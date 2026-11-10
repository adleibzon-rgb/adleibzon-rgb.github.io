// Оболочка «Luna · 2001»: экран приветствия, рабочий стол, панель задач, меню «Пуск», завершение работы.
import { h, state, bus, store, sound, reducedMotion } from './state.js';
import { icon } from './icons.js';
import * as wm from './wm.js';
import { launch, appIcon, appTitle, APPS } from './apps.js';
import * as vault from './vault.js';
import { GAMES } from './games/index.js';

const xpGames = () => GAMES.filter((g) => g.theme === 'xp');

export function wallpaper() {
  return h('div', { class: 'xp-wall', 'aria-hidden': 'true', html: `
    <div class="xp-sky"></div>
    <div class="xp-cloud c1"></div><div class="xp-cloud c2"></div><div class="xp-cloud c3"></div>
    <svg class="xp-hill l3" viewBox="0 0 1600 600" preserveAspectRatio="none"><defs>
      <linearGradient id="xh3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc95a"/><stop offset="1" stop-color="#3f8f2c"/></linearGradient></defs>
      <path d="M0 330 C 260 250 520 260 760 300 S 1240 250 1600 290 V600 H0Z" fill="url(#xh3)"/></svg>
    <svg class="xp-hill l2" viewBox="0 0 1600 600" preserveAspectRatio="none"><defs>
      <linearGradient id="xh2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fe05f"/><stop offset=".5" stop-color="#4fae32"/><stop offset="1" stop-color="#2f7d1f"/></linearGradient></defs>
      <path d="M0 420 C 300 300 700 280 1000 360 S 1400 420 1600 380 V600 H0Z" fill="url(#xh2)"/></svg>
    <svg class="xp-hill l1" viewBox="0 0 1600 600" preserveAspectRatio="none"><defs>
      <radialGradient id="xh1" cx=".35" cy=".1" r=".9"><stop offset="0" stop-color="#a6ef6e"/><stop offset=".45" stop-color="#5cbc3a"/><stop offset="1" stop-color="#2a6e1a"/></radialGradient></defs>
      <path d="M0 520 C 380 430 760 400 1120 470 S 1480 540 1600 520 V600 H0Z" fill="url(#xh1)"/></svg>` });
}

