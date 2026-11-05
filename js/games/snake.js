// «Змейка» на экране кнопочного телефона.
import { h } from '../state.js';
import { keys, loop, best, setBest, fitCanvas } from './kit.js';

const COLS = 24, ROWS = 16, C = 12;
const W = COLS * C, H = ROWS * C + 16;
const INK = '#1f2d14', LCD = '#a7c957', LCD2 = '#9ab94f';

export default {
  id: 'snake', title: 'Змейка', icon: 'snake', theme: 'xp', w: 380, h: 600,
  about: 'Змейка на экране старого телефона. Кнопки 2/4/6/8 или стрелки.',
  mount(root, win) {
    const cv = h('canvas', { class: 'snake-cv', style: { width: '100%', aspectRatio: `${W} / ${H}` } });
    const ctx = fitCanvas(cv, W, H);
    let speed = 5, walls = true;
    const keypad = h('div', { class: 'phone-keys' },
      ...[['1', ''], ['2', '▲'], ['3', ''], ['4', '◀'], ['5', 'OK'], ['6', '▶'], ['7', ''], ['8', '▼'], ['9', ''], ['*', 'скор.'], ['0', 'старт'], ['#', 'края']].map(([n, s]) => {
        const b = h('button', { class: 'pk', 'aria-label': `${n} ${s}` }, h('b', {}, n), h('small', {}, s));
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); press(n); });
        return b;
      }));
    root.append(h('div', { class: 'phone' },
      h('div', { class: 'phone-ear' }), h('div', { class: 'phone-brand' }, 'PCA P-100'),
      h('div', { class: 'phone-screen' }, cv),
      h('div', { class: 'phone-soft' }, h('button', { class: 'pk-soft', onclick: () => press('*') }, 'Скорость'), h('button', { class: 'pk-soft pk-nav', onclick: () => press('5') }, ''), h('button', { class: 'pk-soft', onclick: () => press('#') }, 'Края')),
      keypad));

    let snake, dir, nextDir, food, bonus, score, state = 'menu', acc = 0, eaten = 0, flash = 0;
    function reset() {
      snake = [[8, 8], [7, 8], [6, 8], [5, 8]];
      dir = [1, 0]; nextDir = [1, 0]; score = 0; eaten = 0; bonus = null; acc = 0;
      placeFood();
    }
    const free = (x, y) => !snake.some(([a, b]) => a === x && b === y);
    function placeFood() { let x, y; do { x = Math.floor(Math.random() * COLS); y = Math.floor(Math.random() * ROWS); } while (!free(x, y)); food = [x, y]; }
    function turn(dx, dy) { if (state !== 'play') return; if (dx === -dir[0] && dy === -dir[1]) return; nextDir = [dx, dy]; }
    function press(k) {
      if (k === '2') turn(0, -1); else if (k === '8') turn(0, 1); else if (k === '4') turn(-1, 0); else if (k === '6') turn(1, 0);
      else if (k === '5' || k === '0') { if (state !== 'play') { reset(); state = 'play'; } else state = 'pause'; }
      else if (k === '*' && state !== 'play') speed = speed % 9 + 1;
      else if (k === '#' && state !== 'play') walls = !walls;
    }
    function tick() {
      dir = nextDir;
      let [x, y] = snake[0];
      x += dir[0]; y += dir[1];
      if (!walls) { x = (x + COLS) % COLS; y = (y + ROWS) % ROWS; }
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS || !free(x, y) && !(x === snake.at(-1)[0] && y === snake.at(-1)[1])) {
        state = 'over'; flash = 1200; setBest('snake', score); return;
      }
      snake.unshift([x, y]);
      if (x === food[0] && y === food[1]) {
        score += speed; eaten++;
        placeFood();
        if (eaten % 5 === 0) { let bx, by; do { bx = Math.floor(Math.random() * (COLS - 1)); by = Math.floor(Math.random() * ROWS); } while (!free(bx, by) || !free(bx + 1, by)); bonus = { x: bx, y: by, t: 20 }; }
      } else snake.pop();
      if (bonus) {
        if (y === bonus.y && (x === bonus.x || x === bonus.x + 1)) { score += bonus.t * speed; bonus = null; }
        else if (--bonus.t <= 0) bonus = null;
      }
    }
    function px(x, y, s = C) { ctx.fillRect(x * C + 1, y * C + 17, s - 2, s - 2); }
    function draw(now) {
      ctx.fillStyle = LCD; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = LCD2; for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) ctx.fillRect(x * C + C / 2, y * C + 16 + C / 2, 1, 1);
      ctx.fillStyle = INK;
      ctx.font = '10px "Press Start 2P", monospace'; ctx.textBaseline = 'top';
      ctx.fillText(String(score ?? 0).padStart(4, '0'), 2, 2);
      ctx.textAlign = 'right'; ctx.fillText('РЕК ' + best('snake'), W - 2, 2); ctx.textAlign = 'left';
      ctx.fillRect(0, 14, W, 1);
      if (walls) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(1, 16, W - 2, H - 17); }
      if (state === 'menu') {
        ctx.font = '700 22px "PT Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText('ЗМЕЙКА', W / 2, 46);
        ctx.font = '13px "PT Mono", monospace';
        ctx.fillText(`Скорость: ${speed}   (*)`, W / 2, 92);
        ctx.fillText(`Края: ${walls ? 'есть' : 'нет'}   (#)`, W / 2, 112);
        ctx.fillText('5 или пробел — старт', W / 2, 150);
        ctx.textAlign = 'left';
        // декоративная змейка
        [[4, 13], [5, 13], [6, 13], [7, 13], [7, 12], [8, 12], [9, 12]].forEach(([x, y]) => px(x, y));
        return;
      }
      if (state === 'over' && flash > 0 && Math.floor(now / 150) % 2) { /* мигание */ } else {
        snake.forEach(([x, y], i) => {
          if (i === 0) { ctx.fillRect(x * C, y * C + 16, C, C); ctx.fillStyle = LCD; const ex = dir[0] === 0 ? 3 : (dir[0] > 0 ? 7 : 3), ey = dir[1] === 0 ? 3 : (dir[1] > 0 ? 7 : 3); ctx.fillRect(x * C + ex, y * C + 16 + ey, 2, 2); ctx.fillStyle = INK; }
          else px(x, y);
        });
      }
      // еда — ромбик
      const [fx, fy] = food;
      ctx.fillRect(fx * C + 5, fy * C + 18, 2, 2); ctx.fillRect(fx * C + 3, fy * C + 20, 6, 2); ctx.fillRect(fx * C + 5, fy * C + 22, 2, 2); ctx.fillRect(fx * C + 4, fy * C + 24, 4, 2);
      if (bonus) {
        const bx = bonus.x * C, by = bonus.y * C + 16;
        ctx.fillRect(bx + 2, by + 4, 20, 5); ctx.fillRect(bx + 4, by + 2, 4, 2); ctx.fillRect(bx + 16, by + 2, 4, 2); ctx.fillRect(bx + 4, by + 9, 3, 2); ctx.fillRect(bx + 17, by + 9, 3, 2);
        ctx.font = '8px "Press Start 2P", monospace'; ctx.textAlign = 'right'; ctx.fillText(String(bonus.t), W / 2 + 20, 3); ctx.textAlign = 'left';
      }
      if (state === 'over' && flash <= 0) {
        ctx.fillStyle = LCD; ctx.fillRect(30, 60, W - 60, 80); ctx.fillStyle = INK; ctx.strokeRect(30, 60, W - 60, 80);
        ctx.font = '700 16px "PT Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText('Игра окончена', W / 2, 72); ctx.font = '13px "PT Mono", monospace';
        ctx.fillText(`Счёт: ${score}`, W / 2, 96); ctx.fillText('5 — ещё раз', W / 2, 116); ctx.textAlign = 'left';
      }
      if (state === 'pause') { ctx.font = '700 16px "PT Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText('ПАУЗА', W / 2, H / 2); ctx.textAlign = 'left'; }
    }
    const kmap = { ArrowUp: '2', ArrowDown: '8', ArrowLeft: '4', ArrowRight: '6', w: '2', s: '8', a: '4', d: '6', 'ц': '2', 'ы': '8', 'ф': '4', 'в': '6', ' ': '5', Enter: '5' };
    const offK = keys(win, (e) => { const k = kmap[e.key] || (/^[0-9*#]$/.test(e.key) ? e.key : null); if (!k) return false; press(k); });
    reset();
    const offL = loop((dt) => {
      const interval = 260 - speed * 24;
      if (state === 'play') { acc += dt; while (acc > interval) { acc -= interval; tick(); if (state !== 'play') break; } }
      if (flash > 0) flash -= dt;
      draw(performance.now());
    });
    return () => { offK(); offL(); };
  },
};
