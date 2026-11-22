// Parser and checker for a small subset of IEC 61131-3 Structured Text (SCL/ST):
// assignments, IF / ELSIF / ELSE, CASE, boolean and arithmetic expressions,
// function block calls (timers, counters, edges, flip-flops) and VAR blocks.
// There are no loops, so every program terminates within one scan.

import { Diagnostic, FB_SPEC, isFbType, L10n, Ty, tyOf, Value, VarDecl, VarType } from './types';

export class SclError extends Error {
  constructor(
    public line: number,
    public msg: L10n,
  ) {
    super(msg.en);
  }
}
const fail = (line: number, de: string, en: string): never => {
  throw new SclError(line, { de, en });
};

export type Expr =
  | { k: 'lit'; v: Value; line: number }
  | { k: 'var'; name: string; line: number }
  | { k: 'mem'; inst: string; field: string; line: number }
  | { k: 'un'; op: 'NOT' | 'NEG'; e: Expr; line: number }
  | { k: 'bin'; op: string; l: Expr; r: Expr; line: number };

export type Stmt =
  | { k: 'assign'; name: string; e: Expr; line: number }
  | {
      k: 'call';
      inst: string;
      args: { name: string; e: Expr }[];
      outs: { name: string; target: string }[];
      line: number;
    }
  | { k: 'if'; branches: { cond: Expr; body: Stmt[] }[]; else?: Stmt[]; line: number }
  | { k: 'case'; sel: Expr; arms: { labels: number[]; body: Stmt[] }[]; else?: Stmt[]; line: number };

export interface Program {
  decls: VarDecl[];
  body: Stmt[];
}
export type CompileResult = { ok: true; program: Program } | { ok: false; errors: Diagnostic[] };

// ---------------------------------------------------------------- tokenizer

interface Tok {
  t: 'id' | 'num' | 'op' | 'eof';
  v: string;
  n?: number;
  /** quoted identifier: never a keyword */
  q?: boolean;
  line: number;
}

const KEYWORDS = new Set([
  'IF', 'THEN', 'ELSIF', 'ELSE', 'END_IF', 'CASE', 'OF', 'END_CASE',
  'AND', 'OR', 'XOR', 'NOT', 'MOD', 'TRUE', 'FALSE', 'VAR', 'END_VAR',
]);
const TIME_UNITS: Record<string, number> = { d: 86_400_000, h: 3_600_000, m: 60_000, s: 1000, ms: 1 };

function parseTime(body: string, line: number): number {
  const text = body.replace(/_/g, '').toLowerCase();
  const re = /(\d+(?:\.\d+)?)(ms|d|h|m|s)/y;
  let total = 0;
  let pos = 0;
  while (pos < text.length) {
    re.lastIndex = pos;
    const m = re.exec(text);
    if (!m) break;
    total += parseFloat(m[1]) * TIME_UNITS[m[2]];
    pos = re.lastIndex;
  }
  if (pos === 0 || pos < text.length)
    fail(line, `Die Zeitangabe „T#${body}“ ist nicht gültig. Beispiel: T#5s oder T#500ms.`, `The time value "T#${body}" is not valid. Example: T#5s or T#500ms.`);
  return Math.round(total);
}

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  let line = 1;
  const reTime = /(?:TIME|T)#([0-9A-Za-z_.]+)/iy;
  const reNum = /\d+(?:\.\d+)?/y;
  const reId = /[A-Za-z_ÄÖÜäöüß][A-Za-z0-9_ÄÖÜäöüß]*/y;
  const ops2 = [':=', '=>', '<>', '<=', '>='];
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (src.startsWith('//', i)) { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (src.startsWith('(*', i)) {
      const end = src.indexOf('*)', i + 2);
      if (end < 0) fail(line, 'Der Kommentar (* ... wird nicht mit *) geschlossen.', 'The comment (* ... is not closed with *).');
      for (let k = i; k < end; k++) if (src[k] === '\n') line++;
      i = end + 2;
      continue;
    }
    if (c === '"') {
      const end = src.indexOf('"', i + 1);
      if (end < 0) fail(line, 'Hier fehlt ein schließendes Anführungszeichen ".', 'A closing quotation mark " is missing.');
      toks.push({ t: 'id', v: src.slice(i + 1, end), q: true, line });
      i = end + 1;
      continue;
    }
    if (c === '#' && /[A-Za-z_]/.test(src[i + 1] ?? '')) { i++; continue; }
    reTime.lastIndex = i;
    let m = reTime.exec(src);
    if (m) { toks.push({ t: 'num', v: m[0], n: parseTime(m[1], line), line }); i = reTime.lastIndex; continue; }
    reNum.lastIndex = i;
    m = reNum.exec(src);
    if (m) { toks.push({ t: 'num', v: m[0], n: parseFloat(m[0]), line }); i = reNum.lastIndex; continue; }
    reId.lastIndex = i;
    m = reId.exec(src);
    if (m) { toks.push({ t: 'id', v: m[0], line }); i = reId.lastIndex; continue; }
    const two = ops2.find((o) => src.startsWith(o, i));
    if (two) { toks.push({ t: 'op', v: two, line }); i += 2; continue; }
    if ('=<>+-*/();,.:&'.includes(c)) { toks.push({ t: 'op', v: c, line }); i++; continue; }
    fail(line, `Das Zeichen „${c}“ ist hier nicht erlaubt.`, `The character "${c}" is not allowed here.`);
  }
  toks.push({ t: 'eof', v: 'Ende', line });
  return toks;
}

