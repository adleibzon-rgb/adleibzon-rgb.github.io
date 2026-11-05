// Оконный менеджер: общий для обеих тем. Внешний вид окна задаёт CSS (body.xp / body.mac).
import { h, bus, isMobile, sound } from './state.js';
import { icon } from './icons.js';

const wins = new Map();
let z = 100;
let layer = null;
let seq = 0;

export function setLayer(el) { layer = el; }
export const windows = () => [...wins.values()];
export const getWin = (id) => wins.get(id);

export function openWindow(opts) {
  const id = opts.id || `w${++seq}`;
  if (wins.has(id)) { const w = wins.get(id); restore(w); focus(w); return w; }
  const theme = document.body.classList.contains('mac') ? 'mac' : 'xp';
  const W = Math.min(opts.width || 640, window.innerWidth - 24);
  const H = Math.min(opts.height || 440, window.innerHeight - 90);
  const n = wins.size;
  const x = opts.x ?? Math.max(8, (window.innerWidth - W) / 2 + (n % 6) * 26 - 60);
  const y = opts.y ?? Math.max(theme === 'mac' ? 34 : 8, (window.innerHeight - H) / 2 + (n % 6) * 24 - 70);

  const titleText = h('span', { class: 'win-title-text' }, opts.title);
  const btn = (cls, label, fn) => h('button', { class: `wb ${cls}`, 'aria-label': label, title: label, onclick: (e) => { e.stopPropagation(); fn(); } });
  const el = h('section', { class: `win ${opts.class || ''}`, role: 'dialog', 'aria-label': opts.title, style: { left: x + 'px', top: y + 'px', width: W + 'px', height: H + 'px' } },
    h('header', { class: 'win-bar' },
      h('div', { class: 'win-lights' },
        btn('wb-close', 'Закрыть', () => close(w)),
        btn('wb-min', 'Свернуть', () => minimize(w)),
        opts.resizable === false ? null : btn('wb-max', 'Развернуть', () => toggleMax(w))),
      h('span', { class: 'win-ico', html: icon(opts.icon || 'file', theme, 16) }),
      titleText,
      h('div', { class: 'win-btns' },
        btn('wb-min', 'Свернуть', () => minimize(w)),
        opts.resizable === false ? null : btn('wb-max', 'Развернуть', () => toggleMax(w)),
        btn('wb-close', 'Закрыть', () => close(w)))),
    opts.toolbar ? h('div', { class: 'win-tools' }) : null,
    h('div', { class: 'win-body' }),
    opts.status ? h('footer', { class: 'win-status' }) : null,
    opts.resizable === false ? null : h('div', { class: 'win-resize' }));

  const w = {
    id, el, opts, title: opts.title, icon: opts.icon || 'file',
    body: el.querySelector('.win-body'), tools: el.querySelector('.win-tools'), status: el.querySelector('.win-status'),
    minimized: false, maximized: false, cleanup: [],
    setTitle(t) { w.title = t; titleText.textContent = t; el.setAttribute('aria-label', t); bus.emit('wins'); },
    onClose(fn) { w.cleanup.push(fn); },
  };
  wins.set(id, w);
  layer.append(el);
  el.addEventListener('pointerdown', () => focus(w), true);
  drag(w);
  resize(w);
  if (opts.maximized || isMobile()) toggleMax(w, true);
  focus(w);
  el.classList.add('win-open');
  setTimeout(() => el.classList.remove('win-open'), 260);
  try {
    const r = opts.render?.(w);
    if (typeof r === 'function') w.cleanup.push(r);
  } catch (e) { console.error(e); w.body.textContent = 'Ошибка запуска: ' + e.message; }
  bus.emit('wins');
  return w;
}

export function focus(w) {
  if (!w) return;
  for (const o of wins.values()) o.el.classList.toggle('win-active', o === w);
  w.el.style.zIndex = ++z;
  bus.emit('focus', w);
  bus.emit('wins');
}

export function activeWin() {
  let best = null;
  for (const w of wins.values()) if (!w.minimized && (!best || +w.el.style.zIndex > +best.el.style.zIndex)) best = w;
  return best;
}

