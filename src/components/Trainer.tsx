'use client';
import Link from 'next/link';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { tasks } from '@content/tasks';
import {
  compile, CYCLE_MS, grade, GradeResult, ladderToScl, LadderRung, Plant, plantInit, Sim, simInit, simTick,
  solutionToScl, Task, taskDecls, TestFailure, Value,
} from '@/engine/plc';
import { updateProgress, updateTask, useProgress, useT } from '@/lib/progress';
import { LadderEditor, newRung } from './LadderEditor';
import { Dots, StatusBadge } from './Shell';
import { StationView } from './StationView';

type Mode = 'kop' | 'scl';

const STARTER = { de: '// Schreibe hier dein Programm.\n\n', en: '// Write your program here.\n\n' };

export function Trainer({ task }: { task: Task }) {
  const { lang, t } = useT();
  const progress = useProgress();
  const saved = progress.tasks[task.id];
  const [mode, setMode] = useState<Mode>(saved?.lang && task.languages.includes(saved.lang) ? saved.lang : task.languages[0]);
  const [scl, setScl] = useState(saved?.scl ?? STARTER[lang]);
  const [rungs, setRungs] = useState<LadderRung[]>(saved?.rungs ?? [newRung(task)]);
  const [hints, setHints] = useState(0);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const source = mode === 'kop' ? ladderToScl(rungs) : scl;
  // text is compiled a moment after the learner stops typing, ladder edits at once
  const [live, setLive] = useState(source);
  useEffect(() => {
    const id = setTimeout(() => setLive(source), mode === 'scl' ? 500 : 0);
    return () => clearTimeout(id);
  }, [source, mode]);
  const compiled = useMemo(() => compile(live, taskDecls(task)), [live, task]);
  const program = compiled.ok ? compiled.program : null;

  // save work in progress
  useEffect(() => {
    const id = setTimeout(() => updateTask(task.id, { lang: mode, scl, rungs }), 400);
    return () => clearTimeout(id);
  }, [task.id, mode, scl, rungs]);
  useEffect(() => setResult(null), [source]);

  // live simulation: the engine runs in fixed 10 ms cycles, the screen follows in real time
  const sim = useRef<Sim | null>(null);
  const plant = useRef<Plant>(plantInit(task));
  const pressed = useRef<Record<string, boolean>>({});
  const [, redraw] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!program) {
      sim.current = null;
      redraw();
      return;
    }
    sim.current = simInit(program, task, plant.current);
    let last = performance.now();
    let acc = 0;
    const id = setInterval(() => {
      const now = performance.now();
      acc += Math.min(now - last, 250);
      last = now;
      const operator: Record<string, Value> = {};
      for (const v of task.variables) if (v.dir === 'in' && !v.role) operator[v.name] = v.type === 'BOOL' ? !!pressed.current[v.name] !== !!v.nc : 0;
      let s = sim.current!;
      for (; acc >= CYCLE_MS; acc -= CYCLE_MS) s = simTick(program, task, s, operator);
      sim.current = s;
      plant.current = s.plant;
      redraw();
    }, 40);
    return () => clearInterval(id);
  }, [program, task]);

  const resetStation = () => {
    plant.current = plantInit(task);
    pressed.current = {};
    if (program) sim.current = simInit(program, task, plant.current);
    redraw();
  };
  const read = (name: string): Value | undefined => {
    const s = sim.current;
    if (!s) return undefined;
    const [inst, field] = name.split('.');
    return field ? s.plc.inst[inst]?.[field] : s.image[name];
  };

  const check = () => {
    const r = grade(task, source);
    setResult(r);
    updateTask(task.id, { attempts: (saved?.attempts ?? 0) + 1, solved: !!saved?.solved || r.passed, lang: mode, scl, rungs });
  };

  const idx = tasks.findIndex((x) => x.id === task.id);
  const nextTask = tasks[idx + 1];
  const errors = result && result.errors.length ? result.errors : compiled.ok ? [] : compiled.errors;
  const failed = result?.tests.filter((x) => !x.passed).length ?? 0;
  const refScl = task.solutions.reference.find((s) => s.lang === 'scl');
  const refKop = task.solutions.reference.find((s) => s.lang === 'kop');
  const fmt = (v: Value) => (typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
  const secs = (ms: number) => `${(ms / 1000).toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB')} s`;
  const explain = (f: TestFailure) =>
    f.kind === 'never'
      ? t({ de: `Nach ${secs(f.at)}: ${f.note?.de ?? ''}`, en: `After ${secs(f.at)}: ${f.note?.en ?? ''}` })
      : t({
          de: `Nach ${secs(f.at)}: ${f.variable} soll ${fmt(f.expected)} sein, ist aber ${fmt(f.actual)}.`,
          en: `After ${secs(f.at)}: ${f.variable} should be ${fmt(f.expected)}, but it is ${fmt(f.actual)}.`,
        });

  return (
    <div className="page trainer">
      <p className="crumbs">
        <Link href="/sps">← {t({ de: 'Alle Aufgaben', en: 'All tasks' })}</Link>
        <span className="muted">
          {t({ de: 'Aufgabe', en: 'Task' })} {idx + 1} / {tasks.length}
        </span>
      </p>
      <div className="trainer-grid">
        <aside className="brief">
          <h1>
            {saved?.solved && <span className="tick" title={t({ de: 'gelöst', en: 'solved' })}>✓ </span>}
            {t(task.title)}
          </h1>
          <p className="row">
            <Dots n={task.difficulty} /> <StatusBadge status={task.status} />
          </p>
          <div className="card">
            <h2>{t({ de: 'Aufgabe', en: 'Task' })}</h2>
            {t(task.description)
              .split('\n\n')
              .map((para, i) => (
                <p key={i} className="pre">
                  {para}
                </p>
              ))}
          </div>
          {task.learn && (
            <details className="card learn" open={!saved?.solved}>
              <summary>{t({ de: 'Das musst du wissen', en: 'What you need to know' })}</summary>
              <p>{t(task.learn)}</p>
            </details>
          )}
          <div className="card">
            <h2>{t({ de: 'Tipps', en: 'Hints' })}</h2>
            {task.hints.slice(0, hints).map((h, i) => (
              <p key={i} className="hint">
                <b>{i + 1}.</b> {t(h)}
              </p>
            ))}
            {hints < task.hints.length ? (
              <button className="btn small" onClick={() => setHints(hints + 1)}>
                {hints === 0 ? t({ de: 'Ich brauche einen Tipp', en: 'I need a hint' }) : t({ de: 'Noch ein Tipp', en: 'One more hint' })} ({hints}/{task.hints.length})
              </button>
            ) : (
              <p className="muted small">{t({ de: 'Das waren alle Tipps.', en: 'These were all the hints.' })}</p>
            )}
          </div>
        </aside>

        <section className="work">
          <div className="card">
            <div className="card-head">
              <h2>1. {t({ de: 'Programm', en: 'Program' })}</h2>
              {task.languages.length > 1 && (
                <div className="seg" role="tablist">
                  {task.languages.map((l) => (
                    <button key={l} role="tab" aria-selected={mode === l} className={mode === l ? 'on' : ''} onClick={() => setMode(l)}>
                      {l === 'kop' ? t({ de: 'KOP (Kontaktplan)', en: 'KOP (ladder)' }) : t({ de: 'SCL (Text)', en: 'SCL (text)' })}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {mode === 'kop' ? (
              <>
                <LadderEditor task={task} rungs={rungs} onChange={setRungs} read={read} />
                <details className="as-scl">
                  <summary>{t({ de: 'So sieht dein Kontaktplan als SCL-Text aus', en: 'This is your ladder diagram as SCL text' })}</summary>
                  <pre>{source}</pre>
                </details>
              </>
            ) : (
              <>
                <textarea
                  className="code"
                  value={scl}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  rows={Math.max(10, scl.split('\n').length + 1)}
                  aria-label={t({ de: 'SCL-Programm', en: 'SCL program' })}
                  onChange={(e) => setScl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Tab' || e.shiftKey) return;
                    e.preventDefault();
                    const el = e.currentTarget;
                    const { selectionStart: a, selectionEnd: b } = el;
                    setScl(scl.slice(0, a) + '  ' + scl.slice(b));
                    requestAnimationFrame(() => el.setSelectionRange(a + 2, a + 2));
                  }}
                />
                <details className="as-scl">
                  <summary>{t({ de: 'Spickzettel SCL', en: 'SCL cheat sheet' })}</summary>
                  <pre>{`Q1 := (S1 OR Q1) AND NOT S0;     // ${t({ de: 'Zuweisung mit :=  und ; am Ende', en: 'assignment with := and ; at the end' })}

IF S1 THEN                       // ${t({ de: 'Bedingung', en: 'condition' })}
  Q1 := TRUE;
ELSE
  Q1 := FALSE;
END_IF;

VAR                              // ${t({ de: 'eigene Variablen und Bausteine, ganz oben', en: 'your own variables and blocks, at the very top' })}
  T1 : TON;                      // TON, TOF, TP, CTU, CTD, R_TRIG, F_TRIG
  Anzahl : INT;
END_VAR

T1(IN := S1, PT := T#3s);        // ${t({ de: 'Zeitglied aufrufen', en: 'call the timer' })}
Q1 := T1.Q;                      // ${t({ de: 'Ausgang des Zeitglieds lesen', en: 'read the output of the timer' })}`}</pre>
                </details>
              </>
            )}
            {errors.map((e, i) => (
              <p className="msg error" key={i} role="alert">
                <b>
                  {mode === 'scl' ? `${t({ de: 'Zeile', en: 'Line' })} ${e.line}: ` : ''}
                </b>
                {t(e.msg)}
              </p>
            ))}
          </div>

          <div className="card">
            <div className="card-head">
              <h2>2. {t({ de: 'Ausprobieren', en: 'Try it out' })}</h2>
              <span className="row">
                <span className={program ? 'run on' : 'run'}>{program ? 'RUN' : 'STOP'}</span>
                <button className="btn small" onClick={resetStation}>
                  {t({ de: 'Station zurücksetzen', en: 'Reset station' })}
                </button>
              </span>
            </div>
            {!program && <p className="muted small">{t({ de: 'Die Station steht, weil dein Programm noch einen Fehler hat.', en: 'The station is stopped because your program still has an error.' })}</p>}
            <StationView
              task={task}
              plant={plant.current}
              image={sim.current?.image ?? {}}
              pressed={pressed.current}
              setPressed={(name, value) => {
                pressed.current = { ...pressed.current, [name]: value };
                redraw();
              }}
            />
          </div>

          <div className="card">
            <div className="card-head">
              <h2>3. {t({ de: 'Prüfen', en: 'Check' })}</h2>
              <button className="btn primary" onClick={check}>
                {t({ de: 'Programm prüfen', en: 'Check program' })}
              </button>
            </div>
            {!result && (
              <p className="muted small">
                {t({
                  de: `Die Prüfung spielt ${task.tests.length} Testfälle durch: Sie drückt die Taster und schaut, ob die Ausgänge stimmen. Jedes Programm, das sich richtig verhält, besteht.`,
                  en: `The check runs ${task.tests.length} test cases: it presses the buttons and looks whether the outputs are right. Every program that behaves correctly passes.`,
                })}
              </p>
            )}
            {result && result.errors.length > 0 && (
              <p className="msg error">{t({ de: 'Das Programm hat noch einen Fehler (siehe oben). Behebe ihn zuerst.', en: 'The program still has an error (see above). Fix it first.' })}</p>
            )}
            {result && !result.errors.length && (
              <>
                <ul className="tests">
                  {result.tests.map((x) => (
                    <li key={x.id} className={x.passed ? 'pass' : 'fail'}>
                      <span className="mark">{x.passed ? '✓' : '✗'}</span>
                      <div>
                        <b>{t(x.name)}</b>
                        {x.failure && (
                          <>
                            <p>{explain(x.failure)}</p>
                            {x.failure.kind === 'expect' && x.failure.note && (
                              <p className="muted">
                                {t({ de: 'Situation: ', en: 'Situation: ' })}
                                {t(x.failure.note)}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {result.passed ? (
                  <div className="msg success">
                    <b>{t({ de: 'Richtig! Alle Tests bestanden.', en: 'Correct! All tests passed.' })}</b>
                    {nextTask ? (
                      <Link className="btn primary" href={`/sps/${nextTask.id}`}>
                        {t({ de: 'Nächste Aufgabe', en: 'Next task' })}: {t(nextTask.title)} →
                      </Link>
                    ) : (
                      <Link className="btn primary" href="/quiz">
                        {t({ de: 'Das war die letzte Aufgabe. Weiter zum Quiz', en: 'That was the last task. On to the quiz' })} →
                      </Link>
                    )}
                  </div>
                ) : (
                  <p className="msg warn">
                    {t({
                      de: `Noch nicht ganz: ${failed} von ${result.tests.length} Tests sind nicht bestanden. Spiele die Situation an der Station nach, dann siehst du, was passiert.`,
                      en: `Not quite yet: ${failed} of ${result.tests.length} tests did not pass. Replay the situation on the station, then you will see what happens.`,
                    })}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="card">
            <div className="card-head">
              <h2>4. {t({ de: 'Lösung und Erklärung', en: 'Solution and explanation' })}</h2>
              <span className="row">
                <button className="btn small" aria-expanded={showSolution} onClick={() => setShowSolution(!showSolution)}>
                  {showSolution ? t({ de: 'Lösung verbergen', en: 'Hide solution' }) : t({ de: 'Komplette Lösung zeigen', en: 'Show complete solution' })}
                </button>
                <button className="btn small" aria-expanded={showWhy} onClick={() => setShowWhy(!showWhy)}>
                  {showWhy ? t({ de: 'Erklärung verbergen', en: 'Hide explanation' }) : t({ de: 'Warum ist das so aufgebaut?', en: 'Why is it built like this?' })}
                </button>
              </span>
            </div>
            {!showSolution && !showWhy && (
              <p className="muted small">
                {t({
                  de: 'Probiere es zuerst selbst, auch mehrmals. Du lernst am meisten, wenn du die Lösung erst danach ansiehst.',
                  en: 'Try it yourself first, several times if needed. You learn the most when you look at the solution only afterwards.',
                })}
              </p>
            )}
            {showSolution && (
              <div className="solution">
                <p className="muted small">
                  {t({
                    de: 'Das ist eine mögliche Lösung. Andere Programme können genauso richtig sein: Geprüft wird nur das Verhalten.',
                    en: 'This is one possible solution. Other programs can be just as correct: only the behaviour is checked.',
                  })}
                </p>
                {refKop?.lang === 'kop' && (
                  <>
                    <h3>KOP</h3>
                    <LadderEditor task={task} rungs={refKop.rungs} onChange={() => {}} read={() => undefined} readOnly />
                  </>
                )}
                {refScl && (
                  <>
                    <h3>SCL</h3>
                    <pre>{solutionToScl(refScl)}</pre>
                  </>
                )}
                <p className="row">
                  {refKop?.lang === 'kop' && (
                    <button
                      className="btn small"
                      onClick={() => {
                        setRungs(JSON.parse(JSON.stringify(refKop.rungs)));
                        setMode('kop');
                      }}
                    >
                      {t({ de: 'KOP-Lösung in meinen Editor laden', en: 'Load KOP solution into my editor' })}
                    </button>
                  )}
                  {refScl?.lang === 'scl' && (
                    <button
                      className="btn small"
                      onClick={() => {
                        setScl(refScl.code + '\n');
                        setMode('scl');
                      }}
                    >
                      {t({ de: 'SCL-Lösung in meinen Editor laden', en: 'Load SCL solution into my editor' })}
                    </button>
                  )}
                  <span className="muted small">
                    {t({ de: 'Dein jetziges Programm wird dabei ersetzt. Danach kannst du die Lösung verändern und ausprobieren.', en: 'This replaces your current program. Afterwards you can change the solution and try things out.' })}
                  </span>
                </p>
              </div>
            )}
            {showWhy && (
              <ol className="why">
                {task.explanation.map((x, i) => (
                  <li key={i}>{t(x)}</li>
                ))}
              </ol>
            )}
          </div>
          <p className="muted small">
            <button
              className="link"
              onClick={() => {
                setScl(STARTER[lang]);
                setRungs([newRung(task)]);
                setHints(0);
                resetStation();
                updateProgress((p) => ({ ...p, tasks: { ...p.tasks, [task.id]: { solved: !!saved?.solved, attempts: 0 } } }));
              }}
            >
              {t({ de: 'Mein Programm löschen und neu anfangen', en: 'Delete my program and start again' })}
            </button>
          </p>
        </section>
      </div>
    </div>
  );
}
