// «Шахматы» против компьютера (альфа-бета, глубина 2–3).
import { h, sound } from '../state.js';

const GLYPH = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
// простые позиционные бонусы для белых (для чёрных — зеркально)
const PST = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
};
const isW = (p) => p && p === p.toUpperCase();
const sideOf = (p) => (p ? (isW(p) ? 'w' : 'b') : null);

function initial() {
  const b = Array(64).fill(null);
  'rnbqkbnr'.split('').forEach((p, i) => { b[i] = p; b[56 + i] = p.toUpperCase(); b[8 + i] = 'p'; b[48 + i] = 'P'; });
  return { b, turn: 'w', castle: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0 };
}

function attacked(b, sq, by) {
  const r = sq >> 3, c = sq & 7;
  const at = (rr, cc) => (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 ? b[rr * 8 + cc] : undefined);
  const mine = (p, t) => p && sideOf(p) === by && p.toLowerCase() === t;
  const pd = by === 'w' ? 1 : -1;
  if (mine(at(r + pd, c - 1), 'p') || mine(at(r + pd, c + 1), 'p')) return true;
  for (const [dr, dc] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) if (mine(at(r + dr, c + dc), 'n')) return true;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && mine(at(r + dr, c + dc), 'k')) return true;
  for (const [dr, dc, t] of [[1, 0, 'r'], [-1, 0, 'r'], [0, 1, 'r'], [0, -1, 'r'], [1, 1, 'b'], [1, -1, 'b'], [-1, 1, 'b'], [-1, -1, 'b']]) {
    let rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      const p = b[rr * 8 + cc];
      if (p) { if (sideOf(p) === by && (p.toLowerCase() === t || p.toLowerCase() === 'q')) return true; break; }
      rr += dr; cc += dc;
    }
  }
  return false;
}

