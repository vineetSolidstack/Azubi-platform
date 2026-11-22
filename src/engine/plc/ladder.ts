// Ladder diagram (KOP) as data. A rung is a series of groups; each group is a set of
// parallel branches; each branch is a series of contacts. Ladder is translated to SCL
// text so that there is exactly one execution engine.

export interface LadderContact {
  /** variable name, or a block output such as "T1.Q" */
  v: string;
  /** true = Öffner (NC contact, conducts when the variable is FALSE) */
  neg?: boolean;
}
export type LadderOutKind = 'coil' | 'set' | 'reset' | 'TON' | 'TOF' | 'TP';
export interface LadderRung {
  groups: LadderContact[][][];
  out: { kind: LadderOutKind; v: string; ptMs?: number };
}

export const isTimerKind = (k: LadderOutKind) => k === 'TON' || k === 'TOF' || k === 'TP';

export function rungCondition(rung: LadderRung): string {
  const chain = (b: LadderContact[]) => b.map((c) => (c.neg ? 'NOT ' : '') + c.v).join(' AND ') || 'TRUE';
  return (
    rung.groups
      .filter((g) => g.length > 0)
      .map((g) => (g.length === 1 ? chain(g[0]) : `(${g.map(chain).join(' OR ')})`))
      .join(' AND ') || 'TRUE'
  );
}

export function ladderToScl(rungs: LadderRung[]): string {
  const timers = new Map<string, string>();
  for (const r of rungs) if (isTimerKind(r.out.kind) && !timers.has(r.out.v)) timers.set(r.out.v, r.out.kind);
  const lines: string[] = [];
  if (timers.size) {
    lines.push('VAR');
    for (const [name, type] of timers) lines.push(`  ${name} : ${type};`);
    lines.push('END_VAR', '');
  }
  rungs.forEach((r, i) => {
    const cond = rungCondition(r);
    lines.push(`// Netzwerk ${i + 1}`);
    switch (r.out.kind) {
      case 'coil':
        lines.push(`${r.out.v} := ${cond};`);
        break;
      case 'set':
        lines.push(`IF ${cond} THEN ${r.out.v} := TRUE; END_IF;`);
        break;
      case 'reset':
        lines.push(`IF ${cond} THEN ${r.out.v} := FALSE; END_IF;`);
        break;
      default:
        lines.push(`${r.out.v}(IN := ${cond}, PT := T#${r.out.ptMs ?? 0}ms);`);
    }
  });
  return lines.join('\n') + '\n';
}
