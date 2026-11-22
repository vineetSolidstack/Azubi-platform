'use client';
import Link from 'next/link';
import { modules } from '@content/curriculum';
import { lessons } from '@content/theory';
import { useProgress, useT } from '@/lib/progress';

export default function TheoryList() {
  const { t } = useT();
  const p = useProgress();
  return (
    <div className="page narrow">
      <h1>{t({ de: 'Theorie', en: 'Theory' })}</h1>
      <p className="lead">
        {t({
          de: 'Kurze Lerneinheiten in einfacher Sprache. Lies zuerst die Theorie, dann übe mit den passenden Übungen und Simulatoren.',
          en: 'Short lessons in simple language. Read the theory first, then practise with the matching exercises and simulators.',
        })}
      </p>
      <ol className="task-list">
        {lessons.map((l) => (
          <li key={l.module}>
            <Link href={`/theorie/${l.module}`} className={p.theory[l.module] ? 'task solved' : 'task'}>
              <span className="task-no">{p.theory[l.module] ? '✓' : l.module.slice(1)}</span>
              <span className="task-title">
                {t(modules[l.module])}
                <small>
                  {l.sections.length} {t({ de: 'Abschnitte', en: 'sections' })}
                </small>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
