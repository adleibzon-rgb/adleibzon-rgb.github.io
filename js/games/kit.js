// Мелочи, общие для игр.
import { h, store } from '../state.js';

// Клавиатура только для активного окна.
export function keys(win, onDown, onUp) {
  const active = () => win.el.classList.contains('win-active') && !win.minimized;
  const d = (e) => { if (!active() || e.target.closest('input,textarea')) return; if (onDown(e) !== false && /^Arrow| /.test(e.key)) e.preventDefault(); };
  const u = (e) => { if (active()) onUp?.(e); };
  window.addEventListener('keydown', d);
  window.addEventListener('keyup', u);
  return () => { window.removeEventListener('keydown', d); window.removeEventListener('keyup', u); };
}

export function loop(fn) {
  let id = 0, last = performance.now(), on = true;
  const step = (t) => { if (!on) return; const dt = Math.min(50, t - last); last = t; fn(dt); id = requestAnimationFrame(step); };
  id = requestAnimationFrame(step);
  return () => { on = false; cancelAnimationFrame(id); };
}

export const best = (id) => store.get('best.' + id, 0);
export const setBest = (id, v) => { if (v > best(id)) { store.set('best.' + id, v); return true; } return false; };

// Экранные кнопки для телефонов.
export function pad(onPress, extra = []) {
  const btn = (k, label) => {
    const b = h('button', { class: 'pad-b pad-' + k, 'aria-label': label }, label);
    const down = (e) => { e.preventDefault(); onPress(k, true); };
    const up = (e) => { e.preventDefault(); onPress(k, false); };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointerleave', up);
    return b;
  };
  return h('div', { class: 'pad' },
    h('div', { class: 'pad-dir' }, btn('up', '▲'), btn('left', '◀'), btn('right', '▶'), btn('down', '▼')),
    h('div', { class: 'pad-act' }, extra.map(([k, l]) => btn(k, l))));
}

export function fitCanvas(canvas, w, hgt) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = w * dpr; canvas.height = hgt * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  return ctx;
}
