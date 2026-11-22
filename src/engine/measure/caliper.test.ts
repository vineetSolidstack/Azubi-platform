import { describe, expect, it } from 'vitest';
import { caliperTasks } from '../../../content/measure';
import { alignedTicks, checkReading, readCaliper, validateCaliperTask, vernierTickMm } from './caliper';

describe('vernier caliper', () => {
  it('splits a value into main scale and vernier reading', () => {
    expect(readCaliper(23.35)).toEqual({ mainMm: 23, vernierIndex: 7, vernierMm: 0.35 });
    expect(readCaliper(20)).toEqual({ mainMm: 20, vernierIndex: 0, vernierMm: 0 });
    expect(readCaliper(99.95)).toEqual({ mainMm: 99, vernierIndex: 19, vernierMm: 0.95 });
  });
  it('exactly the tick of the reading lines up with the main scale, for every possible value', () => {
    for (let h = 5; h <= 15000; h += 5) {
      const v = h / 100;
      const { vernierIndex } = readCaliper(v);
      expect(alignedTicks(v)).toEqual(vernierIndex === 0 ? [0, 20] : [vernierIndex]);
      expect(Number.isInteger(vernierTickMm(v, vernierIndex))).toBe(true);
    }
  });
  it('checks an answer and recognises a correct whole-millimetre part', () => {
    expect(checkReading(23.35, 23.35)).toEqual({ ok: true, mainOk: true });
    expect(checkReading(23.35, 23.3)).toEqual({ ok: false, mainOk: true });
    expect(checkReading(23.35, 24.35)).toEqual({ ok: false, mainOk: false });
    expect(checkReading(23.35, null)).toEqual({ ok: false, mainOk: false });
  });
  it('task file is valid', () => {
    expect(new Set(caliperTasks.map((t) => t.id)).size).toBe(caliperTasks.length);
    for (const t of caliperTasks) expect(validateCaliperTask(t)).toEqual([]);
  });
});