function pseudo(s) {
  const { b, turn } = s; const out = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq]; if (!p || sideOf(p) !== turn) continue;
    const r = sq >> 3, c = sq & 7, t = p.toLowerCase();
    const add = (to, extra = {}) => out.push({ from: sq, to, p, cap: b[to], ...extra });
    const slide = (dirs, once) => {
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          const q = b[rr * 8 + cc];
          if (q && sideOf(q) === turn) break;
          add(rr * 8 + cc);
          if (q || once) break;
          rr += dr; cc += dc;
        }
      }
    };
    if (t === 'p') {
      const d = turn === 'w' ? -1 : 1, start = turn === 'w' ? 6 : 1, last = turn === 'w' ? 0 : 7;
      const one = sq + d * 8;
      const promo = (to, cap) => { if ((to >> 3) === last) for (const pr of 'qrbn') add(to, { promo: turn === 'w' ? pr.toUpperCase() : pr, cap }); else add(to, { cap }); };
      if (!b[one]) { promo(one, null); if (r === start && !b[one + d * 8]) add(one + d * 8, { dbl: true }); }
      for (const dc of [-1, 1]) {
        const cc = c + dc; if (cc < 0 || cc > 7) continue;
        const to = (r + d) * 8 + cc;
        if (b[to] && sideOf(b[to]) !== turn) promo(to, b[to]);
        if (to === s.ep) add(to, { epCap: r * 8 + cc, cap: b[r * 8 + cc] });
      }
    } else if (t === 'n') slide([[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]], true);
    else if (t === 'b') slide([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
    else if (t === 'r') slide([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    else if (t === 'q') slide([[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]);
    else if (t === 'k') {
      slide([[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]], true);
      const opp = turn === 'w' ? 'b' : 'w', row = turn === 'w' ? 56 : 0;
      if (sq === row + 4 && !attacked(b, sq, opp)) {
        const K = turn === 'w' ? 'K' : 'k', Q = turn === 'w' ? 'Q' : 'q';
        if (s.castle[K] && !b[row + 5] && !b[row + 6] && !attacked(b, row + 5, opp)) add(row + 6, { castle: 'K' });
        if (s.castle[Q] && !b[row + 3] && !b[row + 2] && !b[row + 1] && !attacked(b, row + 3, opp)) add(row + 2, { castle: 'Q' });
      }
    }
  }
  return out;
}

function make(s, m) {
  const b = s.b.slice();
  const castle = { ...s.castle };
  b[m.to] = m.promo || m.p; b[m.from] = null;
  if (m.epCap != null) b[m.epCap] = null;
  if (m.castle) { const row = m.from & 56; if (m.castle === 'K') { b[row + 5] = b[row + 7]; b[row + 7] = null; } else { b[row + 3] = b[row]; b[row] = null; } }
  if (m.p === 'K') castle.K = castle.Q = false; if (m.p === 'k') castle.k = castle.q = false;
  for (const [sq, k] of [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']]) if (m.from === sq || m.to === sq) castle[k] = false;
  return { b, turn: s.turn === 'w' ? 'b' : 'w', castle, ep: m.dbl ? (m.from + m.to) / 2 : -1, half: s.half + 1 };
}

function legal(s) {
  return pseudo(s).filter((m) => { const n = make(s, m); const k = n.b.indexOf(s.turn === 'w' ? 'K' : 'k'); return !attacked(n.b, k, n.turn); });
}

function evaluate(b) {
  let sc = 0;
  for (let i = 0; i < 64; i++) {
    const p = b[i]; if (!p) continue;
    const t = p.toLowerCase();
    if (isW(p)) sc += VAL[t] + PST[t][i]; else sc -= VAL[t] + PST[t][(7 - (i >> 3)) * 8 + (i & 7)];
  }
  return sc;
}

function search(s, depth, alpha, beta) {
  const moves = legal(s);
  if (!moves.length) { const k = s.b.indexOf(s.turn === 'w' ? 'K' : 'k'); return attacked(s.b, k, s.turn === 'w' ? 'b' : 'w') ? -100000 - depth : 0; }
  if (depth === 0) return (s.turn === 'w' ? 1 : -1) * evaluate(s.b);
  moves.sort((a, b) => (b.cap ? VAL[b.cap.toLowerCase()] : 0) - (a.cap ? VAL[a.cap.toLowerCase()] : 0));
  for (const m of moves) {
    const v = -search(make(s, m), depth - 1, -beta, -alpha);
    if (v >= beta) return beta;
    if (v > alpha) alpha = v;
  }
  return alpha;
}

function bestMove(s, depth) {
  const moves = legal(s);
  let best = null, bv = -Infinity;
  moves.sort(() => Math.random() - .5);
  moves.sort((a, b) => (b.cap ? 1 : 0) - (a.cap ? 1 : 0));
  for (const m of moves) {
    const v = -search(make(s, m), depth - 1, -Infinity, -bv);
    if (v > bv) { bv = v; best = m; }
  }
  return best;
}

const NAME = (sq) => 'abcdefgh'[sq & 7] + (8 - (sq >> 3));

export default {
  id: 'chess', title: 'Шахматы', icon: 'chess', theme: 'mac', w: 600, h: 560, cls: 'win-chess',
  about: 'Шахматы против компьютера. Вы играете белыми.',
  mount(root, win) {
    let S = initial(), sel = -1, targets = [], last = null, log = [], level = 2, thinking = false, over = false;
    const boardEl = h('div', { class: 'ch-board', role: 'grid', 'aria-label': 'Шахматная доска' });
    const statusEl = h('div', { class: 'ch-status' });
    const logEl = h('ol', { class: 'ch-log' });
    const levelSel = h('select', { id: 'ch-level', onchange: (e) => { level = +e.target.value; } },
      h('option', { value: 1 }, 'Новичок'), h('option', { value: 2, selected: true }, 'Любитель'), h('option', { value: 3 }, 'Сильный'));
    root.append(h('div', { class: 'ch' },
      boardEl,
      h('aside', { class: 'ch-side' },
        statusEl,
        h('label', { for: 'ch-level', class: 'ch-lbl' }, 'Уровень'), levelSel,
        h('div', { class: 'ch-btns' }, h('button', { class: 'btn', onclick: () => { S = initial(); sel = -1; targets = []; last = null; log = []; over = false; draw(); } }, 'Новая партия'),
          h('button', { class: 'btn', onclick: () => { if (log.length >= 2 && !thinking) { log.splice(-2); replay(); } } }, 'Вернуть ход')),
        h('h4', {}, 'Ходы'), logEl)));

    let history = [];
    function replay() { S = initial(); last = null; const mv = log.slice(); log = []; history = []; for (const m of mv) { S = make(S, m); log.push(m); last = m; } over = false; sel = -1; targets = []; draw(); }

    function draw() {
      boardEl.innerHTML = '';
      const kSq = S.b.indexOf(S.turn === 'w' ? 'K' : 'k');
      const check = attacked(S.b, kSq, S.turn === 'w' ? 'b' : 'w');
      for (let i = 0; i < 64; i++) {
        const dark = ((i >> 3) + (i & 7)) % 2 === 1;
        const p = S.b[i];
        const cls = ['ch-sq', dark ? 'dk' : 'lt'];
        if (i === sel) cls.push('sel');
        if (last && (i === last.from || i === last.to)) cls.push('last');
        if (check && i === kSq) cls.push('check');
        const t = targets.find((m) => m.to === i);
        const sq = h('button', { class: cls.join(' '), 'aria-label': NAME(i) + (p ? ' ' + p : ''), onclick: () => click(i) },
          p ? h('span', { class: 'pc ' + (isW(p) ? 'pw' : 'pb') }, GLYPH[p.toLowerCase()]) : null,
          t ? h('i', { class: t.cap ? 'cap' : 'dot' }) : null,
          (i & 7) === 0 ? h('small', { class: 'rk' }, 8 - (i >> 3)) : null,
          (i >> 3) === 7 ? h('small', { class: 'fl' }, 'abcdefgh'[i & 7]) : null);
        boardEl.append(sq);
      }
      logEl.innerHTML = '';
      for (let i = 0; i < log.length; i += 2) logEl.append(h('li', {}, san(log[i]) + (log[i + 1] ? '   ' + san(log[i + 1]) : '')));
      logEl.scrollTop = logEl.scrollHeight;
      const moves = legal(S);
      if (!moves.length) { over = true; statusEl.textContent = check ? (S.turn === 'w' ? 'Мат. Победили чёрные.' : 'Мат! Вы победили.') : 'Пат. Ничья.'; }
      else if (S.half > 200) { over = true; statusEl.textContent = 'Ничья по числу ходов.'; }
      else statusEl.textContent = thinking ? 'Компьютер думает…' : (check ? 'Шах! ' : '') + (S.turn === 'w' ? 'Ваш ход (белые)' : 'Ход чёрных');
    }
    const san = (m) => (m.castle ? (m.castle === 'K' ? 'O-O' : 'O-O-O') : (m.p.toLowerCase() === 'p' ? '' : GLYPH[m.p.toUpperCase()]) + NAME(m.from) + (m.cap ? '×' : '–') + NAME(m.to) + (m.promo ? '=' + GLYPH[m.promo.toUpperCase()] : ''));

    function click(i) {
      if (thinking || over || S.turn !== 'w') return;
      const t = targets.find((m) => m.to === i);
      if (t) {
        const m = t.promo ? targets.find((x) => x.to === i && x.promo === 'Q') : t;
        S = make(S, m); log.push(m); last = m; sel = -1; targets = []; sound('click');
        draw();
        if (!over) { thinking = true; draw(); setTimeout(ai, 60); }
        return;
      }
      if (S.b[i] && sideOf(S.b[i]) === 'w') { sel = i; targets = legal(S).filter((m) => m.from === i); }
      else { sel = -1; targets = []; }
      draw();
    }
    function ai() {
      const m = bestMove(S, level);
      thinking = false;
      if (m) { S = make(S, m); log.push(m); last = m; }
      draw();
    }
    draw();
    return () => { over = true; };
  },
};
