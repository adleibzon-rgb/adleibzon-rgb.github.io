// «Сапёр».
import { h, store } from '../state.js';

const getRec = (l) => store.get('mines.rec.' + l, null);

const LEVELS = { 'Новичок': [9, 9, 10], 'Любитель': [16, 16, 40], 'Профи': [30, 16, 99] };
const NUMC = ['', '#1f4fd8', '#1d8a2a', '#d42020', '#1a1a8c', '#8c1a1a', '#178a8a', '#000', '#777'];

export default {
  id: 'mines', title: 'Сапёр', icon: 'mines', theme: 'xp', w: 300, h: 400, cls: 'win-mines', resizable: false,
  about: 'Откройте все клетки без мин. Правый клик или долгое нажатие — флажок.',
  mount(root, win) {
    let level = 'Новичок';
    let W, H, M, cells, opened, flags, state, timer = 0, tid = 0;
    const counter = h('div', { class: 'ms-led' });
    const clock = h('div', { class: 'ms-led' });
    const face = h('button', { class: 'ms-face', 'aria-label': 'Новая игра', onclick: () => start() });
    const board = h('div', { class: 'ms-board', role: 'grid' });
    const menu = h('div', { class: 'ms-menu' }, Object.keys(LEVELS).map((l) => h('button', { class: 'ms-lv', onclick: () => { level = l; start(); } }, l)));
    const bestEl = h('div', { class: 'ms-best' });
    root.append(h('div', { class: 'ms' }, menu, h('div', { class: 'ms-frame' }, h('div', { class: 'ms-top' }, counter, face, clock), board), bestEl));

    const led = (n) => String(Math.max(-99, Math.min(999, n))).padStart(3, '0');
    const setFace = (f) => { face.textContent = { ok: '🙂', oh: '😮', dead: '😵', win: '😎' }[f]; };

    function start() {
      [W, H, M] = LEVELS[level];
      cells = Array.from({ length: W * H }, () => ({ mine: false, n: 0, open: false, flag: 0 }));
      opened = 0; flags = 0; state = 'ready'; timer = 0; clearInterval(tid);
      board.style.gridTemplateColumns = `repeat(${W}, 18px)`;
      board.innerHTML = '';
      cells.forEach((c, i) => {
        const b = h('button', { class: 'ms-c', 'aria-label': 'Закрытая клетка' });
        c.el = b;
        let pressT = 0, longed = false;
        b.addEventListener('pointerdown', (e) => {
          if (state === 'dead' || state === 'win') return;
          if (e.button === 2) return;
          setFace('oh'); longed = false;
          if (e.pointerType !== 'mouse') pressT = setTimeout(() => { longed = true; toggleFlag(i); setFace('ok'); }, 420);
        });
        b.addEventListener('pointerup', (e) => {
          clearTimeout(pressT);
          if (state === 'dead' || state === 'win') return;
          setFace('ok');
          if (e.button === 0 && !longed) (c.open ? chord(i) : reveal(i));
        });
        b.addEventListener('pointerleave', () => clearTimeout(pressT));
        b.addEventListener('contextmenu', (e) => { e.preventDefault(); if (state !== 'dead' && state !== 'win') toggleFlag(i); });
        board.append(b);
      });
      menu.querySelectorAll('.ms-lv').forEach((b) => b.classList.toggle('on', b.textContent === level));
      counter.textContent = led(M); clock.textContent = led(0); setFace('ok');
      const rec = getRec(level);
      bestEl.textContent = rec != null ? `Рекорд (${level}): ${rec} с` : `Рекорда на уровне «${level}» пока нет`;
      // размер окна под поле
      win.el.style.width = Math.max(260, W * 18 + 44) + 'px';
      win.el.style.height = 'auto';
    }

    const nb = (i) => { const x = i % W, y = (i / W) | 0, r = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) r.push(ny * W + nx); } return r; };
    function plant(safe) {
      const ban = new Set([safe, ...nb(safe)]);
      let k = 0;
      while (k < M) { const i = Math.floor(Math.random() * W * H); if (!cells[i].mine && !ban.has(i)) { cells[i].mine = true; k++; } }
      cells.forEach((c, i) => { c.n = nb(i).filter((j) => cells[j].mine).length; });
    }
    function reveal(i) {
      const c = cells[i];
      if (c.open || c.flag === 1) return;
      if (state === 'ready') { plant(i); state = 'play'; tid = setInterval(() => { timer++; clock.textContent = led(timer); }, 1000); }
      if (c.mine) return lose(i);
      const stack = [i];
      while (stack.length) {
        const j = stack.pop(); const d = cells[j];
        if (d.open || d.flag === 1) continue;
        d.open = true; opened++;
        d.el.classList.add('open'); d.el.textContent = d.n || ''; d.el.style.color = NUMC[d.n]; d.el.setAttribute('aria-label', d.n ? `${d.n} мин рядом` : 'Пусто');
        if (!d.n) stack.push(...nb(j));
      }
      if (opened === W * H - M) winGame();
    }
    function chord(i) {
      const c = cells[i];
      const around = nb(i);
      if (around.filter((j) => cells[j].flag === 1).length === c.n) around.forEach(reveal);
    }
    function toggleFlag(i) {
      const c = cells[i]; if (c.open) return;
      c.flag = (c.flag + 1) % 3;
      flags += c.flag === 1 ? 1 : c.flag === 2 ? -1 : 0;
      c.el.textContent = c.flag === 1 ? '🚩' : c.flag === 2 ? '?' : '';
      c.el.setAttribute('aria-label', c.flag === 1 ? 'Флажок' : 'Закрытая клетка');
      counter.textContent = led(M - flags);
    }
    function lose(i) {
      state = 'dead'; clearInterval(tid); setFace('dead');
      cells.forEach((c, j) => {
        if (c.mine && c.flag !== 1) { c.el.classList.add('open'); c.el.textContent = '💣'; }
        if (!c.mine && c.flag === 1) { c.el.classList.add('open', 'wrong'); c.el.textContent = '✕'; }
        if (j === i) c.el.classList.add('boom');
      });
    }
    function winGame() {
      state = 'win'; clearInterval(tid); setFace('win');
      cells.forEach((c) => { if (c.mine) c.el.textContent = '🚩'; });
      counter.textContent = led(0);
      const prev = getRec(level);
      if (prev == null || timer < prev) store.set('mines.rec.' + level, timer);
      bestEl.textContent = `Победа за ${timer} с!` + (prev == null || timer < prev ? ' Это новый рекорд.' : ` Рекорд (${level}): ${prev} с`);
    }
    start();
    return () => clearInterval(tid);
  },
};
