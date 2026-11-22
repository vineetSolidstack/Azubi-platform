'use client';
import { useState } from 'react';
import { caliperTasks } from '@content/measure';
import { alignedTicks, checkReading, readCaliper, VERNIER_DIVISIONS, vernierTickMm } from '@/engine/measure/caliper';
import { updateProgress, useProgress, useT } from '@/lib/progress';
import { parseNumber } from '@/quiz/quiz';
import { Bar, Dots, StatusBadge } from './Shell';

const S = 11; // pixels per millimetre
const PAD = 12;

function CaliperScale({ value, reveal }: { value: number; reveal: boolean }) {
  const { t } = useT();
  const { mainMm, vernierIndex } = readCaliper(value);
  const from = Math.max(0, mainMm - 6);
  const to = from + 58;
  const x = (mm: number) => PAD + (mm - from) * S;
  const hit = reveal ? alignedTicks(value) : [];
  const hitMain = hit.map((k) => vernierTickMm(value, k));
  const mains = [];
  for (let mm = from; mm <= to; mm++) mains.push(mm);
  return (
    <div className="caliper-scroll">
      <svg viewBox={`0 0 ${PAD * 2 + 58 * S} 170`} className="caliper" role="img" aria-label={t({ de: 'Messschieber: Hauptskala oben, Nonius unten', en: 'Caliper: main scale at the top, vernier at the bottom' })}>
        <rect x="0" y="18" width="100%" height="62" className="c-beam" />
        {mains.map((mm) => {
          const len = mm % 10 === 0 ? 30 : mm % 5 === 0 ? 22 : 14;
          return (
            <g key={mm} className={hitMain.includes(mm) ? 'c-hit' : ''}>
              <line x1={x(mm)} x2={x(mm)} y1={80 - len} y2={80} className="c-tick" />
              {mm % 10 === 0 && (
                <text x={x(mm)} y={42} textAnchor="middle" className="c-num">
                  {mm}
                </text>
              )}
            </g>
          );
        })}
        <text x={PAD} y="13" className="c-label">
          {t({ de: 'Hauptskala in mm', en: 'Main scale in mm' })}
        </text>
        <rect x={x(value) - 3 * S} y="80" width={45 * S} height="62" rx="4" className="c-slider" />
        {Array.from({ length: VERNIER_DIVISIONS + 1 }, (_, k) => {
          const px = x(vernierTickMm(value, k));
          const cls = hit.includes(k) ? 'c-hit' : reveal && k === 0 ? 'c-zero' : '';
          return (
            <g key={k} className={cls}>
              <line x1={px} x2={px} y1={80} y2={80 + (k % 2 === 0 ? 22 : 13)} className="c-tick" />
              {k % 2 === 0 && (
                <text x={px} y={118} textAnchor="middle" className="c-num">
                  {k / 2}
                </text>
              )}
            </g>
          );
        })}
        <text x={x(value) - 3 * S + 6} y="136" className="c-label">
          {t({ de: 'Nonius 0,05 mm', en: 'Vernier 0.05 mm' })}
        </text>
        {reveal && vernierIndex >= 0 && (
          <text x={x(value)} y="160" textAnchor="middle" className="c-zero-label">
            ▲ {t({ de: 'Nullstrich', en: 'zero tick' })}
          </text>
        )}
      </svg>
    </div>
  );
}

