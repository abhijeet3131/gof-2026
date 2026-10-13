import { useEffect, useRef } from 'react';
import { Empty, MatchCard } from '../components.jsx';
import { daysBetween, dayParts, fmtDay, nightOf } from '../lib/time.js';
import { href } from '../hooks.js';

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

export default function Schedule({ data, ctx, now, param }) {
  const { meta } = data;
  const today = nightOf(new Date(now), meta.utcOffset, meta.rolloverHour);
  const days = daysBetween(meta.startDate, meta.endDate);
  const clamp = (d) => (d < days[0] ? days[0] : d > days[days.length - 1] ? days[days.length - 1] : d);
  const selected = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : clamp(today);
  const list = ctx.matchesByNight[selected] || [];

  return (
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
  );
}
