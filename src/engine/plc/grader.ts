// Simulation loop and grader. The grader only looks at behaviour (inputs over time ->
// expected values at given moments). It never compares against the structure of a solution.

import { ladderToScl } from './ladder';
import { createState, PlcState, scan } from './runtime';
import { compile, Program } from './scl';
import { Plant, plantInit, plantSensors, plantStep } from './stations';
import { CYCLE_MS, operatorDefaults, Solution, Task, taskDecls, TestCase } from './task';
import { Diagnostic, L10n, Value } from './types';

export interface Sim {
  plc: PlcState;
  plant: Plant;
  /** process image after the last scan: inputs, outputs, memory */
  image: Record<string, Value>;
}

export function simInit(program: Program, task: Task, plant: Plant = plantInit(task)): Sim {
  const plc = createState(program);
  return { plc, plant, image: { ...plc.vars, ...operatorDefaults(task), ...plantSensors(task, plant) } };
}

/** One cycle: sensors + operator inputs -> PLC scan -> outputs move the plant. */
export function simTick(program: Program, task: Task, sim: Sim, operator: Record<string, Value>): Sim {
  const inputs = { ...operator, ...plantSensors(task, sim.plant) };
  const plc = scan(program, sim.plc, inputs, CYCLE_MS);
  return { plc, plant: plantStep(task, sim.plant, plc.vars, CYCLE_MS), image: plc.vars };
}

export interface TestFailure {
  kind: 'expect' | 'never';
  at: number;
  variable: string;
  expected: Value;
  actual: Value;
  note?: L10n;
}
export interface TestResult {
  id: string;
  name: L10n;
  passed: boolean;
  failure?: TestFailure;
}
export interface GradeResult {
  errors: Diagnostic[];
  tests: TestResult[];
  passed: boolean;
}

export function runTest(program: Program, task: Task, test: TestCase): TestResult {
  const base = { id: test.id, name: test.name };
  const byTime = new Map<number, typeof test.steps>();
  for (const s of test.steps) byTime.set(s.at, [...(byTime.get(s.at) ?? []), s]);
  const end = Math.max(...test.steps.map((s) => s.at));
  const operator = operatorDefaults(task);
  let sim = simInit(program, task);
  for (let t = 0; t <= end; t += CYCLE_MS) {
    const steps = byTime.get(t) ?? [];
    for (const s of steps) Object.assign(operator, s.set);
    sim = simTick(program, task, sim, operator);
    for (const s of steps)
      for (const [variable, expected] of Object.entries(s.expect ?? {}))
        if (sim.image[variable] !== expected)
          return { ...base, passed: false, failure: { kind: 'expect', at: t, variable, expected, actual: sim.image[variable], note: s.note } };
    for (const n of test.never ?? []) {
      const entries = Object.entries(n.when);
      if (entries.every(([k, v]) => sim.image[k] === v))
        return { ...base, passed: false, failure: { kind: 'never', at: t, variable: entries.map(([k]) => k).join(' + '), expected: false, actual: true, note: n.note } };
    }
  }
  return { ...base, passed: true };
}

export const solutionToScl = (s: Solution): string => (s.lang === 'scl' ? s.code : ladderToScl(s.rungs));

/** Compile the learner's program and run all test cases of the task. */
export function grade(task: Task, source: string): GradeResult {
  const c = compile(source, taskDecls(task));
  if (!c.ok) return { errors: c.errors, tests: [], passed: false };
  const tests = task.tests.map((t) => runTest(c.program, task, t));
  return { errors: [], tests, passed: tests.every((t) => t.passed) };
}