export function close(w) {
  if (!w || !wins.has(w.id)) return;
  w.cleanup.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  wins.delete(w.id);
  w.el.classList.add('win-closing');
  setTimeout(() => w.el.remove(), 160);
  focus(activeWin());
  bus.emit('wins');
}

export function closeAll() { [...wins.values()].forEach(close); }

export function minimize(w) {
  w.minimized = true;
  w.el.classList.add('win-min');
  w.el.classList.remove('win-active');
  bus.emit('pause', w);
  focus(activeWin());
  bus.emit('wins');
}
export function restore(w) {
  if (!w.minimized) return;
  w.minimized = false;
  w.el.classList.remove('win-min');
  bus.emit('wins');
}
export function toggleTask(w) {
  if (w.minimized) { restore(w); focus(w); }
  else if (w.el.classList.contains('win-active')) minimize(w);
  else focus(w);
}

export function toggleMax(w, force) {
  const on = force ?? !w.maximized;
  if (on && !w.maximized) w.prev = { left: w.el.style.left, top: w.el.style.top, width: w.el.style.width, height: w.el.style.height };
  w.maximized = on;
  w.el.classList.toggle('win-maxed', on);
  if (!on && w.prev) Object.assign(w.el.style, w.prev);
  window.dispatchEvent(new Event('resize'));
}

function drag(w) {
  const bar = w.el.querySelector('.win-bar');
  bar.addEventListener('dblclick', (e) => { if (!e.target.closest('button') && w.opts.resizable !== false) toggleMax(w); });
  bar.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') || e.button !== 0) return;
    if (w.maximized) return;
    const sx = e.clientX, sy = e.clientY;
    const ox = w.el.offsetLeft, oy = w.el.offsetTop;
    bar.setPointerCapture(e.pointerId);
    w.el.classList.add('win-dragging');
    const move = (ev) => {
      const nx = Math.min(window.innerWidth - 60, Math.max(-w.el.offsetWidth + 80, ox + ev.clientX - sx));
      const ny = Math.min(window.innerHeight - 40, Math.max(document.body.classList.contains('mac') ? 22 : 0, oy + ev.clientY - sy));
      w.el.style.left = nx + 'px'; w.el.style.top = ny + 'px';
    };
    const up = () => { bar.removeEventListener('pointermove', move); w.el.classList.remove('win-dragging'); };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up, { once: true });
    bar.addEventListener('pointercancel', up, { once: true });
  });
}

function resize(w) {
  const g = w.el.querySelector('.win-resize');
  if (!g) return;
  g.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, ow = w.el.offsetWidth, oh = w.el.offsetHeight;
    g.setPointerCapture(e.pointerId);
    const move = (ev) => {
      w.el.style.width = Math.max(w.opts.minWidth || 280, ow + ev.clientX - sx) + 'px';
      w.el.style.height = Math.max(w.opts.minHeight || 180, oh + ev.clientY - sy) + 'px';
      window.dispatchEvent(new Event('resize'));
    };
    g.addEventListener('pointermove', move);
    g.addEventListener('pointerup', () => g.removeEventListener('pointermove', move), { once: true });
  });
}

// Модальное сообщение внутри рабочего стола (alert/confirm не используем).
export function dialog({ title = 'Сообщение', text = '', iconName = 'info', buttons = [{ label: 'OK', value: true }], width = 380 }) {
  return new Promise((resolve) => {
    const w = openWindow({
      title, icon: iconName, width, height: 180, resizable: false, class: 'win-dialog',
      render(win) {
        const theme = document.body.classList.contains('mac') ? 'mac' : 'xp';
        win.body.append(
          h('div', { class: 'dlg' },
            h('div', { class: 'dlg-ico', html: icon(iconName, theme, 40) }),
            h('div', { class: 'dlg-text' }, text)),
          h('div', { class: 'dlg-btns' }, buttons.map((b, i) => h('button', {
            class: 'btn' + (i === 0 ? ' btn-default' : ''), onclick: () => { resolve(b.value); close(win); },
          }, b.label))));
        win.onClose(() => resolve(null));
        setTimeout(() => win.body.querySelector('.btn-default')?.focus(), 30);
        win.el.style.height = 'auto';
      },
    });
    sound(iconName === 'info' ? 'ding' : 'error');
    return w;
  });
}
