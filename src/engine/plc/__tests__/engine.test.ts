import { describe, expect, it } from 'vitest';
import { compile, createState, ladderToScl, PlcState, Program, scan, Value, VarDecl } from '..';

const DECLS: VarDecl[] = [
  { name: 'A', type: 'BOOL', dir: 'in' },
  { name: 'B', type: 'BOOL', dir: 'in' },
  { name: 'N', type: 'INT', dir: 'in' },
  { name: 'Q', type: 'BOOL', dir: 'out' },
  { name: 'X', type: 'INT', dir: 'out' },
  { name: 'R', type: 'REAL', dir: 'out' },
];

function prog(src: string): Program {
  const c = compile(src, DECLS);
  if (!c.ok) throw new Error(`line ${c.errors[0].line}: ${c.errors[0].msg.en}`);
  return c.program;
}
const errorOf = (src: string) => {
  const c = compile(src, DECLS);
  return c.ok ? null : c.errors[0];
};

/** Runs scans of 10 ms. `at(ms)` advances to the scan that starts at PLC time `ms` and returns the image. */
function runner(src: string) {
  const program = prog(src);
  let state: PlcState = createState(program);
  let inputs: Record<string, Value> = {};
  return {
    set(i: Record<string, Value>) {
      inputs = { ...inputs, ...i };
      return this;
    },
    at(ms: number) {
      while (state.now <= ms) state = scan(program, state, inputs, 10);
      return state.vars;
    },
    inst: (name: string) => state.inst[name],
  };
}
const once = (src: string, inputs: Record<string, Value> = {}) => runner(src).set(inputs).at(0);

describe('expressions', () => {
  it('evaluates AND, OR, XOR, NOT with IEC precedence', () => {
    expect(once('Q := A OR B AND NOT A;', { A: true, B: false }).Q).toBe(true);
    expect(once('Q := (A OR B) AND NOT A;', { A: true, B: false }).Q).toBe(false);
    expect(once('Q := A XOR B;', { A: true, B: true }).Q).toBe(false);
    expect(once('Q := A XOR B;', { A: true, B: false }).Q).toBe(true);
    expect(once('Q := A & B;', { A: true, B: true }).Q).toBe(true);
  });
  it('does arithmetic and comparisons', () => {
    expect(once('X := 2 + 3 * 4;').X).toBe(14);
    expect(once('X := (2 + 3) * 4;').X).toBe(20);
    expect(once('X := 17 MOD 5;').X).toBe(2);
    expect(once('X := -N + 1;', { N: 4 }).X).toBe(-3);
    expect(once('R := 7 / 2;').R).toBe(3.5);
    expect(once('X := 7 / 2;').X).toBe(3);
    expect(once('X := 5 / 0;').X).toBe(0);
    expect(once('Q := N >= 3 AND N < 10;', { N: 3 }).Q).toBe(true);
    expect(once('Q := N <> 3;', { N: 3 }).Q).toBe(false);
    expect(once('Q := A = B;', { A: true, B: true }).Q).toBe(true);
  });
  it('reads time literals as milliseconds', () => {
    expect(once('X := T#5s;').X).toBe(5000);
    expect(once('X := T#1m30s;').X).toBe(90000);
    expect(once('X := TIME#250ms;').X).toBe(250);
    expect(once('X := t#1.5s;').X).toBe(1500);
  });
  it('ignores case, comments, quotes and # prefixes', () => {
    expect(once('// comment\n(* block\ncomment *) "Q" := #a and TRUE;', { A: true }).Q).toBe(true);
  });
});

