import { useState } from 'react';
import { Crest, Empty, MatchCard, Section, signed } from '../components.jsx';
import { recentResults, textOn } from '../lib/derive.js';
import { eventLabel, hostelsOf, ordinal, sortEvents } from '../lib/brand.js';
import { href } from '../hooks.js';

function Pennant({ s, ctx, tied, selected, onSelect }) {
  const colour = ctx.houseMap[s.house]?.colour || '#666666';
  return (
    <li>
      <button className={`pennant ${selected ? 'is-selected' : ''}`} style={{ '--house': colour, '--on': textOn(colour) }}
        onClick={onSelect} aria-pressed={selected} aria-label={`${s.house}, ${ordinal(s.rank)}, ${s.total} points`}>
        <span className="pennant__rank">{tied ? '=' : ''}{ordinal(s.rank)}</span>
        <Crest house={s.house} houseMap={ctx.houseMap} size={48} />
        <span className="pennant__pts">{s.total}</span>
        <span className="pennant__unit">pts</span>
        <span className="pennant__name">{s.house}</span>
      </button>
      <ul className="hostels" aria-label={`${s.house} hostels`}>
        {hostelsOf(s.house).map((h) => <li key={h}>{h}</li>)}
      </ul>
    </li>
  );
}

/** Plain-language reason for a house's points in one event, e.g. "2nd place in BGMI (worth 50 points)". */
function explain(p, e) {
  if (!p.donPick) return `${p.place} place in ${p.event} (worth ${p.base} points)`;
  if (p.place === '1st') return `Won ${p.event} on Double or Nothing: ${p.base} points doubled to ${p.total}`;
  if (p.place === '2nd') return `2nd place in ${p.event} on Double or Nothing, so the ${p.base} points are lost`;
  const how = e?.format === 'Knockout' ? `Knocked out of ${p.event} in the semi-final` : `Finished outside the top 2 in ${p.event}`;
  return `${how} while on Double or Nothing: ${Math.abs(p.total)}-point penalty`;
}

function Breakdown({ house, data, ctx }) {
  const t = data.houseTotals.find((x) => x.house === house) || {};
  const lines = (ctx.pointsByHouse[house] || []).slice().sort((a, b) => b.total - a.total)
    .map((p) => ({ key: p.event, href: href('sports', p.event), title: p.event, don: p.donPick, text: explain(p, ctx.eventMap[p.event]), pts: p.total }));
  for (const w of data.weasley) {
    if (w.challenger !== house || w.result === 'Pending') continue;
    lines.push({
      key: `weasley-${w.event}`, href: href('sports', w.event), title: 'Weasley Challenge', pts: w.points,
      text: `${w.result === 'Won' ? 'Beat' : 'Lost to'} ${w.challenged} in the ${w.event} semi-final (${w.result === 'Won' ? 'bonus' : 'penalty'} of ${Math.abs(w.points)} points)`,
    });
  }
  data.adjustments.filter((a) => a.house === house).forEach((a, i) => {
    lines.push({ key: `adj-${i}`, title: 'SCAM adjustment', text: a.reason || (a.points < 0 ? 'Penalty' : 'Bonus'), pts: a.points });
  });
  const parts = [
    ['Events', t.eventPoints], ['DON', t.donEffect], ['Weasley', t.weasley], ['SCAM', t.adjustments],
  ].filter(([, v], i) => i === 0 || v);
  return (
    <div className="breakdown-card" style={{ '--house': ctx.houseMap[house]?.colour }}>
      <div className="breakdown-card__head">
        <h3>{house}</h3>
        <b className="breakdown-card__total">{t.total ?? 0}<small> pts</small></b>
      </div>
      <p className="breakdown-card__parts">
        {parts.map(([k, v], i) => <span key={k}>{k} <b>{i === 0 ? v ?? 0 : signed(v)}</b></span>)}
      </p>
      {lines.length > 0 ? (
        <ul className="lines">
          {lines.map((l) => (
            <li key={l.key}>
              <div className="lines__main">
                {l.href ? <a href={l.href}>{l.title}</a> : <span>{l.title}</span>}
                {l.don && <span className="lines__don">DON</span>}
                <small className="lines__why">{l.text}</small>
              </div>
              <b className={l.pts < 0 ? 'neg' : ''}>{signed(l.pts)}</b>
            </li>
          ))}
        </ul>
      ) : <Empty>No points yet.</Empty>}
    </div>
  );
}

