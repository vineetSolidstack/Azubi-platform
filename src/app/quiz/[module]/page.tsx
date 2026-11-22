'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { modules } from '@content/curriculum';
import { questionsOf } from '@content/quiz';
import { QuizRunner } from '@/components/QuizRunner';
import { useT } from '@/lib/progress';

export default function QuizModulePage() {
  const { module } = useParams<{ module: string }>();
  const { t } = useT();
  const qs = questionsOf(module);
  if (!qs.length)
    return (
      <div className="page narrow">
        <h1>{t({ de: 'Zu diesem Modul gibt es noch keine Fragen.', en: 'There are no questions for this module yet.' })}</h1>
        <Link className="btn" href="/quiz">
          {t({ de: 'Zur Quiz-Übersicht', en: 'To the quiz overview' })}
        </Link>
      </div>
    );
  return <QuizRunner key={module} title={t(modules[module])} questions={qs} />;
}
