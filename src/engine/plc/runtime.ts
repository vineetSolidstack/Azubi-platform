// Scan-cycle runtime: state in, inputs in, next state out.
// One scan = copy inputs to the process image, run the program, advance time.
// Physical outputs are whatever the output variables hold at the end of the scan.

import { Expr, Program, Stmt } from './scl';
import { FB_SPEC, FbType, isFbType, Value } from './types';

type Inst = Record<string, Value>;

export interface PlcState {
  /** PLC time in ms at the start of the next scan */
  now: number;
  /** process image: inputs, outputs and memory variables */
  vars: Record<string, Value>;
  /** function block instances (timers, counters ...) */
  inst: Record<string, Inst>;
}

export function createState(program: Program): PlcState {
  const s: PlcState = { now: 0, vars: {}, inst: {} };
  for (const d of program.decls) {
    if (isFbType(d.type)) {
      const spec = FB_SPEC[d.type];
      const inst: Inst = {};
      for (const [f, t] of [...Object.entries(spec.in), ...Object.entries(spec.out)]) inst[f] = t === 'BOOL' ? false : 0;
      s.inst[d.name] = inst;
    } else {
      s.vars[d.name] = d.initial ?? (d.type === 'BOOL' ? false : 0);
    }
  }
  return s;
}

/** IEC 61131-3 behaviour of the standard function blocks. `_`-fields are internal memory. */
export function runFb(type: FbType, s: Inst, now: number): void {
  const edge = (clk: Value, key = '_prev') => {
    const rising = !!clk && !s[key];
    s[key] = !!clk;
    return rising;
  };
  switch (type) {
    case 'TON':
      if (s.IN) {
        if (!s._prev) s._start = now;
        s.ET = Math.min(now - (s._start as number), s.PT as number);
        s.Q = s.ET >= (s.PT as number);
      } else {
        s.ET = 0;
        s.Q = false;
      }
      s._prev = s.IN;
      break;
    case 'TOF':
      if (s.IN) {
        s.Q = true;
        s.ET = 0;
      } else {
        if (s._prev) s._start = now;
        if (s.Q) {
          s.ET = Math.min(now - (s._start as number), s.PT as number);
          if (s.ET >= (s.PT as number)) s.Q = false;
        }
      }
      s._prev = s.IN;
      break;
    case 'TP':
      // not retriggerable: a new pulse can only start after the old one has ended
      if (!s._run && s.IN && !s._prev) {
        s._run = true;
        s._start = now;
      }
      if (s._run) {
        s.ET = Math.min(now - (s._start as number), s.PT as number);
        if (s.ET >= (s.PT as number)) s._run = false;
      }
      s.Q = !!s._run;
      if (!s._run && !s.IN) s.ET = 0;
      s._prev = s.IN;
      break;
    case 'CTU': {
      const up = edge(s.CU);
      if (s.R) s.CV = 0;
      else if (up && (s.CV as number) < 32767) s.CV = (s.CV as number) + 1;
      s.Q = (s.CV as number) >= (s.PV as number);
      break;
    }
    case 'CTD': {
      const down = edge(s.CD);
      if (s.LD) s.CV = s.PV;
      else if (down && (s.CV as number) > -32768) s.CV = (s.CV as number) - 1;
      s.Q = (s.CV as number) <= 0;
      break;
    }
    case 'CTUD': {
      const up = edge(s.CU, '_prevU');
      const down = edge(s.CD, '_prevD');
      if (s.R) s.CV = 0;
      else if (s.LD) s.CV = s.PV;
      else if (up && !down && (s.CV as number) < 32767) s.CV = (s.CV as number) + 1;
      else if (down && !up && (s.CV as number) > -32768) s.CV = (s.CV as number) - 1;
      s.QU = (s.CV as number) >= (s.PV as number);
      s.QD = (s.CV as number) <= 0;
      break;
    }
    case 'R_TRIG':
      s.Q = edge(s.CLK);
      break;
    case 'F_TRIG':
      // Deviation from the letter of the standard: no pulse in the very first scan
      // when CLK starts as FALSE. That first-scan pulse only confuses learners.
      s.Q = !s.CLK && !!s._prev;
      s._prev = s.CLK;
      break;
    case 'SR':
      s.Q1 = !!s.S1 || (!s.R && !!s.Q1);
      break;
    case 'RS':
      s.Q1 = !s.R1 && (!!s.S || !!s.Q1);
      break;
  }
}

function ev(e: Expr, s: PlcState): Value {
  switch (e.k) {
    case 'lit':
      return e.v;
    case 'var':
      return s.vars[e.name];
    case 'mem':
      return s.inst[e.inst][e.field];
    case 'un':
      return e.op === 'NOT' ? !ev(e.e, s) : -(ev(e.e, s) as number);
    case 'bin': {
      const l = ev(e.l, s);
      const r = ev(e.r, s);
      const a = l as number;
      const b = r as number;
      switch (e.op) {
        case 'AND': return !!l && !!r;
        case 'OR': return !!l || !!r;
        case 'XOR': return l !== r;
        case '=': return l === r;
        case '<>': return l !== r;
        case '<': return a < b;
        case '>': return a > b;
        case '<=': return a <= b;
        case '>=': return a >= b;
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        // division by zero yields 0 instead of stopping the simulated CPU
        case '/': return b === 0 ? 0 : a / b;
        case 'MOD': return b === 0 ? 0 : a % b;
      }
      throw new Error(`unknown operator ${e.op}`);
    }
  }
}

function exec(stmts: Stmt[], s: PlcState, types: Map<string, string>): void {
  for (const st of stmts) {
    switch (st.k) {
      case 'assign': {
        const v = ev(st.e, s);
        s.vars[st.name] = types.get(st.name) === 'INT' ? Math.trunc(v as number) : v;
        break;
      }
      case 'call': {
        const inst = s.inst[st.inst];
        for (const a of st.args) inst[a.name] = ev(a.e, s);
        runFb(types.get(st.inst) as FbType, inst, s.now);
        for (const o of st.outs) s.vars[o.target] = inst[o.name];
        break;
      }
      case 'if': {
        const hit = st.branches.find((b) => ev(b.cond, s));
        if (hit) exec(hit.body, s, types);
        else if (st.else) exec(st.else, s, types);
        break;
      }
      case 'case': {
        const v = ev(st.sel, s);
        const arm = st.arms.find((a) => a.labels.includes(v as number));
        if (arm) exec(arm.body, s, types);
        else if (st.else) exec(st.else, s, types);
      }
    }
  }
}

const typeCache = new WeakMap<Program, Map<string, string>>();

/** Run one scan cycle and return the next state. The given state is not modified. */
export function scan(program: Program, state: PlcState, inputs: Record<string, Value>, cycleMs: number): PlcState {
  let types = typeCache.get(program);
  if (!types) {
    types = new Map(program.decls.map((d) => [d.name, d.type]));
    typeCache.set(program, types);
  }
  const s: PlcState = {
    now: state.now,
    vars: { ...state.vars },
    inst: Object.fromEntries(Object.entries(state.inst).map(([k, v]) => [k, { ...v }])),
  };
  // 1. read inputs into the process image
  for (const d of program.decls) if (d.dir === 'in' && d.name in inputs) s.vars[d.name] = inputs[d.name];
  // 2. execute the program on the process image
  exec(program.body, s, types);
  // 3. outputs are taken from s.vars by the caller after the scan; advance time
  s.now += cycleMs;
  return s;
}
