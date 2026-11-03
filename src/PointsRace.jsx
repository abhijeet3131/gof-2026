import { useMemo, useRef, useState } from 'react';
import { pointsTimeline } from './lib/timeline.js';
import { dayParts, fmtDay } from './lib/time.js';

// the drawing is scaled to fit its box, so phones get a narrower canvas (bigger text once scaled)
const WIDE = { W: 720, H: 300, M: { l: 44, r: 118, t: 14, b: 30 }, every: 4 };
const NARROW = { W: 420, H: 300, M: { l: 38, r: 104, t: 14, b: 30 }, every: 6 };

/** Line chart of each house's running total, night by night, with a hover crosshair and end labels. */
export default function PointsRace({ data, ctx }) {
  const { nights, series } = useMemo(() => pointsTimeline(data), [data]);
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  const [narrow] = useState(() => window.matchMedia?.('(max-width: 559px)').matches ?? false);
  const { W, H, M, every } = narrow ? NARROW : WIDE;
  if (nights.length < 2) return null;

  const max = Math.max(...series.flatMap((s) => s.values));
  const top = Math.ceil(max / 500) * 500 || 500;
  const x = (i) => M.l + (i / (nights.length - 1)) * (W - M.l - M.r);
  const y = (v) => M.t + (1 - v / top) * (H - M.t - M.b);
  const colour = (h) => ctx.houseMap[h]?.colour || '#888';
  const ticks = []; for (let v = 0; v <= top; v += 500) ticks.push(v);
  const xTicks = nights.map((n, i) => i).filter((i) => (i % every === 0 && nights.length - 1 - i >= every / 2) || i === nights.length - 1);

  // end labels: sorted by final value, pushed apart so they never overlap
  const ends = series.map((s) => ({ house: s.house, v: s.values[s.values.length - 1], y: y(s.values[s.values.length - 1]) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 17) ends[i].y = ends[i - 1].y + 17;

  const onMove = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - M.l) / (W - M.l - M.r)) * (nights.length - 1));
    setHover(Math.max(0, Math.min(nights.length - 1, i)));
  };
  const tip = hover === null ? null : series.map((s) => ({ house: s.house, v: s.values[hover] })).sort((a, b) => b.v - a.v);

  return (
    <figure className="race">
      <ul className="race__legend" aria-label="Houses">
        {series.map((s) => <li key={s.house}><i style={{ background: colour(s.house) }} />{s.house}</li>)}
      </ul>
      <div className="race__plot">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Points race: ${series.map((s) => `${s.house} ${s.values[s.values.length - 1]}`).join(', ')}`}
          onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="race__grid" />
              <text x={M.l - 8} y={y(v) + 4} className="race__axis" textAnchor="end">{v}</text>
            </g>
          ))}
          {xTicks.map((i) => {
            const p = dayParts(nights[i]);
            return <text key={i} x={x(i)} y={H - 8} className="race__axis" textAnchor="middle">{p.day} {p.month}</text>;
          })}
          {series.map((s) => (
            <path key={s.house} className="race__line" stroke={colour(s.house)}
              d={s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')} />
          ))}
          {ends.map((e) => {
            const s = series.find((q) => q.house === e.house);
            const last = s.values.length - 1;
            return (
              <g key={e.house}>
                <circle cx={x(last)} cy={y(s.values[last])} r="4.5" fill={colour(e.house)} className="race__dot" />
                <text x={x(last) + 10} y={e.y + 4} className="race__label">{e.house} <tspan className="race__val">{e.v}</tspan></text>
              </g>
            );
          })}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} className="race__cross" />
              {series.map((s) => <circle key={s.house} cx={x(hover)} cy={y(s.values[hover])} r="4.5" fill={colour(s.house)} className="race__dot" />)}
            </g>
          )}
          <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} fill="transparent" />
        </svg>
        {tip && (
          <div className="race__tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
            <b>{fmtDay(nights[hover])}</b>
            {tip.map((t) => <span key={t.house}><i style={{ background: colour(t.house) }} />{t.house}<em>{t.v}</em></span>)}
          </div>
        )}
      </div>
      <figcaption className="hint">Running total after each night. Tap or hover to see any night.</figcaption>
      <details className="race__table">
        <summary>View as table</summary>
        <div className="tablewrap">
          <table className="grid">
            <thead><tr><th scope="col">Night</th>{series.map((s) => <th key={s.house} scope="col">{s.house}</th>)}</tr></thead>
            <tbody>
              {nights.map((n, i) => (i === 0 || series.some((s) => s.values[i] !== s.values[i - 1])) && (
                <tr key={n}><th scope="row">{fmtDay(n)}</th>{series.map((s) => <td key={s.house}>{s.values[i]}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
