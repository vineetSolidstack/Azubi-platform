// Theory lessons are data: one lesson per module, split into short sections.

export type L10n = { de: string; en: string };
export interface LessonSection {
  heading: L10n;
  /** paragraphs separated by a blank line */
  body: L10n;
  formulas: string[];
  /** the one sentence to remember */
  remember: L10n;
}
export interface Lesson {
  module: string;
  status: 'draft' | 'self_checked' | 'verified';
  source: string;
  intro: L10n;
  sections: LessonSection[];
}

export function validateLesson(l: Lesson): string[] {
  const p: string[] = [];
  const ok = (x: L10n | undefined, w: string) => {
    if (!x?.de || !x?.en) p.push(`${w}: de and en required`);
  };
  if (!/^M\d\d$/.test(l.module ?? '')) p.push('bad module');
  if (!['draft', 'self_checked', 'verified'].includes(l.status)) p.push('bad status');
  if (!l.source) p.push('source note missing');
  ok(l.intro, 'intro');
  if (!l.sections?.length) p.push('no sections');
  l.sections?.forEach((s, i) => {
    ok(s.heading, `section ${i} heading`);
    ok(s.body, `section ${i} body`);
    ok(s.remember, `section ${i} remember`);
    if (!Array.isArray(s.formulas)) p.push(`section ${i}: formulas must be a list`);
  });
  return p;
}
