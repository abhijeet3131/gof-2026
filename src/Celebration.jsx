import { useEffect, useState } from 'react';
import { Crest } from './components.jsx';
import { launchConfetti } from './confetti.js';
import { textOn } from './lib/derive.js';
import { hostelsOf } from './lib/brand.js';

const SEEN_KEY = 'gof.celebrated';
export const REPLAY_EVENT = 'gof:celebrate';

const seen = () => { try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return false; } };
const markSeen = () => { try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* storage unavailable */ } };

/** Full-screen "House Cup Champions" moment with confetti, once per visit after the opening screen. */
export default function Celebration({ fin, ctx }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!fin) return undefined;
    const show = () => setOpen(true);
    window.addEventListener(REPLAY_EVENT, show);
    // wait for the opening screen (at least 2 s) before celebrating
    const t = seen() ? null : setTimeout(show, Math.max(0, 2300 - performance.now()));
    return () => { clearTimeout(t); window.removeEventListener(REPLAY_EVENT, show); };
  }, [fin]);

  useEffect(() => {
    if (!open || !fin) return undefined;
    markSeen();
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const champ = ctx.houseMap[fin.champions[0]]?.colour || '#a8d43b';
    const others = Object.values(ctx.houseMap).map((h) => h.colour);
    const stop = reduce ? () => {} : launchConfetti({ colors: [champ, champ, champ, '#ffffff', '#ffd75e', '#14110a', ...others] });
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { stop(); window.removeEventListener('keydown', onKey); };
  }, [open, fin, ctx]);

  if (!open || !fin) return null;
  const house = fin.champions[0];
  const colour = ctx.houseMap[house]?.colour || '#a8d43b';
  const joint = fin.champions.length > 1;
  const titles = fin.titles[house]?.length || 0;
  return (
    <div className="celebrate" role="dialog" aria-modal="true" aria-label={`${fin.champions.join(' and ')} win the House Cup`}
      style={{ '--house': colour, '--on': textOn(colour) }} onClick={() => setOpen(false)}>
      <div className="celebrate__card" onClick={(e) => e.stopPropagation()}>
        <img className="celebrate__logo" src="/brand/gof-logo-white.svg" alt="Goblet of Fire" width="416" height="315" />
        <p className="celebrate__kicker">{joint ? 'Joint House Cup Champions' : 'House Cup Champions'} · 2026</p>
        <div className="celebrate__crests">
          {fin.champions.map((h) => <Crest key={h} house={h} houseMap={ctx.houseMap} size={joint ? 96 : 128} />)}
        </div>
        <h2 className="celebrate__name">{fin.champions.join(' & ')}</h2>
        {!joint && (
          <p className="celebrate__stats">
            <b>{fin.lead}</b> points · <b>{titles}</b> sports won · <b>{fin.margin}</b> clear at the top
          </p>
        )}
        {!joint && <p className="celebrate__hostels">{hostelsOf(house).join(' · ')}</p>}
        <button className="celebrate__btn" onClick={() => setOpen(false)} autoFocus>See the final standings</button>
      </div>
    </div>
  );
}