// ------------------------------------------------------------------- parser

interface LocalDecl extends VarDecl {
  line: number;
}

function parse(src: string): { locals: LocalDecl[]; body: Stmt[] } {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const prevLine = () => toks[Math.max(0, p - 1)].line;
  const kw = (k: string) => peek().t === 'id' && !peek().q && peek().v.toUpperCase() === k;
  const isKeyword = (t: Tok) => t.t === 'id' && !t.q && KEYWORDS.has(t.v.toUpperCase());
  const op = (o: string) => peek().t === 'op' && peek().v === o;
  const eatOp = (o: string) => (op(o) ? (p++, true) : false);
  const eatKw = (k: string) => (kw(k) ? (p++, true) : false);
  const semi = () => {
    if (!eatOp(';'))
      fail(prevLine(), 'Hier fehlt ein Semikolon ( ; ) am Ende der Anweisung.', 'A semicolon ( ; ) is missing at the end of the statement.');
  };
  const ident = (): Tok => {
    const t = peek();
    if (t.t !== 'id' || isKeyword(t))
      fail(t.line, `Hier wird ein Name erwartet, nicht „${t.v}“.`, `A name is expected here, not "${t.v}".`);
    p++;
    return t;
  };

  // expressions, lowest precedence first: OR, XOR, AND, = <>, < > <= >=, + -, * / MOD, unary
  function primary(): Expr {
    const t = peek();
    if (t.t === 'num') { p++; return { k: 'lit', v: t.n!, line: t.line }; }
    if (kw('TRUE')) { p++; return { k: 'lit', v: true, line: t.line }; }
    if (kw('FALSE')) { p++; return { k: 'lit', v: false, line: t.line }; }
    if (eatOp('(')) {
      const e = expr();
      if (!eatOp(')')) fail(prevLine(), 'Hier fehlt eine schließende Klammer ).', 'A closing bracket ) is missing.');
      return e;
    }
    if (t.t === 'id' && !isKeyword(t)) {
      p++;
      if (eatOp('.')) return { k: 'mem', inst: t.v, field: ident().v, line: t.line };
      return { k: 'var', name: t.v, line: t.line };
    }
    return fail(t.line, `Hier fehlt ein Wert oder eine Variable (gefunden: „${t.v}“).`, `A value or variable is missing here (found: "${t.v}").`);
  }
  function unary(): Expr {
    const line = peek().line;
    if (eatKw('NOT')) return { k: 'un', op: 'NOT', e: unary(), line };
    if (eatOp('-')) return { k: 'un', op: 'NEG', e: unary(), line };
    return primary();
  }
  const level = (next: () => Expr, match: () => string | null) => (): Expr => {
    let l = next();
    for (;;) {
      const line = peek().line;
      const o = match();
      if (!o) return l;
      l = { k: 'bin', op: o, l, r: next(), line };
    }
  };
  const mOp = (...os: string[]) => () => os.find((o) => eatOp(o)) ?? null;
  const mul = level(unary, () => mOp('*', '/')() ?? (eatKw('MOD') ? 'MOD' : null));
  const add = level(mul, mOp('+', '-'));
  const rel = level(add, mOp('<=', '>=', '<', '>'));
  const eq = level(rel, mOp('=', '<>'));
  const and = level(eq, () => (eatKw('AND') || eatOp('&') ? 'AND' : null));
  const xor = level(and, () => (eatKw('XOR') ? 'XOR' : null));
  const expr: () => Expr = level(xor, () => (eatKw('OR') ? 'OR' : null));

  function block(ends: string[], caseArm = false): Stmt[] {
    const out: Stmt[] = [];
    for (;;) {
      const t = peek();
      if (t.t === 'eof') break;
      if (t.t === 'id' && !t.q && ends.includes(t.v.toUpperCase())) break;
      if (caseArm && (t.t === 'num' || (t.t === 'op' && t.v === '-'))) break;
      if (eatOp(';')) continue;
      out.push(stmt());
    }
    return out;
  }

  function ifStmt(): Stmt {
    const line = peek().line;
    p++;
    const branches: { cond: Expr; body: Stmt[] }[] = [];
    let elseBody: Stmt[] | undefined;
    const thenPart = () => {
      const cond = expr();
      if (!eatKw('THEN')) fail(prevLine(), 'Nach der Bedingung fehlt das Wort THEN.', 'The word THEN is missing after the condition.');
      branches.push({ cond, body: block(['ELSIF', 'ELSE', 'END_IF']) });
    };
    thenPart();
    while (eatKw('ELSIF')) thenPart();
    if (eatKw('ELSE')) elseBody = block(['END_IF']);
    if (!eatKw('END_IF')) fail(line, 'Zu diesem IF fehlt das END_IF.', 'This IF has no END_IF.');
    eatOp(';');
    return { k: 'if', branches, else: elseBody, line };
  }

  function caseStmt(): Stmt {
    const line = peek().line;
    p++;
    const sel = expr();
    if (!eatKw('OF')) fail(prevLine(), 'Nach CASE ... fehlt das Wort OF.', 'The word OF is missing after CASE ...');
    const arms: { labels: number[]; body: Stmt[] }[] = [];
    while (peek().t === 'num' || op('-')) {
      const labels: number[] = [];
      do {
        const neg = eatOp('-');
        const t = peek();
        if (t.t !== 'num') fail(t.line, 'Hier wird eine Zahl erwartet.', 'A number is expected here.');
        p++;
        labels.push(neg ? -t.n! : t.n!);
      } while (eatOp(','));
      if (!eatOp(':')) fail(prevLine(), 'Nach der Zahl im CASE fehlt ein Doppelpunkt.', 'A colon is missing after the number in CASE.');
      arms.push({ labels, body: block(['ELSE', 'END_CASE'], true) });
    }
    let elseBody: Stmt[] | undefined;
    if (eatKw('ELSE')) elseBody = block(['END_CASE']);
    if (!eatKw('END_CASE')) fail(line, 'Zu diesem CASE fehlt das END_CASE.', 'This CASE has no END_CASE.');
    eatOp(';');
    return { k: 'case', sel, arms, else: elseBody, line };
  }

  function stmt(): Stmt {
    const t = peek();
    if (kw('IF')) return ifStmt();
    if (kw('CASE')) return caseStmt();
    if (t.t !== 'id' || isKeyword(t))
      fail(t.line, `„${t.v}“ passt hier nicht. Eine Anweisung beginnt mit einem Variablennamen, IF oder CASE.`, `"${t.v}" does not fit here. A statement starts with a variable name, IF or CASE.`);
    p++;
    if (eatOp(':=')) {
      const e = expr();
      semi();
      return { k: 'assign', name: t.v, e, line: t.line };
    }
    if (op('='))
      fail(t.line, 'Für eine Zuweisung brauchst du := (Doppelpunkt und Gleichzeichen), nicht nur = .', 'An assignment needs := (colon and equals sign), not just = .');
    if (eatOp('(')) {
      const args: { name: string; e: Expr }[] = [];
      const outs: { name: string; target: string }[] = [];
      while (!op(')')) {
        const name = ident();
        if (eatOp(':=')) args.push({ name: name.v, e: expr() });
        else if (eatOp('=>')) outs.push({ name: name.v, target: ident().v });
        else fail(name.line, `Nach „${name.v}“ fehlt := und ein Wert. Beispiel: IN := Taster`, `After "${name.v}" a := and a value are missing. Example: IN := Button`);
        if (!eatOp(',')) break;
      }
      if (!eatOp(')')) fail(prevLine(), 'Hier fehlt eine schließende Klammer ).', 'A closing bracket ) is missing.');
      semi();
      return { k: 'call', inst: t.v, args, outs, line: t.line };
    }
    if (op('.'))
      fail(t.line, `Werte wie ${t.v}.Q kannst du nur lesen. Eingänge setzt du im Aufruf: ${t.v}(IN := ...);`, `Values like ${t.v}.Q are read-only. Set inputs in the call: ${t.v}(IN := ...);`);
    return fail(t.line, `Nach „${t.v}“ fehlt eine Zuweisung mit := .`, `After "${t.v}" an assignment with := is missing.`);
  }

  function varBlock(locals: LocalDecl[]) {
    const start = peek().line;
    p++;
    while (!kw('END_VAR')) {
      if (peek().t === 'eof') fail(start, 'Zu diesem VAR fehlt das END_VAR.', 'This VAR has no END_VAR.');
      const names = [ident()];
      while (eatOp(',')) names.push(ident());
      if (!eatOp(':')) fail(prevLine(), 'Nach dem Namen fehlt ein Doppelpunkt und der Datentyp. Beispiel: T1 : TON;', 'After the name a colon and the data type are missing. Example: T1 : TON;');
      const tt = peek();
      p++;
      let type = tt.v.toUpperCase();
      if (type === 'DINT') type = 'INT';
      if (tt.t !== 'id' || !(['BOOL', 'INT', 'REAL', 'TIME'].includes(type) || isFbType(type)))
        fail(tt.line, `Den Datentyp „${tt.v}“ gibt es hier nicht. Möglich: BOOL, INT, REAL, TIME, ${Object.keys(FB_SPEC).join(', ')}.`, `The data type "${tt.v}" does not exist here. Possible: BOOL, INT, REAL, TIME, ${Object.keys(FB_SPEC).join(', ')}.`);
      let initial: Value | undefined;
      if (eatOp(':=')) {
        const neg = eatOp('-');
        const lit = peek();
        p++;
        if (lit.t === 'num') initial = neg ? -lit.n! : lit.n!;
        else if (lit.t === 'id' && ['TRUE', 'FALSE'].includes(lit.v.toUpperCase())) initial = lit.v.toUpperCase() === 'TRUE';
        else fail(lit.line, 'Als Startwert ist nur eine Zahl, TRUE oder FALSE erlaubt.', 'Only a number, TRUE or FALSE is allowed as a start value.');
      }
      semi();
      for (const n of names) locals.push({ name: n.v, type: type as VarDecl['type'], dir: 'mem', initial, line: n.line });
    }
    p++;
    eatOp(';');
  }

  const locals: LocalDecl[] = [];
  const body: Stmt[] = [];
  while (peek().t !== 'eof') {
    if (kw('VAR')) varBlock(locals);
    else if (!eatOp(';')) body.push(stmt());
  }
  return { locals, body };
}

