// «Косынка» (пасьянс Klondike, сдача по одной карте).
import { h, sound } from '../state.js';
import { best, setBest } from './kit.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const RED = (s) => s === 1 || s === 2;
const RANK = ['', 'Т', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'В', 'Д', 'К'];

export default {
  id: 'solitaire', title: 'Косынка', icon: 'cards', theme: 'xp', w: 660, h: 540, resizable: true, cls: 'win-sol',
  about: 'Классический пасьянс: соберите все масти от туза до короля.',
  mount(root, win) {
    const board = h('div', { class: 'sol' });
    const bar = h('div', { class: 'sol-bar' });
    root.append(h('div', { class: 'sol-wrap' }, h('div', { class: 'sol-menu' },
      h('button', { class: 'tool-b', onclick: () => deal() }, 'Новая раздача'),
      h('button', { class: 'tool-b', onclick: () => undo() }, 'Отменить ход'),
      h('button', { class: 'tool-b', onclick: () => autoFinish() }, 'Собрать')), board, bar));

    let P, moves, score, t0, tid, hist, cw = 71, chh = 96, gap = 10, won = false, anim = 0;

    function deal() {
      const deck = [];
      for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ s, r, up: false, id: s * 13 + r });
      for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
      P = { stock: [], waste: [], f: [[], [], [], []], t: [[], [], [], [], [], [], []] };
      for (let i = 0; i < 7; i++) for (let j = i; j < 7; j++) { const c = deck.pop(); c.up = j === i; P.t[j].push(c); }
      P.stock = deck;
      moves = 0; score = 0; hist = []; won = false; cancelAnimationFrame(anim);
      clearInterval(tid); t0 = Date.now(); tid = setInterval(status, 1000);
      render();
    }
    const snap = () => JSON.stringify(P);
    function push() { hist.push(snap()); if (hist.length > 200) hist.shift(); }
    function undo() { if (!hist.length || won) return; P = JSON.parse(hist.pop()); moves++; render(); }
    function status() { const s = Math.floor((Date.now() - t0) / 1000); bar.textContent = `Очки: ${score}   Ходов: ${moves}   Время: ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}   Рекорд: ${best('solitaire') || '—'}`; }

    const canFound = (c, pile) => (pile.length ? pile.at(-1).s === c.s && pile.at(-1).r === c.r - 1 : c.r === 1);
    const canTab = (c, pile) => (pile.length ? pile.at(-1).up && RED(pile.at(-1).s) !== RED(c.s) && pile.at(-1).r === c.r + 1 : c.r === 13);

    function pileOf(ref) { const [k, i] = ref.split(':'); return k === 'stock' ? P.stock : k === 'waste' ? P.waste : k === 'f' ? P.f[i] : P.t[i]; }
    function flipTops() { P.t.forEach((p) => { if (p.length && !p.at(-1).up) { p.at(-1).up = true; score += 5; } }); }

    function moveCards(from, idx, to) {
      const src = pileOf(from), dst = pileOf(to);
      const cards = src.slice(idx);
      const ok = to.startsWith('f') ? cards.length === 1 && canFound(cards[0], dst) : canTab(cards[0], dst);
      if (!ok) return false;
      push();
      dst.push(...src.splice(idx));
      score += to.startsWith('f') ? 10 : from === 'waste' ? 5 : 0;
      if (from.startsWith('f')) score = Math.max(0, score - 15);
      moves++; flipTops(); render(); checkWin();
      return true;
    }

    function clickStock() {
      push();
      if (P.stock.length) { const c = P.stock.pop(); c.up = true; P.waste.push(c); }
      else { P.stock = P.waste.reverse().map((c) => ({ ...c, up: false })); P.waste = []; score = Math.max(0, score - 20); }
      moves++; render();
    }

    function autoTo(from, idx) {
      const src = pileOf(from);
      if (idx !== src.length - 1) return false;
      for (let i = 0; i < 4; i++) if (canFound(src[idx], P.f[i])) return moveCards(from, idx, 'f:' + i);
      return false;
    }
    function autoFinish() {
      let any = true;
      while (any && !won) {
        any = false;
        for (const ref of ['waste', ...P.t.map((_, i) => 't:' + i)]) { const p = pileOf(ref); if (p.length && autoTo(ref, p.length - 1)) { any = true; break; } }
      }
    }

    function layout() {
      const W = board.clientWidth || 600;
      cw = Math.max(40, Math.min(80, Math.floor((W - gap * 8) / 7)));
      chh = Math.round(cw * 1.38);
    }
    const X = (i) => gap + i * (cw + gap);

    function cardEl(c, ref, idx, x, y) {
      const el = h('div', { class: 'card' + (c.up ? (RED(c.s) ? ' red' : ' black') : ' back'), style: { left: x + 'px', top: y + 'px', width: cw + 'px', height: chh + 'px' }, 'data-ref': ref, 'data-idx': idx });
      if (c.up) el.append(h('span', { class: 'cr' }, RANK[c.r], h('i', {}, SUITS[c.s])), h('span', { class: 'cs' }, SUITS[c.s]), h('span', { class: 'cr cr2' }, RANK[c.r], h('i', {}, SUITS[c.s])));
      return el;
    }

    function render() {
      layout();
      board.innerHTML = '';
      const slot = (x, y, label, ref) => board.append(h('div', { class: 'slot', style: { left: x + 'px', top: y + 'px', width: cw + 'px', height: chh + 'px' }, 'data-ref': ref }, label));
      slot(X(0), gap, P.stock.length ? '' : '↻', 'stock');
      slot(X(1), gap, '', 'waste');
      for (let i = 0; i < 4; i++) slot(X(3 + i), gap, 'Т', 'f:' + i);
      for (let i = 0; i < 7; i++) slot(X(i), gap * 2 + chh, '', 't:' + i);
      if (P.stock.length) { const el = cardEl(P.stock.at(-1), 'stock', P.stock.length - 1, X(0), gap); board.append(el); }
      P.waste.slice(-3).forEach((c, k, arr) => { const idx = P.waste.length - arr.length + k; board.append(cardEl(c, 'waste', idx, X(1) + k * Math.round(cw * .18), gap)); });
      P.f.forEach((p, i) => { if (p.length) board.append(cardEl(p.at(-1), 'f:' + i, p.length - 1, X(3 + i), gap)); });
      const maxH = board.clientHeight || 400;
      P.t.forEach((p, i) => {
        let y = gap * 2 + chh;
        const open = p.filter((c) => c.up).length, closed = p.length - open;
        const room = maxH - y - chh - 6;
        const upStep = Math.max(12, Math.min(Math.round(chh * .28), open > 1 ? (room - closed * 6) / (open - 1) : 99));
        p.forEach((c, j) => { board.append(cardEl(c, 't:' + i, j, X(i), y)); y += c.up ? upStep : Math.round(chh * .12); });
      });
      status();
    }

    // --- перетаскивание ---
    let drag = null;
    board.addEventListener('pointerdown', (e) => {
      if (won) return;
      const el = e.target.closest('.card, .slot');
      if (!el) return;
      const ref = el.dataset.ref;
      if (ref === 'stock') { clickStock(); return; }
      if (!el.classList.contains('card') || el.classList.contains('back')) return;
      const idx = +el.dataset.idx;
      if (ref === 'waste' && idx !== P.waste.length - 1) return;
      const src = pileOf(ref);
      const els = [...board.querySelectorAll(`.card[data-ref="${ref}"]`)].filter((n) => +n.dataset.idx >= idx);
      const start = els.map((n) => [n.offsetLeft, n.offsetTop]);
      els.forEach((n) => n.classList.add('dragging'));
      drag = { ref, idx, els, start, sx: e.clientX, sy: e.clientY, moved: false, count: src.length - idx };
      board.setPointerCapture(e.pointerId);
    });
    board.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      drag.els.forEach((n, k) => { n.style.left = drag.start[k][0] + dx + 'px'; n.style.top = drag.start[k][1] + dy + 'px'; });
    });
    board.addEventListener('pointerup', (e) => {
      if (!drag) return;
      const d = drag; drag = null;
      if (!d.moved) {
        // клик: попытка отправить карту в «дом» или на подходящую стопку
        if (!autoTo(d.ref, d.idx)) {
          const card = pileOf(d.ref)[d.idx];
          for (let i = 0; i < 7; i++) if ('t:' + i !== d.ref && canTab(card, P.t[i])) { moveCards(d.ref, d.idx, 't:' + i); return; }
          render();
        }
        return;
      }
      const r = d.els[0].getBoundingClientRect();
      let bestRef = null, bestA = 0;
      for (const ref of ['f:0', 'f:1', 'f:2', 'f:3', ...P.t.map((_, i) => 't:' + i)]) {
        if (ref === d.ref) continue;
        const pile = pileOf(ref);
        const target = pile.length ? board.querySelector(`.card[data-ref="${ref}"][data-idx="${pile.length - 1}"]`) : board.querySelector(`.slot[data-ref="${ref}"]`);
        if (!target) continue;
        const t = target.getBoundingClientRect();
        const a = Math.max(0, Math.min(r.right, t.right) - Math.max(r.left, t.left)) * Math.max(0, Math.min(r.bottom, t.bottom) - Math.max(r.top, t.top));
        if (a > bestA) { bestA = a; bestRef = ref; }
      }
      if (!bestRef || !moveCards(d.ref, d.idx, bestRef)) render();
    });
    board.addEventListener('dblclick', (e) => { const el = e.target.closest('.card'); if (el && !el.classList.contains('back')) autoTo(el.dataset.ref, +el.dataset.idx); });

    function checkWin() {
      if (P.f.every((p) => p.length === 13)) {
        won = true; clearInterval(tid);
        const secs = Math.floor((Date.now() - t0) / 1000);
        score += Math.max(0, 700 - secs * 2);
        setBest('solitaire', score); status(); sound('ding');
        celebrate();
      }
    }
    function celebrate() {
      // знаменитый «каскад» прыгающих карт
      const cv = h('canvas', { class: 'sol-cv' });
      board.append(cv);
      cv.width = board.clientWidth; cv.height = board.clientHeight;
      const ctx = cv.getContext('2d');
      const cards = [];
      let k = 0;
      const tmp = h('div');
      const spawn = () => {
        const s = k % 4, r = 13 - Math.floor(k / 4);
        if (r < 1) return;
        cards.push({ x: X(3 + s), y: gap, vx: (Math.random() * 4 + 2) * (Math.random() < .5 ? -1 : 1), vy: -Math.random() * 3, s, r });
        k++;
      };
      const drawCard = (c) => {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#333';
        ctx.fillRect(c.x, c.y, cw, chh); ctx.strokeRect(c.x + .5, c.y + .5, cw - 1, chh - 1);
        ctx.fillStyle = RED(c.s) ? '#c8102e' : '#111'; ctx.font = `700 ${Math.round(cw * .26)}px PT Sans, sans-serif`;
        ctx.fillText(RANK[c.r] + SUITS[c.s], c.x + 4, c.y + cw * .3);
        ctx.font = `${Math.round(cw * .5)}px PT Sans, sans-serif`; ctx.fillText(SUITS[c.s], c.x + cw * .3, c.y + chh * .66);
      };
      let frame = 0;
      const step = () => {
        if (frame++ % 22 === 0) spawn();
        for (const c of cards) {
          c.vy += .45; c.x += c.vx; c.y += c.vy;
          if (c.y + chh > cv.height) { c.y = cv.height - chh; c.vy *= -.82; }
          if (!c.gone) drawCard(c);
          if (c.x < -cw || c.x > cv.width) c.gone = true;
        }
        if (k < 52 || cards.some((c) => !c.gone)) anim = requestAnimationFrame(step);
        else { tmp.remove(); board.append(h('div', { class: 'game-msg' }, h('b', {}, 'Пасьянс сошёлся!'), h('p', {}, `Очки: ${score}. Нажмите «Новая раздача».`))); }
      };
      step();
    }

    const ro = new ResizeObserver(() => { if (!drag && !won) render(); });
    ro.observe(board);
    deal();
    return () => { clearInterval(tid); cancelAnimationFrame(anim); ro.disconnect(); };
  },
};
