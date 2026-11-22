'use client';
import Link from 'next/link';
import { tasks } from '@content/tasks';
import { Bar, Dots } from '@/components/Shell';
import { useProgress, useT } from '@/lib/progress';

export default function TaskList() {
  const { t } = useT();
  const p = useProgress();
  const done = tasks.filter((x) => p.tasks[x.id]?.solved).length;
  return (
    <div className="page narrow">
      <h1>{t({ de: 'SPS-Trainer', en: 'PLC trainer' })}</h1>
      <p className="lead">
        {t({
          de: 'Schreibe ein Programm in KOP (Kontaktplan) oder SCL (Text), probiere es an der Station aus und lass es prüfen. Die Aufgaben werden Schritt für Schritt schwerer.',
          en: 'Write a program in KOP (ladder diagram) or SCL (text), try it on the station and have it checked. The tasks get harder step by step.',
        })}
      </p>
      <p className="row">
        <Bar done={done} total={tasks.length} />
        <span className="muted">
          {done} / {tasks.length} {t({ de: 'gelöst', en: 'solved' })}
        </span>
      </p>
      <ol className="task-list">
        {tasks.map((task, i) => {
          const tp = p.tasks[task.id];
          return (
            <li key={task.id}>
              <Link href={`/sps/${task.id}`} className={tp?.solved ? 'task solved' : 'task'}>
                <span className="task-no">{tp?.solved ? '✓' : i + 1}</span>
                <span className="task-title">
                  {t(task.title)}
                  <small>
                    {task.languages.map((l) => l.toUpperCase()).join(' · ')}
                    {tp && !tp.solved && tp.attempts > 0 ? ` · ${t({ de: 'angefangen', en: 'started' })}` : ''}
                  </small>
                </span>
                <Dots n={task.difficulty} />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