// ------------------------------------------------------------------ checker

function check(body: Stmt[], table: Map<string, VarDecl>) {
  const lookup = (name: string, line: number): VarDecl =>
    table.get(name.toLowerCase()) ??
    fail(line, `Die Variable „${name}“ gibt es nicht. Prüfe die Schreibweise in der Variablentabelle.`, `The variable "${name}" does not exist. Check the spelling in the variable table.`);
  const fb = (name: string, line: number) => {
    const d = lookup(name, line);
    if (!isFbType(d.type))
      fail(line, `„${d.name}“ ist kein Baustein (Timer, Zähler ...).`, `"${d.name}" is not a function block (timer, counter ...).`);
    return { d, spec: FB_SPEC[d.type] };
  };
  const plain = (name: string, line: number): VarDecl & { type: VarType } => {
    const d = lookup(name, line);
    if (isFbType(d.type))
      fail(line, `„${d.name}“ ist ein Baustein (${d.type}). Meinst du ${d.name}.Q ?`, `"${d.name}" is a function block (${d.type}). Do you mean ${d.name}.Q ?`);
    return d as VarDecl & { type: VarType };
  };
  const tyName = (t: Ty) => (t === 'BOOL' ? { de: 'ein Wahr/Falsch-Wert (BOOL)', en: 'a true/false value (BOOL)' } : { de: 'eine Zahl', en: 'a number' });
  const need = (e: Expr, want: Ty, deCtx: string, enCtx: string) => {
    const got = ty(e);
    if (got !== want)
      fail(e.line, `${deCtx} braucht ${tyName(want).de}, hier steht aber ${tyName(got).de}.`, `${enCtx} needs ${tyName(want).en}, but here is ${tyName(got).en}.`);
  };
  const ty = (e: Expr): Ty => {
    switch (e.k) {
      case 'lit':
        return typeof e.v === 'boolean' ? 'BOOL' : 'NUM';
      case 'var': {
        const d = plain(e.name, e.line);
        e.name = d.name;
        return tyOf(d.type);
      }
      case 'mem': {
        const { d, spec } = fb(e.inst, e.line);
        const f = e.field.toUpperCase();
        const t = spec.in[f] ?? spec.out[f];
        if (!t) {
          const all = [...Object.keys(spec.out), ...Object.keys(spec.in)].join(', ');
          fail(e.line, `Der Baustein ${d.type} hat kein „${e.field}“. Möglich: ${all}.`, `The block ${d.type} has no "${e.field}". Possible: ${all}.`);
        }
        e.inst = d.name;
        e.field = f;
        return t;
      }
      case 'un':
        if (e.op === 'NOT') { need(e.e, 'BOOL', 'NOT', 'NOT'); return 'BOOL'; }
        need(e.e, 'NUM', 'Das Minuszeichen', 'The minus sign');
        return 'NUM';
      case 'bin': {
        if (['AND', 'OR', 'XOR'].includes(e.op)) {
          need(e.l, 'BOOL', e.op, e.op);
          need(e.r, 'BOOL', e.op, e.op);
          return 'BOOL';
        }
        if (['=', '<>'].includes(e.op)) {
          const l = ty(e.l);
          if (ty(e.r) !== l)
            fail(e.line, 'Du vergleichst eine Zahl mit einem Wahr/Falsch-Wert. Beide Seiten müssen vom gleichen Typ sein.', 'You compare a number with a true/false value. Both sides must have the same type.');
          return 'BOOL';
        }
        need(e.l, 'NUM', `Die Rechnung mit ${e.op}`, `The operation ${e.op}`);
        need(e.r, 'NUM', `Die Rechnung mit ${e.op}`, `The operation ${e.op}`);
        return ['<', '>', '<=', '>='].includes(e.op) ? 'BOOL' : 'NUM';
      }
    }
  };
  const writable = (name: string, line: number) => {
    const d = plain(name, line);
    if (d.dir === 'in')
      fail(line, `„${d.name}“ ist ein Eingang. Eingänge kommen von Tastern und Sensoren, das Programm kann sie nicht beschreiben.`, `"${d.name}" is an input. Inputs come from buttons and sensors, the program cannot write to them.`);
    return d;
  };
  const walk = (stmts: Stmt[]) => {
    for (const s of stmts) {
      switch (s.k) {
        case 'assign': {
          const d = writable(s.name, s.line);
          s.name = d.name;
          need(s.e, tyOf(d.type), `Die Variable „${d.name}“`, `The variable "${d.name}"`);
          break;
        }
        case 'call': {
          const { d, spec } = fb(s.inst, s.line);
          s.inst = d.name;
          for (const a of s.args) {
            const f = a.name.toUpperCase();
            if (!spec.in[f])
              fail(s.line, `Der Baustein ${d.type} hat keinen Eingang „${a.name}“. Möglich: ${Object.keys(spec.in).join(', ')}.`, `The block ${d.type} has no input "${a.name}". Possible: ${Object.keys(spec.in).join(', ')}.`);
            a.name = f;
            need(a.e, spec.in[f], `Der Eingang ${f}`, `The input ${f}`);
          }
          for (const o of s.outs) {
            const f = o.name.toUpperCase();
            if (!spec.out[f])
              fail(s.line, `Der Baustein ${d.type} hat keinen Ausgang „${o.name}“. Möglich: ${Object.keys(spec.out).join(', ')}.`, `The block ${d.type} has no output "${o.name}". Possible: ${Object.keys(spec.out).join(', ')}.`);
            const t = writable(o.target, s.line);
            if (tyOf(t.type) !== spec.out[f])
              fail(s.line, `Der Ausgang ${f} passt nicht zum Typ von „${t.name}“.`, `The output ${f} does not match the type of "${t.name}".`);
            o.name = f;
            o.target = t.name;
          }
          break;
        }
        case 'if':
          for (const b of s.branches) {
            need(b.cond, 'BOOL', 'Die Bedingung nach IF', 'The condition after IF');
            walk(b.body);
          }
          if (s.else) walk(s.else);
          break;
        case 'case':
          need(s.sel, 'NUM', 'CASE', 'CASE');
          for (const a of s.arms) walk(a.body);
          if (s.else) walk(s.else);
      }
    }
  };
  walk(body);
}

/** Parse and check a program against the variable table of a task. */
export function compile(source: string, taskDecls: VarDecl[]): CompileResult {
  try {
    const { locals, body } = parse(source);
    const table = new Map<string, VarDecl>();
    for (const d of taskDecls) table.set(d.name.toLowerCase(), d);
    for (const { line, ...d } of locals) {
      if (table.has(d.name.toLowerCase()))
        fail(line, `Der Name „${d.name}“ ist schon vergeben.`, `The name "${d.name}" is already in use.`);
      table.set(d.name.toLowerCase(), d);
    }
    check(body, table);
    return { ok: true, program: { decls: [...table.values()], body } };
  } catch (e) {
    if (e instanceof SclError) return { ok: false, errors: [{ line: e.line, msg: e.msg }] };
    throw e;
  }
}