describe('statements', () => {
  it('IF / ELSIF / ELSE', () => {
    const src = 'IF N = 1 THEN X := 10; ELSIF N = 2 THEN X := 20; ELSE X := 30; END_IF;';
    expect(once(src, { N: 1 }).X).toBe(10);
    expect(once(src, { N: 2 }).X).toBe(20);
    expect(once(src, { N: 9 }).X).toBe(30);
  });
  it('CASE with several labels and ELSE', () => {
    const src = 'CASE N OF\n 1, 2: X := 10;\n 3: X := 30; Q := TRUE;\n ELSE X := -1;\nEND_CASE;';
    expect(once(src, { N: 2 }).X).toBe(10);
    expect(once(src, { N: 3 })).toMatchObject({ X: 30, Q: true });
    expect(once(src, { N: 7 }).X).toBe(-1);
  });
  it('set and reset keep their value between scans', () => {
    const r = runner('IF A THEN Q := TRUE; END_IF; IF B THEN Q := FALSE; END_IF;');
    expect(r.set({ A: true }).at(0).Q).toBe(true);
    expect(r.set({ A: false }).at(50).Q).toBe(true);
    expect(r.set({ B: true }).at(60).Q).toBe(false);
  });
  it('local variables with start values', () => {
    expect(once('VAR k, m : INT := 4; f : BOOL := TRUE; END_VAR X := k + m; Q := f;')).toMatchObject({ X: 8, Q: true });
  });
});

describe('scan cycle', () => {
  it('works on the process image: inputs are read once per scan', () => {
    const program = prog('Q := A;');
    const s0 = createState(program);
    const s1 = scan(program, s0, { A: true }, 10);
    expect(s1.vars.Q).toBe(true);
    expect(s1.now).toBe(10);
    expect(s0.vars.Q).toBe(false); // the old state is not modified
  });
  it('the last assignment in a scan wins', () => {
    expect(once('Q := TRUE; Q := FALSE;').Q).toBe(false);
  });
  it('a variable used before its assignment still holds the value of the previous scan', () => {
    const r = runner('VAR m : BOOL; END_VAR Q := m; m := A;');
    expect(r.set({ A: true }).at(0).Q).toBe(false);
    expect(r.at(10).Q).toBe(true);
  });
});

describe('timers (IEC 61131-3)', () => {
  it('TON: Q after PT, reset at once when IN goes FALSE', () => {
    const r = runner('VAR T1 : TON; END_VAR T1(IN := A, PT := T#1s); Q := T1.Q; X := T1.ET;');
    expect(r.at(100).Q).toBe(false);
    r.set({ A: true });
    expect(r.at(110)).toMatchObject({ Q: false, X: 0 });
    expect(r.at(610).X).toBe(500);
    expect(r.at(1100).Q).toBe(false);
    expect(r.at(1110)).toMatchObject({ Q: true, X: 1000 });
    expect(r.at(3000)).toMatchObject({ Q: true, X: 1000 }); // ET stops at PT
    r.set({ A: false });
    expect(r.at(3010)).toMatchObject({ Q: false, X: 0 });
  });
  it('TON: a short IN pulse never reaches Q and the time starts again', () => {
    const r = runner('VAR T1 : TON; END_VAR T1(IN := A, PT := T#1s); Q := T1.Q;');
    r.set({ A: true }).at(500);
    r.set({ A: false }).at(600);
    r.set({ A: true });
    expect(r.at(1500).Q).toBe(false);
    expect(r.at(1610).Q).toBe(true);
  });
  it('TOF: Q at once, stays for PT after IN goes FALSE, retriggerable', () => {
    const r = runner('VAR T1 : TOF; END_VAR T1(IN := A, PT := T#1s); Q := T1.Q; X := T1.ET;');
    expect(r.at(50).Q).toBe(false);
    r.set({ A: true });
    expect(r.at(60).Q).toBe(true);
    r.set({ A: false });
    expect(r.at(70)).toMatchObject({ Q: true, X: 0 });
    expect(r.at(1060).Q).toBe(true);
    expect(r.at(1070)).toMatchObject({ Q: false, X: 1000 });
    r.set({ A: true }).at(2000);
    r.set({ A: false }).at(2500);
    r.set({ A: true });
    expect(r.at(2510)).toMatchObject({ Q: true, X: 0 });
    r.set({ A: false });
    expect(r.at(3500).Q).toBe(true);
    expect(r.at(3530).Q).toBe(false);
  });
  it('TP: pulse of exactly PT, not retriggerable, independent of IN length', () => {
    const r = runner('VAR T1 : TP; END_VAR T1(IN := A, PT := T#1s); Q := T1.Q; X := T1.ET;');
    r.set({ A: true });
    expect(r.at(0).Q).toBe(true);
    r.set({ A: false }).at(100);
    r.set({ A: true }); // new edge during the pulse is ignored
    expect(r.at(990).Q).toBe(true);
    expect(r.at(1000)).toMatchObject({ Q: false, X: 1000 }); // ET holds while IN is TRUE
    expect(r.at(1500).Q).toBe(false);
    r.set({ A: false });
    expect(r.at(1510).X).toBe(0);
    r.set({ A: true });
    expect(r.at(1520).Q).toBe(true);
  });
});

