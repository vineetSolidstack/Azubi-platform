'use client';
import Link from 'next/link';
import { solids } from '@content/drawing';
import { Bar, Dots } from '@/components/Shell';
import { useProgress, useT } from '@/lib/progress';

export default function DrawingList() {
  const { t } = useT();
  const p = useProgress();
  const done = solids.filter((s) => p.drawing[s.id]).length;
  return (
    <div className="page narrow">
      <h1>{t({ de: 'Technisches Zeichnen: Ansichten', en: 'Technical drawing: views' })}</h1>
      <p className="lead">
        {t({
          de: 'Du siehst ein Werkstück als räumliches Bild und zeichnest Vorderansicht, Seitenansicht von links und Draufsicht. So lernst du, eine technische Zeichnung zu lesen. Die Theorie dazu findest du unter Theorie, Mechanische Grundlagen.',
          en: 'You see a workpiece as a three-dimensional picture and draw the front view, the side view from the left and the top view. This is how you learn to read a technical drawing. You find the theory under Theory, Mechanical fundamentals.',
        })}
      </p>
      <p className="row">
        <Bar done={done} total={solids.length} />
        <span className="muted">
          {done} / {solids.length} {t({ de: 'gelöst', en: 'solved' })}
        </span>
      </p>
      <ol className="task-list">
        {solids.map((s, i) => (
          <li key={s.id}>
            <Link href={`/zeichnen/${s.id}`} className={p.drawing[s.id] ? 'task solved' : 'task'}>
              <span className="task-no">{p.drawing[s.id] ? '✓' : i + 1}</span>
              <span className="task-title">{t(s.title)}</span>
              <Dots n={s.difficulty} />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
