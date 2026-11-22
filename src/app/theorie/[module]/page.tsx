'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { modules } from '@content/curriculum';
import { solids } from '@content/drawing';
import { exercisesOf } from '@content/exercises';
import { caliperTasks } from '@content/measure';
import { questionsOf } from '@content/quiz';
import { tasks } from '@content/tasks';
import { lessonOf } from '@content/theory';
import { StatusBadge } from '@/components/Shell';
import { localizeNumbers } from '@/exercises/exercise';
import { updateProgress, useProgress, useT } from '@/lib/progress';

export default function TheoryPage() {
  const { module } = useParams<{ module: string }>();
  const { lang, t } = useT();
  const read = !!useProgress().theory[module];
  const lesson = lessonOf(module);
  if (!lesson)
    return (
      <div className="page narrow">
        <h1>{t({ de: 'Zu diesem Modul gibt es noch keine Theorie.', en: 'There is no theory for this module yet.' })}</h1>
        <Link className="btn" href="/theorie">
          {t({ de: 'Zur Theorie-Übersicht', en: 'To the theory overview' })}
        </Link>
      </div>
    );
  const practice = [
    exercisesOf(module).length > 0 && { href: `/uebungen#${module}`, label: t({ de: `Übungen (${exercisesOf(module).length})`, en: `Exercises (${exercisesOf(module).length})` }) },
    tasks.some((x) => x.module === module) && { href: '/sps', label: t({ de: 'SPS-Trainer', en: 'PLC trainer' }) },
    module === 'M14' && { href: '/zeichnen', label: t({ de: `Ansichten zeichnen (${solids.length})`, en: `Draw views (${solids.length})` }) },
    module === 'M14' && { href: '/messen', label: t({ de: `Messschieber ablesen (${caliperTasks.length})`, en: `Read a caliper (${caliperTasks.length})` }) },
    questionsOf(module).length > 0 && { href: `/quiz/${module}`, label: `Quiz (${questionsOf(module).length})` },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <div className="page narrow">
      <p className="crumbs">
        <Link href="/theorie">← {t({ de: 'Theorie', en: 'Theory' })}</Link>
      </p>
      <h1>
        {read && <span className="tick">✓ </span>}
        {t(modules[module])}
      </h1>
      <p className="row">
        <StatusBadge status={lesson.status} />
      </p>
      <p className="lead">{t(lesson.intro)}</p>
      <nav className="toc" aria-label={t({ de: 'Inhalt', en: 'Contents' })}>
        {lesson.sections.map((s, i) => (
          <a key={i} href={`#s${i + 1}`}>
            {i + 1}. {t(s.heading)}
          </a>
        ))}
      </nav>
      {lesson.sections.map((s, i) => (
        <section key={i} id={`s${i + 1}`} className="card lesson">
          <h2>
            {i + 1}. {t(s.heading)}
          </h2>
          {t(s.body)
            .split('\n\n')
            .map((para, k) => (
              <p key={k}>{para}</p>
            ))}
          {s.formulas.length > 0 && (
            <div className="worked">
              {s.formulas.map((f) => (
                <code key={f}>{localizeNumbers(f, lang)}</code>
              ))}
            </div>
          )}
          <p className="takeaway">
            <b>{t({ de: 'Merke: ', en: 'Remember: ' })}</b>
            {t(s.remember)}
          </p>
        </section>
      ))}
      <div className="card">
        <h2>{t({ de: 'Jetzt üben', en: 'Practise now' })}</h2>
        {practice.length ? (
          <p className="row">
            {practice.map((x) => (
              <Link key={x.href} className="btn" href={x.href}>
                {x.label} →
              </Link>
            ))}
          </p>
        ) : (
          <p className="muted">{t({ de: 'Übungen zu diesem Modul kommen später.', en: 'Exercises for this module are coming later.' })}</p>
        )}
        <button className={read ? 'btn small' : 'btn primary'} onClick={() => updateProgress((p) => ({ ...p, theory: { ...p.theory, [module]: !read } }))}>
          {read ? t({ de: 'Als ungelesen markieren', en: 'Mark as unread' }) : t({ de: 'Gelesen und verstanden', en: 'Read and understood' })}
        </button>
      </div>
    </div>
  );
}
