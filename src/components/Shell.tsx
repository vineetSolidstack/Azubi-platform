'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { updateProgress, useT } from '@/lib/progress';

export const LEGAL = [
  { slug: 'impressum', de: 'Impressum', en: 'Legal notice (Impressum)' },
  { slug: 'datenschutz', de: 'Datenschutz', en: 'Privacy' },
  { slug: 'agb', de: 'AGB', en: 'Terms' },
  { slug: 'widerruf', de: 'Widerruf', en: 'Withdrawal' },
  { slug: 'kuendigen', de: 'Abo kündigen', en: 'Cancel subscription' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { lang, t } = useT();
  const path = usePathname();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const nav = [
    { href: '/', label: t({ de: 'Start', en: 'Home' }), active: path === '/' },
    { href: '/sps', label: t({ de: 'SPS-Trainer', en: 'PLC trainer' }), active: path.startsWith('/sps') },
    { href: '/uebungen', label: t({ de: 'Übungen', en: 'Exercises' }), active: path.startsWith('/uebungen') },
    { href: '/quiz', label: 'Quiz', active: path.startsWith('/quiz') },
  ];
  return (
    <>
      <header className="top">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden>
            ⚡
          </span>
          Azubi-Trainer
        </Link>
        <nav>
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={n.active ? 'active' : ''} aria-current={n.active ? 'page' : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="lang" role="group" aria-label={t({ de: 'Sprache', en: 'Language' })}>
          {(['de', 'en'] as const).map((l) => (
            <button key={l} className={lang === l ? 'on' : ''} aria-pressed={lang === l} onClick={() => updateProgress((p) => ({ ...p, lang: l }))}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>
      <main>{children}</main>
      <footer className="foot">
        <p>
          {t({
            de: 'Unabhängiges Übungswerkzeug. Keine Verbindung zu Herstellern von Steuerungen oder zu Prüfungsstellen. Alle Inhalte sind Entwürfe und noch nicht fachlich geprüft.',
            en: 'Independent practice tool. Not affiliated with any controller manufacturer or examination body. All content is in draft state and has not been reviewed by a qualified person yet.',
          })}
        </p>
        <p className="foot-links">
          {LEGAL.map((l) => (
            <Link key={l.slug} href={`/rechtliches/${l.slug}`}>
              {l[lang]}
            </Link>
          ))}
        </p>
      </footer>
    </>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useT();
  const label =
    status === 'verified'
      ? t({ de: 'fachlich geprüft', en: 'verified' })
      : status === 'self_checked'
        ? t({ de: 'selbst geprüft', en: 'self-checked' })
        : t({ de: 'Entwurf, noch nicht fachlich geprüft', en: 'draft, not reviewed yet' });
  return <span className={`badge status-${status}`}>{label}</span>;
}

export function Dots({ n, max = 5 }: { n: number; max?: number }) {
  const { t } = useT();
  return (
    <span className="dots" title={t({ de: `Schwierigkeit ${n} von ${max}`, en: `Difficulty ${n} of ${max}` })}>
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={i < n ? 'on' : ''} />
      ))}
      <span className="sr">{t({ de: `Schwierigkeit ${n} von ${max}`, en: `Difficulty ${n} of ${max}` })}</span>
    </span>
  );
}

export function Bar({ done, total }: { done: number; total: number }) {
  return (
    <span className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
      <i style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
    </span>
  );
}
