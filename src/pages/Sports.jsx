import { useState } from 'react';
import { Crest, Empty, HouseName, MatchCard, Section, signed } from '../components.jsx';
import { GENDER_ORDER } from '../lib/derive.js';
import { fmtDay, fmtTime, isAfterMidnight } from '../lib/time.js';
import { href } from '../hooks.js';

export function SportsList({ data, ctx }) {
  const [gender, setGender] = useState('All');
  const events = data.events.filter((e) => gender === 'All' || e.gender === gender);
  return (
    <>
      <div className="segmented" role="tablist">
        {['All', ...GENDER_ORDER].map((g) => (
          <button key={g} role="tab" aria-selected={gender === g} onClick={() => setGender(g)}>{g}</button>
        ))}
      </div>
      <ul className="eventgrid">
        {events.map((e) => {
          const b = ctx.bracketMap[e.name] || {};
          return (
            <li key={e.name}>
              <a className={`eventcard eventcard--${(b.status || 'Upcoming').replace(' ', '-').toLowerCase()}`} href={href('sports', e.name)}>
                <b className="eventcard__name">{e.name}</b>
                <span className="eventcard__status">
                  {b.champion ? (
                    <><Crest house={b.champion} houseMap={ctx.houseMap} size={20} /> 🏆 {b.champion}</>
                  ) : <span className={`pill pill--${b.status === 'In progress' ? 'progress' : 'muted'}`}>{b.status || 'Upcoming'}</span>}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function BracketBox({ m, label, ctx, rollover }) {
  if (!m) return <div className="bbox bbox--missing"><div className="bbox__label">{label}</div><Empty>Not scheduled</Empty></div>;
  const row = (team, n) => (
    <div className={`bbox__team ${m.winner && m.winner === team ? 'is-win' : m.winner ? 'is-lose' : ''}`}>
      <HouseName house={team} houseMap={ctx.houseMap} placeholder={m.stage === 'Final' ? `Winner Semi-final ${n}` : 'TBD'} trophy={m.official && m.winner === team} />
    </div>
  );
  return (
    <div className={`bbox ${m.status === 'Live' ? 'is-live' : ''}`}>
      <div className="bbox__label">
        {label}
        <small>{fmtDay(m.night)}{isAfterMidnight(m.start, rollover) ? ' night' : ''}{m.start ? ` · ${fmtTime(m.start)}` : ''}</small>
      </div>
      {row(m.teamA, 1)}
      {row(m.teamB, 2)}
      {(m.score || m.status === 'Live' || m.status === 'Walkover') && (
        <div className="bbox__score">{m.status === 'Live' && <><i className="dot" /> LIVE </>}{m.status === 'Walkover' && m.official ? 'Walkover ' : ''}{m.score}</div>
      )}
    </div>
  );
}

export function SportDetail({ data, ctx, now, name }) {
  const e = ctx.eventMap[name];
  if (!e) return <Empty>Event not found. <a href={href('sports')}>Back to all sports</a></Empty>;
  const matches = ctx.matchesByEvent[name] || [];
  const b = ctx.bracketMap[name] || {};
  const byStage = Object.fromEntries(matches.map((m) => [m.stage, m]));
  const dons = data.don.filter((d) => d.valid && d.event === name);
  const weasley = ctx.weasleyByEvent[name] || [];
  const tied = !b.runnerUp && ctx.tiedSecond[name];
  const adj = ctx.adjByEvent[name] || {};
  const log = data.pointsLog.filter((p) => p.event === name)
    .map((p) => (adj[p.house] ? { ...p, total: p.total + adj[p.house].points, place: p.place || (tied?.includes(p.house) ? 'Joint 2nd' : 'SCAM adjustment') } : p))
    .filter((p) => p.place === '1st' || p.place === '2nd' || p.total !== 0 || adj[p.house])
    .sort((a, b) => b.total - a.total);

  return (
    <>
      <a className="back" href={href('sports')}>← All sports</a>
      <header className="eventhead">
        <h1>{e.name}</h1>
        <p>{e.venue}</p>
        <div className="eventhead__pts">
          <span>🥇 <b>{e.points1st}</b></span>
          <span>🥈 <b>{e.points2nd}</b></span>
          {!e.donEligible && <span className="muted">No DON</span>}
        </div>
      </header>

      {e.format === 'Knockout' ? (
        <Section title="Bracket">
          <div className="bracket">
            <div className="bracket__semis">
              <BracketBox m={byStage['Semi 1']} label="Semi-final 1" ctx={ctx} rollover={data.meta.rolloverHour} />
              <BracketBox m={byStage['Semi 2']} label="Semi-final 2" ctx={ctx} rollover={data.meta.rolloverHour} />
            </div>
            <div className="bracket__final">
              <BracketBox m={byStage.Final} label="Final" ctx={ctx} rollover={data.meta.rolloverHour} />
              <div className={`champion ${b.champion ? 'is-set' : ''}`}>
                {b.champion ? <>🏆 <HouseName house={b.champion} houseMap={ctx.houseMap} strong /></> : <span className="muted">Champion TBD</span>}
              </div>
            </div>
          </div>
        </Section>
      ) : (
        <Section title="Result">
          {b.champion ? (
            <div className={`podium ${tied ? 'podium--tie' : ''}`}>
              <div className="podium__step podium__step--1"><span>🥇</span><Crest house={b.champion} houseMap={ctx.houseMap} size={44} /><b>{b.champion}</b><small>{e.points1st} pts</small></div>
              {tied ? tied.map((h) => (
                <div key={h} className="podium__step podium__step--2"><span>🥈</span><Crest house={h} houseMap={ctx.houseMap} size={44} /><b>{h}</b><small>Joint 2nd · {ctx.adjByEvent[name][h].points} pts</small></div>
              )) : (
                <div className="podium__step podium__step--2"><span>🥈</span><Crest house={b.runnerUp} houseMap={ctx.houseMap} size={44} /><b>{b.runnerUp}</b><small>{e.points2nd} pts</small></div>
              )}
            </div>
          ) : (
            <div className="cards">{matches.map((m) => <MatchCard key={m.id} m={m} ctx={ctx} now={now} rollover={data.meta.rolloverHour} showDay />)}</div>
          )}
        </Section>
      )}

      {(dons.length > 0 || weasley.length > 0) && (
        <Section title="On the line">
          <ul className="stakes">
            {dons.map((d) => (
              <li key={d.house}><HouseName house={d.house} houseMap={ctx.houseMap} /> <span>Double or Nothing</span>{d.place && <b className={d.effect < 0 ? 'neg' : ''}>{signed(d.effect)}</b>}</li>
            ))}
            {weasley.map((w) => (
              <li key={w.challenger}><HouseName house={w.challenger} houseMap={ctx.houseMap} /> <span>Weasley vs {w.challenged}</span>{w.result !== 'Pending' && <b className={w.points < 0 ? 'neg' : ''}>{signed(w.points)}</b>}</li>
            ))}
          </ul>
        </Section>
      )}

      {log.length > 0 && (
        <Section title="Points">
          <ul className="stakes">
            {log.map((p) => (
              <li key={p.house}>
                <HouseName house={p.house} houseMap={ctx.houseMap} />
                <span>{p.place}{p.donPick ? ' · DON' : ''}</span>
                <b className={p.total < 0 ? 'neg' : ''}>{signed(p.total)}</b>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
