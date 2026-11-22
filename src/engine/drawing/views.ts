// Orthographic views of simple solids (technical drawing, projection method 1).
// A solid is a height map: heights[y][x] = number of cubes stacked at column x, row y.
// Row y = 0 is the FRONT of the solid, x = 0 is its LEFT side as seen from the front.
// Pure functions, no UI.

export type L10n = { de: string; en: string };
export type ReviewStatus = 'draft' | 'self_checked' | 'verified';
export type ViewId = 'front' | 'left' | 'top';
export const VIEW_IDS: ViewId[] = ['front', 'left', 'top'];

export interface Solid {
  id: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  status: ReviewStatus;
  title: L10n;
  /** rows from front to back, each row from left to right */
  heights: number[][];
}

export interface ViewGrid {
  cols: number;
  rows: number;
  /** depth[r][c]: distance of the visible surface from the viewer, null where nothing is seen. Row 0 is the top of the drawing. */
  depth: (number | null)[][];
}

export const solidSize = (s: Solid) => ({ nx: s.heights[0].length, ny: s.heights.length, nz: Math.max(1, ...s.heights.flat()) });

/**
 * The view as it is placed on the drawing sheet in projection method 1:
 * - front: seen from the front; left of the solid is left on the sheet
 * - left:  side view from the left (drawn to the right of the front view); the back of the solid is on the left of this view
 * - top:   seen from above (drawn below the front view); the back of the solid is at the top of this view
 */
export function viewGrid(s: Solid, view: ViewId): ViewGrid {
  const { nx, ny, nz } = solidSize(s);
  const h = (x: number, y: number) => s.heights[y][x];
  const first = (n: number, hit: (i: number) => boolean) => {
    for (let i = 0; i < n; i++) if (hit(i)) return i;
    return null;
  };
  if (view === 'front')
    return { cols: nx, rows: nz, depth: Array.from({ length: nz }, (_, r) => Array.from({ length: nx }, (_, c) => first(ny, (y) => h(c, y) > nz - 1 - r))) };
  if (view === 'left')
    return { cols: ny, rows: nz, depth: Array.from({ length: nz }, (_, r) => Array.from({ length: ny }, (_, c) => first(nx, (x) => h(x, ny - 1 - c) > nz - 1 - r))) };
  return { cols: nx, rows: ny, depth: Array.from({ length: ny }, (_, r) => Array.from({ length: nx }, (_, c) => (h(c, ny - 1 - r) > 0 ? nz - h(c, ny - 1 - r) : null))) };
}

/** Grid segment keys: "h:c:r" = horizontal line above row r in column c, "v:c:r" = vertical line left of column c in row r. */
export const hKey = (c: number, r: number) => `h:${c}:${r}`;
export const vKey = (c: number, r: number) => `v:${c}:${r}`;

/**
 * All visible edges of a view. For solids made of cubes every visible face is parallel to the
 * drawing plane, so an edge is seen exactly where the visible depth changes (or the solid ends).
 */
export function visibleEdges(g: ViewGrid): Set<string> {
  const d = (c: number, r: number) => (c < 0 || r < 0 || c >= g.cols || r >= g.rows ? null : g.depth[r][c]);
  const out = new Set<string>();
  for (let r = 0; r <= g.rows; r++) for (let c = 0; c < g.cols; c++) if (d(c, r - 1) !== d(c, r)) out.add(hKey(c, r));
  for (let r = 0; r < g.rows; r++) for (let c = 0; c <= g.cols; c++) if (d(c - 1, r) !== d(c, r)) out.add(vKey(c, r));
  return out;
}

export interface ViewCheck {
  ok: boolean;
  missing: number;
  extra: number;
}
export function checkView(s: Solid, view: ViewId, drawn: Iterable<string>): ViewCheck {
  const want = visibleEdges(viewGrid(s, view));
  const got = new Set(drawn);
  let missing = 0;
  let extra = 0;
  for (const k of want) if (!got.has(k)) missing++;
  for (const k of got) if (!want.has(k)) extra++;
  return { ok: missing === 0 && extra === 0, missing, extra };
}

export function validateSolid(s: Solid): string[] {
  const p: string[] = [];
  if (!/^[a-z0-9-]+$/.test(s.id ?? '')) p.push('bad id');
  if (!['draft', 'self_checked', 'verified'].includes(s.status)) p.push('bad status');
  if (!(s.difficulty >= 1 && s.difficulty <= 5)) p.push('difficulty must be 1..5');
  if (!s.title?.de || !s.title?.en) p.push('title: de and en required');
  const w = s.heights?.[0]?.length ?? 0;
  if (!w || s.heights.some((row) => row.length !== w)) p.push('heights must be a rectangle');
  else {
    if (s.heights.flat().some((v) => !Number.isInteger(v) || v < 0 || v > 5)) p.push('heights must be whole numbers 0..5');
    if (w > 5 || s.heights.length > 5) p.push('at most 5 x 5 columns');
    if (!s.heights.flat().some((v) => v > 0)) p.push('solid is empty');
  }
  return p;
}
