import { useState } from 'react';
import { Crest, Empty, MatchCard, Section, donPoints, fmtPts, signed, stageName } from '../components.jsx';
import { REPLAY_EVENT } from '../Celebration.jsx';
import PointsRace from '../PointsRace.jsx';
import { shareCard } from '../shareCard.js';
import { parseScore, recentResults, textOn } from '../lib/derive.js';
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
  if (p.provisional) return `Reached the ${p.event} final: ${p.base} points now, ${e?.points1st ?? 'more'} in total if they win it`;
  if (!p.donPick) return `${p.place} place in ${p.event} (worth ${p.base} points)`;
  if (p.place === '1st') return `Won ${p.event} on Double or Nothing: ${p.base} points doubled to ${p.total}`;
  if (p.place === '2nd') return `2nd place in ${p.event} on Double or Nothing, so the ${p.base} points are lost`;
  const how = e?.format === 'Knockout' ? `Knocked out of ${p.event} in the semi-final` : `Finished outside the top 2 in ${p.event}`;
  return `${how} while on Double or Nothing: ${Math.abs(p.total)}-point penalty`;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function Breakdown({ house, data, ctx, link = true }) {
  const t = data.houseTotals.find((x) => x.house === house) || {};
  const lines = (ctx.pointsByHouse[house] || [])
    .map((p) => ({ key: p.event, href: href('sports', p.event), title: p.event, don: p.donPick, text: explain(p, ctx.eventMap[p.event]), pts: p.total }));
  // adjustments tagged to an event (e.g. a tied 2nd place) sit with the event points
  for (const [event, byHouse] of Object.entries(ctx.adjByEvent)) {
    const a = byHouse[house];
    if (a) lines.push({ key: `adj-${event}`, href: href('sports', event), title: event, text: cap(a.notes.join('; ')) || 'SCAM adjustment', pts: a.points });
  }
  lines.sort((a, b) => b.pts - a.pts);
  for (const w of data.weasley) {
    if (w.challenger !== house || w.result === 'Pending') continue;
    lines.push({
      key: `weasley-${w.event}`, href: href('sports', w.event), title: 'Weasley Challenge', pts: w.points,
      text: `${w.result === 'Won' ? 'Beat' : 'Lost to'} ${w.challenged} in the ${w.event} semi-final (${w.result === 'Won' ? 'bonus' : 'penalty'} of ${Math.abs(w.points)} points)`,
    });
  }
  const tagged = ctx.adjTagged[house] || 0;
  data.adjustments.filter((a) => a.house === house && !ctx.adjTaggedSet.has(a)).forEach((a, i) => {
    lines.push({ key: `adj-${i}`, title: 'SCAM adjustment', text: a.reason || (a.points < 0 ? 'Penalty' : 'Bonus'), pts: a.points });
  });
  const parts = [
    ['Events', (t.eventPoints ?? 0) + (t.donEffect ?? 0) + tagged], ['Weasley', t.weasley], ['SCAM', (t.adjustments ?? 0) - tagged],
  ].filter(([, v], i) => i === 0 || v);
  return (
    <div className="breakdown-card" style={{ '--house': ctx.houseMap[house]?.colour }}>
      <div className="breakdown-card__head">
        <h3>{house}</h3>
        <b className="breakdown-card__total">{t.total ?? 0}<small> pts</small></b>
      </div>
      {link && <a className="breakdown-card__more" href={href('house', house)}>See {house}'s whole tournament →</a>}
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
  const adj = sum('adjustments');
  for (const h of houses) adj[h] -= ctx.adjTagged[h] || 0;     // event-tagged adjustments are shown in their event's row
  const extras = [['Weasley Challenge', sum('weasley')], ['SCAM adjustments', adj]]
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
            {sortEvents(data.events).map((e) => {
              // a completed sport's row takes the winning house's colour
              const b = ctx.bracketMap[e.name];
              const won = b?.status === 'Decided' && ctx.houseMap[b.champion]?.colour;
              return (
              <tr key={e.name} className={won ? 'is-won' : undefined} style={won ? { '--house': won, '--on': textOn(won) } : undefined}>
                <th scope="row">
                  <a href={href('sports', e.name)}>{eventLabel(e)}</a>
                  {ctx.bracketMap[e.name]?.status === 'Decided' && <small className="grid__done"> (Completed)</small>}
                </th>
                {houses.map((h) => {
                  const p = cell[`${e.name}|${h}`];
                  const a = ctx.adjByEvent[e.name]?.[h];
                  const total = (p?.total || 0) + (a?.points || 0);
                  // show a number once the house's result in this event is known (placed or knocked out)
                  const started = (p && (p.place || p.total !== 0 || p.status === 'Decided')) || a;
                  return (
                    <td key={h} className={`${p?.donPick ? 'is-don' : ''} ${total < 0 ? 'neg' : ''} ${started && total === 0 ? 'is-zero' : ''}`}
                      title={p?.provisional ? 'Finalist: points for reaching the final' : undefined}>
                      {started ? total : <span className="muted">–</span>}
                      {p?.provisional && <sup className="prov">F</sup>}
                    </td>
                  );
                })}
              </tr>
              );
            })}
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
      {data.pointsLog.some((p) => p.provisional) && (
        <p className="legend"><sup className="prov">F</sup> Finalist: points for reaching the final. The winner gets the rest after the final. A house's DON sport is scored only after the final.</p>
      )}
    </>
  );
}

/** Big banner for the House Cup winner, shown once every sport is decided. */
function ChampionHero({ fin, ctx, data }) {
  const [sharing, setSharing] = useState('');
  const share = async () => {
    setSharing('Making the image…');
    try { const r = await shareCard(data, ctx); setSharing(r === 'downloaded' ? 'Image saved' : ''); } catch { setSharing('Could not make the image'); }
    setTimeout(() => setSharing(''), 2500);
  };
  const house = fin.champions[0];
  const colour = ctx.houseMap[house]?.colour || '#a8d43b';
  const joint = fin.champions.length > 1;
  return (
    <section className="champ" style={{ '--house': colour, '--on': textOn(colour) }} aria-label="House Cup champions">
      <p className="champ__kicker">🏆 {joint ? 'Joint House Cup Champions' : 'House Cup Champions'} 2026</p>
      <div className="champ__row">
        <div className="champ__crests">{fin.champions.map((h) => <Crest key={h} house={h} houseMap={ctx.houseMap} size={84} />)}</div>
        <div>
          <h1 className="champ__name">{fin.champions.join(' & ')}</h1>
          {!joint && <p className="champ__hostels">{hostelsOf(house).join(' · ')}</p>}
        </div>
      </div>
      {!joint && (
        <dl className="champ__stats">
          <div><dt>Points</dt><dd>{fin.lead}</dd></div>
          <div><dt>Sports won</dt><dd>{fin.titles[house]?.length || 0}</dd></div>
          <div><dt>Ahead of 2nd</dt><dd>+{fin.margin}</dd></div>
        </dl>
      )}
      {!joint && fin.titles[house] && (
        <ul className="champ__titles" aria-label="Sports won">
          {fin.titles[house].map((e) => <li key={e}><a href={href('sports', e)}>{e}</a></li>)}
        </ul>
      )}
      <div className="champ__actions">
        <button className="champ__btn champ__btn--solid" onClick={share} disabled={!!sharing}>📤 {sharing || 'Share final standings'}</button>
        {!joint && <a className="champ__btn" href={href('house', house)}>{house}'s tournament →</a>}
        <button className="champ__btn" onClick={() => window.dispatchEvent(new Event(REPLAY_EVENT))}>🎉 Celebrate again</button>
      </div>
    </section>
  );
}

const DON_OUTCOME = { '1st': 'Won it: points doubled', '2nd': 'Runner-up: no points', Out: 'Knocked out: penalty' };

/** End-of-tournament recap: medal table, DON and Weasley outcomes, standout results. */
function Recap({ data, ctx, fin }) {
  const sc = (m) => { const p = parseScore(m.score); return p ? `${Math.max(...p)}–${Math.min(...p)}` : m.score; };   // winner first
  return (
    <Section title="Tournament in numbers">
      <ul className="recap-tiles">
        <li><b>{fin.played}</b><span>matches played</span></li>
        <li><b>{fin.sports}</b><span>sports</span></li>
        <li><b>{data.matches.filter((m) => m.type === 'Event').length}</b><span>events & nights</span></li>
      </ul>

      <h3 className="recap-h">Medal table</h3>
      <div className="tablewrap">
        <table className="grid medals">
          <thead><tr><th scope="col">House</th><th scope="col">🥇 Won</th><th scope="col">🥈 Runner-up</th><th scope="col">Points</th></tr></thead>
          <tbody>
            {fin.medals.map((r) => (
              <tr key={r.house} className={r.rank === 1 ? 'is-won' : undefined}
                style={r.rank === 1 ? { '--house': ctx.houseMap[r.house]?.colour, '--on': textOn(ctx.houseMap[r.house]?.colour) } : undefined}>
                <th scope="row"><a className="medals__house" href={href('house', r.house)}><Crest house={r.house} houseMap={ctx.houseMap} size={20} /> {ordinal(r.rank)} · {r.house}</a></th>
                <td>{r.gold}</td><td>{r.silver}</td><td>{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="recap-h">Double or Nothing: how the bets landed</h3>
      <ul className="stakes">
        {fin.don.map((d) => (
          <li key={d.house}>
            <HouseNameLite house={d.house} ctx={ctx} />
            <span><a href={href('sports', d.event)}>{d.event}</a> · {DON_OUTCOME[d.place] || 'Pending'}</span>
            <b className={donPoints(d) < 0 ? 'neg' : ''}>{fmtPts(donPoints(d))}</b>
          </li>
        ))}
      </ul>

      {fin.weasley.length > 0 && (
        <>
          <h3 className="recap-h">Weasley Challenges</h3>
          <ul className="stakes">
            {fin.weasley.map((w) => (
              <li key={w.challenger + w.event}>
                <HouseNameLite house={w.challenger} ctx={ctx} />
                <span>{w.result === 'Won' ? 'Beat' : 'Lost to'} {w.challenged} · {w.event}</span>
                <b className={w.points < 0 ? 'neg' : ''}>{signed(w.points)}</b>
              </li>
            ))}
          </ul>
        </>
      )}

      {(fin.closest || fin.biggest) && (
        <>
          <h3 className="recap-h">Moments</h3>
          <ul className="moments">
            {fin.closest && (
              <li><span className="moments__tag">Closest final</span>
                <a href={href('sports', fin.closest.event)}>{fin.closest.event}</a>: {fin.closest.winner} won by {fin.closest.by} ({sc(fin.closest)})</li>
            )}
            {fin.biggest && (
              <li><span className="moments__tag">Biggest win</span>
                <a href={href('sports', fin.biggest.event)}>{fin.biggest.event}</a> {stageName(fin.biggest.stage).toLowerCase()}: {fin.biggest.winner} won {sc(fin.biggest)}</li>
            )}
          </ul>
        </>
      )}
    </Section>
  );
}

function HouseNameLite({ house, ctx }) {
  return <span className="team"><Crest house={house} houseMap={ctx.houseMap} size={22} /><span className="team__name">{house}</span></span>;
}

// Junior SCAM, alphabetical (names as given by SCAM, 3 Nov)
const JUNIOR_SCAM = ['Arya', 'Harsh', 'Kavya', 'Khushi', 'Meet', 'Mudit', 'Rishabh', 'Ruchikar', 'Sanyam', 'Shruti', 'Vasu', 'Vijay'];

function Credits() {
  return (
    <section className="credits" aria-labelledby="credits-title">
      <img src="/brand/scam-logo.png" alt="SCAM" width="72" height="72" loading="lazy" />
      <h2 id="credits-title">Thank you</h2>
      <p>Goblet of Fire 2026 was brought to you by the whole <b>SCAM</b> team. Thank you to every house, every player and everyone who came out to cheer.</p>
      <div className="credits__special">
        <p className="credits__kicker">A special mention</p>
        <h3>Junior SCAM</h3>
        <p>Who literally gave it their all to make this a tournament the campus never forgets.</p>
        <ul className="credits__names">{JUNIOR_SCAM.map((n) => <li key={n}>{n}</li>)}</ul>
      </div>
    </section>
  );
}

export default function Home({ data, ctx, now, fin }) {
  const [open, setOpen] = useState(null);
  const recent = recentResults(data, 10);       // newest first
  const rankCount = data.standings.reduce((m, s) => ({ ...m, [s.rank]: (m[s.rank] || 0) + 1 }), {});

  return (
    <>
      {fin && <ChampionHero fin={fin} ctx={ctx} data={data} />}
      {fin && <Credits />}
      <Section title={fin ? 'Final Standings' : 'Current Standings'}>
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

      {fin && (
        <Section title="The points race">
          <PointsRace data={data} ctx={ctx} />
        </Section>
      )}

      <Section title="Points table">
        <PointsTable data={data} ctx={ctx} />
      </Section>

      {fin && <Recap data={data} ctx={ctx} fin={fin} />}

      <Section title="Latest results">
        {recent.length ? (
          <div className="cards">{recent.map((m) => <MatchCard key={m.id} m={m} ctx={ctx} now={now} rollover={data.meta.rolloverHour} showDay />)}</div>
        ) : <Empty>No results yet — the tournament starts soon!</Empty>}
      </Section>
    </>
  );
}
