// Draws the final standings as a 1080x1920 story image and shares it (or downloads it where
// sharing files isn't supported). Everything is drawn on a canvas from same-origin assets.

import { HOUSE_BRAND, hostelsOf, ordinal } from './lib/brand.js';
import { textOn } from './lib/derive.js';

const SHIELD = new Path2D('M50 3C62 12 80 13 96 8V58C96 88 74 105 50 115C26 105 4 88 4 58V8C20 13 38 12 50 3Z');
const W = 1080, H = 1920;

const loadImg = (src) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});
const mix = (hex, other, t) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = p(hex), b = p(other);
  return `rgb(${a.map((v, i) => Math.round(v * (1 - t) + b[i] * t)).join(',')})`;
};

async function crest(ctx, house, colour, cx, top, size) {
  const s = size / 100;
  ctx.save();
  ctx.translate(cx - size / 2, top);
  ctx.scale(s, s);
  ctx.fillStyle = mix(colour, '#ffffff', 0.62);
  ctx.strokeStyle = mix(colour, '#000000', 0.45);
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.fill(SHIELD);
  ctx.stroke(SHIELD);
  ctx.restore();
  const img = await loadImg(HOUSE_BRAND[house]?.mascot);
  if (img) {
    const h = size * 1.15 * 0.62, w = Math.min(h * (img.width / img.height || 1), size * 0.78);
    ctx.drawImage(img, cx - w / 2, top + size * 1.15 * 0.15, w, h);
  }
}

export async function drawShareCard(data, ctx) {
  await Promise.all(["400 80px 'Collegiate Black'", "400 60px 'Permanent Marker'", "700 40px 'Barlow Condensed'", "600 30px 'Barlow'"]
    .map((f) => document.fonts?.load(f).catch(() => {})));
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  const standings = data.standings;
  const champ = standings[0].house;
  const cc = ctx.houseMap[champ]?.colour || '#a8d43b';

  // background: charcoal, champion glow, halftone dots
  g.fillStyle = '#1c1a1b'; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 640, 40, W / 2, 640, 900);
  glow.addColorStop(0, mix(cc, '#1c1a1b', 0.45)); glow.addColorStop(1, 'rgba(28,26,27,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.05)';
  for (let yy = 0; yy < H; yy += 22) for (let xx = (yy / 22) % 2 ? 11 : 0; xx < W; xx += 22) { g.beginPath(); g.arc(xx, yy, 2.2, 0, Math.PI * 2); g.fill(); }

  const logo = await loadImg('/brand/gof-logo-white.svg');
  if (logo) g.drawImage(logo, W / 2 - 170, 80, 340, 340 * (315 / 416));
  g.textAlign = 'center';
  g.save(); g.translate(W / 2, 410); g.rotate(-0.06);
  g.fillStyle = '#a8d43b'; g.font = "400 64px 'Permanent Marker', cursive"; g.fillText('Hostel Wars 2026', 0, 0);
  g.restore();

  g.fillStyle = '#a8d43b'; g.font = "700 38px 'Barlow Condensed', sans-serif";
  g.letterSpacing = '8px';
  g.fillText('HOUSE CUP CHAMPIONS', W / 2, 520);
  g.letterSpacing = '0px';
  await crest(g, champ, cc, W / 2, 560, 250);
  g.fillStyle = cc; g.font = "400 128px 'Collegiate Black', Impact, sans-serif";
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowOffsetY = 6;
  g.fillText(champ.toUpperCase(), W / 2, 1000, W - 100);
  g.shadowColor = 'transparent';
  g.fillStyle = '#f6f3ee'; g.font = "700 46px 'Barlow Condensed', sans-serif";
  g.fillText(`${standings[0].total} POINTS`, W / 2, 1070);

  // the full table
  g.textAlign = 'left';
  let y = 1150;
  for (const s of standings) {
    const c = ctx.houseMap[s.house]?.colour || '#888';
    const on = textOn(c);
    g.fillStyle = c;
    g.beginPath(); g.roundRect(90, y, W - 180, 128, 22); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.14)'; g.beginPath(); g.roundRect(90, y, 150, 128, [22, 0, 0, 22]); g.fill();
    g.fillStyle = on; g.textAlign = 'center'; g.font = "400 52px 'Collegiate Black', Impact, sans-serif";
    g.fillText(ordinal(s.rank), 165, y + 84);
    await crest(g, s.house, c, 300, y + 16, 82);
    g.textAlign = 'left'; g.fillStyle = on;
    g.font = "700 50px 'Barlow Condensed', sans-serif"; g.fillText(s.house.toUpperCase(), 365, y + 64);
    g.font = "600 24px 'Barlow Condensed', sans-serif"; g.globalAlpha = 0.85;
    g.fillText(hostelsOf(s.house).join(' · ').toUpperCase(), 365, y + 100, 420);
    g.globalAlpha = 1;
    g.textAlign = 'right'; g.font = "400 62px 'Collegiate Black', Impact, sans-serif";
    g.fillText(String(s.total), W - 120, y + 84);
    y += 150;
  }

  g.textAlign = 'center'; g.fillStyle = '#b3aba3'; g.font = "600 34px 'Barlow Condensed', sans-serif";
  g.fillText('FINAL STANDINGS · GOBLET OF FIRE 2026', W / 2, H - 120);
  g.fillStyle = '#a8d43b'; g.font = "700 38px 'Barlow Condensed', sans-serif";
  g.fillText('gof-2026.pages.dev', W / 2, H - 68);
  return canvas;
}

/** Share the card as an image (phones), or download it (desktop). Returns 'shared' | 'downloaded' | 'cancelled'. */
export async function shareCard(data, ctx) {
  const canvas = await drawShareCard(data, ctx);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const file = new File([blob], 'GOF-2026-final-standings.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Goblet of Fire 2026: Final Standings', text: `${data.standings[0].house} win the House Cup! gof-2026.pages.dev` });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: file.name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}