export function CaliperTrainer() {
  const { lang, t } = useT();
  const progress = useProgress();
  const [i, setI] = useState(0);
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ ok: boolean; mainOk: boolean } | null>(null);
  const [reveal, setReveal] = useState(false);
  const task = caliperTasks[i];
  const r = readCaliper(task.value);
  const done = caliperTasks.filter((x) => progress.measure[x.id]).length;
  const num = (v: number, digits = 2) => (lang === 'de' ? v.toFixed(digits).replace('.', ',') : v.toFixed(digits));
  const go = (k: number) => {
    setI(k);
    setText('');
    setResult(null);
    setReveal(false);
  };
  const check = () => {
    const res = checkReading(task.value, parseNumber(text));
    setResult(res);
    if (res.ok) updateProgress((p) => ({ ...p, measure: { ...p.measure, [task.id]: true } }));
  };

  return (
    <div className="page narrow">
      <h1>{t({ de: 'Messschieber ablesen', en: 'Reading a caliper' })}</h1>
      <p className="lead">
        {t({
          de: 'Lies den eingestellten Messwert ab. Oben ist die Hauptskala in Millimetern, unten der Nonius. Der Nonius teilt einen Millimeter in Schritte von 0,05 mm.',
          en: 'Read the set measurement. At the top is the main scale in millimetres, at the bottom the vernier (Nonius). The vernier divides one millimetre into steps of 0.05 mm.',
        })}
      </p>
      <p className="row">
        <Bar done={done} total={caliperTasks.length} />
        <span className="muted">
          {done} / {caliperTasks.length} {t({ de: 'richtig abgelesen', en: 'read correctly' })}
        </span>
      </p>
      <div className="card">
        <div className="card-head">
          <h2>
            {progress.measure[task.id] && <span className="tick">✓ </span>}
            {t({ de: 'Messung', en: 'Measurement' })} {i + 1} / {caliperTasks.length}
          </h2>
          <span className="row">
            <Dots n={task.difficulty} /> <StatusBadge status={task.status} />
          </span>
        </div>
        <CaliperScale value={task.value} reveal={reveal} />
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) check();
          }}
        >
          <label className="answer">
            {t({ de: 'Dein Messwert', en: 'Your reading' })}
            <span className="row">
              <input
                value={text}
                inputMode="decimal"
                autoComplete="off"
                onChange={(e) => {
                  setText(e.target.value);
                  setResult(null);
                }}
              />
              <b>mm</b>
              <button className="btn primary" type="submit" disabled={!text.trim()}>
                {t({ de: 'Prüfen', en: 'Check' })}
              </button>
            </span>
          </label>
        </form>
        {result?.ok && <p className="msg success">{t({ de: 'Richtig abgelesen!', en: 'Read correctly!' })}</p>}
        {result && !result.ok && (
          <p className="msg warn">
            {result.mainOk
              ? t({
                  de: 'Die ganzen Millimeter stimmen. Schau noch einmal genau auf den Nonius: Welcher Strich steht exakt unter einem Strich der Hauptskala?',
                  en: 'The whole millimetres are right. Look closely at the vernier again: which tick is exactly below a tick of the main scale?',
                })
              : t({
                  de: 'Das stimmt noch nicht. Lies zuerst die ganzen Millimeter ab: Das ist der letzte Strich der Hauptskala links vom Nullstrich des Nonius.',
                  en: 'That is not right yet. Read the whole millimetres first: that is the last tick of the main scale to the left of the zero tick of the vernier.',
                })}
          </p>
        )}
        <p className="row" style={{ marginTop: '1rem' }}>
          <button className="btn small" aria-expanded={reveal} onClick={() => setReveal(!reveal)}>
            {reveal ? t({ de: 'Lösung verbergen', en: 'Hide solution' }) : t({ de: 'Lösung mit Erklärung zeigen', en: 'Show solution with explanation' })}
          </button>
          <button className="btn small" disabled={i === 0} onClick={() => go(i - 1)}>
            ← {t({ de: 'Zurück', en: 'Back' })}
          </button>
          <button className={result?.ok ? 'btn small primary' : 'btn small'} disabled={i === caliperTasks.length - 1} onClick={() => go(i + 1)}>
            {t({ de: 'Nächste Messung', en: 'Next measurement' })} →
          </button>
        </p>
        {reveal && (
          <ol className="why">
            <li>
              {r.vernierIndex === 0
                ? t({ de: `Der Nullstrich des Nonius steht genau auf ${r.mainMm} mm der Hauptskala.`, en: `The zero tick of the vernier is exactly at ${r.mainMm} mm on the main scale.` })
                : t({
                    de: `Der Nullstrich des Nonius steht rechts von ${r.mainMm} mm und noch vor ${r.mainMm + 1} mm. Die ganzen Millimeter sind also ${r.mainMm} mm.`,
                    en: `The zero tick of the vernier is to the right of ${r.mainMm} mm and still before ${r.mainMm + 1} mm. So the whole millimetres are ${r.mainMm} mm.`,
                  })}
            </li>
            <li>
              {r.vernierIndex === 0
                ? t({
                    de: 'Auf dem Nonius decken sich nur der erste und der letzte Strich mit der Hauptskala (grün). Der Nonius zeigt also 0,00 mm.',
                    en: 'On the vernier only the first and the last tick line up with the main scale (green). So the vernier shows 0.00 mm.',
                  })
                : t({
                    de: `Suche den Noniusstrich, der genau unter einem Strich der Hauptskala steht (grün). Er steht auf dem Nonius bei ${num(r.vernierIndex / 2, 1)}. Die Zahlen auf dem Nonius sind Zehntel Millimeter, also ${num(r.vernierMm)} mm. Probe: Es ist der ${r.vernierIndex}. Strich nach dem Nullstrich, und ${r.vernierIndex} · 0,05 mm = ${num(r.vernierMm)} mm.`,
                    en: `Find the vernier tick that is exactly below a tick of the main scale (green). It is at ${num(r.vernierIndex / 2, 1)} on the vernier. The numbers on the vernier are tenths of a millimetre, so ${num(r.vernierMm)} mm. Check: it is tick number ${r.vernierIndex} after the zero tick, and ${r.vernierIndex} · 0.05 mm = ${num(r.vernierMm)} mm.`,
                  })}
            </li>
            <li>
              {t({ de: 'Beide Werte zusammen: ', en: 'Both values together: ' })}
              <b>
                {r.mainMm} mm + {num(r.vernierMm)} mm = {num(task.value)} mm
              </b>
            </li>
          </ol>
        )}
      </div>
    </div>
  );
}
