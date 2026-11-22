'use client';
import Link from 'next/link';
import { useState } from 'react';
import { exercisesOf } from '@content/exercises';
import { lessonOf } from '@content/theory';
import { checkStep, Exercise, localizeNumbers } from '@/exercises/exercise';
import { updateProgress, useProgress, useT } from '@/lib/progress';
import { Dots, StatusBadge } from './Shell';

export function ExerciseRunner({ exercise }: { exercise: Exercise }) {
  const { lang, t } = useT();
  const solvedBefore = !!useProgress().exercises[exercise.id];
  const n = exercise.steps.length;
  const [text, setText] = useState<string[]>(() => Array(n).fill(''));
  const [state, setState] = useState<(boolean | null)[]>(() => Array(n).fill(null));
  const [shown, setShown] = useState<boolean[]>(() => Array(n).fill(false));
  const set = <T,>(arr: T[], i: number, v: T) => arr.map((x, k) => (k === i ? v : x));

  const list = exercisesOf(exercise.module);
  const idx = list.findIndex((e) => e.id === exercise.id);
  const next = list[idx + 1];
  const allRight = state.every((s) => s === true);
  const allShown = shown.every(Boolean);

  const check = (i: number) => {
    if (!text[i].trim()) return;
    const ok = checkStep(exercise.steps[i], text[i]);
    const nextState = set(state, i, ok);
    setState(nextState);
    if (nextState.every((s) => s === true)) updateProgress((p) => ({ ...p, exercises: { ...p.exercises, [exercise.id]: true } }));
  };

  return (
    <div className="page narrow">
      <p className="crumbs">
        <Link href="/uebungen">← {t({ de: 'Alle Übungen', en: 'All exercises' })}</Link>
        <span className="muted">
          {lessonOf(exercise.module) && (
            <>
              <Link href={`/theorie/${exercise.module}`}>{t({ de: 'Theorie dazu', en: 'Theory for this' })}</Link> ·{' '}
            </>
          )}
          {t({ de: 'Übung', en: 'Exercise' })} {idx + 1} / {list.length}
        </span>
      </p>
      <h1>
        {solvedBefore && <span className="tick">✓ </span>}
        {t(exercise.title)}
      </h1>
      <p className="row">
        <Dots n={exercise.difficulty} /> <StatusBadge status={exercise.status} />
      </p>
      <div className="card">
        <h2>{t({ de: 'Aufgabe', en: 'Task' })}</h2>
        <p>{t(exercise.situation)}</p>

        {exercise.steps.map((s, i) => (
          <form
            key={i}
            className={state[i] ? 'ex-step ok' : 'ex-step'}
            onSubmit={(e) => {
              e.preventDefault();
              check(i);
            }}
          >
            <h3>
              <span className="no">{state[i] ? '✓' : i + 1}</span>
              {t(s.prompt)}
            </h3>
            <p className="row">
              <input
                value={text[i]}
                inputMode="decimal"
                autoComplete="off"
                className={state[i] === null ? '' : state[i] ? 'ok' : 'bad'}
                aria-label={`${t({ de: 'Ergebnis Schritt', en: 'Result of step' })} ${i + 1}`}
                onChange={(e) => {
                  setText(set(text, i, e.target.value));
                  setState(set(state, i, null));
                }}
              />
              <b>{s.unit}</b>
              <button className="btn small" type="submit" disabled={!text[i].trim()}>
                {t({ de: 'Prüfen', en: 'Check' })}
              </button>
              <button className="btn small" type="button" aria-expanded={shown[i]} onClick={() => setShown(set(shown, i, !shown[i]))}>
                {shown[i] ? t({ de: 'Lösungsweg verbergen', en: 'Hide worked solution' }) : t({ de: 'Lösungsweg zeigen', en: 'Show worked solution' })}
              </button>
            </p>
            {state[i] === true && <p className="msg success">{t({ de: 'Richtig!', en: 'Correct!' })}</p>}
            {state[i] === false && (
              <p className="msg warn">
                {t({
                  de: 'Das stimmt noch nicht. Prüfe die Formel, die Einheiten (zum Beispiel mA und A) und die Rundung. Du kannst es so oft versuchen, wie du willst.',
                  en: 'That is not right yet. Check the formula, the units (for example mA and A) and the rounding. You can try as often as you like.',
                })}
              </p>
            )}
            {shown[i] && (
              <div className="worked">
                <code>{s.formula}</code>
                <code>{localizeNumbers(s.calc, lang)}</code>
                <p>
                  <b>{t({ de: 'Warum? ', en: 'Why? ' })}</b>
                  {t(s.why)}
                </p>
              </div>
            )}
          </form>
        ))}

        <p className="row" style={{ marginTop: '1rem' }}>
          <button className="btn" onClick={() => setShown(Array(n).fill(!allShown))}>
            {allShown ? t({ de: 'Komplette Lösung verbergen', en: 'Hide complete solution' }) : t({ de: 'Komplette Lösung mit Erklärung zeigen', en: 'Show complete solution with explanation' })}
          </button>
        </p>
        {(allRight || allShown) && (
          <p className="takeaway">
            <b>{t({ de: 'Merke: ', en: 'Remember: ' })}</b>
            {t(exercise.takeaway)}
          </p>
        )}
        {allRight && (
          <div className="msg success">
            <b>{t({ de: 'Alle Schritte richtig!', en: 'All steps correct!' })}</b>
            {next ? (
              <Link className="btn primary" href={`/uebungen/${next.id}`}>
                {t({ de: 'Nächste Übung', en: 'Next exercise' })}: {t(next.title)} →
              </Link>
            ) : (
              <Link className="btn primary" href="/uebungen">
                {t({ de: 'Zu den Übungen', en: 'To the exercises' })} →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
