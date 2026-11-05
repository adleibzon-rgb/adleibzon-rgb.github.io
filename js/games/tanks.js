// «Танчики»: защитите серверную стойку от волн вражеских танков.
import { h } from '../state.js';
import { keys, loop, best, setBest, pad, fitCanvas } from './kit.js';

const S = 16;               // под-клетка
const N = 26;               // 26×26 под-клеток = 13×13 клеток
const FW = S * N;           // 416
const HUD = 96;
const EMPTY = 0, BRICK = 1, STEEL = 2, WATER = 3, GRASS = 4;

const LEVELS = [
  { name: 'Серверная', map: [
    '.............',
    '..BB..G..BB..',
    '..BB.GGG.BB..',
    '......S......',
    '.WW..BBB..WW.',
    '.WW..B.B..WW.',
    '.....B.B.....',
    'GG.SS...SS.GG',
    'GG.........GG',
    '..BBB...BBB..',
    '..B.......B..',
    '.............',
    '.............'] },
  { name: 'Река', map: [
    '.....S.S.....',
    '.BB.......BB.',
    '.BB.GGGGG.BB.',
    '....GBBBG....',
    'WWW.......WWW',
    'WWW..SSS..WWW',
    '.....BBB.....',
    '.SS.......SS.',
    '.BB.BB.BB.BB.',
    '.BB.......BB.',
    '....B...B....',
    '.............',
    '.............'] },
  { name: 'Лабиринт', map: [
    '.............',
    '.SBBBS.SBBBS.',
    '.B...B.B...B.',
    '.B.G.B.B.G.B.',
    '...G.......G.',
    'BBB.SSWSS.BBB',
    '.....W.W.....',
    '.GG..BBB..GG.',
    '.GG.......GG.',
    '.BBBB...BBBB.',
    '.....S.S.....',
    '.............',
    '.............'] },
];
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const KIND = {
  basic: { speed: .055, hp: 1, color: '#b9c0c9', dark: '#5f6670', score: 100, reload: 1400 },
  fast: { speed: .095, hp: 1, color: '#ff7b5c', dark: '#8f2b16', score: 200, reload: 1100 },
  heavy: { speed: .045, hp: 3, color: '#b98cff', dark: '#4b2a85', score: 400, reload: 1200 },
};
const BONUS = ['star', 'helmet', 'clock', 'bomb'];

