'use client';
import { Plant, Task, TaskVar, Value } from '@/engine/plc';
import { useT } from '@/lib/progress';

const role = (task: Task, r: string) => task.variables.find((v) => v.role === r);

function Conveyor({ task, plant, image }: { task: Task; plant: Plant; image: Record<string, Value> }) {
  const { t } = useT();
  const right = role(task, 'motorRight');
  const left = role(task, 'motorLeft');
  const b1 = role(task, 'limitLeft');
  const b2 = role(task, 'limitRight');
  const x = 50 + plant.pos * 264;
  const on = (v?: TaskVar) => !!v && image[v.name] === true;
  return (
    <svg viewBox="0 0 400 150" className="station-svg" role="img" aria-label={t({ de: 'Förderband', en: 'Conveyor' })}>
      <rect x="50" y="86" width="300" height="18" rx="9" className="s-belt" />
      <line x1="58" y1="95" x2="342" y2="95" className="s-belt-marks" strokeDashoffset={-plant.pos * 320} />
      <circle cx="59" cy="95" r="9" className="s-roller" />
      <circle cx="341" cy="95" r="9" className="s-roller" />
      <rect x={x} y="56" width="36" height="30" rx="4" className="s-part" />
      {b1 && (
        <g className={on(b1) ? 's-sensor on' : 's-sensor'}>
          <rect x="44" y="112" width="24" height="14" rx="3" />
          <text x="56" y="140" textAnchor="middle">{b1.name}</text>
        </g>
      )}
      {b2 && (
        <g className={on(b2) ? 's-sensor on' : 's-sensor'}>
          <rect x="332" y="112" width="24" height="14" rx="3" />
          <text x="344" y="140" textAnchor="middle">{b2.name}</text>
        </g>
      )}
      {left && (
        <text x="150" y="34" textAnchor="middle" className={on(left) ? 's-arrow on' : 's-arrow'}>
          ◀ {left.name}
        </text>
      )}
      {right && (
        <text x={left ? 250 : 200} y="34" textAnchor="middle" className={on(right) ? 's-arrow on' : 's-arrow'}>
          {right.name} ▶
        </text>
      )}
      {plant.fault && (
        <text x="200" y="140" textAnchor="middle" className="s-fault">
          {t({ de: 'Kurzschluss! Beide Richtungen waren gleichzeitig ein.', en: 'Short circuit! Both directions were on at the same time.' })}
        </text>
      )}
    </svg>
  );
}

function Cylinder({ task, plant, image }: { task: Task; plant: Plant; image: Record<string, Value> }) {
  const { t } = useT();
  const b1 = role(task, 'sensorIn');
  const b2 = role(task, 'sensorOut');
  const y1 = role(task, 'valveExtend');
  const on = (v?: TaskVar) => !!v && image[v.name] === true;
  const px = 70 + plant.pos * 130;
  return (
    <svg viewBox="0 0 400 150" className="station-svg" role="img" aria-label={t({ de: 'Pneumatikzylinder', en: 'Pneumatic cylinder' })}>
      <rect x="60" y="60" width="170" height="44" rx="4" className="s-body" />
      <rect x={px} y="64" width="14" height="36" className="s-piston" />
      <rect x={px + 14} y="77" width="170" height="10" className="s-rod" />
      <rect x={px + 184} y="68" width="10" height="28" rx="2" className="s-rod" />
      {b1 && (
        <g className={on(b1) ? 's-sensor on' : 's-sensor'}>
          <rect x="66" y="42" width="24" height="14" rx="3" />
          <text x="78" y="34" textAnchor="middle">{b1.name}</text>
        </g>
      )}
      {b2 && (
        <g className={on(b2) ? 's-sensor on' : 's-sensor'}>
          <rect x="196" y="42" width="24" height="14" rx="3" />
          <text x="208" y="34" textAnchor="middle">{b2.name}</text>
        </g>
      )}
      {y1 && (
        <text x="145" y="132" textAnchor="middle" className={on(y1) ? 's-arrow on' : 's-arrow'}>
          {on(y1) ? `${y1.name} = 1 ▶ ${t({ de: 'ausfahren', en: 'extend' })}` : `◀ ${t({ de: 'einfahren', en: 'retract' })} (${y1.name} = 0)`}
        </text>
      )}
    </svg>
  );
}

