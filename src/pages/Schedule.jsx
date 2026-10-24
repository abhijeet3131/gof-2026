import { useEffect, useMemo, useRef, useState } from 'react';
import { Empty, MatchCard, stageName } from '../components.jsx';
import { matchState } from '../lib/derive.js';
import { buildGrid } from '../lib/grid.js';
import { daysBetween, dayParts, fmtDay, fmtTime, nightOf } from '../lib/time.js';
import { href } from '../hooks.js';

const VIEW_KEY = 'gof.scheduleView';
const NOTE = 'Kindly note that the schedule is dynamic in nature and subject to change. Playing teams are thus encouraged to be on campus and available for matches on short notice.';

function DayStrip({ days, selected, today, ctx }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.querySelector('[aria-current="date"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [selected]);
  return (
    <nav className="daystrip" ref={ref} aria-label="Pick a day">
      {days.map((d) => {
        const p = dayParts(d);
        const items = ctx.matchesByNight[d] || [];
        const sports = items.filter((m) => m.type === 'Sport').length;
        return (
          <a key={d} href={href('schedule', d)} className={`daychip ${d === today ? 'is-today' : ''}`}
            aria-current={d === selected ? 'date' : undefined}>
            <small>{p.weekday}</small>
            <b>{p.day}</b>
            <small>{p.month}</small>
            <i className="daychip__dots">{sports ? '•'.repeat(Math.min(sports, 5)) : items.length ? '✦' : ''}</i>
          </a>
        );
      })}
    </nav>
  );
}

/** Text for one grid cell, in the style of SCAM's sheet: "Football (W) · G v S", "Volleyball (M) Final". */
function cellText(m, ctx) {
  if (m.type === 'Event') return { title: m.name };
  const code = (h) => ctx.houseMap[h]?.code || h?.[0] || '?';
  const short = m.event.replace(/ Men$/, ' (M)').replace(/ Women$/, ' (W)');
  let sub = '';
  if (m.stage === 'Single round') sub = 'All';
  else if (m.teamA && m.teamB) sub = `${code(m.teamA)} v ${code(m.teamB)}`;
  return { title: m.stage === 'Final' ? `${short} Final` : short, sub, winner: m.official && m.winner ? code(m.winner) : '' };
}

function GridView({ data, ctx, now, today, onPickDay }) {
  const { meta } = data;
  const days = daysBetween(meta.startDate, meta.endDate);
  const grid = useMemo(() => buildGrid(data.matches, days, meta.rolloverHour), [data, meta.startDate, meta.endDate]);
  const wrap = useRef(null);
  const firstEvening = useMemo(() => {
    const tonight = grid.rows.find((r) => r.night === today);
    const cols = (tonight?.items || []).filter((it) => it.m.type !== 'Event' && grid.cols[it.c0]?.start >= 12 * 60).map((it) => it.c0);
    return cols.length ? Math.min(...cols) : -1;
  }, [grid, today]);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = wrap.current;
      if (!el) return;
      // open with tonight's row just under the sticky time header
      const row = el.querySelector('.sg__date.is-today');
      const head = el.querySelector('.sg__time');
      if (row && head) el.scrollTop += row.getBoundingClientRect().top - head.getBoundingClientRect().bottom;
      // on narrow screens, also slide across to tonight's first evening match
      const target = el.querySelector(`.sg__time[data-col="${firstEvening}"]`);
      const date = el.querySelector('.sg__corner');
      if (target && date) el.scrollLeft = Math.max(0, el.scrollLeft + target.getBoundingClientRect().left - date.getBoundingClientRect().right - 6);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const cols = `var(--sg-date) ${grid.cols.map((c) => (c.gap ? '8px' : 'minmax(var(--sg-slot), 1fr)')).join(' ')}`;
  const firstNext = grid.cols.findIndex((c) => c.nextDay);
  let rowAt = 3;                                          // grid rows 1-2 are the header
  return (
    <div className="sg-wrap" ref={wrap} role="region" aria-label="Full schedule" tabIndex={0}>
      <div className="sg" style={{ gridTemplateColumns: cols }}>
        <div className="sg__corner" style={{ gridRow: '1 / 3' }}>Date</div>
        <div className="sg__headbg" style={{ gridRow: 1, gridColumn: '2 / -1' }} />
        {firstNext > 0 && (
          <div className="sg__next" style={{ gridRow: 1, gridColumn: `${firstNext + 2} / ${grid.cols.length + 2}` }}>Next day</div>
        )}
        {grid.cols.map((c, i) => {
          if (c.gap) return <div key={i} className="sg__gap sg__gap--head" style={{ gridRow: '1 / 3', gridColumn: i + 2 }} />;
          const [t, ampm] = fmtTime(c.time).split(' ');
          return <div key={i} className="sg__time" data-col={i} style={{ gridRow: 2, gridColumn: i + 2 }}>{t}<small>{ampm}</small></div>;
        })}

        {grid.rows.map((r) => {
          const top = rowAt;
          rowAt += r.lanes;
          const span = `${top} / ${top + r.lanes}`;
          const p = dayParts(r.night);
          const past = r.night < today;
          return [
            <button key={`d${r.night}`} type="button" onClick={() => onPickDay(r.night)}
              className={`sg__date ${r.night === today ? 'is-today' : ''} ${past ? 'is-past' : ''}`} style={{ gridRow: span }}
              title={`Open ${fmtDay(r.night)} in the day view`}>
              <b>{p.day} {p.month}</b><small>{p.weekday}</small>
            </button>,
            ...grid.cols.map((c, i) => (
              <div key={`b${r.night}${i}`} className={`sg__cell ${c.gap ? 'sg__gap' : ''} ${r.night === today ? 'is-today' : ''}`}
                style={{ gridRow: span, gridColumn: i + 2 }} />
            )),
            ...r.items.map((it) => {
              const m = it.m;
              const t = cellText(m, ctx);
              const state = matchState(m, now);
              const kind = m.type === 'Event' ? 'event' : m.stage === 'Final' ? 'final' : 'match';
              const when = m.start ? `${fmtTime(m.start)}${m.end ? `–${fmtTime(m.end)}` : ''}` : 'All evening';
              const full = m.type === 'Event' ? `${m.name} · ${when}`
                : `${m.event} · ${stageName(m.stage)}${m.teamA && m.teamB ? ` · ${m.teamA} v ${m.teamB}` : ''} · ${when}${m.official && m.winner ? ` · Won by ${m.winner}` : ''}`;
              const props = {
                className: `sg__item sg__item--${kind} sg__item--${state} ${past ? 'is-past' : ''}`,
                style: { gridRow: top + it.lane, gridColumn: `${it.c0 + 2} / ${it.c1 + 2}` },
                title: full,
              };
              const body = (
                <>
                  <span className="sg__title">{t.title}</span>
                  {t.sub && <span className="sg__sub">{t.sub}</span>}
                  {t.winner && <span className="sg__win">🏆 {t.winner}</span>}
                  {state === 'live' && <span className="sg__live">LIVE</span>}
                </>
              );
              return m.type === 'Event'
                ? <div key={m.id} {...props} aria-label={full}>{body}</div>
                : <a key={m.id} {...props} href={href('sports', m.event)} aria-label={full}>{body}</a>;
            }),
          ];
        })}
      </div>
    </div>
  );
}

function readView() {
  try { return localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'day'; } catch { return 'day'; }
}

export default function Schedule({ data, ctx, now, param }) {
  const { meta } = data;
  const [view, setView] = useState(readView);
  const choose = (v) => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* storage unavailable */ }
  };
  const today = nightOf(new Date(now), meta.utcOffset, meta.rolloverHour);
  const days = daysBetween(meta.startDate, meta.endDate);
  const clamp = (d) => (d < days[0] ? days[0] : d > days[days.length - 1] ? days[days.length - 1] : d);
  const selected = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : clamp(today);
  const list = ctx.matchesByNight[selected] || [];

  return (
    <>
      <div className="viewtoggle" role="tablist" aria-label="Schedule view">
        <button role="tab" aria-selected={view === 'day'} onClick={() => choose('day')}>📅 Day by day</button>
        <button role="tab" aria-selected={view === 'grid'} onClick={() => choose('grid')}>▦ Full schedule</button>
      </div>

      {view === 'grid' ? (
        <>
          <GridView data={data} ctx={ctx} now={now} today={today}
            onPickDay={(d) => { choose('day'); location.hash = href('schedule', d); }} />
          <p className="sg-legend">
            <span><i className="sg-key sg-key--match" /> Match</span>
            <span><i className="sg-key sg-key--final" /> Final</span>
            <span><i className="sg-key sg-key--event" /> Event</span>
            <span>🏆 Winner</span>
            <span className="muted">Tap a match for its bracket, a date for that day.</span>
          </p>
        </>
      ) : (
        <>
          <DayStrip days={days} selected={selected} today={today} ctx={ctx} />
          <h2 className="dayhead">
            {fmtDay(selected)}{selected === today && <span className="pill pill--today">Tonight</span>}
          </h2>
          {list.length ? (
            <div className="cards">
              {list.map((m) => <MatchCard key={m.id} m={m} ctx={ctx} now={now} rollover={meta.rolloverHour} />)}
            </div>
          ) : <Empty>Nothing scheduled on this day.</Empty>}
        </>
      )}
      <p className="schedule-note">{NOTE}</p>
    </>
  );
}