export function mount(stage, layer) {
  const nodes = [];
  const add = (n) => { stage.append(n); nodes.push(n); return n; };
  const offs = [];

  // ---------- рабочий стол ----------
  const wall = wallpaper();
  stage.prepend(wall); nodes.push(wall);
  const onMove = (e) => {
    if (reducedMotion()) return;
    const kx = e.clientX / window.innerWidth - .5, ky = e.clientY / window.innerHeight - .5;
    wall.style.setProperty('--px', kx); wall.style.setProperty('--py', ky);
  };
  window.addEventListener('pointermove', onMove);
  offs.push(() => window.removeEventListener('pointermove', onMove));

  const deskItems = [
    ['computer', 'computer'], ['projects', 'folderCode'], ['docs', 'folderDocs'], ['games', 'folderGames'], ['browser', 'globe'],
    ['terminal', 'terminal'], ['notes', 'notepad'], ['trash', 'trash'],
  ];
  const desk = add(h('div', { class: 'desk-icons', role: 'list' }));
  const drawDesk = () => {
    desk.innerHTML = '';
    for (const [app, ic] of deskItems) desk.append(deskIcon(appTitle(app), ic, () => launch(app)));
    if (vault.apiMode()) desk.append(deskIcon('Ассистент', 'assistant', () => launch('chat')));
    desk.append(deskIcon('Аренда сервера', 'server', () => launch('hosting')));
    if (vault.isAdmin()) desk.append(deskIcon('Администрирование', 'shield', () => launch('admin')));
    desk.append(deskIcon('Стиль Aqua · 2009', 'swap', () => bus.emit('switch-theme', 'mac')));
    xpGames().slice(0, 2).forEach((g) => desk.append(deskIcon(g.title, g.icon, () => launch('game:' + g.id))));
  };
  function deskIcon(label, ic, fn) {
    const b = h('button', { class: 'dico', role: 'listitem', ondblclick: fn, onkeydown: (e) => e.key === 'Enter' && fn() },
      h('span', { html: icon(ic, 'xp', 40) }), h('span', { class: 'dico-l' }, label));
    b.addEventListener('click', (e) => { desk.querySelectorAll('.dico').forEach((d) => d.classList.toggle('sel', d === b)); if (window.matchMedia('(pointer: coarse)').matches) fn(); e.stopPropagation(); });
    return b;
  }
  drawDesk();
  wall.addEventListener('click', () => desk.querySelectorAll('.dico').forEach((d) => d.classList.remove('sel')));

  // ---------- панель задач ----------
  const startBtn = h('button', { class: 'xp-start', 'aria-haspopup': 'menu', 'aria-expanded': 'false' }, h('span', { html: icon('logo', 'xp', 22) }), h('b', {}, 'пуск'));
  const quick = h('div', { class: 'xp-quick' },
    ['browser', 'projects', 'terminal'].map((a) => h('button', { class: 'xp-ql', title: appTitle(a), 'aria-label': appTitle(a), onclick: () => launch(a), html: icon(appIcon(a), 'xp', 18) })));
  const tasks = h('div', { class: 'xp-tasks' });
  const clock = h('span', { class: 'xp-clock' });
  const userBtn = h('button', { class: 'xp-tray-b', onclick: () => (vault.unlocked() ? logOff() : launch('login')) });
  const tray = h('div', { class: 'xp-tray' },
    h('button', { class: 'xp-tray-b', title: 'Переключить стиль на Aqua 2009', 'aria-label': 'Переключить стиль', onclick: () => bus.emit('switch-theme', 'mac'), html: icon('swap', 'xp', 16) }),
    h('button', { class: 'xp-tray-b', title: 'Звук', 'aria-label': 'Звук', onclick: (e) => { store.set('mute', !store.get('mute', false)); e.currentTarget.classList.toggle('off', store.get('mute', false)); } }, '🔊'),
    userBtn, clock);
  const bar = add(h('nav', { class: 'xp-bar', 'aria-label': 'Панель задач' }, startBtn, quick, tasks, tray));

  const drawUser = () => { userBtn.innerHTML = icon(vault.unlocked() ? 'user' : 'lock', 'xp', 16); userBtn.title = vault.unlocked() ? `Вы вошли как ${state.user}. Щёлкните, чтобы выйти.` : 'Войти в закрытые проекты'; };
  drawUser();
  const tick = () => { clock.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); };
  tick(); const tid = setInterval(tick, 10000); offs.push(() => clearInterval(tid));

  const drawTasks = () => {
    tasks.innerHTML = '';
    for (const w of wm.windows()) {
      tasks.append(h('button', { class: 'xp-task' + (w.el.classList.contains('win-active') && !w.minimized ? ' on' : ''), title: w.title, onclick: () => wm.toggleTask(w) },
        h('span', { html: icon(w.icon, 'xp', 16) }), h('span', { class: 'xp-task-t' }, w.title)));
    }
  };
  offs.push(bus.on('wins', drawTasks), bus.on('auth', () => { drawUser(); drawDesk(); menu.remove(); menu = buildMenu(); }));
  drawTasks();

  // ---------- меню «Пуск» ----------
  let menu = buildMenu();
  function buildMenu() {
    const item = (ic, label, sub, fn, cls = '') => h('button', { class: 'sm-i ' + cls, role: 'menuitem', onclick: () => { closeMenu(); fn(); } },
      h('span', { html: icon(ic, 'xp', cls.includes('big') ? 32 : 24) }), h('span', { class: 'sm-t' }, h('b', {}, label), sub ? h('small', {}, sub) : null));
    const allProgs = h('div', { class: 'sm-all', role: 'menu' },
      h('div', { class: 'sm-all-h' }, 'Игры'),
      ...xpGames().map((g) => item(g.icon, g.title, null, () => launch('game:' + g.id))),
      h('div', { class: 'sm-all-h' }, 'Стандартные'),
      item('notepad', 'Блокнот', null, () => launch('notes')),
      item('terminal', 'Командная строка', null, () => launch('terminal')),
      item('globe', 'Интернет', null, () => launch('browser')));
    const allBtn = h('button', { class: 'sm-allbtn', 'aria-haspopup': 'menu', onclick: (e) => { e.stopPropagation(); allProgs.classList.toggle('open'); } }, h('b', {}, 'Все программы'), h('span', { class: 'sm-arrow' }, '▶'));
    const who = vault.unlocked() ? state.user : 'Гость';
    const m = h('div', { class: 'xp-menu', role: 'menu', hidden: true },
      h('header', { class: 'sm-head' }, h('span', { class: 'sm-ava', html: icon(vault.isAdmin() ? 'shield' : vault.unlocked() ? 'user' : 'guest', 'xp', 42) }), h('b', {}, who)),
      h('div', { class: 'sm-cols' },
        h('div', { class: 'sm-left' },
          item('globe', 'Интернет', 'Домашняя страница', () => launch('browser'), 'big'),
          item('folderCode', 'Мои проекты', `${state.manifest.repos.length} репозиториев`, () => launch('projects'), 'big'),
          item('folderDocs', 'Документы', 'описания, фото, карта', () => launch('docs'), 'big'),
          vault.apiMode() ? item('assistant', 'Ассистент', 'подбор и установка', () => launch('chat'), 'big') : null,
          h('hr'),
          ...xpGames().map((g) => item(g.icon, g.title, null, () => launch('game:' + g.id))),
          h('div', { class: 'sm-sp' }), allBtn),
        h('div', { class: 'sm-right' },
          item('folderCode', 'Мои проекты', null, () => launch('projects')),
          item('folderDocs', 'Документы', null, () => launch('docs')),
          item('server', 'Аренда сервера', null, () => launch('hosting')),
          item('folderGames', 'Игры', null, () => launch('games')),
          item('computer', 'Мой компьютер', null, () => launch('computer')),
          h('hr'),
          item('gear', 'Панель управления', null, () => launch('settings')),
          item('swap', 'Стиль Aqua · 2009', null, () => bus.emit('switch-theme', 'mac')),
          item('info', 'О системе', null, () => launch('computer')),
          vault.isAdmin() ? item('shield', 'Администрирование', 'проекты и пользователи', () => launch('admin')) : null,
          vault.unlocked() ? null : item('key', 'Войти', 'закрытые проекты', () => launch('login')))),
      h('footer', { class: 'sm-foot' },
        h('button', { class: 'sm-f', onclick: () => { closeMenu(); logOff(); } }, h('span', { html: icon('logout', 'xp', 22) }), 'Выход из системы'),
        h('button', { class: 'sm-f', onclick: () => { closeMenu(); turnOff(); } }, h('span', { html: icon('power', 'xp', 22) }), 'Выключение')),
      allProgs);
    stage.append(m); nodes.push(m);
    return m;
  }
  function openMenu() { menu.hidden = false; startBtn.classList.add('on'); startBtn.setAttribute('aria-expanded', 'true'); sound('click'); }
  function closeMenu() { menu.hidden = true; menu.querySelector('.sm-all')?.classList.remove('open'); startBtn.classList.remove('on'); startBtn.setAttribute('aria-expanded', 'false'); }
  startBtn.addEventListener('click', (e) => { e.stopPropagation(); menu.hidden ? openMenu() : closeMenu(); });
  const outside = (e) => { if (!menu.hidden && !menu.contains(e.target) && e.target !== startBtn) closeMenu(); };
  const esc = (e) => { if (e.key === 'Escape') closeMenu(); if ((e.key === 'Meta' || e.key === 'OS') && !e.repeat) { menu.hidden ? openMenu() : closeMenu(); } };
  document.addEventListener('pointerdown', outside);
  document.addEventListener('keydown', esc);
  offs.push(() => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', esc); });

  // ---------- выход / выключение ----------
  function overlayDialog(title, buttons) {
    stage.classList.add('xp-gray');
    const ov = h('div', { class: 'xp-off', role: 'dialog', 'aria-label': title },
      h('div', { class: 'xp-off-box' },
        h('header', {}, h('b', {}, title), h('span', { html: icon('logo', 'xp', 30) })),
        h('div', { class: 'xp-off-btns' }, buttons.map(([ic, label, fn]) => h('button', { class: 'xp-off-b', onclick: () => { done(); fn(); } }, h('span', { html: icon(ic, 'xp', 40) }), label))),
        h('footer', {}, h('button', { class: 'btn', onclick: () => done() }, 'Отмена'))));
    const done = () => { stage.classList.remove('xp-gray'); ov.remove(); };
    stage.append(ov);
    ov.querySelector('.xp-off-b')?.focus();
  }
  function logOff() {
    overlayDialog('Выход из системы', [
      ['swap', 'Смена пользователя', () => bus.emit('logoff')],
      ['logout', 'Выход', () => { vault.logout(); bus.emit('logoff'); }],
    ]);
  }
  function turnOff() {
    overlayDialog('Выключить компьютер', [
      ['sleep', 'Ждущий режим', () => bus.emit('sleep')],
      ['power', 'Выключение', () => bus.emit('shutdown')],
      ['restart', 'Перезагрузка', () => bus.emit('restart')],
    ]);
  }

  // приветственная подсказка из трея
  if (!store.get('xpTip', false)) {
    const tip = add(h('div', { class: 'xp-balloon', role: 'status' },
      h('button', { class: 'xp-balloon-x', 'aria-label': 'Закрыть', onclick: () => { tip.remove(); store.set('xpTip', true); } }, '×'),
      h('b', {}, 'Добро пожаловать!'),
      h('p', {}, vault.unlocked() ? 'Проекты открыты. Загляните в «Мои проекты», «Документы» или запустите «Танчики».' : vault.apiMode() ? 'Открытые проекты, документы и игры доступны всем. Закрытые — после входа: щёлкните замок в углу.' : 'Игры доступны всем. Проекты откроются после входа: щёлкните замок в углу.')));
    setTimeout(() => tip.remove(), 12000);
  }

  return () => { offs.forEach((f) => f()); nodes.forEach((n) => n.remove()); stage.classList.remove('xp-gray'); };
}

