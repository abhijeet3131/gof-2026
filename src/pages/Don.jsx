import { Crest, Empty, HouseName, Section, signed } from '../components.jsx';
import { fmtDay } from '../lib/time.js';
import { hostelsOf } from '../lib/brand.js';
import { href } from '../hooks.js';

export default function Don({ data, ctx }) {
  return (
    <>
      <Section title="Double or Nothing">
        <p className="hint">Each house goes all-in on one event.</p>
        <ul className="rulechips">
          <li><b>1st</b><span>points ×2</span></li>
          <li><b>2nd</b><span>0 points</span></li>
          <li><b>Out</b><span>−100</span></li>
        </ul>
        <ul className="doncards">
          {data.don.map((d) => (
            <li key={d.house} className={`doncard doncard--${d.place === '1st' ? 'won' : d.place === 'Out' ? 'out' : d.place === '2nd' ? 'second' : 'pending'}`}
              style={{ '--house': ctx.houseMap[d.house]?.colour }}>
              <Crest house={d.house} houseMap={ctx.houseMap} size={40} />
              <div className="doncard__body">
                <b>{d.house}</b>
                {d.event ? (
                  <a href={href('sports', d.event)}>{d.event}</a>
                ) : <span className="muted">Not declared yet</span>}
                {d.event && !d.valid && <small className="neg">{d.result}</small>}
                <small className="doncard__hostels">{hostelsOf(d.house).join(' · ')}</small>
              </div>
              {d.valid && (d.place
                ? <span className="doncard__fx">{signed(d.effect)}</span>
                : <span className="pill pill--muted">Pending</span>)}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Weasley Challenge">
        <p className="hint">Challenger wins its semi-final: <b>+50</b>. Loses: <b>−50</b>.</p>
        {data.weasley.length ? (
          <ul className="stakes">
            {data.weasley.map((w) => (
              <li key={w.challenger + w.event}>
                <HouseName house={w.challenger} houseMap={ctx.houseMap} />
                <span>vs {w.challenged} · <a href={href('sports', w.event)}>{w.event}</a></span>
                {w.result !== 'Pending' && <b className={w.points < 0 ? 'neg' : ''}>{signed(w.points)}</b>}
              </li>
            ))}
          </ul>
        ) : <Empty>No challenges.</Empty>}
      </Section>

      <Section title="SCAM adjustments">
        {data.adjustments.length ? (
          <ul className="stakes">
            {data.adjustments.map((a, i) => (
              <li key={i}>
                <HouseName house={a.house} houseMap={ctx.houseMap} />
                <span>{a.reason || 'Adjustment'}{a.date ? ` · ${fmtDay(a.date)}` : ''}</span>
                <b className={a.points < 0 ? 'neg' : ''}>{signed(a.points)}</b>
              </li>
            ))}
          </ul>
        ) : <Empty>No bonus or penalty points so far.</Empty>}
      </Section>
    </>
  );
}
