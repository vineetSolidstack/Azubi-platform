'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { taskById } from '@content/tasks';
import { Trainer } from '@/components/Trainer';
import { useHydrated, useT } from '@/lib/progress';

export default function TaskPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useT();
  const ready = useHydrated();
  const task = taskById(id);
  if (!task)
    return (
      <div className="page narrow">
        <h1>{t({ de: 'Diese Aufgabe gibt es nicht.', en: 'This task does not exist.' })}</h1>
        <Link className="btn" href="/sps">
          {t({ de: 'Zur Aufgabenliste', en: 'To the task list' })}
        </Link>
      </div>
    );
  // the editor starts from saved work in the browser, so it renders on the client only
  return ready ? <Trainer key={task.id} task={task} /> : null;
}