describe('counters and edges (IEC 61131-3)', () => {
  it('CTU counts rising edges only, R resets and wins', () => {
    const r = runner('VAR C : CTU; END_VAR C(CU := A, R := B, PV := 2); Q := C.Q; X := C.CV;');
    r.set({ A: true });
    expect(r.at(100).X).toBe(1); // held TRUE for many scans: still 1
    r.set({ A: false }).at(110);
    r.set({ A: true });
    expect(r.at(120)).toMatchObject({ X: 2, Q: true });
    r.set({ A: false }).at(130);
    r.set({ A: true });
    expect(r.at(140).X).toBe(3); // keeps counting above PV
    r.set({ A: false, B: true });
    expect(r.at(150)).toMatchObject({ X: 0, Q: false });
    r.set({ A: true });
    expect(r.at(160).X).toBe(0); // R is dominant
  });
  it('CTD loads PV and counts down to Q at 0', () => {
    const r = runner('VAR C : CTD; END_VAR C(CD := A, LD := B, PV := 2); Q := C.Q; X := C.CV;');
    expect(r.at(0).Q).toBe(true); // CV starts at 0
    r.set({ B: true });
    expect(r.at(10)).toMatchObject({ X: 2, Q: false });
    r.set({ B: false, A: true });
    expect(r.at(20).X).toBe(1);
    r.set({ A: false }).at(30);
    r.set({ A: true });
    expect(r.at(40)).toMatchObject({ X: 0, Q: true });
  });
  it('CTUD counts both ways', () => {
    const r = runner('VAR C : CTUD; u, d : BOOL; END_VAR C(CU := A, CD := B, R := FALSE, LD := FALSE, PV := 2); Q := C.QU; X := C.CV;');
    r.set({ A: true }).at(0);
    r.set({ A: false }).at(10);
    r.set({ A: true });
    expect(r.at(20)).toMatchObject({ X: 2, Q: true });
    r.set({ B: true });
    expect(r.at(30)).toMatchObject({ X: 1, Q: false });
    expect(r.inst('C').QD).toBe(false);
    r.set({ B: false }).at(40);
    r.set({ B: true }).at(50);
    expect(r.inst('C').QD).toBe(true);
  });
  it('R_TRIG and F_TRIG give a pulse of one scan', () => {
    const r = runner('VAR up : R_TRIG; down : F_TRIG; END_VAR up(CLK := A); down(CLK := A); Q := up.Q; IF down.Q THEN X := X + 1; END_IF;');
    expect(r.at(0)).toMatchObject({ Q: false, X: 0 }); // no pulse in the first scan
    r.set({ A: true });
    expect(r.at(10).Q).toBe(true);
    expect(r.at(20).Q).toBe(false);
    r.set({ A: false });
    expect(r.at(30).X).toBe(1);
    expect(r.at(100).X).toBe(1);
  });
  it('SR is set dominant, RS is reset dominant', () => {
    const src = 'VAR f1 : SR; f2 : RS; END_VAR f1(S1 := A, R := B); f2(S := A, R1 := B); Q := f1.Q1; IF f2.Q1 THEN X := 1; ELSE X := 0; END_IF;';
    const r = runner(src);
    expect(r.set({ A: true, B: true }).at(0)).toMatchObject({ Q: true, X: 0 });
    expect(r.set({ A: true, B: false }).at(10)).toMatchObject({ Q: true, X: 1 });
    expect(r.set({ A: false }).at(20)).toMatchObject({ Q: true, X: 1 }); // both hold
    expect(r.set({ B: true }).at(30)).toMatchObject({ Q: false, X: 0 });
  });
  it('block outputs can be assigned with =>', () => {
    expect(once('VAR T1 : TON; END_VAR T1(IN := A, PT := T#0s, Q => Q);', { A: true }).Q).toBe(true);
  });
});

