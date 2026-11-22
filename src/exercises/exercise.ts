// Worked exercises (Übungen): a situation, several calculation steps that are checked one
// by one, and a complete worked solution. Exercises are data; checking is deterministic.

import { parseNumber } from '../quiz/quiz';

export type L10n = { de: string; en: string };
export type ReviewStatus = 'draft' | 'self_checked' | 'verified';

export interface ExerciseStep {
  /** what the learner has to calculate */
  prompt: L10n;
  unit: string;
  answer: number;
  /** accepted absolute deviation from the answer */
  tolerance: number;
  /** the general formula, e.g. "I = U / R" */
  formula: string;
  /** the worked calculation with numbers, written with a decimal point, ending in the result */
  calc: string;
  /** why this step is done this way */
  why: L10n;
}

export interface Exercise {
  id: string;
  module: string;
  /** Lernfeld numbers per trade */
  lernfeld: Record<string, number[]>;
  difficulty: 1 | 2 | 3 | 4 | 5;
  status: ReviewStatus;
  title: L10n;
  /** the task text with all given values */
  situation: L10n;
  steps: ExerciseStep[];
  /** the idea to remember from this exercise */
  takeaway: L10n;
  source: string;
}

export function checkStep(step: ExerciseStep, text: string): boolean {
  const n = parseNumber(text);
  return n !== null && Math.abs(n - step.answer) <= step.tolerance + 1e-9;
}

/** German text uses a decimal comma: 0.25 A -> 0,25 A */
export const localizeNumbers = (text: string, lang: 'de' | 'en') => (lang === 'de' ? text.replace(/(\d)\.(\d)/g, '$1,$2') : text);

/** The last number in the worked calculation: it must be the stored answer. */
export function calcResult(calc: string): number | null {
  const all = calc.match(/-?\d+(?:\.\d+)?/g);
  return all ? parseFloat(all[all.length - 1]) : null;
}

export function validateExercise(e: Exercise): string[] {
  const p: string[] = [];
  const l = (x: L10n | undefined, w: string) => {
    if (!x?.de || !x?.en) p.push(`${w}: de and en required`);
  };
  if (!/^[a-z0-9-]+$/.test(e.id ?? '')) p.push('bad id');
  if (!['draft', 'self_checked', 'verified'].includes(e.status)) p.push('bad status');
  if (!e.module) p.push('module missing');
  if (!e.lernfeld || !Object.keys(e.lernfeld).length) p.push('lernfeld mapping missing');
  if (!(e.difficulty >= 1 && e.difficulty <= 5)) p.push('difficulty must be 1..5');
  if (!e.source) p.push('source note missing');
  l(e.title, 'title');
  l(e.situation, 'situation');
  l(e.takeaway, 'takeaway');
  if (!e.steps?.length) p.push('at least one step required');
  e.steps?.forEach((s, i) => {
    l(s.prompt, `step ${i} prompt`);
    l(s.why, `step ${i} why`);
    if (!s.formula) p.push(`step ${i}: formula missing`);
    if (typeof s.answer !== 'number' || !(s.tolerance >= 0)) p.push(`step ${i}: answer/tolerance invalid`);
    const r = calcResult(s.calc ?? '');
    if (r === null || Math.abs(r - s.answer) > s.tolerance + 1e-9) p.push(`step ${i}: worked calculation ends in ${r}, stored answer is ${s.answer}`);
  });
  return p;
}
