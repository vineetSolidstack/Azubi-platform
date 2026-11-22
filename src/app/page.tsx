'use client';
import Link from 'next/link';
import { lernfelder, modules, TradeId, trades } from '@content/curriculum';
import { exercisesOf } from '@content/exercises';
import { solids } from '@content/drawing';
import { caliperTasks } from '@content/measure';
import { questionsOf } from '@content/quiz';
import { tasks } from '@content/tasks';
import { lessonOf } from '@content/theory';
import { Bar } from '@/components/Shell';
import { updateProgress, useHydrated, useProgress, useT } from '@/lib/progress';

export default function Home() {
  const { t } = useT();
  const p = useProgress();
  const ready = useHydrated();
  const trade = trades.find((x) => x.id === p.trade);
  const setTrade = (id: TradeId | null) => updateProgress((x) => ({ ...x, trade: id }));

  if (!ready) return null;
  if (!trade)
    return (
      <div className="page narrow">
        <h1>{t({ de: 'Willkommen! Was lernst du?', en: 'Welcome! What are you training for?' })}</h1>
        <p className="lead">
          {t({
            de: 'Wähle deinen Beruf. Dann siehst du die Inhalte in der Reihenfolge deiner Lernfelder aus der Berufsschule. Du kannst das später ändern.',
            en: 'Choose your trade. You will then see the content in the order of your Lernfelder (learning fields) at vocational school. You can change this later.',
          })}
        </p>
        <div className="choices">
          {trades.map((tr) => (
            <button key={tr.id} className="choice" onClick={() => setTrade(tr.id)}>
              <strong>{tr.name.de}</strong>
              {p.lang === 'en' && <span>{tr.name.en}</span>}
            </button>
          ))}
        </div>
      </div>
    );

  const solved = (id: string) => !!p.tasks[id]?.solved;
  const next = tasks.find((x) => !solved(x.id));
  const stats = (m: string) => {
    const ts = tasks.filter((x) => x.module === m);
    const qs = questionsOf(m);
    const es = exercisesOf(m);
    const ms = m === 'M14' ? caliperTasks : [];
    const ds = m === 'M14' ? solids : [];
    return { ts, qs, es, ms, ds, dDone: ds.filter((x) => p.drawing[x.id]).length, mDone: ms.filter((x) => p.measure[x.id]).length, eDone: es.filter((e) => p.exercises[e.id]).length, tDone: ts.filter((x) => solved(x.id)).length, qDone: qs.filter((q) => p.quiz[q.id]).length };
  };
  const years = [...new Set(lernfelder[trade.id].map((l) => l.year))];

  return (
    <div className="page">
      <div className="hello">
        <div>
          <h1>{t({ de: 'Dein Lernplan', en: 'Your learning plan' })}</h1>
          <p className="muted">
            {trade.name.de}{' '}
            <button className="link" onClick={() => setTrade(null)}>
              {t({ de: 'Beruf ändern', en: 'Change trade' })}
            </button>
          </p>
        </div>
        {next ? (
          <Link className="btn primary big" href={`/sps/${next.id}`}>
            <small>{Object.keys(p.tasks).length ? t({ de: 'Weiter üben', en: 'Continue practising' }) : t({ de: 'Hier starten', en: 'Start here' })}</small>
            {t(next.title)} →
          </Link>
        ) : (
          <Link className="btn primary big" href="/quiz">
            <small>{t({ de: 'Alle SPS-Aufgaben gelöst!', en: 'All PLC tasks solved!' })}</small>
            {t({ de: 'Zum Quiz', en: 'Go to the quiz' })} →
          </Link>
        )}
      </div>

      {years.map((y) => (
        <section key={y}>
          <h2>{t({ de: `${y}. Ausbildungsjahr`, en: `Year ${y}` })}</h2>
          <div className="lf-list">
            {lernfelder[trade.id]
              .filter((l) => l.year === y)
              .map((l) => (
                <article key={l.lf} className="lf">
                  <h3>
                    <span className="lf-no">LF {l.lf}</span> {l.title}
                  </h3>
                  {l.modules.length === 0 && <p className="muted small">{t({ de: 'Projektarbeit im Betrieb', en: 'Project work in the company' })}</p>}
                  <ul className="mods">
                    {l.modules.map((m) => {
                      const s = stats(m);
                      const live = s.ts.length + s.qs.length + s.es.length + s.ms.length + s.ds.length > 0 || !!lessonOf(m);
                      return (
                        <li key={m} className={live ? 'mod' : 'mod soon'}>
                          <span className="mod-name">{t(modules[m])}</span>
                          {live ? (
                            <span className="mod-actions">
                              {s.ts.length > 0 && (
                                <Link href="/sps" className="chip">
                                  {t({ de: 'Simulator', en: 'Simulator' })} {s.tDone}/{s.ts.length}
                                  <Bar done={s.tDone} total={s.ts.length} />
                                </Link>
                              )}
                              {lessonOf(m) && (
                                <Link href={`/theorie/${m}`} className="chip">
                                  {p.theory[m] ? '✓ ' : ''}
                                  {t({ de: 'Theorie', en: 'Theory' })}
                                  <Bar done={p.theory[m] ? 1 : 0} total={1} />
                                </Link>
                              )}
                              {s.ds.length > 0 && (
                                <Link href="/zeichnen" className="chip">
                                  {t({ de: 'Ansichten', en: 'Views' })} {s.dDone}/{s.ds.length}
                                  <Bar done={s.dDone} total={s.ds.length} />
                                </Link>
                              )}
                              {s.ms.length > 0 && (
                                <Link href="/messen" className="chip">
                                  {t({ de: 'Messschieber', en: 'Caliper' })} {s.mDone}/{s.ms.length}
                                  <Bar done={s.mDone} total={s.ms.length} />
                                </Link>
                              )}
                              {s.es.length > 0 && (
                                <Link href={`/uebungen#${m}`} className="chip">
                                  {t({ de: 'Übungen', en: 'Exercises' })} {s.eDone}/{s.es.length}
                                  <Bar done={s.eDone} total={s.es.length} />
                                </Link>
                              )}
                              {s.qs.length > 0 && (
                                <Link href={`/quiz/${m}`} className="chip">
                                  Quiz {s.qDone}/{s.qs.length}
                                  <Bar done={s.qDone} total={s.qs.length} />
                                </Link>
                              )}
                            </span>
                          ) : (
                            <span className="muted small">{t({ de: 'kommt später', en: 'coming later' })}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </article>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