/** Sport x house grid, styled after last year's points table. DON picks are tinted. */
function PointsTable({ data, ctx }) {
  const houses = data.houses.map((h) => h.name).sort();
  const cell = {};
  for (const p of data.pointsLog) cell[`${p.event}|${p.house}`] = p;
  const sum = (field) => Object.fromEntries(houses.map((h) => [h, data.houseTotals.find((t) => t.house === h)?.[field] ?? 0]));
  const extras = [['Weasley Challenge', sum('weasley')], ['SCAM adjustments', sum('adjustments')]]
    .filter(([, row]) => houses.some((h) => row[h]));
  const totals = sum('total');

  return (
    <>
      <div className="tablewrap">
        <table className="grid">
          <thead>
            <tr>
              <th scope="col">Sport</th>
              {houses.map((h) => (
                <th key={h} scope="col" title={h}>
                  <Crest house={h} houseMap={ctx.houseMap} size={22} />
                  <span style={{ '--house-c': ctx.houseMap[h]?.colour }}>{ctx.houseMap[h]?.code || h[0]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortEvents(data.events).map((e) => (
              <tr key={e.name}>
                <th scope="row"><a href={href('sports', e.name)}>{eventLabel(e)}</a></th>
                {houses.map((h) => {
                  const p = cell[`${e.name}|${h}`];
                  // show a number once the house's result in this event is known (placed or knocked out)
                  const started = p && (p.place || p.total !== 0);
                  return (
                    <td key={h} className={`${p?.donPick ? 'is-don' : ''} ${p?.total < 0 ? 'neg' : ''} ${started && p.total === 0 ? 'is-zero' : ''}`}>
                      {started ? p.total : <span className="muted">–</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
            {extras.map(([label, row]) => (
              <tr key={label} className="grid__extra">
                <th scope="row">{label}</th>
                {houses.map((h) => <td key={h} className={row[h] < 0 ? 'neg' : row[h] === 0 ? 'is-zero' : ''}>{signed(row[h])}</td>)}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              {houses.map((h) => <td key={h}>{totals[h]}</td>)}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="legend"><i className="legend__don" /> Double or Nothing pick</p>
    </>
  );
}

export default function Home({ data, ctx, now }) {
  const [open, setOpen] = useState(null);
  const recent = recentResults(data, 3);
  const rankCount = data.standings.reduce((m, s) => ({ ...m, [s.rank]: (m[s.rank] || 0) + 1 }), {});

  return (
    <>
      <Section title="House Cup">
        <ol className="pennants">
          {data.standings.map((s) => (
            <Pennant key={s.house} s={s} ctx={ctx} tied={rankCount[s.rank] > 1}
              selected={open === s.house} onSelect={() => setOpen(open === s.house ? null : s.house)} />
          ))}
        </ol>
        {open
          ? <Breakdown house={open} data={data} ctx={ctx} />
          : <p className="hint center">Tap a banner to see how the points add up.</p>}
      </Section>

      <Section title="Points table">
        <PointsTable data={data} ctx={ctx} />
      </Section>

      <Section title="Latest results">
        {recent.length ? (
          <div className="cards">{recent.map((m) => <MatchCard key={m.id} m={m} ctx={ctx} now={now} rollover={data.meta.rolloverHour} showDay />)}</div>
        ) : <Empty>No results yet — the tournament starts soon!</Empty>}
      </Section>
    </>
  );
}
