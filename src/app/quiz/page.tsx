'use client';
import Link from 'next/link';
import { modules } from '@content/curriculum';
import { questions, questionsOf } from '@content/quiz';
import { Bar } from '@/components/Shell';
import { useProgress, useT } from '@/lib/progress';

export default function QuizHome() {
  const { t } = useT();
  const p = useProgress();
  const mods = [...new Set(questions.map((q) => q.module))];
  return (
    <div className="page narrow">
      <h1>Quiz</h1>
      <p className="lead">
        {t({
          de: 'Fragen mit Erklärung zu jeder Antwort. Auch Rechenaufgaben und Reihenfolgen, nicht nur Ankreuzen.',
          en: 'Questions with an explanation for every answer. Also calculations and ordering tasks, not only multiple choice.',
        })}
      </p>
      <ol className="task-list">
        {mods.map((m) => {
          const qs = questionsOf(m);
          const done = qs.filter((q) => p.quiz[q.id]).length;
          return (
            <li key={m}>
              <Link href={`/quiz/${m}`} className={done === qs.length ? 'task solved' : 'task'}>
                <span className="task-no">{done === qs.length ? '✓' : m.slice(1)}</span>
                <span className="task-title">
                  {t(modules[m])}
                  <small>
                    {done} / {qs.length} {t({ de: 'richtig', en: 'correct' })}
                  </small>
                </span>
                <Bar done={done} total={qs.length} />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
