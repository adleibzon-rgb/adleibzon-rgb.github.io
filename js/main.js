// Точка входа: 3D-выбор стиля → загрузка → вход → рабочий стол.
import { h, state, bus, store, sound } from './state.js';
import { installIconDefs } from './icons.js';
import * as vault from './vault.js';
import * as wm from './wm.js';
import * as xp from './shell-xp.js';
import * as mac from './shell-mac.js';

const stage = document.getElementById('stage');
const SHELLS = { xp, mac };
let layer = null;
let teardown = null;
let gen = 0;
let idleT = 0;
let saverStop = null;

installIconDefs();

function setTheme(t) {
  state.theme = t;
  store.set('theme', t);
  document.body.classList.remove('xp', 'mac');
  document.body.classList.add(t);
  document.documentElement.style.colorScheme = 'light';
  bus.emit('theme', t);
}

function clearStage() {
  wm.closeAll();
  teardown?.(); teardown = null;
  saverStop?.(); saverStop = null;
  stage.innerHTML = '';
  layer = null;
}

async function intro() {
  const { intro: run } = await import('./intro3d.js');
  return run(stage);
}

function mountDesktop() {
  if (!layer) {
    layer = h('div', { class: 'winlayer' });
    stage.append(layer);
    wm.setLayer(layer);
  }
  teardown = SHELLS[state.theme].mount(stage, layer);
  stage.append(layer);
  // панели оболочки поверх окон
  stage.querySelectorAll('.xp-bar, .xp-menu, .xp-balloon, .mac-bar, .mb-drop, .mac-dock, .spot').forEach((n) => stage.append(n));
  document.body.classList.remove('booting');
  resetIdle();
}

async function bootFlow(first) {
  const my = ++gen;
  clearStage();
  document.body.classList.add('booting');
  let theme = state.theme;
  if (!theme || (first && !store.get('skipIntro', false))) {
    try { theme = await intro(); } catch (e) { console.warn('3D-заставка не загрузилась', e); theme = theme || 'xp'; }
  }
  if (my !== gen) return;
  setTheme(theme);
  await SHELLS[theme].bootScreen(stage);
  if (my !== gen) return;
  if (!vault.unlocked()) {
    const who = await SHELLS[theme].welcome(stage);
    if (my !== gen) return;
    if (who === 'restart') return bootFlow(false);
  }
  if (theme === 'xp') sound('xpStart');
  mountDesktop();
}

async function switchTheme(t) {
  if (t === state.theme || !teardown) { if (!teardown) setTheme(t); return; }
  stage.classList.add('flip-out');
  await new Promise((r) => setTimeout(r, 420));
  teardown(); teardown = null;
  setTheme(t);
  mountDesktop();
  for (const w of wm.windows()) { // в новом стиле окна не должны залезать под строку меню
    if (t === 'mac' && w.el.offsetTop < 24) w.el.style.top = '28px';
  }
  stage.classList.remove('flip-out');
  stage.classList.add('flip-in');
  setTimeout(() => stage.classList.remove('flip-in'), 520);
}

function powerOff(restart) {
  const my = ++gen;
  const theme = state.theme;
  clearStage();
  document.body.classList.add('booting');
  const done = () => {
    if (my !== gen) return;
    if (restart) return bootFlow(false);
    stage.innerHTML = '';
    const off = h('button', { class: 'power-off', autofocus: true }, h('span', { class: 'power-dot' }), h('b', {}, 'Компьютер выключен'), h('small', {}, 'Нажмите здесь или любую клавишу, чтобы включить.'));
    const on = () => { window.removeEventListener('keydown', on); bootFlow(false); };
    off.addEventListener('click', on);
    window.addEventListener('keydown', on);
    stage.append(off);
    off.focus();
  };
  if (theme === 'xp') xp.shutdownScreen(stage, restart ? 'Перезагрузка…' : 'Завершение работы…').then(done);
  else { stage.append(h('div', { class: 'mac-bye' })); setTimeout(done, 1400); }
}

function sleep() {
  const el = h('div', { class: 'sleep', role: 'button', tabindex: 0, 'aria-label': 'Разбудить' }, h('span', { class: 'sleep-led' }));
  document.body.append(el);
  let armed = false; setTimeout(() => { armed = true; }, 500);
  const wake = () => { if (!armed) return; el.remove(); window.removeEventListener('keydown', wake); };
  el.addEventListener('click', wake);
  window.addEventListener('keydown', wake);
}

async function startSaver() {
  if (saverStop || !teardown || document.querySelector('.sleep')) return;
  const { screensaver } = await import('./intro3d.js');
  const stop = screensaver(stage);
  saverStop = () => { stop(); saverStop = null; resetIdle(); };
  const end = () => { window.removeEventListener('keydown', end); window.removeEventListener('pointermove', end); window.removeEventListener('pointerdown', end); setTimeout(() => { saverStop = null; resetIdle(); }, 50); };
  setTimeout(() => { window.addEventListener('keydown', end); window.addEventListener('pointermove', end); window.addEventListener('pointerdown', end); }, 600);
}
function resetIdle() {
  clearTimeout(idleT);
  const busyGame = () => wm.windows().some((w) => w.id.startsWith('game-') && !w.minimized);
  idleT = setTimeout(() => { if (!busyGame()) startSaver(); else resetIdle(); }, 3 * 60 * 1000);
}
['pointermove', 'keydown', 'pointerdown', 'wheel'].forEach((ev) => window.addEventListener(ev, () => { if (!saverStop) resetIdle(); }, { passive: true }));

bus.on('switch-theme', switchTheme);
bus.on('intro', async () => { const t = await intro(); switchTheme(t); });
bus.on('shutdown', () => powerOff(false));
bus.on('restart', () => powerOff(true));
bus.on('sleep', sleep);
bus.on('screensaver', startSaver);
bus.on('logoff', async () => {
  const my = ++gen;
  clearStage();
  document.body.classList.add('booting');
  const who = await SHELLS[state.theme].welcome(stage);
  if (my !== gen) return;
  if (who === 'restart') return bootFlow(false);
  mountDesktop();
});
function closeForbidden() {
  // закрываем окна, которые пользователь больше не вправе видеть
  for (const w of wm.windows()) {
    if (w.id.startsWith('repo-') && !vault.canOpen(w.id.slice(5))) wm.close(w);
    if ((w.id === 'admin' || w.id.startsWith('adm-')) && !vault.isAdmin()) wm.close(w);
  }
}
bus.on('auth', closeForbidden);
let lastNotice = '';
bus.on('notice', (text) => {
  if (text === lastNotice) return;
  lastNotice = text;
  closeForbidden();
  bus.emit('auth', 'guest');
  wm.dialog({ title: 'Подписка', text, iconName: 'lock' });
});
bus.on('projects', closeForbidden);

(async () => {
  try {
    await vault.loadManifest();
  } catch (e) {
    stage.append(h('div', { class: 'fatal' }, h('b', {}, 'Не удалось загрузить данные сайта.'), h('p', {}, 'Проверьте подключение к интернету и обновите страницу.')));
    return;
  }
  await vault.restoreSession();
  bootFlow(true);
})();
