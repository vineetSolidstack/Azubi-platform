import { describe, expect, it } from 'vitest';
import { solids } from '../../../content/drawing';
import { checkView, hKey, Solid, validateSolid, VIEW_IDS, viewGrid, visibleEdges, vKey } from './views';

const solid = (heights: number[][]): Solid => ({ id: 't', difficulty: 1, status: 'draft', title: { de: 't', en: 't' }, heights });
// step: front row 1 high, back row 2 high, 3 wide
const step = solid([[1, 1, 1], [2, 2, 2]]);
// bracket: left column 3 high, rest 1 high, 2 deep
const bracket = solid([[3, 1, 1], [3, 1, 1]]);

describe('views of a solid', () => {
  it('front view of a step: a rectangle with one line where the step goes back', () => {
    const g = viewGrid(step, 'front');
    expect(g).toMatchObject({ cols: 3, rows: 2 });
    expect(g.depth).toEqual([[1, 1, 1], [0, 0, 0]]);
    const e = visibleEdges(g);
    expect(e.size).toBe(3 + 3 + 3 + 2 + 2); // top, step line, bottom, left side, right side
    for (const c of [0, 1, 2]) expect(e.has(hKey(c, 1))).toBe(true);
  });
  it('left side view of a step: an L shape with the back on the left', () => {
    const g = viewGrid(step, 'left');
    expect(g).toMatchObject({ cols: 2, rows: 2 });
    expect(g.depth).toEqual([[0, null], [0, 0]]);
    const e = visibleEdges(g);
    expect(e.has(vKey(1, 0))).toBe(true); // riser of the step
    expect(e.has(hKey(1, 1))).toBe(true); // tread of the step
    expect(e.has(hKey(1, 0))).toBe(false); // nothing above the low part
    expect(e.size).toBe(8);
  });
  it('top view of a step: the back row is at the top, one line between the two levels', () => {
    const g = viewGrid(step, 'top');
    expect(g.depth).toEqual([[0, 0, 0], [1, 1, 1]]);
    expect(visibleEdges(g).size).toBe(3 + 3 + 3 + 2 + 2);
  });
  it('front view of a bracket is an L, its left side view a rectangle without inner lines', () => {
    expect(viewGrid(bracket, 'front').depth).toEqual([[0, null, null], [0, null, null], [0, 0, 0]]);
    const left = viewGrid(bracket, 'left');
    expect(left.depth).toEqual([[0, 0], [0, 0], [0, 0]]);
    expect(visibleEdges(left).size).toBe(2 + 2 + 3 + 3);
  });
  it('a missing column leaves a gap in the top view only', () => {
    const t = solid([[0, 2, 0], [2, 2, 2]]);
    expect(viewGrid(t, 'top').depth).toEqual([[0, 0, 0], [null, 0, null]]);
    expect(viewGrid(t, 'front').depth).toEqual([[1, 0, 1], [1, 0, 1]]);
  });
  it('checks a drawing: exact, missing and extra lines', () => {
    const want = [...visibleEdges(viewGrid(step, 'front'))];
    expect(checkView(step, 'front', want)).toEqual({ ok: true, missing: 0, extra: 0 });
    expect(checkView(step, 'front', want.slice(2))).toEqual({ ok: false, missing: 2, extra: 0 });
    expect(checkView(step, 'front', [...want, vKey(1, 0)])).toEqual({ ok: false, missing: 0, extra: 1 });
    expect(checkView(step, 'front', [])).toMatchObject({ ok: false, extra: 0 });
  });
});

describe('solid files', () => {
  it('have unique ids', () => expect(new Set(solids.map((s) => s.id)).size).toBe(solids.length));
  for (const s of solids)
    it(`${s.id} is valid and every view has a closed outline`, () => {
      expect(validateSolid(s)).toEqual([]);
      for (const v of VIEW_IDS) {
        const g = viewGrid(s, v);
        const e = visibleEdges(g);
        expect(e.size).toBeGreaterThanOrEqual(4);
        // every corner point of the grid is touched by an even number of lines or by none: the lines form closed loops
        for (let r = 0; r <= g.rows; r++)
          for (let c = 0; c <= g.cols; c++) {
            const n = [hKey(c - 1, r), hKey(c, r), vKey(c, r - 1), vKey(c, r)].filter((k) => e.has(k)).length;
            expect(n === 0 || n >= 2).toBe(true);
          }
      }
    });
});
