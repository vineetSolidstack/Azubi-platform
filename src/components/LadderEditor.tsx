'use client';
import { useState } from 'react';
import { isTimerKind, LadderContact, LadderOutKind, LadderRung, Task, Value } from '@/engine/plc';
import { useT } from '@/lib/progress';

type Sel = { ri: number; kind: 'out' } | { ri: number; kind: 'c'; gi: number; bi: number; ci: number } | null;

const boolVars = (task: Task) => task.variables.filter((v) => v.type === 'BOOL');
// prefer a plain push-button or switch: a normally closed stop button would switch the output on at once
const firstIn = (task: Task) =>
  (boolVars(task).find((v) => v.dir === 'in' && !v.nc && !v.role) ?? boolVars(task).find((v) => v.dir === 'in') ?? boolVars(task)[0]).name;
const firstOut = (task: Task) => boolVars(task).find((v) => v.dir !== 'in')?.name ?? boolVars(task)[0].name;

export const newRung = (task: Task): LadderRung => ({ groups: [[[{ v: firstIn(task) }]]], out: { kind: 'coil', v: firstOut(task) } });

const OUT_KINDS: { kind: LadderOutKind; de: string; en: string }[] = [
  { kind: 'coil', de: '( ) Spule: Ausgang folgt dem Strompfad', en: '( ) Coil: output follows the current path' },
  { kind: 'set', de: '(S) Setzen: bleibt 1, bis zurückgesetzt wird', en: '(S) Set: stays 1 until it is reset' },
  { kind: 'reset', de: '(R) Rücksetzen: schaltet auf 0', en: '(R) Reset: switches to 0' },
  { kind: 'TON', de: 'TON Einschaltverzögerung', en: 'TON on-delay' },
  { kind: 'TOF', de: 'TOF Ausschaltverzögerung', en: 'TOF off-delay' },
  { kind: 'TP', de: 'TP Impuls', en: 'TP pulse' },
];

