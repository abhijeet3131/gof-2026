import { Fragment } from 'react';
import { matchState, textOn } from './lib/derive.js';
import { fmtDay, fmtTime, isAfterMidnight } from './lib/time.js';
import { href } from './hooks.js';
import { HOUSE_BRAND } from './lib/brand.js';

const SHIELD = 'M50 3C62 12 80 13 96 8V58C96 88 74 105 50 115C26 105 4 88 4 58V8C20 13 38 12 50 3Z';

/** House crest: a shield in the house colour with the jersey mascot (falls back to the house initial). */
export function Crest({ house, houseMap, size = 28 }) {
  const h = houseMap[house];
  const colour = h?.colour || '#6b6b6b';
  const mascot = HOUSE_BRAND[house]?.mascot;
  return (
    <span className="crest" style={{ '--house': colour, width: size, height: size * 1.15 }} aria-hidden="true">
      <svg viewBox="0 0 100 118" className="crest__shield"><path d={SHIELD} /></svg>
      {mascot
        ? <img className="crest__mascot" src={mascot} alt="" loading="lazy" />
        : <b className="crest__letter" style={{ color: textOn(colour), fontSize: size * 0.45 }}>{(h?.code || house?.[0] || '?').slice(0, 1)}</b>}
    </span>
  );
}

export function HouseName({ house, houseMap, placeholder = 'TBD', strong, lose, trophy }) {
  if (!house) return <span className="team team--tbd">{placeholder}</span>;
  return (
    <span className={'team' + (strong ? ' team--win' : '') + (lose ? ' team--lose' : '') + (trophy ? ' team--trophy' : '')}>
      <Crest house={house} houseMap={houseMap} size={22} />
      <span className="team__name">{house}{trophy && <span className="sr-only"> (winner)</span>}</span>
    </span>
  );
}

const STATE_LABEL = {
  live: 'Live', done: 'Completed', awaiting: 'Result awaited', postponed: 'Postponed',
  cancelled: 'Cancelled', upcoming: '', event: '', 'event-now': 'On now',
};

export function StatePill({ state, status }) {
  let label = STATE_LABEL[state];
  if (state === 'done' && status === 'Walkover') label = 'Walkover';
  if (!label) return null;
  return <span className={`pill pill--${state}`}>{state === 'live' && <i className="dot" />}{label}</span>;
}

function TimeCol({ m, rollover }) {
  if (!m.start) return <div className="mc__time"><b>All</b><small>evening</small></div>;
  const [t, ampm] = fmtTime(m.start).split(' ');
  return (
    <div className="mc__time">
      <b>{t}</b><small>{ampm}</small>
      {isAfterMidnight(m.start, rollover) && <small className="mc__late" title="After midnight">next day</small>}
    </div>
  );
}

export function MatchCard({ m, ctx, now, rollover, showDay }) {
  const state = matchState(m, now);
  const { houseMap } = ctx;
  const dayLabel = showDay && <span className="mc__day">{fmtDay(m.night)}</span>;

  if (m.type === 'Event') {
    return (
      <article className={`mc mc--event ${state === 'event-now' ? 'is-now' : ''}`}>
        <TimeCol m={m} rollover={rollover} />
        <div className="mc__body">
          <div className="mc__head">{dayLabel}<span className="mc__kicker">Event</span><StatePill state={state} /></div>
          <div className="mc__title">{m.name}</div>
          {m.notes && <div className="mc__note">{m.notes}</div>}
        </div>
      </article>
    );
  }

  const isSingle = m.format === 'Single round';
  const dons = ctx.donByEvent[m.event] || [];
  const weasley = (ctx.weasleyByEvent[m.event] || []).find(
    (w) => m.stage.startsWith('Semi') && [m.teamA, m.teamB].includes(w.challenger) && [m.teamA, m.teamB].includes(w.challenged));
  const placeholder = (n) => (m.stage === 'Final' ? `Winner Semi-final ${n}` : 'TBD');
  const done = state === 'done';
  const donTags = dons.filter((h) => isSingle || [m.teamA, m.teamB].includes(h));

  return (
    <article className={`mc mc--${state}`}>
      <TimeCol m={m} rollover={rollover} />
      <div className="mc__body">
        <div className="mc__head">
          {dayLabel}
          <a className="mc__kicker" href={href('sports', m.event)}>{m.event}{m.stage && !isSingle ? ` · ${stageName(m.stage)}` : ''}</a>
          <StatePill state={state} status={m.status} />
        </div>

        {isSingle ? (
          state === 'done' ? (
            <div className="podium-mini">
              <span>🥇</span><HouseName house={m.winner} houseMap={houseMap} strong />
              {(ctx.tiedSecond[m.event] && !m.second ? ctx.tiedSecond[m.event] : [m.second]).map((h) => (
                <Fragment key={h || '2nd'}><span>🥈</span><HouseName house={h} houseMap={houseMap} /></Fragment>
              ))}
            </div>
          ) : <div className="mc__title">All four houses</div>
        ) : (
          <div className="vs">
            <HouseName house={m.teamA} houseMap={houseMap} placeholder={placeholder(1)} strong={done && m.winner === m.teamA} />
            <span className="vs__v">vs</span>
            <HouseName house={m.teamB} houseMap={houseMap} placeholder={placeholder(2)} strong={done && m.winner === m.teamB} />
          </div>
        )}

        {(m.score || (done && !isSingle)) && (
          <div className="mc__score">
            {m.score}
            {done && !isSingle && <span className="mc__winner">🏆 {m.winner}{m.status === 'Walkover' ? ' (walkover)' : ''}</span>}
          </div>
        )}

        <div className="mc__foot">
          {m.venue && <span className="mc__venue">📍 {m.venue}</span>}
          {weasley && <span className="tag tag--weasley" title="Weasley Challenge: challenger +50 / -50">Weasley Challenge</span>}
          {donTags.map((h) => (
            <span key={h} className="tag tag--don" style={{ borderColor: houseMap[h]?.colour }} title={`${h}: Double or Nothing`}>DON · {houseMap[h]?.code || h}</span>
          ))}
        </div>
        {m.notes && <div className="mc__note">{m.notes}</div>}
      </div>
    </article>
  );
}

/** 'Semi 1' -> 'Semi-final 1' */
export const stageName = (stage) => stage.replace(/^Semi (\d)$/, 'Semi-final $1');

export function Section({ title, action, children }) {
  return (
    <section className="section">
      <div className="section__head"><h2>{title}</h2>{action}</div>
      {children}
    </section>
  );
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>;
}

export const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
