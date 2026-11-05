// Общее состояние и шина событий.
const listeners = {};
export const bus = {
  on(ev, fn) { (listeners[ev] ||= new Set()).add(fn); return () => listeners[ev].delete(fn); },
  emit(ev, data) { (listeners[ev] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); },
};

export const store = {
  get(k, d) { try { const v = localStorage.getItem('jd.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('jd.' + k, JSON.stringify(v)); } catch { /* приватный режим */ } },
};

export const state = {
  theme: store.get('theme', null), // 'xp' | 'mac'
  user: null,                      // null | 'guest' | 'pca'
  manifest: null,
  index: null,                     // расшифрованный список проектов
};

export const isMobile = () => window.matchMedia('(max-width: 720px)').matches;
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

export const fmtSize = (b) => b < 1024 ? `${b} Б` : b < 1048576 ? `${(b / 1024).toFixed(1)} КБ` : `${(b / 1048576).toFixed(1)} МБ`;
export const fmtDate = (iso) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Короткие синтезированные звуки (только после действия пользователя).
let actx = null;
export function sound(kind) {
  if (store.get('mute', false)) return;
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime;
    const notes = {
      xpStart: [[523, 0, .5], [659, .12, .5], [784, .24, .6], [1047, .4, .9], [784, .55, .9]],
      xpEnd: [[784, 0, .4], [659, .15, .4], [523, .3, .5], [392, .45, .8]],
      macStart: [[262, 0, 1.6], [330, 0, 1.6], [392, 0, 1.6], [523, 0, 1.6], [659, .02, 1.6]],
      click: [[880, 0, .05]],
      error: [[220, 0, .25], [196, .12, .3]],
      ding: [[1319, 0, .35], [1568, .08, .45]],
    }[kind] || [];
    for (const [f, d, len] of notes) {
      const o = actx.createOscillator(); const g = actx.createGain();
      o.type = kind.startsWith('mac') ? 'sine' : 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t + d);
      g.gain.linearRampToValueAtTime(kind === 'click' ? .05 : .12, t + d + .02);
      g.gain.exponentialRampToValueAtTime(.0001, t + d + len);
      o.connect(g).connect(actx.destination);
      o.start(t + d); o.stop(t + d + len + .05);
    }
  } catch { /* без звука */ }
}
