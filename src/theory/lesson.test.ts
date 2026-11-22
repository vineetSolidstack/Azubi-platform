import { describe, expect, it } from 'vitest';
import { modules } from '../../content/curriculum';
import { lessons } from '../../content/theory';
import { validateLesson } from './lesson';

describe('theory lessons', () => {
  it('one lesson per module at most', () => expect(new Set(lessons.map((l) => l.module)).size).toBe(lessons.length));
  for (const l of lessons)
    it(`${l.module} is valid and belongs to a known module`, () => {
      expect(validateLesson(l)).toEqual([]);
      expect(modules[l.module]).toBeDefined();
    });
});
