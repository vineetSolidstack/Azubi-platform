'use client';
import Link from 'next/link';
import { useState } from 'react';
import { updateProgress, useT } from '@/lib/progress';
import { Answer, checkAnswer, Question, shuffledIndices } from '@/quiz/quiz';
import { Bar, StatusBadge } from './Shell';

export function QuizRunner({ title, questions }: { title: string; questions: Question[] }) {
  const { t } = useT();
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const q = questions[i];

  if (!q)
    return (
      <div className="page narrow">
        <h1>{t({ de: 'Geschafft!', en: 'Done!' })}</h1>
        <p className="lead">
          {t({ de: `Du hast ${right} von ${questions.length} Fragen richtig beantwortet.`, en: `You answered ${right} of ${questions.length} questions correctly.` })}
        </p>
        <p className="row">
          <button
            className="btn"
            onClick={() => {
              setI(0);
              setRight(0);
            }}
          >
            {t({ de: 'Noch einmal üben', en: 'Practise again' })}
          </button>
          <Link className="btn primary" href="/quiz">
            {t({ de: 'Zur Quiz-Übersicht', en: 'To the quiz overview' })}
          </Link>
        </p>
      </div>
    );

  return (
    <div className="page narrow">
      <p className="crumbs">
        <Link href="/quiz">← Quiz</Link>
        <span className="muted">
          {title} · {t({ de: 'Frage', en: 'Question' })} {i + 1} / {questions.length}
        </span>
      </p>
      <Bar done={i} total={questions.length} />
      <QuestionCard
        key={q.id}
        q={q}
        last={i === questions.length - 1}
        onResult={(ok) => {
          if (ok) setRight((r) => r + 1);
          updateProgress((p) => ({ ...p, quiz: { ...p.quiz, [q.id]: ok } }));
        }}
        onNext={() => setI(i + 1)}
      />
    </div>
  );
}

function QuestionCard({ q, last, onResult, onNext }: { q: Question; last: boolean; onResult: (ok: boolean) => void; onNext: () => void }) {
  const { t } = useT();
  const [single, setSingle] = useState<number | null>(null);
  const [multi, setMulti] = useState<number[]>([]);
  const [text, setText] = useState('');
  const [order, setOrder] = useState(() => (q.type === 'order' ? shuffledIndices(q.items.length, q.id) : []));
  const [ok, setOk] = useState<boolean | null>(null);
  const done = ok !== null;

  const answer: Answer | null =
    q.type === 'single' ? single : q.type === 'multiple' ? (multi.length ? multi : null) : q.type === 'order' ? order : text.trim() ? text : null;
  const submit = () => {
    if (answer === null || done) return;
    const r = checkAnswer(q, answer);
    setOk(r);
    onResult(r);
  };
  const move = (pos: number, d: number) => {
    const o = [...order];
    [o[pos], o[pos + d]] = [o[pos + d], o[pos]];
    setOrder(o);
  };
  const optClass = (idx: number, chosen: boolean, correct: boolean) =>
    `opt${chosen ? ' chosen' : ''}${done && correct ? ' right' : ''}${done && chosen && !correct ? ' wrong' : ''}`;

  return (
    <form
      className="card quiz"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h1 className="q">{t(q.question)}</h1>
      <StatusBadge status={q.status} />

      {q.type === 'single' && (
        <div className="opts" role="radiogroup">
          {q.options.map((o, idx) => (
            <button type="button" key={idx} role="radio" aria-checked={single === idx} disabled={done} className={optClass(idx, single === idx, idx === q.correct)} onClick={() => setSingle(idx)}>
              <span className="pick round" />
              {t(o)}
            </button>
          ))}
        </div>
      )}
      {q.type === 'multiple' && (
        <div className="opts">
          {q.options.map((o, idx) => {
            const chosen = multi.includes(idx);
            return (
              <button
                type="button"
                key={idx}
                role="checkbox"
                aria-checked={chosen}
                disabled={done}
                className={optClass(idx, chosen, q.correct.includes(idx))}
                onClick={() => setMulti(chosen ? multi.filter((x) => x !== idx) : [...multi, idx])}
              >
                <span className="pick" />
                {t(o)}
              </button>
            );
          })}
        </div>
      )}
      {(q.type === 'numeric' || q.type === 'text') && (
        <label className="answer">
          {t({ de: 'Deine Antwort', en: 'Your answer' })}
          <span className="row">
            <input value={text} disabled={done} inputMode={q.type === 'numeric' ? 'decimal' : 'text'} autoComplete="off" onChange={(e) => setText(e.target.value)} />
            {q.type === 'numeric' && q.unit && <b>{q.unit}</b>}
          </span>
        </label>
      )}
      {q.type === 'order' && (
        <ol className="order">
          {order.map((item, pos) => (
            <li key={item} className={done ? (item === pos ? 'right' : 'wrong') : ''}>
              <span>{t(q.items[item])}</span>
              {!done && (
                <span className="updown">
                  <button type="button" disabled={pos === 0} onClick={() => move(pos, -1)} aria-label={t({ de: 'nach oben', en: 'move up' })}>
                    ↑
                  </button>
                  <button type="button" disabled={pos === order.length - 1} onClick={() => move(pos, 1)} aria-label={t({ de: 'nach unten', en: 'move down' })}>
                    ↓
                  </button>
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {!done ? (
        <button className="btn primary" type="submit" disabled={answer === null}>
          {t({ de: 'Antwort prüfen', en: 'Check answer' })}
        </button>
      ) : (
        <>
          <div className={ok ? 'msg success col' : 'msg warn col'} role="status">
            <b>{ok ? t({ de: 'Richtig!', en: 'Correct!' }) : t({ de: 'Leider falsch.', en: 'Not correct.' })}</b>
            {!ok && q.type === 'numeric' && (
              <p>
                {t({ de: 'Richtige Antwort: ', en: 'Correct answer: ' })}
                {q.answer} {q.unit}
              </p>
            )}
            {!ok && q.type === 'text' && (
              <p>
                {t({ de: 'Richtige Antwort: ', en: 'Correct answer: ' })}
                {q.accepted[0]}
              </p>
            )}
            {!ok && q.type === 'order' && (
              <ol>
                {q.items.map((it, k) => (
                  <li key={k}>{t(it)}</li>
                ))}
              </ol>
            )}
            <p>{t(q.explanation)}</p>
          </div>
          <button className="btn primary" type="button" onClick={onNext} autoFocus>
            {last ? t({ de: 'Ergebnis ansehen', en: 'Show result' }) : t({ de: 'Nächste Frage', en: 'Next question' })} →
          </button>
        </>
      )}
    </form>
  );
}
