// Quiz questions are data. Checking is deterministic: the stored solution decides, never an AI.

export type L10n = { de: string; en: string };
export type ReviewStatus = 'draft' | 'self_checked' | 'verified';

interface Base {
  id: string;
  module: string;
  status: ReviewStatus;
  question: L10n;
  explanation: L10n;
  /** where the idea comes from (own wording; names of standards only) */
  source: string;
}
export type Question =
  | (Base & { type: 'single'; options: L10n[]; correct: number })
  | (Base & { type: 'multiple'; options: L10n[]; correct: number[] })
  | (Base & { type: 'numeric'; answer: number; tolerance: number; unit?: string })
  | (Base & { type: 'text'; accepted: string[] })
  | (Base & { type: 'order'; items: L10n[] });

export type Answer = number | number[] | string;

/** Accepts German and English number formats: "3,5" and "3.5". */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  return parseFloat(t);
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * single: index of the chosen option. multiple: chosen indices.
 * numeric / text: the typed text. order: item indices in the order the learner put them.
 */
export function checkAnswer(q: Question, a: Answer): boolean {
  switch (q.type) {
    case 'single':
      return a === q.correct;
    case 'multiple':
      return Array.isArray(a) && a.length === q.correct.length && q.correct.every((c) => a.includes(c));
    case 'numeric': {
      const n = typeof a === 'string' ? parseNumber(a) : null;
      return n !== null && Math.abs(n - q.answer) <= q.tolerance + 1e-9;
    }
    case 'text':
      return typeof a === 'string' && q.accepted.some((x) => norm(x) === norm(a));
    case 'order':
      return Array.isArray(a) && a.length === q.items.length && a.every((v, i) => v === i);
  }
}

/** Deterministic shuffle so that a question looks the same on every visit. */
export function shuffledIndices(n: number, seed: string): number[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9;
    const j = (h >>> 0) % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  // never present an ordering question already solved
  if (n > 1 && idx.every((v, i) => v === i)) idx.push(idx.shift()!);
  return idx;
}

export function validateQuestion(q: Question): string[] {
  const p: string[] = [];
  const l = (x: L10n | undefined, w: string) => {
    if (!x?.de || !x?.en) p.push(`${w}: de and en required`);
  };
  if (!/^[a-z0-9-]+$/.test(q.id ?? '')) p.push('bad id');
  if (!['draft', 'self_checked', 'verified'].includes(q.status)) p.push('bad status');
  if (!q.module) p.push('module missing');
  if (!q.source) p.push('source note missing');
  l(q.question, 'question');
  l(q.explanation, 'explanation');
  if (q.type === 'single' || q.type === 'multiple') {
    q.options.forEach((o, i) => l(o, `option ${i}`));
    const c = q.type === 'single' ? [q.correct] : q.correct;
    if (!c.length || c.some((i) => !(i >= 0 && i < q.options.length))) p.push('correct index out of range');
    if (new Set(c).size !== c.length) p.push('duplicate correct index');
  } else if (q.type === 'numeric') {
    if (typeof q.answer !== 'number' || !(q.tolerance >= 0)) p.push('numeric answer/tolerance invalid');
  } else if (q.type === 'text') {
    if (!q.accepted?.length) p.push('accepted answers missing');
  } else if (q.type === 'order') {
    if (!(q.items?.length >= 2)) p.push('order needs at least 2 items');
    q.items?.forEach((o, i) => l(o, `item ${i}`));
  } else p.push('unknown type');
  return p;
}
