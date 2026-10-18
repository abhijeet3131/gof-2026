import { useEffect, useMemo } from 'react';
import { derive, liveMatches, orderSemis, withFinalists } from './lib/derive.js';
import { fmtAgo } from './lib/time.js';
import { href, useNow, useRoute, useTournament } from './hooks.js';
import Home from './pages/Home.jsx';
import Schedule from './pages/Schedule.jsx';
import { SportDetail, SportsList } from './pages/Sports.jsx';
import Don from './pages/Don.jsx';
import { hideSplash } from './splash.js';

const NAV = [
  { key: '', label: 'Standings', icon: '🏆' },
  { key: 'schedule', label: 'Schedule', icon: '📅' },
  { key: 'sports', label: 'Sports', icon: '⚡' },
  { key: 'don', label: 'DON', icon: '🎲' },
];

export default function App() {
  const { data: raw, checkedAt, error, refreshing, refresh } = useTournament();
  const data = useMemo(() => withFinalists(orderSemis(raw)), [raw]);
  const now = useNow(10000);
  const [page = '', param] = useRoute();
  const ctx = useMemo(() => derive(data), [data]);
  const liveCount = data ? liveMatches(data, now).length : 0;

  useEffect(() => { if (data || error) hideSplash(); }, [data, error]);

  let body;
  if (!data) {
    body = error
      ? <div className="state"><p>Couldn't load the tournament data.</p><p className="muted">{error}</p><button className="btn" onClick={refresh}>Try again</button></div>
      : <div className="state"><div className="spinner" aria-label="Loading" /></div>;
  } else if (page === 'schedule') body = <Schedule data={data} ctx={ctx} now={now} param={param} />;
  else if (page === 'sports' && param) body = <SportDetail data={data} ctx={ctx} now={now} name={param} />;
  else if (page === 'sports') body = <SportsList data={data} ctx={ctx} />;
  else if (page === 'don') body = <Don data={data} ctx={ctx} />;
  else body = <Home data={data} ctx={ctx} now={now} />;

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href={href()} aria-label="Goblet of Fire 2026 - home">
          <img src="/brand/gof-logo-white.svg" alt="Goblet of Fire" width="416" height="315" />
          <span className="brand__tag">Hostel Wars<small>2026</small></span>
        </a>
        <nav className="tabs" aria-label="Main">
          {NAV.map((n) => (
            <a key={n.key} href={href(...(n.key ? [n.key] : []))} aria-current={page === n.key ? 'page' : undefined}>
              <span className="tabs__icon" aria-hidden="true">{n.icon}</span>
              <span>{n.label}</span>
              {n.key === 'schedule' && liveCount > 0 && <i className="tabs__live" aria-label={`${liveCount} live`} />}
            </a>
          ))}
        </nav>
        {data && (
          <button className={`sync ${error ? 'is-error' : ''}`} onClick={refresh} title="Refresh now">
            <span className={`sync__dot ${refreshing ? 'is-spinning' : ''}`} />
            <span className="sync__label">{error ? 'Offline' : checkedAt ? `Updated ${fmtAgo(new Date(checkedAt).toISOString(), Date.now())}` : 'Updating…'}</span>
          </button>
        )}
      </header>

      {data?.meta.demo && (
        <div className="banner banner--demo">DEMO DATA — the live sheet is not connected yet. Scores below are made up.</div>
      )}
      {data?.meta.stale && !error && (
        <div className="banner banner--error">The score sheet can't be reached right now. Showing data from {fmtAgo(data.meta.fetchedAt, Date.now())}.</div>
      )}
      {data && error && (
        <div className="banner banner--error">Couldn't refresh ({error}). Showing the last data we got.</div>
      )}

      <main className="content">{body}</main>

      <footer className="footer">
        <span>Organised by</span>
        <img src="/brand/scam-logo.png" alt="SCAM" width="56" height="56" loading="lazy" />
        <img src="/brand/mica-logo-white.png" alt="MICA" width="46" height="50" loading="lazy" />
      </footer>
    </div>
  );
}
