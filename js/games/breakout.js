// «Арканоид» в стеклянном стиле.
import { h } from '../state.js';
import { keys, loop, best, setBest, fitCanvas } from './kit.js';

const W = 480, H = 400;
const LEVELS = [
  ['..RRRRRRRR..', '.OOOOOOOOOO.', 'YYYYYYYYYYYY', 'GGGGGGGGGGGG', '.BBBBBBBBBB.'],
  ['R.R.R.R.R.R.', '.O.O.O.O.O.O', 'YYYY....YYYY', 'GGGGSSSSGGGG', 'BB.BBBBBB.BB', 'PPPPPPPPPPPP'],
  ['SSSSSSSSSSSS', 'R..........R', 'R.OOOOOOOO.R', 'R.Y.GGGG.Y.R', 'R.Y.BBBB.Y.R', 'R.PPPPPPPP.R'],
];
const COL = { R: 0, O: 30, Y: 52, G: 120, B: 205, P: 280, S: -1 };

export default {
  id: 'breakout', title: 'Арканоид', icon: 'breakout', theme: 'mac', w: 520, h: 500,
  about: 'Отбивайте шарик и разбейте все кирпичи. Мышь или стрелки.',
  mount(root, win) {
    const cv = h('canvas', { class: 'game-cv', style: { width: '100%', maxWidth: W + 'px', aspectRatio: `${W} / ${H}`, cursor: 'none', touchAction: 'none' } });
    const ctx = fitCanvas(cv, W, H);
    const msg = h('div', { class: 'game-msg' });
    root.append(h('div', { class: 'game-wrap game-break' }, h('div', { class: 'game-stage' }, cv, msg)));

    let lv = 0, score = 0, lives = 3, bricks, ball, paddle, mode = 'title', left = false, right = false, parts = [], drops = [];
    function setup(i) {
      bricks = [];
      const bw = 36, bh = 16, ox = (W - 12 * (bw + 3)) / 2;
      LEVELS[i].forEach((row, r) => [...row].forEach((c, k) => {
        if (c === '.') return;
        bricks.push({ x: ox + k * (bw + 3), y: 50 + r * (bh + 4), w: bw, h: bh, hue: COL[c], hp: c === 'S' ? 3 : 1 });
      }));
      paddle = { x: W / 2 - 40, w: 80 };
      resetBall();
    }
    function resetBall() { ball = { x: W / 2, y: H - 46, vx: 0, vy: 0, r: 7, stuck: true, sp: .3 + lv * .04 }; }
    function launch() { if (!ball.stuck) return; ball.stuck = false; const a = -Math.PI / 2 + (Math.random() - .5) * .8; ball.vx = Math.cos(a) * ball.sp; ball.vy = Math.sin(a) * ball.sp; }
    function act() {
      if (mode === 'title' || mode === 'over' || mode === 'win') { lv = 0; score = 0; lives = 3; setup(0); mode = 'play'; msg.hidden = true; return; }
      if (mode === 'next') { lv++; setup(lv); mode = 'play'; msg.hidden = true; return; }
      if (mode === 'play') launch();
    }
    cv.addEventListener('pointermove', (e) => { const r = cv.getBoundingClientRect(); paddle.x = Math.max(0, Math.min(W - paddle.w, (e.clientX - r.left) / r.width * W - paddle.w / 2)); });
    cv.addEventListener('pointerdown', (e) => { cv.dispatchEvent(new PointerEvent('pointermove', e)); act(); });
    msg.addEventListener('click', act);
    const offK = keys(win, (e) => {
      if (e.key === 'ArrowLeft') left = true; else if (e.key === 'ArrowRight') right = true;
      else if (e.key === ' ' || e.key === 'Enter') act(); else return false;
    }, (e) => { if (e.key === 'ArrowLeft') left = false; if (e.key === 'ArrowRight') right = false; });

    function update(dt) {
      if (mode !== 'play') return;
      if (left) paddle.x = Math.max(0, paddle.x - .5 * dt);
      if (right) paddle.x = Math.min(W - paddle.w, paddle.x + .5 * dt);
      if (ball.stuck) { ball.x = paddle.x + paddle.w / 2; ball.y = H - 32 - ball.r; return; }
      const n = 4;
      for (let s = 0; s < n; s++) {
        ball.x += ball.vx * dt / n; ball.y += ball.vy * dt / n;
        if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
        if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
        if (ball.y < ball.r + 24) { ball.y = ball.r + 24; ball.vy = Math.abs(ball.vy); }
        // ракетка
        if (ball.vy > 0 && ball.y + ball.r > H - 32 && ball.y < H - 20 && ball.x > paddle.x - ball.r && ball.x < paddle.x + paddle.w + ball.r) {
          const k = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
          const a = -Math.PI / 2 + k * 1.05;
          ball.sp = Math.min(.62, ball.sp * 1.01);
          ball.vx = Math.cos(a) * ball.sp; ball.vy = Math.sin(a) * ball.sp;
        }
        for (const b of bricks) {
          if (b.dead) continue;
          const cx = Math.max(b.x, Math.min(ball.x, b.x + b.w)), cy = Math.max(b.y, Math.min(ball.y, b.y + b.h));
          const dx = ball.x - cx, dy = ball.y - cy;
          if (dx * dx + dy * dy < ball.r * ball.r) {
            if (Math.abs(dx) > Math.abs(dy)) ball.vx = Math.sign(dx || -ball.vx) * Math.abs(ball.vx); else ball.vy = Math.sign(dy || -ball.vy) * Math.abs(ball.vy);
            if (--b.hp <= 0) {
              b.dead = true; score += b.hue < 0 ? 50 : 10 + lv * 5;
              for (let i = 0; i < 10; i++) parts.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, vx: (Math.random() - .5) * .4, vy: (Math.random() - .7) * .4, t: 0, hue: b.hue });
              if (Math.random() < .12) drops.push({ x: b.x + b.w / 2, y: b.y, type: Math.random() < .5 ? 'wide' : 'life' });
            }
            break;
          }
        }
      }
      for (const d of drops) {
        d.y += .12 * dt;
        if (d.y > H - 34 && d.y < H - 18 && d.x > paddle.x && d.x < paddle.x + paddle.w) { d.got = true; if (d.type === 'wide') { paddle.w = Math.min(140, paddle.w + 30); } else lives++; }
      }
      drops = drops.filter((d) => !d.got && d.y < H);
      if (ball.y > H + 20) {
        lives--;
        paddle.w = 80;
        if (lives <= 0) { mode = 'over'; const rec = setBest('breakout', score); show('Игра окончена', `Счёт: ${score}${rec ? ' — новый рекорд!' : ''}. Щёлкните, чтобы сыграть ещё.`); }
        else resetBall();
      }
      if (bricks.every((b) => b.dead)) {
        if (lv + 1 < LEVELS.length) { mode = 'next'; show(`Уровень ${lv + 1} пройден`, 'Щёлкните, чтобы продолжить.'); }
        else { mode = 'win'; const rec = setBest('breakout', score); show('Все уровни пройдены!', `Счёт: ${score}${rec ? ' — новый рекорд!' : ''}`); }
      }
    }
    function glossRect(x, y, w, hh, hue, r = 5) {
      const g = ctx.createLinearGradient(0, y, 0, y + hh);
      if (hue < 0) { g.addColorStop(0, '#f4f6f9'); g.addColorStop(.5, '#b8c0ca'); g.addColorStop(1, '#8a939e'); }
      else { g.addColorStop(0, `hsl(${hue} 95% 78%)`); g.addColorStop(.5, `hsl(${hue} 85% 55%)`); g.addColorStop(1, `hsl(${hue} 80% 42%)`); }
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, hh, r); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.roundRect(x + 2, y + 1.5, w - 4, hh * .42, [r, r, 2, 2]); ctx.fill();
    }
    function draw() {
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#1d2b4a'); bg.addColorStop(1, '#0b1020');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(120,170,255,.08)';
      for (let x = 0; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, 24); ctx.lineTo(x, H); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(0, 0, W, 24);
      ctx.fillStyle = '#dbe6ff'; ctx.font = '700 13px PT Sans, sans-serif'; ctx.textBaseline = 'middle';
      ctx.fillText(`Очки: ${score}`, 10, 12); ctx.textAlign = 'center'; ctx.fillText(`Уровень ${lv + 1}`, W / 2, 12);
      ctx.textAlign = 'right'; ctx.fillText(`${'●'.repeat(Math.max(0, lives))}   Рекорд ${Math.max(best('breakout'), score)}`, W - 10, 12); ctx.textAlign = 'left';
      if (!bricks) return;
      for (const b of bricks) if (!b.dead) { glossRect(b.x, b.y, b.w, b.h, b.hue); if (b.hue < 0 && b.hp < 3) { ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.moveTo(b.x + 8, b.y + 3); ctx.lineTo(b.x + 18, b.y + 12); if (b.hp < 2) ctx.lineTo(b.x + 28, b.y + 5); ctx.stroke(); } }
      for (const p of parts) { p.t += 16; p.x += p.vx * 16; p.y += p.vy * 16; p.vy += .015; ctx.fillStyle = p.hue < 0 ? `rgba(220,225,230,${1 - p.t / 600})` : `hsla(${p.hue},90%,65%,${1 - p.t / 600})`; ctx.fillRect(p.x, p.y, 3, 3); }
      parts = parts.filter((p) => p.t < 600);
      for (const d of drops) { glossRect(d.x - 14, d.y, 28, 12, d.type === 'wide' ? 205 : 120, 6); ctx.fillStyle = '#fff'; ctx.font = '700 10px PT Sans, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(d.type === 'wide' ? '↔' : '+1', d.x, d.y + 6.5); ctx.textAlign = 'left'; }
      glossRect(paddle.x, H - 32, paddle.w, 12, 210, 6);
      const g = ctx.createRadialGradient(ball.x - 2, ball.y - 3, 1, ball.x, ball.y, ball.r);
      g.addColorStop(0, '#fff'); g.addColorStop(1, '#8fb8ff');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
      if (mode === 'play' && ball.stuck) { ctx.fillStyle = 'rgba(219,230,255,.75)'; ctx.font = '13px PT Sans, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Щелчок или пробел — запуск', W / 2, H - 70); ctx.textAlign = 'left'; }
    }
    function show(t, p) { msg.innerHTML = ''; msg.append(h('b', {}, t), h('p', {}, p)); msg.hidden = false; }
    setup(0);
    show('Арканоид', 'Мышь или стрелки — ракетка, щелчок или пробел — запуск. Серебряные кирпичи выдерживают три удара. Щёлкните, чтобы начать.');
    const offL = loop((dt) => { update(dt); draw(); });
    return () => { offK(); offL(); };
  },
};
