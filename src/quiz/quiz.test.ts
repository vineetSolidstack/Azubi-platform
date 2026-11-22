import { describe, expect, it } from 'vitest';
import { questions } from '../../content/quiz';
import { checkAnswer, parseNumber, Question, shuffledIndices, validateQuestion } from './quiz';

const base = { id: 'x', module: 'M00', status: 'draft' as const, source: 's', question: { de: 'f', en: 'q' }, explanation: { de: 'e', en: 'e' } };
const opts = [0, 1, 2].map((i) => ({ de: `o${i}`, en: `o${i}` }));

describe('checkAnswer', () => {
  it('single choice', () => {
    const q: Question = { ...base, type: 'single', options: opts, correct: 1 };
    expect(checkAnswer(q, 1)).toBe(true);
    expect(checkAnswer(q, 0)).toBe(false);
  });
  it('multiple choice needs exactly the right set', () => {
    const q: Question = { ...base, type: 'multiple', options: opts, correct: [0, 2] };
    expect(checkAnswer(q, [2, 0])).toBe(true);
    expect(checkAnswer(q, [0])).toBe(false);
    expect(checkAnswer(q, [0, 1, 2])).toBe(false);
  });
  it('numeric with tolerance, comma or point', () => {
    const q: Question = { ...base, type: 'numeric', answer: 3.5, tolerance: 0.05 };
    expect(checkAnswer(q, '3,5')).toBe(true);
    expect(checkAnswer(q, ' 3.54 ')).toBe(true);
    expect(checkAnswer(q, '3.6')).toBe(false);
    expect(checkAnswer(q, 'abc')).toBe(false);
    expect(checkAnswer(q, '')).toBe(false);
    expect(parseNumber('3,5 V')).toBeNull();
  });
  it('short text ignores case and extra spaces', () => {
    const q: Question = { ...base, type: 'text', accepted: ['Verarbeitung'] };
    expect(checkAnswer(q, '  verarbeitung ')).toBe(true);
    expect(checkAnswer(q, 'Ausgabe')).toBe(false);
  });
  it('ordered steps', () => {
    const q: Question = { ...base, type: 'order', items: opts };
    expect(checkAnswer(q, [0, 1, 2])).toBe(true);
    expect(checkAnswer(q, [1, 0, 2])).toBe(false);
  });
});

describe('shuffledIndices', () => {
  it('is a stable permutation and never already sorted', () => {
    for (const seed of ['a', 'b', 'm07-q01', 'm05-q07']) {
      const s = shuffledIndices(3, seed);
      expect([...s].sort()).toEqual([0, 1, 2]);
      expect(s).toEqual(shuffledIndices(3, seed));
      expect(s).not.toEqual([0, 1, 2]);
    }
  });
});

describe('question bank', () => {
  it('has unique ids', () => {
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
  });
  for (const q of questions) it(`${q.id} is valid`, () => expect(validateQuestion(q)).toEqual([]));
});
