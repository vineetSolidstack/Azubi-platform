// Vernier caliper (Messschieber) with a 1/20 vernier: 20 divisions over 39 mm, reading 0.05 mm.
// Pure functions, no UI. All maths is done in hundredths of a millimetre to avoid rounding errors.

export const VERNIER_DIVISIONS = 20;
/** distance between two vernier ticks in hundredths of a millimetre (1.95 mm) */
const TICK_H = 195;

export type ReviewStatus = 'draft' | 'self_checked' | 'verified';
export interface CaliperTask {
  id: string;
  /** set measurement in mm, a multiple of 0.05 */
  value: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  status: ReviewStatus;
}

export interface CaliperReading {
  /** whole millimetres left of the vernier zero tick */
  mainMm: number;
  /** number of the vernier tick that lines up with a main-scale tick (0..19) */
  vernierIndex: number;
  /** vernierIndex · 0.05 mm */
  vernierMm: number;
}

const hundredths = (mm: number) => Math.round(mm * 100);

export function readCaliper(valueMm: number): CaliperReading {
  const h = hundredths(valueMm);
  const vernierIndex = (h % 100) / 5;
  return { mainMm: Math.floor(h / 100), vernierIndex, vernierMm: (vernierIndex * 5) / 100 };
}

/** Position in mm of vernier tick k on the main scale. */
export const vernierTickMm = (valueMm: number, k: number) => (hundredths(valueMm) + k * TICK_H) / 100;

/** Vernier ticks that coincide exactly with a main-scale tick. */
export function alignedTicks(valueMm: number): number[] {
  const h = hundredths(valueMm);
  const out: number[] = [];
  for (let k = 0; k <= VERNIER_DIVISIONS; k++) if ((h + k * TICK_H) % 100 === 0) out.push(k);
  return out;
}

export function checkReading(valueMm: number, answer: number | null): { ok: boolean; mainOk: boolean } {
  if (answer === null) return { ok: false, mainOk: false };
  return { ok: hundredths(answer) === hundredths(valueMm), mainOk: Math.floor(answer + 1e-9) === readCaliper(valueMm).mainMm };
}

export function validateCaliperTask(t: CaliperTask): string[] {
  const p: string[] = [];
  if (!/^[a-z0-9-]+$/.test(t.id ?? '')) p.push('bad id');
  if (!['draft', 'self_checked', 'verified'].includes(t.status)) p.push('bad status');
  if (!(t.difficulty >= 1 && t.difficulty <= 5)) p.push('difficulty must be 1..5');
  if (!(t.value > 0 && t.value <= 150) || hundredths(t.value) % 5 !== 0) p.push('value must be a multiple of 0.05 between 0 and 150 mm');
  return p;
}