describe('error messages for learners', () => {
  const cases: [string, string, number][] = [
    ['Q = A;', ':=', 1],
    ['Q := A', 'semicolon', 1],
    ['\nQ := Motor;', 'does not exist', 2],
    ['A := TRUE;', 'is an input', 1],
    ['Q := 5;', 'needs a true/false value', 1],
    ['X := A;', 'needs a number', 1],
    ['IF N THEN Q := TRUE; END_IF;', 'condition after IF', 1],
    ['IF A THEN\n Q := TRUE;', 'END_IF', 1],
    ['Q := (A OR B;', 'closing bracket', 1],
    ['Q := A AND;', 'value or variable is missing', 1],
    ['VAR T1 : TON; END_VAR Q := T1;', 'T1.Q', 1],
    ['VAR T1 : TON; END_VAR Q := T1.X;', 'has no "X"', 1],
    ['VAR T1 : TON; END_VAR T1(IN := A, ZEIT := T#1s);', 'no input "ZEIT"', 1],
    ['VAR T1 : TIMER; END_VAR', 'data type', 1],
    ['VAR Q : BOOL; END_VAR', 'already in use', 1],
    ['Q := N = A;', 'same type', 1],
    ['X := T#5x;', 'time value', 1],
    ['Q := A $ B;', 'not allowed', 1],
    ['END_IF;', 'does not fit here', 1],
    ['Q.X := TRUE;', 'read-only', 1],
  ];
  for (const [src, part, line] of cases)
    it(`${JSON.stringify(src)} -> "${part}"`, () => {
      const e = errorOf(src);
      expect(e).not.toBeNull();
      expect(e!.msg.en).toContain(part);
      expect(e!.msg.de.length).toBeGreaterThan(10);
      expect(e!.line).toBe(line);
    });
});

describe('ladder (KOP) to SCL', () => {
  it('series = AND, parallel = OR, NC contact = NOT', () => {
    const scl = ladderToScl([
      { groups: [[[{ v: 'A' }], [{ v: 'Q' }]], [[{ v: 'B', neg: true }]]], out: { kind: 'coil', v: 'Q' } },
    ]);
    expect(scl).toContain('Q := (A OR Q) AND NOT B;');
    const r = runner(scl);
    expect(r.set({ A: true }).at(0).Q).toBe(true);
    expect(r.set({ A: false }).at(10).Q).toBe(true);
    expect(r.set({ B: true }).at(20).Q).toBe(false);
  });
  it('set, reset and timer outputs, empty rung is always TRUE', () => {
    const scl = ladderToScl([
      { groups: [[[{ v: 'A' }]]], out: { kind: 'TON', v: 'T1', ptMs: 100 } },
      { groups: [[[{ v: 'T1.Q' }]]], out: { kind: 'set', v: 'Q' } },
      { groups: [[[{ v: 'B' }]]], out: { kind: 'reset', v: 'Q' } },
      { groups: [], out: { kind: 'coil', v: 'X_on' } },
    ]);
    const c = compile(scl, [...DECLS, { name: 'X_on', type: 'BOOL', dir: 'out' }]);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    let s = createState(c.program);
    for (let t = 0; t <= 200; t += 10) s = scan(c.program, s, { A: true }, 10);
    expect(s.vars).toMatchObject({ Q: true, X_on: true });
    s = scan(c.program, s, { A: false, B: true }, 10);
    expect(s.vars.Q).toBe(false);
  });
});