export function LadderEditor({
  task,
  rungs,
  onChange,
  read,
}: {
  task: Task;
  rungs: LadderRung[];
  onChange: (r: LadderRung[]) => void;
  /** live value of a variable or block output, undefined when the simulation is stopped */
  read: (name: string) => Value | undefined;
}) {
  const { t } = useT();
  const [sel, setSel] = useState<Sel>(null);
  const edit = (fn: (draft: LadderRung[]) => void) => {
    const draft: LadderRung[] = JSON.parse(JSON.stringify(rungs));
    fn(draft);
    onChange(draft);
  };
  const timers = [...new Set(rungs.filter((r) => isTimerKind(r.out.kind)).map((r) => r.out.v))];
  const freshTimer = () => {
    let n = 1;
    while (timers.includes(`T${n}`) || task.variables.some((v) => v.name === `T${n}`)) n++;
    return `T${n}`;
  };
  const groupLabel = (dir: string) =>
    dir === 'in' ? t({ de: 'Eingänge', en: 'Inputs' }) : dir === 'out' ? t({ de: 'Ausgänge', en: 'Outputs' }) : t({ de: 'Merker', en: 'Memory' });
  const varOptions = (dirs: string[]) =>
    dirs.map((dir) => {
      const vs = boolVars(task).filter((v) => v.dir === dir);
      return vs.length ? (
        <optgroup key={dir} label={groupLabel(dir)}>
          {vs.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name}: {t(v.comment)}
            </option>
          ))}
        </optgroup>
      ) : null;
    });

  return (
    <div className="ladder">
      {rungs.map((r, ri) => {
        const cur = sel?.ri === ri ? sel : null;
        const contact: LadderContact | undefined = cur?.kind === 'c' ? r.groups[cur.gi]?.[cur.bi]?.[cur.ci] : undefined;
        const outLive = isTimerKind(r.out.kind) ? read(`${r.out.v}.Q`) : read(r.out.v);
        return (
          <div className="rung-card" key={ri}>
            <div className="rung-head">
              <b>
                {t({ de: 'Netzwerk', en: 'Network' })} {ri + 1}
              </b>
              <button
                className="link danger"
                onClick={() => {
                  setSel(null);
                  edit((d) => d.splice(ri, 1));
                }}
              >
                {t({ de: 'Netzwerk löschen', en: 'Delete network' })}
              </button>
            </div>
            <div className="rung-scroll">
              <div className="rung">
                <span className="rail" />
                {r.groups.map((g, gi) => (
                  <div className={g.length > 1 ? 'group par' : 'group'} key={gi}>
                    {g.map((b, bi) => (
                      <div className="branch" key={bi}>
                        {b.map((c, ci) => {
                          const v = read(c.v);
                          const conducts = v === undefined ? false : !!v !== !!c.neg;
                          const isSel = cur?.kind === 'c' && cur.gi === gi && cur.bi === bi && cur.ci === ci;
                          return (
                            <button
                              key={ci}
                              className={`contact${conducts ? ' live' : ''}${isSel ? ' sel' : ''}`}
                              onClick={() => setSel(isSel ? null : { ri, kind: 'c', gi, bi, ci })}
                              aria-label={`${c.neg ? t({ de: 'Öffner', en: 'NC contact' }) : t({ de: 'Schließer', en: 'NO contact' })} ${c.v}`}
                            >
                              <span className="cname">{c.v}</span>
                              <i className="w" />
                              <span className={c.neg ? 'csym nc' : 'csym'} />
                              <i className="w" />
                            </button>
                          );
                        })}
                        <i className="w fill" />
                      </div>
                    ))}
                  </div>
                ))}
                <i className="w fill" />
                <button
                  className={`contact out${outLive ? ' live' : ''}${cur?.kind === 'out' ? ' sel' : ''}`}
                  onClick={() => setSel(cur?.kind === 'out' ? null : { ri, kind: 'out' })}
                >
                  <span className="cname">{r.out.v}</span>
                  <i className="w" />
                  {isTimerKind(r.out.kind) ? (
                    <span className="tbox">
                      {r.out.kind} {(r.out.ptMs ?? 0) / 1000} s
                    </span>
                  ) : (
                    <span className="coil">{r.out.kind === 'coil' ? '' : r.out.kind === 'set' ? 'S' : 'R'}</span>
                  )}
                </button>
              </div>
            </div>

            {cur?.kind === 'c' && contact && (
              <div className="rung-edit">
                <label>
                  {t({ de: 'Variable', en: 'Variable' })}
                  <select value={contact.v} onChange={(e) => edit((d) => void (d[ri].groups[cur.gi][cur.bi][cur.ci].v = e.target.value))}>
                    {varOptions(['in', 'out', 'mem'])}
                    {timers.length > 0 && (
                      <optgroup label={t({ de: 'Zeitglieder', en: 'Timers' })}>
                        {timers.map((n) => (
                          <option key={n} value={`${n}.Q`}>
                            {n}.Q
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </label>
                <div className="seg" role="group" aria-label={t({ de: 'Art des Kontakts', en: 'Type of contact' })}>
                  <button className={!contact.neg ? 'on' : ''} onClick={() => edit((d) => void (d[ri].groups[cur.gi][cur.bi][cur.ci].neg = false))}>
                    {t({ de: 'Schließer (leitet bei 1)', en: 'NO (conducts at 1)' })}
                  </button>
                  <button className={contact.neg ? 'on' : ''} onClick={() => edit((d) => void (d[ri].groups[cur.gi][cur.bi][cur.ci].neg = true))}>
                    {t({ de: 'Öffner (leitet bei 0)', en: 'NC (conducts at 0)' })}
                  </button>
                </div>
                <div className="row">
                  <button
                    className="btn small"
                    onClick={() =>
                      edit((d) => {
                        const g = d[ri].groups[cur.gi];
                        const fresh = { v: firstIn(task) };
                        if (g.length > 1) {
                          g[cur.bi].splice(cur.ci + 1, 0, fresh);
                          setSel({ ...cur, ci: cur.ci + 1 });
                        } else {
                          d[ri].groups.splice(cur.gi + 1, 0, [[fresh]]);
                          setSel({ ri, kind: 'c', gi: cur.gi + 1, bi: 0, ci: 0 });
                        }
                      })
                    }
                  >
                    {t({ de: '+ Kontakt dahinter (UND)', en: '+ Contact after it (AND)' })}
                  </button>
                  <button
                    className="btn small"
                    onClick={() =>
                      edit((d) => {
                        const g = d[ri].groups[cur.gi];
                        g.push([{ v: firstOut(task) }]);
                        setSel({ ri, kind: 'c', gi: cur.gi, bi: g.length - 1, ci: 0 });
                      })
                    }
                  >
                    {t({ de: '+ Kontakt parallel (ODER)', en: '+ Contact in parallel (OR)' })}
                  </button>
                  <button
                    className="btn small danger"
                    onClick={() => {
                      setSel(null);
                      edit((d) => {
                        const gs = d[ri].groups;
                        gs[cur.gi][cur.bi].splice(cur.ci, 1);
                        if (!gs[cur.gi][cur.bi].length) gs[cur.gi].splice(cur.bi, 1);
                        if (!gs[cur.gi].length) gs.splice(cur.gi, 1);
                      });
                    }}
                  >
                    {t({ de: 'Kontakt löschen', en: 'Delete contact' })}
                  </button>
                </div>
              </div>
            )}

            {cur?.kind === 'out' && (
              <div className="rung-edit">
                <label>
                  {t({ de: 'Art', en: 'Type' })}
                  <select
                    value={r.out.kind}
                    onChange={(e) =>
                      edit((d) => {
                        const kind = e.target.value as LadderOutKind;
                        const was = isTimerKind(d[ri].out.kind);
                        if (isTimerKind(kind) && !was) d[ri].out = { kind, v: freshTimer(), ptMs: 3000 };
                        else if (!isTimerKind(kind) && was) d[ri].out = { kind, v: firstOut(task) };
                        else d[ri].out.kind = kind;
                      })
                    }
                  >
                    {OUT_KINDS.map((k) => (
                      <option key={k.kind} value={k.kind}>
                        {t(k)}
                      </option>
                    ))}
                  </select>
                </label>
                {isTimerKind(r.out.kind) ? (
                  <>
                    <label>
                      {t({ de: 'Name', en: 'Name' })}
                      <input className="short" value={r.out.v} onChange={(e) => edit((d) => void (d[ri].out.v = e.target.value.replace(/[^A-Za-z0-9_]/g, '')))} />
                    </label>
                    <label>
                      {t({ de: 'Zeit in Sekunden', en: 'Time in seconds' })}
                      <input
                        className="short"
                        type="number"
                        min={0}
                        step={0.1}
                        value={(r.out.ptMs ?? 0) / 1000}
                        onChange={(e) => edit((d) => void (d[ri].out.ptMs = Math.max(0, Math.round(parseFloat(e.target.value || '0') * 1000))))}
                      />
                    </label>
                    <p className="muted small">
                      {t({
                        de: `Den Ausgang des Zeitglieds fragst du in einem anderen Netzwerk mit dem Kontakt ${r.out.v}.Q ab.`,
                        en: `You query the output of the timer in another network with the contact ${r.out.v}.Q.`,
                      })}
                    </p>
                  </>
                ) : (
                  <label>
                    {t({ de: 'Variable', en: 'Variable' })}
                    <select value={r.out.v} onChange={(e) => edit((d) => void (d[ri].out.v = e.target.value))}>
                      {varOptions(['out', 'mem'])}
                    </select>
                  </label>
                )}
              </div>
            )}

            {!cur && (
              <div className="rung-tools">
                <button
                  className="btn small"
                  onClick={() =>
                    edit((d) => {
                      d[ri].groups.push([[{ v: firstIn(task) }]]);
                      setSel({ ri, kind: 'c', gi: d[ri].groups.length - 1, bi: 0, ci: 0 });
                    })
                  }
                >
                  {t({ de: '+ Kontakt', en: '+ Contact' })}
                </button>
                <span className="muted small">{t({ de: 'Tipp: Klicke auf einen Kontakt oder die Spule, um sie zu ändern.', en: 'Tip: click a contact or the coil to change it.' })}</span>
              </div>
            )}
          </div>
        );
      })}
      <button className="btn" onClick={() => onChange([...rungs, newRung(task)])}>
        {t({ de: '+ Netzwerk', en: '+ Network' })}
      </button>
    </div>
  );
}