export function StationView({
  task,
  plant,
  image,
  pressed,
  setPressed,
}: {
  task: Task;
  plant: Plant;
  image: Record<string, Value>;
  pressed: Record<string, boolean>;
  setPressed: (name: string, value: boolean) => void;
}) {
  const { t } = useT();
  const operator = task.variables.filter((v) => v.dir === 'in' && !v.role && v.type === 'BOOL');
  const lamps = task.variables.filter((v) => v.ui === 'lamp');
  const io = task.variables.filter((v) => v.dir !== 'mem');
  const hold = (v: TaskVar) => ({
    onPointerDown: (e: React.PointerEvent) => {
      setPressed(v.name, true);
      try {
        // keeps the button pressed when the finger slides off it
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // no capture available: releasing still works through pointerup / blur
      }
    },
    onPointerUp: () => setPressed(v.name, false),
    onPointerCancel: () => setPressed(v.name, false),
    onKeyDown: (e: React.KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) setPressed(v.name, true);
    },
    onKeyUp: (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') setPressed(v.name, false);
    },
    onBlur: () => setPressed(v.name, false),
  });
  return (
    <div className="station">
      {task.station === 'conveyor' && <Conveyor task={task} plant={plant} image={image} />}
      {task.station === 'cylinder' && <Cylinder task={task} plant={plant} image={image} />}
      {lamps.length > 0 && (
        <div className="lamps">
          {lamps.map((v) => (
            <div key={v.name} className="lamp-wrap">
              <span className={`lamp ${v.color ?? 'white'}${image[v.name] === true ? ' on' : ''}`} />
              <b>{v.name}</b>
              <small>{t(v.comment)}</small>
            </div>
          ))}
        </div>
      )}
      <div className="controls">
        {operator.map((v) =>
          v.ui === 'switch' ? (
            <button key={v.name} className={`ctl switch${pressed[v.name] ? ' on' : ''}`} role="switch" aria-checked={!!pressed[v.name]} onClick={() => setPressed(v.name, !pressed[v.name])}>
              <span className="knob" />
              <b>{v.name}</b>
              <small>
                {t(v.comment)}: {pressed[v.name] ? t({ de: 'EIN', en: 'ON' }) : t({ de: 'AUS', en: 'OFF' })}
              </small>
            </button>
          ) : (
            <button key={v.name} className={`ctl push ${v.color ?? ''}${pressed[v.name] ? ' on' : ''}`} {...hold(v)}>
              <span className="cap" />
              <b>{v.name}</b>
              <small>{t(v.comment)}</small>
            </button>
          ),
        )}
      </div>
      <p className="muted small">{t({ de: 'Taster: gedrückt halten. Schalter: einmal klicken.', en: 'Push-buttons: press and hold. Switches: click once.' })}</p>
      <table className="io">
        <thead>
          <tr>
            <th>{t({ de: 'Signal', en: 'Signal' })}</th>
            <th>{t({ de: 'Name', en: 'Name' })}</th>
            <th>{t({ de: 'Adresse', en: 'Address' })}</th>
            <th>{t({ de: 'Bedeutung', en: 'Meaning' })}</th>
          </tr>
        </thead>
        <tbody>
          {io.map((v) => (
            <tr key={v.name}>
              <td>
                <span className={`led ${v.dir}${image[v.name] === true ? ' on' : ''}`} /> {image[v.name] === true ? 1 : 0}
              </td>
              <td>
                <code>{v.name}</code>
              </td>
              <td>
                <code>{v.address}</code>
              </td>
              <td>{t(v.comment)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
