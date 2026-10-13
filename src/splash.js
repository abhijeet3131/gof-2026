// Fades out the opening screen defined in index.html once the app has data,
// but never before the intro animation has had time to play.

const MIN_VISIBLE_MS = 2000;
let hidden = false;

export function hideSplash() {
  if (hidden) return;
  hidden = true;
  const el = document.getElementById('splash');
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const wait = Math.max(0, (reduce ? 500 : MIN_VISIBLE_MS) - performance.now());
  setTimeout(() => {
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 700);
  }, wait);
}
