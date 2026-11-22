import { describe, expect, it } from 'vitest';
import { exercises } from '../../content/exercises';
import { calcResult, checkStep, ExerciseStep, localizeNumbers, validateExercise } from './exercise';

const step: ExerciseStep = { prompt: { de: 'a', en: 'a' }, unit: 'A', answer: 0.25, tolerance: 0.005, formula: 'I = U / R', calc: 'I = 12 V / 48 Ω = 0.25 A', why: { de: 'w', en: 'w' } };

describe('exercise steps', () => {
  it('accepts comma and point within the tolerance', () => {
    expect(checkStep(step, '0,25')).toBe(true);
    expect(checkStep(step, '0.254')).toBe(true);
    expect(checkStep(step, '0.26')).toBe(false);
    expect(checkStep(step, '250')).toBe(false);
    expect(checkStep(step, '')).toBe(false);
  });
  it('reads the result of a worked calculation', () => {
    expect(calcResult(step.calc)).toBe(0.25);
    expect(calcResult('I = 13 V / 650 Ω = 0.02 A = 20 mA')).toBe(20);
    expect(calcResult('no numbers')).toBeNull();
  });
  it('writes numbers with a decimal comma in German', () => {
    expect(localizeNumbers('R = 230 V / 4.6 A = 50 Ω', 'de')).toBe('R = 230 V / 4,6 A = 50 Ω');
    expect(localizeNumbers('4.6 A', 'en')).toBe('4.6 A');
  });
});

describe('exercise bank', () => {
  it('has unique ids', () => {
    expect(new Set(exercises.map((e) => e.id)).size).toBe(exercises.length);
  });
  for (const e of exercises) it(`${e.id} is valid and its worked solution matches the stored answers`, () => expect(validateExercise(e)).toEqual([]));
});
