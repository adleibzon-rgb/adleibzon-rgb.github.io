// Оболочка «Aqua · 2009»: строка меню, Dock с увеличением, окно входа, поиск, выключение.
import { h, state, bus, store, sound, reducedMotion, isMobile } from './state.js';
import { icon, fileIcon } from './icons.js';
import * as wm from './wm.js';
import { launch, appIcon, appTitle } from './apps.js';
import * as vault from './vault.js';
import { GAMES } from './games/index.js';

const macGames = () => GAMES.filter((g) => g.theme === 'mac');

export function wallpaper() {
  const el = h('div', { class: 'mac-wall', 'aria-hidden': 'true' }, h('canvas', { class: 'mac-aurora' }), h('div', { class: 'mac-stars' }));
  const cv = el.querySelector('canvas');
  let raf = 0, t0 = performance.now();
  const draw = (now) => {
    const w = cv.clientWidth || window.innerWidth, hh = cv.clientHeight || window.innerHeight;
    if (cv.width !== Math.round(w / 2) || cv.height !== Math.round(hh / 2)) { cv.width = Math.round(w / 2); cv.height = Math.round(hh / 2); }
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height, t = (now - t0) / 1000;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#05051a'); g.addColorStop(.55, '#1a0f3d'); g.addColorStop(1, '#3a1460');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    const bands = [[285, .55, 0], [215, .45, 1.7], [320, .4, 3.1], [190, .35, 4.4]];
    for (const [hue, amp, ph] of bands) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 6) {
        const y = H * (.52 + .16 * Math.sin(x / W * 3.2 + ph + t * .12) + .06 * Math.sin(x / W * 9 + t * .3 + ph));
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
      const gg = ctx.createLinearGradient(0, H * .3, 0, H);
      gg.addColorStop(0, `hsla(${hue},100%,65%,0)`); gg.addColorStop(.25, `hsla(${hue},100%,62%,${amp * .55})`); gg.addColorStop(1, `hsla(${hue},100%,40%,0)`);
      ctx.fillStyle = gg; ctx.fill();
      // светящийся гребень волны
      ctx.strokeStyle = `hsla(${hue},100%,80%,${amp * .5})`; ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 6) { const y = H * (.52 + .16 * Math.sin(x / W * 3.2 + ph + t * .12) + .06 * Math.sin(x / W * 9 + t * .3 + ph)); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    if (!reducedMotion()) raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  el.stop = () => cancelAnimationFrame(raf);
  return el;
}

export function mount(stage, layer) {
  const nodes = [];
  const offs = [];
  const add = (n) => { stage.append(n); nodes.push(n); return n; };
  const wall = wallpaper();
  stage.prepend(wall); nodes.push(wall); offs.push(() => wall.stop());

  // ---------- значки справа ----------
  const desk = add(h('div', { class: 'mac-desk', role: 'list' }));
  const di = (label, ic, fn) => {
    const b = h('button', { class: 'dico', role: 'listitem', ondblclick: fn, onkeydown: (e) => e.key === 'Enter' && fn() }, h('span', { html: icon(ic, 'mac', 48) }), h('span', { class: 'dico-l' }, label));
    b.addEventListener('click', (e) => { desk.querySelectorAll('.dico').forEach((d) => d.classList.toggle('sel', d === b)); if (window.matchMedia('(pointer: coarse)').matches) fn(); e.stopPropagation(); });
    return b;
  };
  const drawDesk = () => {
    desk.innerHTML = '';
    desk.append(di('PCA HD', 'computer', () => launch('computer')), di('Проекты', 'folderCode', () => launch('projects')), di('Документы', 'folderDocs', () => launch('docs')), di('Игры', 'folderGames', () => launch('games')),
      vault.apiMode() ? di('Ассистент', 'assistant', () => launch('chat')) : '',
      vault.isAdmin() ? di('Администрирование', 'shield', () => launch('admin')) : '', di('Стиль Luna · 2001', 'swap', () => bus.emit('switch-theme', 'xp')));
  };
  drawDesk();
  wall.addEventListener('click', () => { desk.querySelectorAll('.dico').forEach((d) => d.classList.remove('sel')); closeMenus(); });

  // ---------- строка меню ----------
  const appName = h('b', { class: 'mb-app' }, 'Файлы');
  const clock = h('span', { class: 'mb-clock' });
  const userEl = h('button', { class: 'mb-i mb-user' });
  const spotBtn = h('button', { class: 'mb-i mb-spot', 'aria-label': 'Поиск', html: icon('search', 'mac', 14) });
  const menus = {
    logo: () => [
      ['Об этом компьютере', () => launch('computer')],
      ['Системные настройки…', () => launch('settings')],
      ['Стиль Luna · 2001', () => bus.emit('switch-theme', 'xp')],
      '-',
      ['Режим сна', () => bus.emit('sleep')],
      ['Перезагрузить…', () => confirmPower('restart')],
      ['Выключить…', () => confirmPower('shutdown')],
      '-',
      vault.unlocked() ? [`Завершить сеанс «${state.user}»…`, () => { vault.logout(); bus.emit('logoff'); }] : ['Войти…', () => launch('login')],
    ],
    file: () => [['Новое окно «Проекты»', () => launch('projects')], ['Открыть «Игры»', () => launch('games')], '-', ['Закрыть окно', () => wm.close(wm.activeWin())]],
    view: () => [['Стиль Luna · 2001', () => bus.emit('switch-theme', 'xp')], ['3D-заставка', () => bus.emit('intro')], ['Хранитель экрана', () => bus.emit('screensaver')]],
    go: () => [['Проекты', () => launch('projects')], ['Документы', () => launch('docs')], ['Навигатор', () => launch('browser')], ['Терминал', () => launch('terminal')], ['Заметки', () => launch('notes')], ...(vault.isAdmin() ? ['-', ['Администрирование', () => launch('admin')]] : [])],
    win: () => [['Свернуть', () => { const w = wm.activeWin(); if (w) wm.minimize(w); }], ['Изменить масштаб', () => { const w = wm.activeWin(); if (w) wm.toggleMax(w); }], '-', ...wm.windows().map((w) => [w.title, () => { wm.restore(w); wm.focus(w); }])],
    help: () => [['Подсказки', () => wm.dialog({ title: 'Подсказки', text: 'Двойной щелчок открывает значок. Проекты закрыты паролем, игры доступны всем. Стиль меняется в меню логотипа или в Dock.', iconName: 'info' })]],
  };
  const drop = h('div', { class: 'mb-drop', role: 'menu', hidden: true });
  let openKey = null;
  function openMenu(key, anchor) {
    if (openKey === key) return closeMenus();
    openKey = key;
    drop.innerHTML = '';
    for (const it of menus[key]()) {
      if (it === '-') { drop.append(h('hr')); continue; }
      drop.append(h('button', { class: 'mb-di', role: 'menuitem', onclick: () => { closeMenus(); it[1](); } }, it[0]));
    }
    drop.style.left = Math.min(anchor.getBoundingClientRect().left, window.innerWidth - 240) + 'px';
    drop.hidden = false;
    bar.querySelectorAll('.mb-m').forEach((b) => b.classList.toggle('on', b.dataset.k === key));
  }
  function closeMenus() { drop.hidden = true; openKey = null; bar.querySelectorAll('.mb-m').forEach((b) => b.classList.remove('on')); }
  const mb = (k, label, cls = '') => {
    const b = h('button', { class: 'mb-i mb-m ' + cls, 'data-k': k, 'aria-haspopup': 'menu' }, label);
    b.addEventListener('click', (e) => { e.stopPropagation(); openMenu(k, b); });
    b.addEventListener('pointerenter', () => { if (openKey && openKey !== k) openMenu(k, b); });
    return b;
  };
  const bar = add(h('nav', { class: 'mac-bar', 'aria-label': 'Строка меню' },
    mb('logo', h('span', { html: icon('logo', 'mac', 16) }), 'mb-logo'),
    appName,
    mb('file', 'Файл'), mb('view', 'Вид'), mb('go', 'Переход'), mb('win', 'Окно'), mb('help', 'Справка'),
    h('span', { class: 'mb-sp' }),
    h('button', { class: 'mb-i', title: 'Переключить стиль на Luna 2001', 'aria-label': 'Переключить стиль', onclick: () => bus.emit('switch-theme', 'xp'), html: icon('swap', 'mac', 14) }),
    userEl, clock, spotBtn));
  add(drop);
  const outside = (e) => { if (!drop.hidden && !drop.contains(e.target) && !e.target.closest('.mb-m')) closeMenus(); };
  document.addEventListener('pointerdown', outside);
  offs.push(() => document.removeEventListener('pointerdown', outside));

  const drawUser = () => { userEl.textContent = vault.unlocked() ? state.user : 'Гость'; userEl.title = vault.unlocked() ? 'Завершить сеанс' : 'Войти в закрытые проекты'; };
  userEl.addEventListener('click', () => (vault.unlocked() ? (vault.logout(), bus.emit('logoff')) : launch('login')));
  drawUser();
  const tick = () => { clock.textContent = new Date().toLocaleString('ru-RU', { weekday: 'short', hour: '2-digit', minute: '2-digit' }); };
  tick(); const tid = setInterval(tick, 10000); offs.push(() => clearInterval(tid));
  offs.push(bus.on('focus', (w) => { appName.textContent = w ? w.title.split(' — ')[0] : 'Файлы'; }), bus.on('auth', () => { drawUser(); drawDock(); drawDesk(); }));

  // ---------- Dock ----------
  const dockBase = ['projects', 'docs', ...(vault.apiMode() ? ['chat'] : []), 'browser', 'terminal', 'notes', ...macGames().map((g) => 'game:' + g.id), 'settings', '|', 'games', 'trash'];
  const dock = add(h('nav', { class: 'mac-dock', 'aria-label': 'Dock' }));
  const shelf = h('div', { class: 'dock-shelf' });
  const row = h('div', { class: 'dock-row' });
  dock.append(shelf, row);
  function drawDock() {
    row.innerHTML = '';
    const dockApps = vault.isAdmin() ? [...dockBase.slice(0, -3), 'admin', ...dockBase.slice(-3)] : dockBase;
    for (const a of dockApps) {
      if (a === '|') { row.append(h('i', { class: 'dock-sep' })); continue; }
      const running = wm.windows().some((w) => w.id === a || w.id === 'game-' + a.slice(5) || (a === 'projects' && w.id.startsWith('repo-')));
      const ic = appIcon(a);
      const b = h('button', { class: 'dock-i' + (running ? ' run' : ''), 'aria-label': appTitle(a), onclick: () => { b.classList.add('bounce'); setTimeout(() => b.classList.remove('bounce'), 700); launch(a); } },
        h('span', { class: 'dock-ico', html: icon(ic, 'mac', 64) }), h('span', { class: 'dock-lbl' }, appTitle(a)));
      row.append(b);
    }
  }
  drawDock();
  offs.push(bus.on('wins', drawDock));
  // увеличение значков под курсором
  row.addEventListener('pointermove', (e) => {
    if (reducedMotion() || isMobile()) return;
    for (const b of row.querySelectorAll('.dock-i')) {
      const r = b.getBoundingClientRect();
      const d = Math.abs(e.clientX - (r.left + r.width / 2));
      const s = 1 + Math.max(0, 1 - d / 150) * .75;
      b.style.setProperty('--s', s.toFixed(3));
    }
  });
  row.addEventListener('pointerleave', () => row.querySelectorAll('.dock-i').forEach((b) => b.style.setProperty('--s', 1)));

  // ---------- поиск ----------
  const spot = add(h('div', { class: 'spot', hidden: true, role: 'dialog', 'aria-label': 'Поиск' }));
  const spotIn = h('input', { id: 'spot-in', type: 'search', placeholder: 'Поиск: проекты, файлы, игры', autocomplete: 'off', 'aria-label': 'Поиск' });
  const spotRes = h('div', { class: 'spot-res' });
  spot.append(h('div', { class: 'spot-row' }, h('span', { html: icon('search', 'mac', 18) }), spotIn), spotRes);
  spotBtn.addEventListener('click', (e) => { e.stopPropagation(); spot.hidden = !spot.hidden; if (!spot.hidden) { spotIn.value = ''; runSpot(); spotIn.focus(); } });
  const runSpot = async () => {
    const q = spotIn.value.trim().toLowerCase();
    spotRes.innerHTML = '';
    const res = [];
    for (const a of ['projects', 'browser', 'terminal', 'notes', 'settings', 'computer', 'games', ...GAMES.map((g) => 'game:' + g.id)]) if (!q || appTitle(a).toLowerCase().includes(q)) res.push(['Программы', appIcon(a), appTitle(a), () => launch(a)]);
    const repos = vault.unlocked() ? state.index.repos : state.manifest.repos;
    for (const r of repos) if (q && (r.name.toLowerCase().includes(q) || (r.desc || '').toLowerCase().includes(q))) res.push(['Проекты', vault.unlocked() ? 'folder' : 'folderLocked', r.name, () => launch('repo:' + r.id)]);
    if (q.length > 2 && vault.unlocked()) {
      for (const r of state.index.repos) {
        try {
          const d = await vault.loadRepo(r.id);
          for (const e of d.tree) if (e.p.toLowerCase().includes(q)) { res.push(['Файлы', fileIcon(e.p), `${r.name}/${e.p}`, () => launch('repo:' + r.id, e.p)]); if (res.length > 40) break; }
        } catch { /* */ }
        if (spotIn.value.trim().toLowerCase() !== q) return;
      }
    }
    let group = null;
    for (const [g, ic, label, fn] of res.slice(0, 40)) {
      if (g !== group) { spotRes.append(h('div', { class: 'spot-g' }, g)); group = g; }
      spotRes.append(h('button', { class: 'spot-i', onclick: () => { spot.hidden = true; fn(); } }, h('span', { html: icon(ic, 'mac', 16) }), label));
    }
    if (!res.length) spotRes.append(h('div', { class: 'spot-g' }, 'Ничего не найдено'));
  };
  let st = 0;
  spotIn.addEventListener('input', () => { clearTimeout(st); st = setTimeout(runSpot, 150); });
  spotIn.addEventListener('keydown', (e) => { if (e.key === 'Escape') spot.hidden = true; if (e.key === 'Enter') spotRes.querySelector('.spot-i')?.click(); });
  const hot = (e) => { if ((e.metaKey || e.ctrlKey) && e.code === 'Space') { e.preventDefault(); spotBtn.click(); } if (e.key === 'Escape') { closeMenus(); spot.hidden = true; } };
  document.addEventListener('keydown', hot);
  offs.push(() => document.removeEventListener('keydown', hot));
  const spotOut = (e) => { if (!spot.hidden && !spot.contains(e.target) && !spotBtn.contains(e.target)) spot.hidden = true; };
  document.addEventListener('pointerdown', spotOut);
  offs.push(() => document.removeEventListener('pointerdown', spotOut));

  function confirmPower(kind) {
    const names = { shutdown: ['выключить компьютер', 'Выключить', 'power'], restart: ['перезагрузить компьютер', 'Перезагрузить', 'restart'] }[kind];
    let left = 60;
    const txt = h('p', {});
    const upd = () => { txt.textContent = `Если ничего не выбрать, компьютер ${kind === 'shutdown' ? 'выключится' : 'перезагрузится'} автоматически через ${left} с.`; };
    upd();
    const ov = add(h('div', { class: 'mac-sheet-wrap' }, h('div', { class: 'mac-sheet', role: 'alertdialog' },
      h('span', { html: icon(names[2], 'mac', 56) }),
      h('div', {}, h('b', {}, `Вы действительно хотите ${names[0]}?`), txt,
        h('div', { class: 'dlg-btns' }, h('button', { class: 'btn', onclick: () => done() }, 'Отменить'), h('button', { class: 'btn btn-default', onclick: () => { done(); bus.emit(kind); } }, names[1]))))));
    const iv = setInterval(() => { if (--left <= 0) { done(); bus.emit(kind); } else upd(); }, 1000);
    const done = () => { clearInterval(iv); ov.remove(); };
    ov.querySelector('.btn-default').focus();
  }

  return () => { offs.forEach((f) => f()); nodes.forEach((n) => n.remove()); };
}

// ---------- загрузка ----------
export function bootScreen(stage) {
  return new Promise((res) => {
    sound('macStart');
    const el = h('div', { class: 'mac-boot', role: 'status', 'aria-label': 'Загрузка' }, h('span', { html: icon('logo', 'mac', 96) }), h('div', { class: 'mac-spin' }, ...Array.from({ length: 12 }, (_, i) => h('i', { style: { transform: `rotate(${i * 30}deg)`, animationDelay: `${i * 0.083 - 1}s` } }))));
    stage.append(el);
    setTimeout(() => { el.classList.add('fade'); setTimeout(() => { el.remove(); res(); }, 500); }, reducedMotion() ? 600 : 2400);
  });
}

// ---------- окно входа ----------
export function welcome(stage) {
  return new Promise((res) => {
    const wall = wallpaper();
    const err = h('p', { class: 'mac-l-err', role: 'alert' });
    const form = h('form', { class: 'mac-l-form' + (vault.apiMode() ? ' mac-l-form2' : ''), hidden: true },
      vault.apiMode() ? h('label', { class: 'sr', for: 'macl-login' }, 'Логин') : null,
      vault.apiMode() ? h('input', { id: 'macl-login', autocomplete: 'username', placeholder: 'Логин', autocapitalize: 'off', spellcheck: 'false' }) : null,
      h('label', { class: 'sr', for: 'macl-pass' }, 'Пароль'),
      h('input', { id: 'macl-pass', type: 'password', autocomplete: 'current-password', placeholder: 'Пароль' }),
      h('button', { class: 'mac-l-go', type: 'submit', 'aria-label': 'Войти' }, '➜'));
    const user = (who, ic, label) => h('button', { class: 'mac-l-u', onclick: () => pick(who) }, h('span', { class: 'mac-l-ava', html: icon(ic, 'mac', 72) }), h('b', {}, label));
    const users = h('div', { class: 'mac-l-users' }, user('pca', 'user', vault.apiMode() ? 'Вход' : 'pca'), user('guest', 'guest', 'Гость'));
    const el = h('div', { class: 'mac-login' }, wall,
      h('div', { class: 'mac-l-box' }, h('span', { html: icon('logo', 'mac', 40) }), h('h2', {}, 'PCA OS X'), users, form, err,
        h('div', { class: 'mac-l-pow' },
          h('button', { onclick: () => bus.emit('sleep') }, h('span', { html: icon('sleep', 'mac', 28) }), 'Сон'),
          h('button', { onclick: () => { cleanup(); res('restart'); } }, h('span', { html: icon('restart', 'mac', 28) }), 'Перезагрузить'),
          h('button', { onclick: () => { cleanup(); bus.emit('shutdown'); } }, h('span', { html: icon('power', 'mac', 28) }), 'Выключить'))));
    stage.append(el);
    if (vault.apiMode()) {
      const slot = h('div', { class: 'mac-l-tg' });
      import('./tglogin.js').then((m) => m.telegramButton(slot, (ex) => { if (ex) { err.textContent = ex.message; sound('error'); } else finish('pca'); }))
        .then((ok) => { if (ok) el.querySelector('.mac-l-pow').before(slot); });
    }
    const cleanup = () => { wall.stop(); el.remove(); };
    function pick(who) {
      sound('click');
      if (who === 'guest') { state.user = 'guest'; finish('guest'); return; }
      users.querySelectorAll('.mac-l-u').forEach((b, i) => b.classList.toggle('on', i === 0));
      form.hidden = false; form.querySelector('input').focus();
    }
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = 'Проверяю…';
      const lg = form.querySelector('#macl-login');
      try { await vault.login(lg ? lg.value : 'pca', form.querySelector('#macl-pass').value, true); finish('pca'); }
      catch (ex) { err.textContent = vault.apiMode() ? ex.message : 'Неверный пароль.'; el.querySelector('.mac-l-box').classList.add('shake'); setTimeout(() => el.querySelector('.mac-l-box')?.classList.remove('shake'), 400); sound('error'); form.querySelector('#macl-pass').select(); }
    });
    function finish(who) { el.classList.add('fade'); setTimeout(() => { cleanup(); res(who); }, 400); }
  });
}