// ---------- экран загрузки ----------
export function bootScreen(stage) {
  return new Promise((res) => {
    const el = h('div', { class: 'xp-boot', role: 'status', 'aria-label': 'Загрузка' },
      h('div', { class: 'xp-boot-logo' }, h('span', { html: icon('logo', 'xp', 72) }), h('div', {}, h('b', {}, 'PCA'), h('sup', {}, 'XP'))),
      h('div', { class: 'xp-boot-bar' }, h('i'), h('i'), h('i')),
      h('small', {}, 'Загрузка рабочего стола…'));
    stage.append(el);
    setTimeout(() => { el.classList.add('fade'); setTimeout(() => { el.remove(); res(); }, 400); }, reducedMotion() ? 600 : 2600);
  });
}

// ---------- экран приветствия ----------
export function welcome(stage) {
  return new Promise((res) => {
    let open = null;
    const err = h('p', { class: 'xp-w-err', role: 'alert' });
    const tile = (who, ic, label, sub) => {
      const pass = who === 'pca' ? h('form', { class: 'xp-w-pass' + (vault.apiMode() ? ' xp-w-pass2' : ''), hidden: true },
        vault.apiMode() ? h('label', { class: 'sr', for: 'xpw-login' }, 'Логин') : null,
        vault.apiMode() ? h('input', { id: 'xpw-login', autocomplete: 'username', placeholder: 'Логин', autocapitalize: 'off', spellcheck: 'false' }) : null,
        h('label', { class: 'sr', for: 'xpw-pass' }, 'Пароль'),
        h('input', { id: 'xpw-pass', type: 'password', autocomplete: 'current-password', placeholder: 'Введите пароль' }),
        h('button', { class: 'xp-w-go', type: 'submit', 'aria-label': 'Войти' }, '➜'),
        err) : null;
      const t = h('div', { class: 'xp-w-user' },
        h('button', { class: 'xp-w-tile', onclick: () => select() }, h('span', { class: 'xp-w-ava', html: icon(ic, 'xp', 48) }), h('span', {}, h('b', {}, label), h('small', {}, sub))),
        pass);
      const select = async () => {
        sound('click');
        if (who === 'guest') { done('guest'); return; }
        if (open === t) return;
        open = t; t.classList.add('on'); pass.hidden = false; pass.querySelector('input').focus();
      };
      pass?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inp = pass.querySelector('#xpw-pass'); const lg = pass.querySelector('#xpw-login'); err.textContent = 'Проверяю пароль…';
        try { await vault.login(lg ? lg.value : 'pca', inp.value, true); done('pca'); }
        catch (ex) { err.textContent = vault.apiMode() ? ex.message : 'Неверный пароль. Проверьте раскладку и Caps Lock.'; inp.select(); sound('error'); }
      });
      return t;
    };
    const el = h('div', { class: 'xp-welcome' },
      h('header', {}),
      h('main', {},
        h('div', { class: 'xp-w-left' }, h('div', { class: 'xp-w-brand' }, h('span', { html: icon('logo', 'xp', 64) }), h('b', {}, 'PCA'), h('sup', {}, 'XP')), h('p', {}, 'Чтобы начать, выберите пользователя')),
        h('div', { class: 'xp-w-sep' }),
        h('div', { class: 'xp-w-right' },
          vault.apiMode() ? tile('pca', 'user', 'Вход по паролю', 'Клиенты клуба и администратор') : tile('pca', 'user', 'pca', 'Владелец · все проекты'),
          tile('guest', 'guest', 'Гость', vault.apiMode() ? 'Открытые проекты, документы, игры' : 'Игры и названия проектов'))),
      h('footer', {},
        h('button', { class: 'xp-w-off', onclick: () => { el.remove(); bus.emit('shutdown'); } }, h('span', { html: icon('power', 'xp', 26) }), 'Выключить компьютер'),
        h('small', {}, 'После входа можно переключить стиль на Aqua 2009.')));
    stage.append(el);
    if (vault.apiMode()) {
      const slot = h('div', { class: 'xp-w-tg' });
      const tgErr = h('p', { class: 'xp-w-err', role: 'alert' });
      import('./tglogin.js').then((m) => m.telegramButton(slot, (ex) => { if (ex) { tgErr.textContent = ex.message; sound('error'); } else done('pca'); }))
        .then((ok) => { if (ok) el.querySelector('.xp-w-right').append(h('div', { class: 'xp-w-user xp-w-tgbox' }, h('p', { class: 'xp-w-tgl' }, 'Подписчики Boosty — вход через Telegram'), slot, tgErr)); });
    }
    const done = (who) => { if (who === 'guest') state.user = 'guest'; el.classList.add('fade'); setTimeout(() => { el.remove(); res(who); }, 350); };
  });
}

export function shutdownScreen(stage, text = 'Завершение работы…') {
  return new Promise((res) => {
    sound('xpEnd');
    const el = h('div', { class: 'xp-welcome xp-bye' }, h('header', {}), h('main', {}, h('div', { class: 'xp-w-brand' }, h('span', { html: icon('logo', 'xp', 64) }), h('b', {}, 'PCA'), h('sup', {}, 'XP')), h('p', {}, text)), h('footer', {}));
    stage.append(el);
    setTimeout(() => { el.remove(); res(); }, 2200);
  });
}
