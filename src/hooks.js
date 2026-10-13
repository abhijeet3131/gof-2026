import { useCallback, useEffect, useRef, useState } from 'react';
import { nowOverride } from './lib/time.js';

const CACHE_KEY = 'gof2026:data';
const REFRESH_MS = 30000;

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
}
function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
}

/** Loads /api/data, refreshes every 30 s while the tab is visible, and on focus/reconnect. */
export function useTournament() {
  const [data, setData] = useState(readCache);
  const [checkedAt, setCheckedAt] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const inflight = useRef(false);

  const load = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    setRefreshing(true);
    try {
      // no-cache: the browser revalidates with its ETag and gets a tiny 304 when nothing changed
      const res = await fetch('/api/data', { cache: 'no-cache' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) throw new Error(json.error || `Server error ${res.status}`);
      setData(json);
      setCheckedAt(Date.now());
      setError(null);
      writeCache(json);
    } catch (e) {
      setError(e.message === 'Failed to fetch' ? 'You seem to be offline.' : e.message);
    } finally {
      inflight.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const tick = setInterval(() => { if (document.visibilityState === 'visible') load(); }, REFRESH_MS);
    const wake = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
    };
  }, [load]);

  return { data, checkedAt, error, refreshing, refresh: load };
}

const skew = nowOverride();

/** Current time in ms, re-rendering every `everyMs`. Honors the ?now= preview override. */
export function useNow(everyMs = 15000) {
  const [now, setNow] = useState(() => Date.now() + (skew ?? 0));
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + (skew ?? 0)), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

/** Minimal hash router: '#/sports/Chess' -> ['sports', 'Chess'] */
export function useRoute() {
  const parse = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onHash = () => { setRoute(parse()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}

export const href = (...parts) => '#/' + parts.map(encodeURIComponent).join('/');
