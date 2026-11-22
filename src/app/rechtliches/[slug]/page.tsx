'use client';
import { useParams } from 'next/navigation';
import { LEGAL } from '@/components/Shell';
import { useT } from '@/lib/progress';

// Placeholders only. The final legal texts must be written and reviewed by the operator.
export default function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang, t } = useT();
  const page = LEGAL.find((l) => l.slug === slug);
  return (
    <div className="page narrow">
      <h1>{page ? page[lang] : t({ de: 'Seite nicht gefunden', en: 'Page not found' })}</h1>
      {page && (
        <p className="note">
          {t({
            de: 'Platzhalter. Der geprüfte Text für diese Seite fehlt noch. Diese Vorschau-Version ist nicht für die Öffentlichkeit bestimmt.',
            en: 'Placeholder. The reviewed text for this page is still missing. This preview version is not meant for the public.',
          })}
        </p>
      )}
      {slug === 'kuendigen' && (
        <p>{t({ de: 'Es gibt noch keine Konten und keine Abos. Hier kommt später der Button zum Kündigen hin.', en: 'There are no accounts and no subscriptions yet. The cancel button will be placed here later.' })}</p>
      )}
    </div>
  );
}
