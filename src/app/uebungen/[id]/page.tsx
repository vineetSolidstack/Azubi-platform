'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { exerciseById } from '@content/exercises';
import { ExerciseRunner } from '@/components/ExerciseRunner';
import { useT } from '@/lib/progress';

export default function ExercisePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useT();
  const exercise = exerciseById(id);
  if (!exercise)
    return (
      <div className="page narrow">
        <h1>{t({ de: 'Diese Übung gibt es nicht.', en: 'This exercise does not exist.' })}</h1>
        <Link className="btn" href="/uebungen">
          {t({ de: 'Zu den Übungen', en: 'To the exercises' })}
        </Link>
      </div>
    );
  return <ExerciseRunner key={exercise.id} exercise={exercise} />;
}
