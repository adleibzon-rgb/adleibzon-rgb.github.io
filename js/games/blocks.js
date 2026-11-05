// «Блоки» — падающие фигуры из стеклянных кубиков.
import { h } from '../state.js';
import { keys, loop, best, setBest, fitCanvas, pad } from './kit.js';

const COLS = 10, ROWS = 20, C = 20;
const SHAPES = [
  [[1, 1, 1, 1]], [[1, 1], [1, 1]], [[0, 1, 0], [1, 1, 1]], [[1, 0, 0], [1, 1, 1]], [[0, 0, 1], [1, 1, 1]], [[1, 1, 0], [0, 1, 1]], [[0, 1, 1], [1, 1, 0]],
];
const HUES = [190, 50, 285, 220, 28, 0, 120];
const W = COLS * C + 120, H = ROWS * C;

export default {
  id: 'blocks', title: 'Блоки', icon: 'blocks', theme: 'mac', w: 380, h: 500,
  about: 'Складывайте фигуры в сплошные ряды. Стрелки — двигать и вращать.',
  mount(root, win) {
    const cv = h('canvas', { class: 'game-cv', style: { width: '100%', maxWidth: W + 'px', aspectRatio: `${W} / ${H}` } });
    const ctx = fitCanvas(cv, W, H);
    const msg = h('div', { class: 'game-msg' });
    root.append(h('div', { class: 'game-wrap' }, h('div', { class: 'game-stage' }, cv, msg),
      pad((k, on) => { if (!on) return; ({ left: () => shift(-1), right: () => shift(1), up: rotate, down: () => drop(), drop: hard })[k]?.(); }, [['drop', '⤓']])));

    let board, cur, next, score, lines, level, acc, mode = 'title', clearing = null;
    const rand = () => { const i = Math.floor(Math.random() * 7); return { m: SHAPES[i].map((r) => r.slice()), hue: HUES[i], x: 3, y: 0 }; };
    function start() { board = Array.from({ length: ROWS }, () => Array(COLS).fill(null)); cur = rand(); next = rand(); score = 0; lines = 0; level = 1; acc = 0; mode = 'play'; msg.hidden = true; }
    const fits = (m, x, y) => m.every((row, r) => row.every((v, c) => !v || (x + c >= 0 && x + c < COLS && y + r < ROWS && (y + r < 0 || !board[y + r][x + c]))));
    function shift(d) { if (mode === 'play' && fits(cur.m, cur.x + d, cur.y)) cur.x += d; }
    function rotate() {
      if (mode !== 'play') return;
      const m = cur.m[0].map((_, c) => cur.m.map((row) => row[c]).reverse());
      for (const k of [0, -1, 1, -2, 2]) if (fits(m, cur.x + k, cur.y)) { cur.m = m; cur.x += k; return; }
    }
    function drop() { if (mode !== 'play') return false; if (fits(cur.m, cur.x, cur.y + 1)) { cur.y++; return true; } lock(); return false; }
    function hard() { if (mode !== 'play') return; let n = 0; while (fits(cur.m, cur.x, cur.y + 1)) { cur.y++; n++; } score += n * 2; lock(); }
    function lock() {
      cur.m.forEach((row, r) => row.forEach((v, c) => { if (v && cur.y + r >= 0) board[cur.y + r][cur.x + c] = cur.hue; }));
      const full = board.map((row, i) => (row.every(Boolean) ? i : -1)).filter((i) => i >= 0);
      if (full.length) { clearing = { rows: full, t: 0 }; mode = 'clear'; score += [0, 100, 300, 500, 800][full.length] * level; lines += full.length; level = 1 + Math.floor(lines / 10); }
      spawn();
    }
    function spawn() {
      cur = next; next = rand();
      if (!fits(cur.m, cur.x, cur.y)) { mode = 'over'; const rec = setBest('blocks', score); show('Игра окончена', `Очки: ${score}, рядов: ${lines}${rec ? ' — новый рекорд!' : ''}. Пробел — заново.`); }
    }
    function cube(x, y, hue, a = 1) {
      const g = ctx.createLinearGradient(0, y, 0, y + C);
      g.addColorStop(0, `hsla(${hue},95%,80%,${a})`); g.addColorStop(.5, `hsla(${hue},85%,55%,${a})`); g.addColorStop(1, `hsla(${hue},80%,40%,${a})`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x + 1, y + 1, C - 2, C - 2, 4); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${.55 * a})`; ctx.beginPath(); ctx.roundRect(x + 3, y + 2.5, C - 6, 7, [3, 3, 1, 1]); ctx.fill();
    }
    function draw(now) {
      ctx.fillStyle = '#e8ecf1'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#1a2233'; ctx.fillRect(0, 0, COLS * C, H);
      ctx.strokeStyle = 'rgba(255,255,255,.05)';
      for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * C, 0); ctx.lineTo(x * C, H); ctx.stroke(); }
      for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * C); ctx.lineTo(COLS * C, y * C); ctx.stroke(); }
      if (board) {
        board.forEach((row, r) => row.forEach((v, c) => {
          if (v == null) return;
          const fade = clearing && clearing.rows.includes(r) ? 1 - clearing.t / 260 : 1;
          cube(c * C, r * C, v, Math.max(0, fade));
        }));
        if (mode === 'play') {
          let gy = cur.y; while (fits(cur.m, cur.x, gy + 1)) gy++;
          cur.m.forEach((row, r) => row.forEach((v, c) => { if (v) { ctx.strokeStyle = `hsla(${cur.hue},90%,70%,.5)`; ctx.strokeRect(( cur.x + c) * C + 2.5, (gy + r) * C + 2.5, C - 5, C - 5); } }));
          cur.m.forEach((row, r) => row.forEach((v, c) => { if (v && cur.y + r >= 0) cube((cur.x + c) * C, (cur.y + r) * C, cur.hue); }));
        }
      }
      const sx = COLS * C + 14;
      ctx.fillStyle = '#4a5466'; ctx.font = '700 11px PT Sans, sans-serif'; ctx.textBaseline = 'top';
      ctx.fillText('СЛЕДУЮЩАЯ', sx, 12);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(sx, 30, 92, 64, 8); ctx.fill(); ctx.strokeStyle = '#b8c0ca'; ctx.stroke();
      if (next) { const ox = sx + 46 - next.m[0].length * C / 2, oy = 62 - next.m.length * C / 2; next.m.forEach((row, r) => row.forEach((v, c) => v && cube(ox + c * C, oy + r * C, next.hue))); }
      const stat = [['ОЧКИ', score ?? 0], ['РЯДЫ', lines ?? 0], ['УРОВЕНЬ', level ?? 1], ['РЕКОРД', Math.max(best('blocks'), score || 0)]];
      stat.forEach(([k, v], i) => { ctx.fillStyle = '#4a5466'; ctx.font = '700 11px PT Sans, sans-serif'; ctx.fillText(k, sx, 116 + i * 52); ctx.fillStyle = '#1a2233'; ctx.font = '700 20px PT Sans, sans-serif'; ctx.fillText(String(v), sx, 132 + i * 52); });
    }
    function show(t, p) { msg.innerHTML = ''; msg.append(h('b', {}, t), h('p', {}, p)); msg.hidden = false; }
    const offK = keys(win, (e) => {
      if (mode !== 'play' && (e.key === ' ' || e.key === 'Enter')) { if (mode !== 'clear') { if (mode === 'pause') { mode = 'play'; msg.hidden = true; } else start(); } return; }
      if (e.key === 'ArrowLeft') shift(-1); else if (e.key === 'ArrowRight') shift(1); else if (e.key === 'ArrowUp' || e.key === 'x') rotate();
      else if (e.key === 'ArrowDown') { if (drop()) score += 1; } else if (e.key === ' ') hard();
      else if (e.key === 'p' || e.key === 'з') { if (mode === 'play') { mode = 'pause'; show('Пауза', 'Пробел — продолжить.'); } }
      else return false;
    });
    msg.addEventListener('click', () => { if (mode === 'title' || mode === 'over') start(); else if (mode === 'pause') { mode = 'play'; msg.hidden = true; } });
    show('Блоки', 'Стрелки: ← → двигать, ↑ вращать, ↓ быстрее, пробел — уронить. Щёлкните или нажмите пробел.');
    const offL = loop((dt) => {
      if (mode === 'clear') {
        clearing.t += dt;
        if (clearing.t > 260) { for (const r of clearing.rows) { board.splice(r, 1); board.unshift(Array(COLS).fill(null)); } clearing = null; mode = 'play'; }
      } else if (mode === 'play') { acc += dt; const iv = Math.max(80, 700 - (level - 1) * 60); if (acc > iv) { acc = 0; drop(); } }
      draw(performance.now());
    });
    return () => { offK(); offL(); };
  },
};