export default {
  id: 'tanks', title: 'Танчики', icon: 'tank', theme: 'xp', w: 540, h: 520,
  about: 'Защитите серверную стойку. Стрелки — ехать, пробел — огонь.',
  mount(root, win) {
    const cv = h('canvas', { class: 'game-cv', style: { width: '100%', maxWidth: FW + HUD + 'px', aspectRatio: `${FW + HUD} / ${FW}` } });
    const ctx = fitCanvas(cv, FW + HUD, FW);
    const msg = h('div', { class: 'game-msg' });
    const held = new Set();
    let fireHeld = false;
    root.append(h('div', { class: 'game-wrap game-tanks' }, h('div', { class: 'game-stage' }, cv, msg),
      pad((k, on) => { if (k === 'fire') { fireHeld = on; if (on) tryStart(); } else if (on) held.add(k); else held.delete(k); }, [['fire', '●']])));

    let G;
    let mode = 'title'; // title | play | over | win | levelup
    let levelIdx = 0;
    let score = 0;
    let lives = 3;

    function newLevel(i) {
      const grid = new Uint8Array(N * N);
      LEVELS[i].map.forEach((row, ty) => [...row].forEach((c, tx) => {
        const v = { B: BRICK, S: STEEL, W: WATER, G: GRASS }[c] || EMPTY;
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) grid[(ty * 2 + dy) * N + tx * 2 + dx] = v;
      }));
      // база в центре снизу и кирпичное кольцо вокруг неё
      for (let y = 22; y < 26; y++) for (let x = 11; x < 15; x++) grid[y * N + x] = (y >= 24 && x >= 12 && x < 14) ? EMPTY : BRICK;
      const queue = [];
      const plan = [['basic', 10], ['fast', 4 + i * 2], ['heavy', 2 + i * 2]];
      for (const [k, n] of plan) for (let j = 0; j < n; j++) queue.push(k);
      for (let j = queue.length - 1; j > 0; j--) { const r = Math.floor(Math.random() * (j + 1)); [queue[j], queue[r]] = [queue[r], queue[j]]; }
      G = {
        grid, queue, total: queue.length, enemies: [], bullets: [], booms: [], bonus: null,
        player: makeTank(8 * S, 24 * S, 'up', 'player'),
        spawnT: 800, spawnIdx: 0, freeze: 0, baseAlive: true, endT: 0, steelT: 0,
      };
      G.player.shield = 3000;
    }

    function makeTank(x, y, dir, kind) {
      return { x, y, dir, kind, hp: kind === 'player' ? 1 : KIND[kind].hp, reload: 0, moving: false, tread: 0, turnT: 0, shield: 0, flash: false, power: 0 };
    }

    const cell = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? STEEL : G.grid[y * N + x]);
    function solidAt(px, py, w, hgt) {
      const x0 = Math.floor(px / S), y0 = Math.floor(py / S), x1 = Math.floor((px + w - 1) / S), y1 = Math.floor((py + hgt - 1) / S);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = cell(x, y); if (c === BRICK || c === STEEL || c === WATER) return true; }
      if (px < 12 * S + 32 && px + w > 12 * S && py < 24 * S + 32 && py + hgt > 24 * S) return true; // база
      return false;
    }
    const TS = 30; // размер танка
    function tankHit(t, nx, ny) {
      if (solidAt(nx + 1, ny + 1, TS, TS)) return true;
      for (const o of [G.player, ...G.enemies]) {
        if (o === t || !o || o.dead) continue;
        if (Math.abs(o.x - nx) < TS && Math.abs(o.y - ny) < TS && !(Math.abs(o.x - t.x) < TS && Math.abs(o.y - t.y) < TS)) return true;
      }
      return false;
    }

    function move(t, dir, dt, speed) {
      if (t.dir !== dir) {
        // при повороте выравниваем по сетке 16px
        if (DIRS[dir][0] !== 0) t.y = Math.round(t.y / S) * S; else t.x = Math.round(t.x / S) * S;
        t.dir = dir;
      }
      const [dx, dy] = DIRS[dir];
      const step = speed * dt;
      const nx = t.x + dx * step, ny = t.y + dy * step;
      t.tread += dt;
      if (!tankHit(t, nx, ny)) { t.x = nx; t.y = ny; return true; }
      return false;
    }

    function shoot(t) {
      if (t.reload > 0) return;
      const own = G.bullets.filter((b) => b.owner === t).length;
      if (own >= (t.kind === 'player' && t.power >= 2 ? 2 : 1)) return;
      const [dx, dy] = DIRS[t.dir];
      G.bullets.push({ x: t.x + 16 + dx * 16 - 3, y: t.y + 16 + dy * 16 - 3, dx, dy, owner: t, speed: t.kind === 'player' ? (t.power ? .42 : .3) : (t.kind === 'fast' ? .32 : .24), steel: t.kind === 'player' && t.power >= 3 });
      t.reload = t.kind === 'player' ? 260 : KIND[t.kind].reload * (0.6 + Math.random() * .8);
    }

    function boom(x, y, big) { G.booms.push({ x, y, t: 0, big }); }

    function hitBrick(b) {
      const cx = Math.floor((b.x + 3) / S), cy = Math.floor((b.y + 3) / S);
      const c = cell(cx, cy);
      if (c !== BRICK && c !== STEEL) return false;
      if (c === STEEL && !b.steel) return true;
      // разрушаем полосу шириной 2 под-клетки поперёк полёта
      const cells = b.dx !== 0 ? [[cx, cy], [cx, cy + (((b.y + 3) % S) < S / 2 ? -1 : 1)]] : [[cx, cy], [cx + (((b.x + 3) % S) < S / 2 ? -1 : 1), cy]];
      for (const [x, y] of cells) { const v = cell(x, y); if (v === BRICK || (v === STEEL && b.steel)) G.grid[y * N + x] = EMPTY; }
      return true;
    }

    function killEnemy(e) {
      e.dead = true;
      boom(e.x + 16, e.y + 16, true);
      score += KIND[e.kind].score;
      if (e.flash) G.bonus = { type: BONUS[Math.floor(Math.random() * BONUS.length)], x: 32 + Math.floor(Math.random() * 11) * 32, y: 32 + Math.floor(Math.random() * 9) * 32, t: 12000 };
    }

    function update(dt) {
      if (mode !== 'play') return;
      const p = G.player;
      // игрок
      if (!p.dead) {
        const order = ['up', 'down', 'left', 'right'];
        const dir = [...held].reverse().find((k) => order.includes(k));
        p.moving = !!dir;
        if (dir) move(p, dir, dt, .085);
        if (fireHeld) shoot(p);
        p.reload -= dt; p.shield = Math.max(0, p.shield - dt);
      } else if ((p.respawn -= dt) <= 0) {
        if (lives > 0) { Object.assign(p, makeTank(8 * S, 24 * S, 'up', 'player'), { power: p.power > 0 ? 0 : 0 }); p.shield = 3000; } else return lose('Танки кончились');
      }
      // появление врагов
      G.freeze = Math.max(0, G.freeze - dt);
      G.spawnT -= dt;
      if (G.spawnT <= 0 && G.queue.length && G.enemies.filter((e) => !e.dead).length < 4) {
        const sx = [0, 12, 24][G.spawnIdx++ % 3] * S;
        const kind = G.queue.shift();
        const e = makeTank(sx, 0, 'down', kind);
        if (!tankHit(e, sx, 0)) {
          e.flash = (G.total - G.queue.length) % 4 === 0;
          e.think = 0;
          G.enemies.push(e);
          G.spawnT = 2600 - levelIdx * 300;
        } else { G.queue.unshift(kind); G.spawnT = 300; }
      }
      // враги
      for (const e of G.enemies) {
        if (e.dead || G.freeze > 0) continue;
        e.reload -= dt;
        e.think -= dt;
        const moved = move(e, e.dir, dt, KIND[e.kind].speed);
        if (!moved || e.think <= 0) {
          e.think = 600 + Math.random() * 2200;
          const target = Math.random() < .5 ? { x: 12 * S, y: 24 * S } : p;
          const opts = ['down', 'down', 'left', 'right', 'up'];
          if (Math.random() < .55) {
            const dx = target.x - e.x, dy = target.y - e.y;
            e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
          } else e.dir = opts[Math.floor(Math.random() * opts.length)];
          if (DIRS[e.dir][0] !== 0) e.y = Math.round(e.y / S) * S; else e.x = Math.round(e.x / S) * S;
        }
        if (Math.random() < dt / 700) shoot(e);
      }
      G.enemies = G.enemies.filter((e) => !e.dead);
      // пули
      for (const b of G.bullets) {
        const steps = 3;
        for (let s = 0; s < steps && !b.dead; s++) {
          b.x += b.dx * b.speed * dt / steps; b.y += b.dy * b.speed * dt / steps;
          if (b.x < 0 || b.y < 0 || b.x > FW - 6 || b.y > FW - 6) { b.dead = true; boom(b.x + 3, b.y + 3); break; }
          if (hitBrick(b)) { b.dead = true; boom(b.x + 3, b.y + 3); break; }
          // база
          if (G.baseAlive && b.x + 6 > 12 * S && b.x < 14 * S && b.y + 6 > 24 * S && b.y < 26 * S) { b.dead = true; G.baseAlive = false; boom(13 * S, 25 * S, true); lose('Серверная стойка уничтожена'); break; }
          // танки
          const isPlayer = b.owner.kind === 'player';
          const targets = isPlayer ? G.enemies : [p];
          for (const t of targets) {
            if (t.dead) continue;
            if (b.x + 6 > t.x + 1 && b.x < t.x + 31 && b.y + 6 > t.y + 1 && b.y < t.y + 31) {
              b.dead = true;
              if (isPlayer) { if (--t.hp <= 0) killEnemy(t); else boom(b.x, b.y); }
              else if (t.shield <= 0) { t.dead = true; lives--; t.respawn = 1200; boom(t.x + 16, t.y + 16, true); }
              break;
            }
          }
          // пуля в пулю
          for (const o of G.bullets) {
            if (o === b || o.dead || (o.owner.kind === 'player') === isPlayer) continue;
            if (Math.abs(o.x - b.x) < 6 && Math.abs(o.y - b.y) < 6) { o.dead = b.dead = true; }
          }
        }
      }
      G.bullets = G.bullets.filter((b) => !b.dead);
      // бонус
      if (G.bonus) {
        G.bonus.t -= dt;
        if (G.bonus.t <= 0) G.bonus = null;
        else if (!p.dead && Math.abs(p.x - G.bonus.x) < 28 && Math.abs(p.y - G.bonus.y) < 28) {
          const t = G.bonus.type; score += 500;
          if (t === 'star') p.power = Math.min(3, p.power + 1);
          if (t === 'helmet') p.shield = 10000;
          if (t === 'clock') G.freeze = 8000;
          if (t === 'bomb') G.enemies.forEach(killEnemy);
          G.bonus = null;
        }
      }
      G.booms.forEach((b) => (b.t += dt));
      G.booms = G.booms.filter((b) => b.t < (b.big ? 420 : 200));
      if (!G.queue.length && !G.enemies.length) {
        G.endT += dt;
        if (G.endT > 1500) {
          if (levelIdx + 1 < LEVELS.length) { mode = 'levelup'; show(`Уровень ${levelIdx + 1} пройден`, `Счёт: ${score}. Нажмите пробел — дальше «${LEVELS[levelIdx + 1].name}».`); }
          else { mode = 'win'; const rec = setBest('tanks', score); show('Победа!', `Все три уровня пройдены. Счёт: ${score}${rec ? ' — новый рекорд!' : ''}`); }
        }
      }
    }

    function lose(why) {
      mode = 'over';
      const rec = setBest('tanks', score);
      show('Игра окончена', `${why}. Счёт: ${score}${rec ? ' — новый рекорд!' : ''}. Пробел — заново.`);
    }

    // ---------- отрисовка ----------
    function drawTank(t, now) {
      const P = t.kind === 'player';
      const col = P ? '#f2c94c' : KIND[t.kind].color;
      const dark = P ? '#8a6a12' : KIND[t.kind].dark;
      const flash = t.flash && Math.floor(now / 200) % 2;
      ctx.save();
      ctx.translate(t.x + 16, t.y + 16);
      ctx.rotate({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[t.dir]);
      // гусеницы
      ctx.fillStyle = '#2a2d33';
      ctx.fillRect(-15, -14, 8, 28); ctx.fillRect(7, -14, 8, 28);
      ctx.fillStyle = '#596070';
      const off = Math.floor(t.tread / 40) % 2 ? 0 : 3;
      for (let i = -14 + off; i < 14; i += 6) { ctx.fillRect(-15, i, 8, 2); ctx.fillRect(7, i, 8, 2); }
      // корпус
      ctx.fillStyle = flash ? '#ff3b3b' : col;
      ctx.fillRect(-8, -11, 16, 23);
      ctx.fillStyle = dark;
      ctx.fillRect(-8, 8, 16, 4);
      // башня и ствол
      ctx.beginPath(); ctx.arc(0, 1, 7, 0, Math.PI * 2); ctx.fillStyle = flash ? '#ffb0b0' : col; ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = dark; ctx.fillRect(-2, -17, 4, 14);
      if (t.kind === 'heavy') { ctx.fillStyle = t.hp === 3 ? '#e6d4ff' : t.hp === 2 ? '#c9a8ff' : '#8f5cff'; ctx.fillRect(-4, -1, 8, 4); }
      ctx.restore();
      if (t.shield > 0) {
        ctx.strokeStyle = `hsla(${now / 4 % 360},90%,70%,.85)`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(t.x + 16, t.y + 16, 19 + Math.sin(now / 80) * 1.5, 0, Math.PI * 2); ctx.stroke();
      }
    }

    function drawCell(x, y, c, now) {
      const px = x * S, py = y * S;
      if (c === BRICK) {
        ctx.fillStyle = '#a84a1f'; ctx.fillRect(px, py, S, S);
        ctx.fillStyle = '#d77a3f';
        const o = (y % 2) * 4;
        ctx.fillRect(px, py, S, 7); ctx.fillRect(px, py + 8, S, 7);
        ctx.fillStyle = '#6b2a0d';
        ctx.fillRect(px + ((4 + o) % S), py, 1, 7); ctx.fillRect(px + ((12 + o) % S), py + 8, 1, 7);
        ctx.fillRect(px, py + 7, S, 1);
      } else if (c === STEEL) {
        ctx.fillStyle = '#7c8794'; ctx.fillRect(px, py, S, S);
        ctx.fillStyle = '#dfe6ee'; ctx.fillRect(px + 3, py + 3, 10, 10);
        ctx.fillStyle = '#aab4c0'; ctx.fillRect(px + 5, py + 5, 6, 6);
      } else if (c === WATER) {
        ctx.fillStyle = '#1f5fbf'; ctx.fillRect(px, py, S, S);
        ctx.fillStyle = '#6fb3ff';
        const wv = Math.floor(now / 400 + x + y) % 2;
        ctx.fillRect(px + 2 + wv * 4, py + 4, 5, 2); ctx.fillRect(px + 8 - wv * 4, py + 11, 5, 2);
      }
    }

    function drawBase(now) {
      const x = 12 * S, y = 24 * S;
      if (!G.baseAlive) { ctx.fillStyle = '#3b3f46'; ctx.fillRect(x + 4, y + 10, 24, 20); ctx.fillStyle = '#ff6b3d'; ctx.fillRect(x + 10, y + 6, 4, 6); return; }
      ctx.fillStyle = '#20242b'; ctx.fillRect(x + 4, y + 2, 24, 28);
      ctx.strokeStyle = '#8fa0b5'; ctx.strokeRect(x + 4.5, y + 2.5, 23, 27);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = '#3a414c'; ctx.fillRect(x + 7, y + 5 + i * 6, 18, 4);
        ctx.fillStyle = Math.floor(now / (180 + i * 90)) % 2 ? '#47e07a' : '#1e6b3a'; ctx.fillRect(x + 21, y + 6 + i * 6, 2, 2);
        ctx.fillStyle = '#4aa8ff'; ctx.fillRect(x + 9, y + 6 + i * 6, 6, 1);
      }
    }

    function drawBonus(b, now) {
      if (Math.floor(now / 250) % 2) return;
      ctx.fillStyle = '#fff'; ctx.fillRect(b.x, b.y, 30, 30);
      ctx.fillStyle = '#1b1d22'; ctx.fillRect(b.x + 2, b.y + 2, 26, 26);
      ctx.fillStyle = { star: '#ffd23f', helmet: '#4aa8ff', clock: '#9be36b', bomb: '#ff6b5c' }[b.type];
      ctx.font = 'bold 18px PT Sans, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText({ star: '★', helmet: '⛨', clock: '◷', bomb: '✸' }[b.type], b.x + 15, b.y + 16);
    }

    function draw(now) {
      ctx.fillStyle = '#0d0f12'; ctx.fillRect(0, 0, FW + HUD, FW);
      if (!G) return;
      // фон: еле заметная сетка
      ctx.fillStyle = '#12161b';
      for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) if ((x + y) % 2) ctx.fillRect(x * 32, y * 32, 32, 32);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = G.grid[y * N + x]; if (c && c !== GRASS) drawCell(x, y, c, now); }
      drawBase(now);
      if (!G.player.dead) drawTank(G.player, now);
      G.enemies.forEach((e) => drawTank(e, now));
      ctx.fillStyle = '#fff6c2';
      G.bullets.forEach((b) => { ctx.fillRect(b.x, b.y, 6, 6); });
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (G.grid[y * N + x] === GRASS) {
        ctx.fillStyle = '#2f8f3a'; ctx.fillRect(x * S, y * S, S, S);
        ctx.fillStyle = '#5fd06a'; ctx.fillRect(x * S + 2, y * S + 2, 5, 5); ctx.fillRect(x * S + 9, y * S + 8, 5, 5);
        ctx.fillStyle = '#1d5e26'; ctx.fillRect(x * S + 9, y * S + 2, 4, 4); ctx.fillRect(x * S + 2, y * S + 10, 4, 4);
      }
      for (const b of G.booms) {
        const k = b.t / (b.big ? 420 : 200), r = (b.big ? 26 : 10) * (0.4 + k);
        const gr = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
        gr.addColorStop(0, `rgba(255,255,220,${1 - k})`); gr.addColorStop(.4, `rgba(255,170,40,${1 - k})`); gr.addColorStop(1, 'rgba(200,40,20,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
      }
      if (G.bonus) drawBonus(G.bonus, now);
      if (G.freeze > 0) { ctx.fillStyle = 'rgba(120,200,255,.08)'; ctx.fillRect(0, 0, FW, FW); }
      // HUD
      const hx = FW;
      ctx.fillStyle = '#8a8f98'; ctx.fillRect(hx, 0, HUD, FW);
      ctx.fillStyle = '#2a2d33';
      for (let i = 0; i < G.queue.length; i++) {
        const cx = hx + 22 + (i % 3) * 20, cy = 18 + Math.floor(i / 3) * 18;
        ctx.fillRect(cx, cy, 12, 12); ctx.fillStyle = '#8a8f98'; ctx.fillRect(cx + 4, cy - 2, 4, 6); ctx.fillStyle = '#2a2d33';
      }
      ctx.fillStyle = '#14171c'; ctx.font = '10px "Press Start 2P", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('1P', hx + 20, 270);
      ctx.fillStyle = '#f2c94c'; ctx.fillRect(hx + 20, 280, 14, 14);
      ctx.fillStyle = '#14171c'; ctx.fillText('' + Math.max(0, lives), hx + 44, 293);
      ctx.fillText('LV' + (levelIdx + 1), hx + 20, 330);
      ctx.fillText('' + score, hx + 12, 370);
      ctx.fillStyle = '#3a3f47'; ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText('HI ' + Math.max(best('tanks'), score), hx + 12, 392);
    }

    function show(title, text) { msg.innerHTML = ''; msg.append(h('b', {}, title), h('p', {}, text)); msg.hidden = false; }
    function tryStart() {
      if (mode === 'play') return;
      if (mode === 'levelup') { levelIdx++; newLevel(levelIdx); }
      else { levelIdx = 0; score = 0; lives = 3; newLevel(0); }
      mode = 'play'; msg.hidden = true;
    }

    newLevel(0);
    show('Танчики', 'Защитите серверную стойку внизу карты. Стрелки или WASD — ехать, пробел — огонь. Мигающие враги оставляют бонусы. Нажмите пробел.');
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', 'ц': 'up', 'ы': 'down', 'ф': 'left', 'в': 'right' };
    const offK = keys(win, (e) => {
      const k = map[e.key] || map[e.key.toLowerCase()];
      if (k) { held.delete(k); held.add(k); return; }
      if (e.key === ' ' || e.key === 'Enter') { fireHeld = true; tryStart(); return; }
      if (e.key === 'p' || e.key === 'з') { if (mode === 'play') { mode = 'pause'; show('Пауза', 'Нажмите P, чтобы продолжить.'); } else if (mode === 'pause') { mode = 'play'; msg.hidden = true; } return; }
      return false;
    }, (e) => { const k = map[e.key] || map[e.key.toLowerCase()]; if (k) held.delete(k); if (e.key === ' ' || e.key === 'Enter') fireHeld = false; });
    const offL = loop((dt) => { update(dt); draw(performance.now()); });
    return () => { offK(); offL(); };
  },
};
