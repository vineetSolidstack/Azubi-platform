// Task file format. Tasks are data (JSON), never code.

import { LadderRung } from './ladder';
import { L10n, Value, VarDecl, VarType } from './types';

export type ReviewStatus = 'draft' | 'self_checked' | 'verified';
export type StationId = 'panel' | 'conveyor' | 'cylinder';

export interface TaskVar {
  name: string;
  type: VarType;
  dir: 'in' | 'out' | 'mem';
  /** IEC address shown in the variable table, e.g. %I0.0 */
  address?: string;
  comment: L10n;
  /** Connects the variable to the station model (e.g. motorRight, limitLeft). Inputs with a role are driven by the plant. */
  role?: string;
  /** Öffner: the signal is TRUE at rest and FALSE when actuated (wire-break safe) */
  nc?: boolean;
  ui?: 'button' | 'switch' | 'lamp';
  color?: 'red' | 'yellow' | 'green' | 'white';
}

export interface TestStep {
  /** time in ms from the start of the test, multiple of the cycle time */
  at: number;
  /** operator inputs that change at this moment (electrical signal values) */
  set?: Record<string, Value>;
  /** values that must be present after the scan at this moment */
  expect?: Record<string, Value>;
  note?: L10n;
}
export interface TestCase {
  id: string;
  name: L10n;
  steps: TestStep[];
  /** combinations that must never occur during the whole test */
  never?: { when: Record<string, Value>; note: L10n }[];
}

export type Solution = { lang: 'scl'; code: string } | { lang: 'kop'; rungs: LadderRung[] };

export interface Task {
  id: string;
  module: string;
  /** Lernfeld numbers per trade, e.g. { "EAT": [7], "MECH": [7] } */
  lernfeld: Record<string, number[]>;
  difficulty: 1 | 2 | 3 | 4 | 5;
  status: ReviewStatus;
  title: L10n;
  description: L10n;
  /** short explanation of the idea needed for this task */
  learn?: L10n;
  hints: L10n[];
  /** why the reference solution is built the way it is, one point per entry */
  explanation: L10n[];
  station: StationId;
  stationOptions?: { wrap?: boolean; startPos?: number };
  languages: ('kop' | 'scl')[];
  variables: TaskVar[];
  tests: TestCase[];
  solutions: { reference: Solution[]; wrong: Solution[] };
}

export const CYCLE_MS = 10;

export const taskDecls = (task: Task): VarDecl[] => task.variables.map(({ name, type, dir }) => ({ name, type, dir }));

/** Inputs set by the learner or a test (not by the plant), with their value at rest. */
export function operatorDefaults(task: Task): Record<string, Value> {
  const out: Record<string, Value> = {};
  for (const v of task.variables) if (v.dir === 'in' && !v.role) out[v.name] = v.type === 'BOOL' ? !!v.nc : 0;
  return out;
}

/** Structural checks for a task file. Returns a list of problems (empty = fine). */
export function validateTask(t: Task): string[] {
  const p: string[] = [];
  const l10n = (x: L10n | undefined, where: string) => {
    if (!x?.de || !x?.en) p.push(`${where}: de and en text required`);
  };
  if (!/^[a-z0-9-]+$/.test(t.id ?? '')) p.push('id must be lowercase letters, digits and dashes');
  if (!['draft', 'self_checked', 'verified'].includes(t.status)) p.push('invalid review status');
  if (!(t.difficulty >= 1 && t.difficulty <= 5)) p.push('difficulty must be 1..5');
  if (!t.module) p.push('module missing');
  if (!t.lernfeld || !Object.keys(t.lernfeld).length) p.push('lernfeld mapping missing');
  l10n(t.title, 'title');
  l10n(t.description, 'description');
  t.hints?.forEach((h, i) => l10n(h, `hint ${i}`));
  if (!t.explanation?.length) p.push('explanation of the solution missing');
  t.explanation?.forEach((h, i) => l10n(h, `explanation ${i}`));
  if (!t.languages?.length) p.push('languages missing');
  const vars = new Map(t.variables.map((v) => [v.name, v]));
  if (vars.size !== t.variables.length) p.push('duplicate variable names');
  for (const v of t.variables) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(v.name)) p.push(`variable ${v.name}: invalid name`);
    l10n(v.comment, `variable ${v.name}`);
  }
  const operator = operatorDefaults(t);
  if (!t.tests?.length) p.push('at least one test case required');
  for (const tc of t.tests ?? []) {
    l10n(tc.name, `test ${tc.id}`);
    for (const s of tc.steps) {
      if (s.at < 0 || s.at % CYCLE_MS !== 0) p.push(`test ${tc.id}: "at" ${s.at} must be a multiple of ${CYCLE_MS}`);
      for (const k of Object.keys(s.set ?? {})) if (!(k in operator)) p.push(`test ${tc.id}: "${k}" is not an operator input`);
      for (const k of Object.keys(s.expect ?? {})) if (!vars.has(k)) p.push(`test ${tc.id}: unknown variable "${k}"`);
      if (s.note) l10n(s.note, `test ${tc.id} step ${s.at}`);
    }
    for (const n of tc.never ?? []) {
      l10n(n.note, `test ${tc.id} never`);
      for (const k of Object.keys(n.when)) if (!vars.has(k)) p.push(`test ${tc.id}: unknown variable "${k}"`);
    }
  }
  if (!t.solutions?.reference?.length) p.push('at least one reference solution required');
  if (!t.solutions?.wrong?.length) p.push('at least one wrong solution required');
  for (const s of [...(t.solutions?.reference ?? []), ...(t.solutions?.wrong ?? [])])
    if (!t.languages.includes(s.lang) && s.lang !== 'scl') p.push(`solution uses language ${s.lang} that the task does not allow`);
  return p;
}
