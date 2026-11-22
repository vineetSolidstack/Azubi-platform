'use client';
import Link from 'next/link';
import { useState } from 'react';
import { solids } from '@content/drawing';
import { checkView, hiddenEdges, hKey, Solid, solidSize, ViewCheck, ViewId, VIEW_IDS, viewGrid, visibleEdges, vKey } from '@/engine/drawing/views';
import { updateProgress, useProgress, useT } from '@/lib/progress';
import { Dots, StatusBadge } from './Shell';

const U = 30; // edge length of one cube in the isometric picture
const C = 34; // cell size on the drawing sheet

/** Isometric picture, seen from the front left and from above: front, left side and top are visible. */
function IsoSolid({ solid }: { solid: Solid }) {
  const { t } = useT();
  const { nx, ny, nz } = solidSize(solid);
  const P = (x: number, y: number, z: number): [number, number] => [(x - y) * U * 0.866, -(x + y) * U * 0.5 - z * U];
  const cubes: [number, number, number][] = [];
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) for (let z = 0; z < solid.heights[y][x]; z++) cubes.push([x, y, z]);
  cubes.sort((a, b) => b[0] + b[1] - (a[0] + a[1]) || a[2] - b[2]);
  const pts = (list: [number, number, number][]) => list.map((p) => P(...p).join(',')).join(' ');
  const minX = -ny * U * 0.866 - 8;
  const maxX = nx * U * 0.866 + 8;
  const minY = -(nx + ny) * U * 0.5 - nz * U - 8;
  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${-minY + 8}`} className="iso" style={{ maxWidth: (maxX - minX) * 1.4 }} role="img" aria-label={t({ de: 'Räumliches Bild des Werkstücks', en: 'Three-dimensional picture of the workpiece' })}>
      {cubes.map(([x, y, z]) => (
        <g key={`${x}-${y}-${z}`}>
          <polygon className="iso-top" points={pts([[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]])} />
          <polygon className="iso-front" points={pts([[x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1]])} />
          <polygon className="iso-left" points={pts([[x, y, z], [x, y + 1, z], [x, y + 1, z + 1], [x, y, z + 1]])} />
        </g>
      ))}
    </svg>
  );
}

function ViewSheet({ solid, view, drawn, dashed, toggle, reveal }: { solid: Solid; view: ViewId; drawn: string[]; dashed: string[]; toggle: (k: string) => void; reveal: boolean }) {
  const { t } = useT();
  const g = viewGrid(solid, view);
  const want = reveal ? visibleEdges(g) : new Set<string>();
  const wantHidden = reveal && solid.hidden ? hiddenEdges(solid, view) : new Set<string>();
  const segs: { k: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let r = 0; r <= g.rows; r++) for (let c = 0; c < g.cols; c++) segs.push({ k: hKey(c, r), x1: c * C, y1: r * C, x2: (c + 1) * C, y2: r * C });
  for (let r = 0; r < g.rows; r++) for (let c = 0; c <= g.cols; c++) segs.push({ k: vKey(c, r), x1: c * C, y1: r * C, x2: c * C, y2: (r + 1) * C });
  return (
    <svg viewBox={`-10 -10 ${g.cols * C + 20} ${g.rows * C + 20}`} width={g.cols * C + 20} className="sheet">
      {segs.map((s) => (
        <line key={'g' + s.k} {...s} className="sheet-guide" />
      ))}
      {segs.filter((s) => want.has(s.k)).map((s) => (
        <line key={'w' + s.k} {...s} className="sheet-want" />
      ))}
      {segs.filter((s) => wantHidden.has(s.k)).map((s) => (
        <line key={'wh' + s.k} {...s} className="sheet-want hidden-edge" />
      ))}
      {segs.filter((s) => drawn.includes(s.k)).map((s) => (
        <line key={'d' + s.k} {...s} className="sheet-line" />
      ))}
      {segs.filter((s) => dashed.includes(s.k)).map((s) => (
        <line key={'x' + s.k} {...s} className="sheet-line sheet-dashed" />
      ))}
      {segs.map((s) => (
        <line
          key={'h' + s.k}
          {...s}
          className="sheet-hit"
          role="button"
          tabIndex={0}
          aria-pressed={drawn.includes(s.k) || dashed.includes(s.k)}
          aria-label={t({ de: 'Linie', en: 'Line' }) + ' ' + s.k}
          onClick={() => toggle(s.k)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggle(s.k);
            }
          }}
        />
      ))}
    </svg>
  );
}

export function ViewsTrainer({ solid }: { solid: Solid }) {
  const { t } = useT();
  const solved = !!useProgress().drawing[solid.id];
  const [drawn, setDrawn] = useState<Record<ViewId, string[]>>({ front: [], left: [], top: [] });
  const [dashed, setDashed] = useState<Record<ViewId, string[]>>({ front: [], left: [], top: [] });
  const [result, setResult] = useState<Record<ViewId, ViewCheck> | null>(null);
  const [reveal, setReveal] = useState(false);
  const idx = solids.findIndex((s) => s.id === solid.id);
  const next = solids[idx + 1];

  const NAMES: Record<ViewId, { de: string; en: string }> = {
    front: { de: 'Vorderansicht', en: 'Front view (Vorderansicht)' },
    left: { de: 'Seitenansicht von links', en: 'Side view from the left (Seitenansicht von links)' },
    top: { de: 'Draufsicht', en: 'Top view (Draufsicht)' },
  };
  const WHY: Record<ViewId, { de: string; en: string }> = {
    front: { de: 'Du schaust von vorn auf die blauen Flächen. Du siehst Breite und Höhe, aber keine Tiefe.', en: 'You look at the blue faces from the front. You see width and height, but no depth.' },
    left: {
      de: 'Du schaust von links auf die orangen Flächen. Diese Ansicht steht rechts neben der Vorderansicht. Die Rückseite des Werkstücks ist in dieser Ansicht links.',
      en: 'You look at the orange faces from the left. This view is placed to the right of the front view. The back of the workpiece is on the left in this view.',
    },
    top: {
      de: 'Du schaust von oben auf die hellen Flächen. Die Draufsicht steht unter der Vorderansicht. Die Rückseite des Werkstücks ist in dieser Ansicht oben.',
      en: 'You look at the light faces from above. The top view is placed below the front view. The back of the workpiece is at the top in this view.',
    },
  };

  // one click: wide line. With hidden edges switched on a second click makes it dashed, the next click removes it.
  const toggle = (view: ViewId) => (k: string) => {
    const isSolid = drawn[view].includes(k);
    const isDashed = dashed[view].includes(k);
    setDrawn({ ...drawn, [view]: isSolid ? drawn[view].filter((x) => x !== k) : isDashed ? drawn[view] : [...drawn[view], k] });
    setDashed({ ...dashed, [view]: isDashed ? dashed[view].filter((x) => x !== k) : isSolid && solid.hidden ? [...dashed[view], k] : dashed[view] });
    setResult(null);
  };
  const check = () => {
    const r = Object.fromEntries(VIEW_IDS.map((v) => [v, checkView(solid, v, drawn[v], dashed[v])])) as Record<ViewId, ViewCheck>;
    setResult(r);
    if (VIEW_IDS.every((v) => r[v].ok)) updateProgress((p) => ({ ...p, drawing: { ...p.drawing, [solid.id]: true } }));
  };
  const allOk = !!result && VIEW_IDS.every((v) => result[v].ok);

  const panel = (v: ViewId) => (
    <div className={`view-panel view-${v}`}>
      <h3>
        <i className="swatch" /> {t(NAMES[v])}
      </h3>
      <ViewSheet solid={solid} view={v} drawn={drawn[v]} dashed={dashed[v]} toggle={toggle(v)} reveal={reveal} />
      {result && (
        <p className={result[v].ok ? 'msg success' : 'msg warn'}>
          {result[v].ok
            ? t({ de: 'Richtig!', en: 'Correct!' })
            : t({
                de: `${result[v].missing} ${result[v].missing === 1 ? 'Linie fehlt' : 'Linien fehlen'}${solid.hidden ? ' oder haben die falsche Linienart' : ''}, ${result[v].extra} ${result[v].extra === 1 ? 'Linie ist' : 'Linien sind'} zu viel.`,
                en: `${result[v].missing} ${result[v].missing === 1 ? 'line is' : 'lines are'} missing${solid.hidden ? ' or of the wrong line type' : ''}, ${result[v].extra} ${result[v].extra === 1 ? 'line is' : 'lines are'} too many.`,
              })}
        </p>
      )}
      {reveal && <p className="small">{t(WHY[v])}</p>}
      <button className="link" onClick={() => { setDrawn({ ...drawn, [v]: [] }); setDashed({ ...dashed, [v]: [] }); setResult(null); }}>
        {t({ de: 'Diese Ansicht löschen', en: 'Clear this view' })}
      </button>
    </div>
  );

  return (
    <div className="page">
      <p className="crumbs">
        <Link href="/zeichnen">← {t({ de: 'Alle Werkstücke', en: 'All workpieces' })}</Link>
        <span className="muted">
          {t({ de: 'Werkstück', en: 'Workpiece' })} {idx + 1} / {solids.length}
        </span>
      </p>
      <h1>
        {solved && <span className="tick">✓ </span>}
        {t({ de: 'Drei Ansichten zeichnen', en: 'Draw three views' })}: {t(solid.title)}
      </h1>
      <p className="row">
        <Dots n={solid.difficulty} /> <StatusBadge status={solid.status} />
      </p>
      <div className="views-grid">
        <div className="card">
          <h2>{t({ de: 'Werkstück', en: 'Workpiece' })}</h2>
          <IsoSolid solid={solid} />
          <p className="small">
            <span className="view-front"><i className="swatch" /></span> {t({ de: 'von vorn', en: 'from the front' })} &nbsp;
            <span className="view-left"><i className="swatch" /></span> {t({ de: 'von links', en: 'from the left' })} &nbsp;
            <span className="view-top"><i className="swatch" /></span> {t({ de: 'von oben', en: 'from above' })}
          </p>
          <p className="muted small">
            {t({
              de: 'Zeichne alle sichtbaren Kanten: Klicke auf die gestrichelten Hilfslinien. Ein zweiter Klick löscht die Linie wieder. Ein Kästchen entspricht einem Würfel.',
              en: 'Draw all visible edges: click the dashed guide lines. A second click removes the line again. One square corresponds to one cube.',
            })}
          </p>
          <p className={solid.hidden ? 'note small' : 'muted small'}>
            {solid.hidden
              ? t({
                  de: 'Bei diesem Werkstück gehören auch die verdeckten Kanten dazu. Erster Klick: breite Volllinie (sichtbare Kante). Zweiter Klick: Strichlinie (verdeckte Kante). Dritter Klick: Linie weg.',
                  en: 'For this workpiece the hidden edges are required as well. First click: wide continuous line (visible edge). Second click: dashed line (hidden edge). Third click: line removed.',
                })
              : t({ de: 'Verdeckte Kanten werden bei diesem Werkstück nicht gezeichnet.', en: 'Hidden edges are not drawn for this workpiece.' })}
          </p>
        </div>
        <div className="card">
          <div className="card-head">
            <h2>{t({ de: 'Zeichenblatt (Projektionsmethode 1)', en: 'Drawing sheet (projection method 1)' })}</h2>
          </div>
          <div className="sheet-layout">
            {panel('front')}
            {panel('left')}
            {panel('top')}
          </div>
          <p className="row" style={{ marginTop: '1rem' }}>
            <button className="btn primary" onClick={check}>
              {t({ de: 'Zeichnung prüfen', en: 'Check drawing' })}
            </button>
            <button className="btn" aria-expanded={reveal} onClick={() => setReveal(!reveal)}>
              {reveal ? t({ de: 'Lösung verbergen', en: 'Hide solution' }) : t({ de: 'Lösung mit Erklärung zeigen', en: 'Show solution with explanation' })}
            </button>
          </p>
          {reveal && (
            <ol className="why">
              <li>{t({ de: 'Die grünen Linien sind die Lösung. Eine breite Volllinie gehört überall hin, wo eine Kante sichtbar ist: am Umriss und an jeder Stufe.', en: 'The green lines are the solution. A wide continuous line belongs wherever an edge is visible: at the outline and at every step.' })}</li>
              <li>{t({ de: 'Liegen zwei Flächen in Blickrichtung gleich weit entfernt, ist zwischen ihnen keine Kante und damit keine Linie.', en: 'If two faces are at the same distance in the viewing direction, there is no edge between them and so no line.' })}</li>
              {solid.hidden && (
                <li>{t({ de: 'Eine Strichlinie zeichnest du dort, wo eine Kante hinter Material liegt: Du siehst sie aus dieser Richtung nicht, aber sie ist da. Liegt vor ihr schon eine sichtbare Kante an der gleichen Stelle, wird nur die Volllinie gezeichnet.', en: 'You draw a dashed line where an edge lies behind material: you cannot see it from this direction, but it is there. If a visible edge is already in front of it at the same place, only the continuous line is drawn.' })}</li>
              )}
              <li>{t({ de: 'Die Ansichten gehören zusammen: Vorderansicht und Draufsicht sind gleich breit, Vorderansicht und Seitenansicht sind gleich hoch.', en: 'The views belong together: front view and top view have the same width, front view and side view have the same height.' })}</li>
            </ol>
          )}
          {allOk && (
            <div className="msg success">
              <b>{t({ de: 'Alle drei Ansichten stimmen!', en: 'All three views are correct!' })}</b>
              <Link className="btn primary" href={next ? `/zeichnen/${next.id}` : '/zeichnen'}>
                {next ? `${t({ de: 'Nächstes Werkstück', en: 'Next workpiece' })}: ${t(next.title)}` : t({ de: 'Zur Übersicht', en: 'To the overview' })} →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
