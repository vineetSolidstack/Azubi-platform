import { describe, expect, it } from 'vitest';
import { tasks } from '../../../../content/tasks';
import { grade, solutionToScl, validateTask } from '..';

describe('task files', () => {
  it('have unique ids', () => {
    expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length);
  });
  for (const task of tasks) {
    describe(task.id, () => {
      it('is structurally valid', () => {
        expect(validateTask(task)).toEqual([]);
      });
      task.solutions.reference.forEach((s, i) =>
        it(`reference solution ${i + 1} (${s.lang}) passes every test`, () => {
          const r = grade(task, solutionToScl(s));
          expect(r.errors).toEqual([]);
          expect(r.tests.filter((t) => !t.passed)).toEqual([]);
        }),
      );
      task.solutions.wrong.forEach((s, i) =>
        it(`wrong solution ${i + 1} compiles but fails`, () => {
          const r = grade(task, solutionToScl(s));
          expect(r.errors).toEqual([]);
          expect(r.passed).toBe(false);
        }),
      );
      it('an empty program fails', () => {
        expect(grade(task, '').passed).toBe(false);
      });
    });
  }
});
