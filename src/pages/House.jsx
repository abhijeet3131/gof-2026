import { Crest, Empty, MatchCard, Section, donPoints, fmtPts, signed } from '../components.jsx';
import { textOn } from '../lib/derive.js';
import { hostelsOf, ordinal } from '../lib/brand.js';
import { href } from '../hooks.js';
import { Breakdown } from './Home.jsx';

/** One house's whole tournament: rank, record, titles, points by sport, DON/Weasley and every match. */
export default function House({ data, ctx, now, name }) {
  const s = data.standings.find((x) => x.house === name);
  if (!s) return <Empty>House not found. <a href={href()}>Back to standings</a></Empty>;
  const colour = ctx.houseMap[name]?.colour || '#888888';
  const mine = (m) => m.type !== 'Event' && (m.format === 'Single round' || m.teamA === name || m.teamB === name);
  const matches = data.matches.filter(mine);
  const knockout = matches.filter((m) => m.official && m.format === 'Knockout' && (m.teamA === name || m.teamB === name));
  const won = knockout.filter((m) => m.winner === name).length;
  const titles = data.brackets.filter((b) => b.champion === name).map((b) => b.event);
  const silvers = data.brackets.filter((b) => b.runnerUp === name).map((b) => b.event);
  const don = data.don.find((d) => d.house === name && d.valid && d.event);
  const weasley = data.weasley.filter((w) => w.challenger === name);
  const tied = data.standings.filter((x) => x.rank === s.rank).length > 1;

  return (
    <>
      <a className="back" href={href()}>← Standings</a>
      <header className="househead" style={{ '--house': colour, '--on': textOn(colour) }}>
        <Crest house={name} houseMap={ctx.houseMap} size={76} />
        <div>
          <p className="househead__rank">{tied ? '=' : ''}{ordinal(s.rank)} place</p>
          <h1>{name}</h1>
          <p className="househead__hostels">{hostelsOf(name).join(' · ')}</p>
        </div>
        <b className="househead__pts">{s.total}<small>pts</small></b>
      </header>

      <ul className="recap-tiles recap-tiles--4">
        <li><b>{titles.length}</b><span>sports won</span></li>
        <li><b>{silvers.length}</b><span>runner-up</span></li>
        <li><b>{won}–{knockout.length - won}</b><span>match record</span></li>
        <li><b>{don ? fmtPts(donPoints(don)).replace(' pts', '') : '–'}</b><span>DON points</span></li>
      </ul>

      {titles.length > 0 && (
        <Section title="Titles">
          <ul className="champ__titles champ__titles--plain">{titles.map((e) => <li key={e}><a href={href('sports', e)}>🥇 {e}</a></li>)}</ul>
          {silvers.length > 0 && <ul className="champ__titles champ__titles--plain">{silvers.map((e) => <li key={e}><a href={href('sports', e)}>🥈 {e}</a></li>)}</ul>}
        </Section>
      )}

      {(don || weasley.length > 0) && (
        <Section title="Bets & challenges">
          <ul className="stakes">
            {don && (
              <li><span>🎲 Double or Nothing</span><span><a href={href('sports', don.event)}>{don.event}</a> · {don.place === '1st' ? 'won it, points doubled' : don.place === '2nd' ? 'runner-up, no points' : don.place === 'Out' ? 'knocked out' : 'pending'}</span>
                <b className={donPoints(don) < 0 ? 'neg' : ''}>{fmtPts(donPoints(don))}</b></li>
            )}
            {weasley.map((w) => (
              <li key={w.event}><span>⚡ Weasley Challenge</span><span>{w.result === 'Won' ? 'Beat' : w.result === 'Lost' ? 'Lost to' : 'vs'} {w.challenged} · {w.event}</span>
                {w.result !== 'Pending' && <b className={w.points < 0 ? 'neg' : ''}>{signed(w.points)}</b>}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Points by sport">
        <Breakdown house={name} data={data} ctx={ctx} link={false} />
      </Section>

      <Section title={`Every ${name} match`}>
        {matches.length
          ? <div className="cards">{matches.map((m) => <MatchCard key={m.id} m={m} ctx={ctx} now={now} rollover={data.meta.rolloverHour} showDay />)}</div>
          : <Empty>No matches yet.</Empty>}
      </Section>
    </>
  );
}
