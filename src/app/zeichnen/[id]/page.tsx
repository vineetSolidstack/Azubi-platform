'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { solidById } from '@content/drawing';
import { ViewsTrainer } from '@/components/ViewsTrainer';
import { useT } from '@/lib/progress';

export default function DrawingPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useT();
  const solid = solidById(id);
  if (!solid)
    return (
      <div className="page narrow">
        <h1>{t({ de: 'Dieses Werkstück gibt es nicht.', en: 'This workpiece does not exist.' })}</h1>
        <Link className="btn" href="/zeichnen">
          {t({ de: 'Zur Übersicht', en: 'To the overview' })}
        </Link>
      </div>
    );
  return <ViewsTrainer key={solid.id} solid={solid} />;
}
