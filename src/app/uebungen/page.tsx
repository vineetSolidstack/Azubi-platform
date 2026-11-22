'use client';
import Link from 'next/link';
import { modules } from '@content/curriculum';
import { exercises, exercisesOf } from '@content/exercises';
import { Bar, Dots } from '@/components/Shell';
import { useProgress, useT } from '@/lib/progress';

export default function ExerciseList() {
  const { t } = useT();
  const p = useProgress();
  const mods = [...new Set(exercises.map((e) => e.module))];
  return (
    <div className="page narrow">
      <h1>{t({ de: 'Übungen', en: 'Exercises' })}</h1>
      <p className="lead">
        {t({
          de: 'Rechenaufgaben in mehreren Schritten. Jeder Schritt wird einzeln geprüft. Zu jedem Schritt gibt es den Lösungsweg und eine Erklärung, warum man so rechnet.',
          en: 'Calculation tasks in several steps. Each step is checked separately. For every step there is the worked solution and an explanation of why you calculate it this way.',
        })}
      </p>
      {mods.map((m) => {
        const es = exercisesOf(m);
        const done = es.filter((e) => p.exercises[e.id]).length;
        return (
          <section key={m}>
            <h2 id={m} className="mod-head">
              {t(modules[m])}
            </h2>
            <p className="row">
              <Bar done={done} total={es.length} />
              <span className="muted">
                {done} / {es.length} {t({ de: 'gelöst', en: 'solved' })}
              </span>
            </p>
            <ol className="task-list">
              {es.map((e, i) => (
                <li key={e.id}>
                  <Link href={`/uebungen/${e.id}`} className={p.exercises[e.id] ? 'task solved' : 'task'}>
                    <span className="task-no">{p.exercises[e.id] ? '✓' : i + 1}</span>
                    <span className="task-title">
                      {t(e.title)}
                      <small>
                        {e.steps.length} {t({ de: 'Schritte', en: 'steps' })}
                      </small>
                    </span>
                    <Dots n={e.difficulty} />
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
