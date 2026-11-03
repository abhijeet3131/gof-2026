// Small dependency-free confetti burst on a full-screen canvas. Returns a stop() function.

export function launchConfetti({ colors, duration = 6000, count = 220 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; };
  resize();
  addEventListener('resize', resize);

  const rand = (a, b) => a + Math.random() * (b - a);
  const pieces = [];
  const burst = (n, fromLeft) => {
    for (let i = 0; i < n; i++) {
      const angle = fromLeft ? rand(-75, -45) : rand(-135, -105);
      const speed = rand(9, 17);
      pieces.push({
        x: fromLeft ? rand(0, 0.08) * innerWidth : rand(0.92, 1) * innerWidth, y: innerHeight + 10,
        vx: Math.cos((angle * Math.PI) / 180) * speed, vy: Math.sin((angle * Math.PI) / 180) * speed,
        w: rand(6, 11), h: rand(8, 16), r: rand(0, Math.PI), vr: rand(-0.2, 0.2),
        color: colors[Math.floor(Math.random() * colors.length)], shape: Math.random() < 0.25 ? 'circle' : 'rect',
      });
    }
  };
  const rain = (n) => {
    for (let i = 0; i < n; i++) pieces.push({
      x: rand(0, innerWidth), y: rand(-innerHeight * 0.6, -10), vx: rand(-1, 1), vy: rand(2, 4),
      w: rand(6, 10), h: rand(8, 14), r: rand(0, Math.PI), vr: rand(-0.15, 0.15),
      color: colors[Math.floor(Math.random() * colors.length)], shape: Math.random() < 0.25 ? 'circle' : 'rect',
    });
  };
  burst(count * 0.35, true);
  burst(count * 0.35, false);
  rain(count * 0.3);
  const second = setTimeout(() => { burst(count * 0.2, true); burst(count * 0.2, false); }, 900);

  const start = performance.now();
  let frame;
  const tick = (t) => {
    const age = t - start;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalAlpha = age > duration - 1200 ? Math.max(0, (duration - age) / 1200) : 1;
    for (const p of pieces) {
      p.vy += 0.22; p.vx *= 0.99; p.vy = Math.min(p.vy, 5.5);
      p.x += p.vx + Math.sin((t / 400) + p.r) * 0.6; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.color;
      if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 2);
      ctx.restore();
    }
    if (age < duration) frame = requestAnimationFrame(tick); else stop();
  };
  frame = requestAnimationFrame(tick);

  function stop() {
    cancelAnimationFrame(frame);
    clearTimeout(second);
    removeEventListener('resize', resize);
    canvas.remove();
  }
  return stop;
}
