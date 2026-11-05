// Приложения рабочего стола: проекты, просмотр репозитория, вход, терминал, настройки и т.д.
import { h, state, bus, store, fmtSize, fmtDate, esc, sound } from './state.js';
import { icon, fileIcon } from './icons.js';
import { openWindow, close, dialog, getWin } from './wm.js';
import * as vault from './vault.js';
import { GAMES } from './games/index.js';

const T = () => (document.body.classList.contains('mac') ? 'mac' : 'xp');
const LANG_COLORS = { Python: '#3572A5', JavaScript: '#e3c22b', TypeScript: '#3178c6', Shell: '#89e051', HTML: '#e34c26', CSS: '#663399', PowerShell: '#2a5bb8', Batch: '#c1f12e', Go: '#00ADD8', Kotlin: '#A97BFF', Java: '#b07219', Swift: '#F05138', C: '#555555', 'C++': '#f34b7d', Docker: '#384d54', systemd: '#d0d0d0', Lua: '#000080', Gradle: '#02303A' };
const langColor = (l) => LANG_COLORS[l] || '#8a8f98';

// ---------- общий реестр ----------
export const APPS = {
  projects: { title: () => (T() === 'mac' ? 'Проекты' : 'Мои проекты'), icon: 'folderCode', open: openProjects },
  computer: { title: () => (T() === 'mac' ? 'Об этом компьютере' : 'Мой компьютер'), icon: 'computer', open: openComputer },
  games: { title: () => 'Игры', icon: 'folderGames', open: openGames },
  terminal: { title: () => (T() === 'mac' ? 'Терминал' : 'Командная строка'), icon: 'terminal', open: openTerminal },
  browser: { title: () => (T() === 'mac' ? 'Навигатор' : 'Интернет'), icon: () => (T() === 'mac' ? 'compass' : 'globe'), open: openBrowser },
  settings: { title: () => (T() === 'mac' ? 'Системные настройки' : 'Панель управления'), icon: 'gear', open: openSettings },
  trash: { title: () => 'Корзина', icon: 'trash', open: openTrash },
  login: { title: () => 'Вход', icon: 'key', open: () => openLogin() },
  notes: { title: () => (T() === 'mac' ? 'Заметки' : 'Блокнот'), icon: 'notepad', open: openNotes },
  docs: { title: () => 'Документы', icon: 'folderDocs', open: (a) => import('./docs.js').then((m) => m.openDocs(a)) },
  chat: { title: () => 'Ассистент', icon: 'assistant', open: () => import('./chat.js').then((m) => m.openChat()) },
  admin: { title: () => 'Администрирование', icon: 'shield', open: (a) => import('./admin.js').then((m) => m.openAdmin(a)), admin: true },
};
for (const g of GAMES) APPS['game:' + g.id] = { title: () => g.title, icon: g.icon, open: () => openGame(g), game: g };

export function launch(name, arg) {
  sound('click');
  if (name.startsWith('repo:')) return openRepo(name.slice(5), arg);
  const app = APPS[name];
  if (!app) return null;
  return app.open(arg);
}
export const appIcon = (name) => { const i = APPS[name]?.icon; return typeof i === 'function' ? i() : i; };
export const appTitle = (name) => APPS[name]?.title() || name;

// ---------- вход ----------
export function openLogin(after) {
  if (vault.unlocked()) { after?.(); return; }
  const ex = getWin('login'); if (ex) { close(ex); }
  return openWindow({
    id: 'login', title: 'Вход в закрытые проекты', icon: 'key', width: 400, height: 300, resizable: false, class: 'win-dialog',
    render(w) {
      const err = h('div', { class: 'login-err', role: 'alert' });
      const form = h('form', { class: 'login-form', autocomplete: 'on' },
        h('div', { class: 'login-head' },
          h('div', { html: icon('lock', T(), 44) }),
          h('p', {}, vault.apiMode() ? 'Закрытые проекты доступны клиентам клуба. Введите имя пользователя и пароль.' : 'Проекты закрыты. Введите имя пользователя и пароль владельца.')),
        h('label', { for: 'lg-user' }, 'Пользователь'),
        h('input', { id: 'lg-user', name: 'username', autocomplete: 'username', value: vault.apiMode() ? '' : 'pca', required: true, autocapitalize: 'off', spellcheck: 'false' }),
        h('label', { for: 'lg-pass' }, 'Пароль'),
        h('input', { id: 'lg-pass', name: 'password', type: 'password', autocomplete: 'current-password', required: true }),
        h('label', { class: 'login-rem' }, h('input', { type: 'checkbox', id: 'lg-rem', checked: true }), ' Не выходить, пока открыта вкладка'),
        err,
        h('div', { class: 'dlg-btns' },
          h('button', { class: 'btn', type: 'button', onclick: () => close(w) }, 'Отмена'),
          h('button', { class: 'btn btn-default', type: 'submit' }, 'Войти')));
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('[type=submit]');
        btn.disabled = true; btn.textContent = 'Проверяю…'; err.textContent = '';
        try {
          await vault.login(form.querySelector('#lg-user').value, form.querySelector('#lg-pass').value, form.querySelector('#lg-rem').checked);
          sound('ding');
          close(w);
          after?.();
        } catch (ex) {
          err.textContent = ex.message; sound('error');
          form.querySelector('#lg-pass').select();
          w.el.classList.add('shake'); setTimeout(() => w.el.classList.remove('shake'), 400);
        } finally { btn.disabled = false; btn.textContent = 'Войти'; }
      });
      w.body.append(form);
      if (vault.apiMode()) {
        const tg = h('div', { class: 'login-tg' }, h('p', {}, 'Подписчики Boosty — войдите через Telegram:'));
        import('./tglogin.js').then((m) => m.telegramButton(tg, (ex) => {
          if (ex) { err.textContent = ex.message; sound('error'); return; }
          sound('ding'); close(w); after?.();
        })).then((ok) => { if (ok) { form.prepend(tg); w.el.style.height = 'auto'; } });
      }
      setTimeout(() => form.querySelector(vault.apiMode() ? '#lg-user' : '#lg-pass').focus(), 40);
    },
  });
}

// ---------- список проектов ----------
function openProjects() {
  return openWindow({
    id: 'projects', title: appTitle('projects'), icon: 'folderCode', width: 860, height: 560, toolbar: true, status: true,
    render(w) {
      let view = store.get('projView', 'icons');
      let filter = 'Все';
      let query = '';
      const draw = () => {
        const theme = T();
        w.body.innerHTML = '';
        w.tools.innerHTML = '';
        const locked = !vault.unlocked();
        const all = vault.listRepos();
        const nLocked = all.filter((r) => r.locked).length;
        const cats = ['Все', ...new Set(all.map((r) => r.category).filter(Boolean))];
        const list = all.filter((r) => (filter === 'Все' || r.category === filter) && (!query || (r.name + ' ' + (r.desc || '')).toLowerCase().includes(query)));

        w.tools.append(
          h('div', { class: 'seg' }, cats.map((c) => h('button', { class: 'seg-b' + (c === filter ? ' on' : ''), onclick: () => { filter = c; draw(); } }, c))),
          h('div', { class: 'tool-sp' }),
          h('input', { class: 'tool-search', type: 'search', placeholder: 'Поиск проекта', value: query, 'aria-label': 'Поиск проекта', oninput: (e) => { query = e.target.value.toLowerCase(); drawList(); } }),
          h('div', { class: 'seg' },
            h('button', { class: 'seg-b' + (view === 'icons' ? ' on' : ''), onclick: () => { view = 'icons'; store.set('projView', view); draw(); } }, 'Значки'),
            h('button', { class: 'seg-b' + (view === 'table' ? ' on' : ''), onclick: () => { view = 'table'; store.set('projView', view); draw(); } }, 'Таблица')));

        const side = h('aside', { class: 'side' },
          h('h4', {}, theme === 'mac' ? 'МЕСТА' : 'Задачи для файлов и папок'),
          locked
            ? h('div', { class: 'side-card' }, h('div', { html: icon('lock', theme, 32) }),
                h('p', {}, nLocked === all.length ? `Все ${all.length} проектов закрыты паролем. Без входа видны только названия.` : `Открыто ${all.length - nLocked} из ${all.length}. ${nLocked ? `Ещё ${nLocked} — для клиентов клуба, нужен вход.` : ''}`),
                nLocked ? h('button', { class: 'btn btn-default', onclick: () => openLogin(() => draw()) }, 'Войти') : null)
            : h('div', { class: 'side-card' }, h('div', { html: icon('user', theme, 32) }), h('p', {}, `Вы вошли как ${state.user} (${vault.roleLabel()}). Доступно ${all.length - nLocked} проектов.`),
                vault.isAdmin() ? h('button', { class: 'btn btn-default', onclick: () => launch('admin') }, 'Администрирование') : null,
                h('button', { class: 'btn', onclick: () => vault.logout() }, 'Выйти')),
          h('button', { class: 'side-link', onclick: () => launch('docs') }, h('span', { html: icon('folderDocs', theme, 20) }), 'Документы и фотоальбом'),
          all.length === nLocked ? null : h('div', { class: 'side-stats' },
            h('h4', {}, 'Языки'),
            ...topLangs(all.filter((r) => !r.locked)).map(([l, b]) => h('div', { class: 'lang-row' }, h('i', { style: { background: langColor(l) } }), h('span', {}, l), h('b', {}, fmtSize(b))))));
        const main = h('div', { class: 'files' + (view === 'table' ? ' files-table' : '') });
        const drawList = () => {
          const q = query;
          main.innerHTML = '';
          const shown = list.filter((r) => !q || (r.name + ' ' + (r.desc || '')).toLowerCase().includes(q));
          if (view === 'table') {
            const tb = h('table', { class: 'grid' }, h('thead', {}, h('tr', {}, ['Имя', 'Доступ', 'Категория', 'Язык', 'Файлов', 'Изменён'].map((c) => h('th', {}, c)))));
            const body = h('tbody');
            for (const r of shown) {
              const lang = r.locked ? '—' : Object.entries(r.langs).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
              body.append(h('tr', { tabindex: 0, class: r.locked ? 'tr-locked' : null, ondblclick: () => openItem(r), onkeydown: (e) => e.key === 'Enter' && openItem(r) },
                h('td', {}, h('span', { class: 'cell-ico', html: icon(r.locked ? 'folderLocked' : 'folder', theme, 18) }), r.name),
                h('td', {}, visLabel(r)),
                h('td', {}, r.category || '—'), h('td', {}, lang), h('td', { class: 'num' }, r.locked ? '—' : r.files), h('td', { class: 'num' }, r.locked ? '—' : new Date(r.date).toLocaleDateString('ru-RU'))));
            }
            tb.append(body); main.append(tb);
          } else {
            for (const r of shown) {
              const tile = h('button', {
                class: 'fi' + (r.locked ? ' fi-locked' : ''),
                title: r.locked ? 'Закрыто — нужен вход' : r.desc,
                ondblclick: () => openItem(r), onclick: (e) => { if (e.detail === 1 && window.matchMedia('(pointer: coarse)').matches) openItem(r); },
                onkeydown: (e) => e.key === 'Enter' && openItem(r),
              }, h('span', { html: icon(r.locked ? 'folderLocked' : 'folder', theme, 48) }), h('span', { class: 'fi-name' }, r.name));
              main.append(tile);
            }
          }
          if (!shown.length) main.append(h('p', { class: 'empty' }, 'Ничего не найдено. Измените запрос или выберите «Все».'));
          const open = shown.filter((r) => !r.locked);
          w.status.textContent = `Объектов: ${shown.length}` + (open.length ? ` · ${fmtSize(open.reduce((s, r) => s + r.size, 0))}` : '') + (shown.length > open.length ? ` · закрыто: ${shown.length - open.length}` : '');
        };
        const openItem = (r) => (r.locked ? openLogin(() => { draw(); launch('repo:' + r.id); }) : launch('repo:' + r.id));
        w.body.append(h('div', { class: 'split' }, side, main));
        drawList();
      };
      draw();
      const a = bus.on('auth', draw), b = bus.on('projects', draw);
      return () => { a(); b(); };
    },
  });
}

export const visLabel = (r) => (r.visibility === 'hidden' ? 'скрыт' : r.visibility === 'public' ? 'открытый' : 'для клиентов');

function topLangs(repos) {
  const m = {};
  for (const r of repos) for (const [l, b] of Object.entries(r.langs || {})) m[l] = (m[l] || 0) + b;
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 7);
}

// ---------- репозиторий ----------
function buildTree(entries) {
  const root = { dirs: {}, files: [] };
  for (const e of entries) {
    const parts = e.p.split('/');
    let node = root;
    for (const d of parts.slice(0, -1)) node = node.dirs[d] ||= { dirs: {}, files: [] };
    node.files.push(e);
  }
  return root;
}

function openRepo(id, path) {
  if (!vault.canOpen(id)) {
    if (vault.unlocked()) return dialog({ title: 'Нет доступа', text: 'Этот проект сейчас недоступен.', iconName: 'lock' });
    return openLogin(() => (vault.canOpen(id) ? openRepo(id, path) : null));
  }
  const meta = vault.repoMeta(id);
  if (!meta) return null;
  const win = openWindow({
    id: 'repo-' + id, title: meta.name, icon: 'folderCode', width: 980, height: 640, toolbar: true, status: true,
    render(w) {
      w.body.innerHTML = `<div class="loading"><span class="spin"></span> ${vault.apiMode() ? 'Загружаю проект…' : 'Расшифровываю проект…'}</div>`;
      let data = null;
      const history = [];
      const crumbs = h('div', { class: 'crumbs' });
      const back = h('button', { class: 'tool-b', disabled: true, onclick: () => { history.pop(); show(history.pop() || null); } }, '◀ Назад');
      w.tools.append(back, crumbs, h('div', { class: 'tool-sp' }),
        h('a', { class: 'tool-b', href: meta.url, target: '_blank', rel: 'noopener' }, h('span', { html: icon('github', T(), 16) }), ' На GitHub'));
      const tree = h('nav', { class: 'tree', 'aria-label': 'Файлы проекта' });
      const pane = h('div', { class: 'pane' });

      const show = (p) => {
        history.push(p);
        back.disabled = history.length < 2;
        tree.querySelectorAll('.tr-f').forEach((n) => n.classList.toggle('on', n.dataset.p === p));
        pane.scrollTop = 0;
        crumbs.innerHTML = '';
        crumbs.append(h('button', { class: 'crumb', onclick: () => show(null) }, meta.name));
        if (p) p.split('/').forEach((part) => crumbs.append(h('span', { class: 'crumb-sep' }, '›'), h('span', { class: 'crumb' }, part)));
        pane.innerHTML = '';
        if (!p) return pane.append(overview(meta, data, show));
        pane.append(fileView(meta, data, p, show));
      };

      vault.loadRepo(id).then((d) => {
        data = d;
        const root = buildTree(d.tree);
        const renderNode = (node, prefix, depth) => {
          const frag = [];
          for (const name of Object.keys(node.dirs).sort()) {
            const det = h('details', { class: 'tr-d', open: depth < 1 ? true : null },
              h('summary', { style: { paddingLeft: depth * 12 + 6 + 'px' } }, h('span', { html: icon('folder', T(), 16) }), name),
              ...renderNode(node.dirs[name], prefix + name + '/', depth + 1));
            frag.push(det);
          }
          for (const f of node.files.sort((a, b) => a.p.localeCompare(b.p))) {
            const nm = f.p.split('/').pop();
            frag.push(h('button', { class: 'tr-f' + (f.t === 'hidden' ? ' tr-hidden' : ''), 'data-p': f.p, style: { paddingLeft: depth * 12 + 6 + 'px' }, onclick: () => show(f.p), title: f.p },
              h('span', { html: icon(fileIcon(f.p), T(), 16) }), nm));
          }
          return frag;
        };
        tree.append(h('button', { class: 'tr-f tr-root', onclick: () => show(null) }, h('span', { html: icon('info', T(), 16) }), 'Обзор проекта'), ...renderNode(root, '', 0));
        w.body.innerHTML = '';
        w.body.append(h('div', { class: 'split split-repo' }, tree, pane));
        w.status.textContent = `${meta.files} файлов · ${fmtSize(meta.size)} · обновлён ${fmtDate(meta.date)}`;
        show(path || null);
      }).catch((e) => { w.body.innerHTML = ''; w.body.append(h('p', { class: 'empty' }, 'Не удалось открыть проект: ' + e.message)); });
    },
  });
  return win;
}

function overview(meta, data, show) {
  const langs = Object.entries(meta.langs).sort((a, b) => b[1] - a[1]);
  const total = langs.reduce((s, [, b]) => s + b, 0) || 1;
  const box = h('article', { class: 'ov' },
    h('div', { class: 'ov-head' },
      h('div', { html: icon('folderCode', T(), 56) }),
      h('div', {},
        h('h2', {}, meta.title),
        h('p', { class: 'ov-desc' }, meta.desc),
        h('div', { class: 'chips' },
          h('span', { class: 'chip' + (meta.visibility === 'public' ? ' chip-open' : ' chip-lock') }, visLabel(meta)),
          h('span', { class: 'chip' }, meta.category),
          h('span', { class: 'chip' }, `${meta.files} файлов`),
          h('span', { class: 'chip' }, `коммит: ${fmtDate(meta.date)}`)))),
    langs.length ? h('div', { class: 'langbar', role: 'img', 'aria-label': 'Языки проекта' }, langs.map(([l, b]) => h('i', { style: { flex: b / total, background: langColor(l) }, title: `${l} ${(b / total * 100).toFixed(1)}%` }))) : null,
    langs.length ? h('div', { class: 'langs' }, langs.slice(0, 6).map(([l, b]) => h('span', {}, h('i', { style: { background: langColor(l) } }), `${l} ${(b / total * 100).toFixed(1)}%`))) : null,
    h('p', { class: 'ov-last' }, 'Последнее изменение: ', h('em', {}, meta.msg)));
  if (meta.readme && data.contents[meta.readme]) {
    box.append(h('div', { class: 'md' }, renderMarkdown(data.contents[meta.readme], meta.readme, data, show)));
  }
  return box;
}

function resolvePath(base, rel) {
  if (/^(https?:|mailto:|#|data:)/.test(rel)) return null;
  const stack = base.split('/').slice(0, -1);
  for (const part of rel.split(/[?#]/)[0].split('/')) {
    if (part === '..') stack.pop(); else if (part && part !== '.') stack.push(part);
  }
  return decodeURIComponent(stack.join('/'));
}

function renderMarkdown(src, path, data, show) {
  const html = window.DOMPurify.sanitize(window.marked.parse(src, { gfm: true }), { ADD_ATTR: ['target'] });
  const div = h('div', { html });
  div.querySelectorAll('img').forEach((img) => {
    const p = resolvePath(path, img.getAttribute('src') || '');
    if (p && data.contents[p]?.startsWith('data:')) img.src = data.contents[p];
    else if (p) img.replaceWith(h('span', { class: 'img-missing' }, `[изображение ${p.split('/').pop()} не включено]`));
    img.loading = 'lazy';
  });
  div.querySelectorAll('a[href]').forEach((a) => {
    const p = resolvePath(path, a.getAttribute('href'));
    if (p && data.tree.some((e) => e.p === p)) a.addEventListener('click', (e) => { e.preventDefault(); show(p); });
    else if (!p || /^https?:/.test(a.getAttribute('href'))) { a.target = '_blank'; a.rel = 'noopener'; }
  });
  div.querySelectorAll('pre code').forEach((c) => { try { window.hljs.highlightElement(c); } catch { /* */ } });
  return div;
}

function fileView(meta, data, p, show) {
  const entry = data.tree.find((e) => e.p === p);
  const content = data.contents[p];
  const head = h('div', { class: 'fv-head' }, h('span', { html: icon(fileIcon(p), T(), 20) }), h('b', {}, p.split('/').pop()), h('span', { class: 'fv-size' }, fmtSize(entry?.s || 0)));
  if (entry?.t === 'hidden') return h('div', {}, head, h('p', { class: 'empty' }, 'Этот файл может содержать секреты, поэтому на сайт он не выкладывается.'));
  if (content == null) return h('div', {}, head, h('p', { class: 'empty' }, entry?.t === 'img-big' ? 'Изображение слишком большое для сайта. Откройте его на GitHub.' : 'Двоичный файл. Посмотреть его можно на GitHub.'), h('a', { class: 'btn', href: `${meta.url}/blob/HEAD/${p}`, target: '_blank', rel: 'noopener' }, 'Открыть на GitHub'));
  if (content.startsWith('data:image')) return h('div', { class: 'fv-img' }, head, h('img', { src: content, alt: p }));
  if (/\.md$/i.test(p)) return h('div', {}, head, h('div', { class: 'md' }, renderMarkdown(content, p, data, show)));
  const ext = p.split('.').pop().toLowerCase();
  const map = { py: 'python', js: 'javascript', mjs: 'javascript', ts: 'typescript', sh: 'bash', ps1: 'powershell', bat: 'dos', html: 'xml', css: 'css', json: 'json', yml: 'yaml', yaml: 'yaml', go: 'go', kt: 'kotlin', java: 'java', swift: 'swift', c: 'c', h: 'c', service: 'ini', conf: 'nginx', toml: 'ini', sql: 'sql', dockerfile: 'dockerfile' };
  const code = h('code', { class: map[ext] ? 'language-' + map[ext] : 'nohighlight' });
  code.textContent = content;
  const lines = content.split('\n').length;
  if (content.length < 200000 && map[ext]) { try { window.hljs.highlightElement(code); } catch { /* */ } }
  const gutter = h('pre', { class: 'fv-gutter', 'aria-hidden': 'true' }, Array.from({ length: lines }, (_, i) => i + 1).join('\n'));
  const copy = h('button', { class: 'tool-b', onclick: async () => { try { await navigator.clipboard.writeText(content); copy.textContent = 'Скопировано'; } catch { copy.textContent = 'Выделите текст вручную'; } } }, 'Копировать');
  head.append(h('span', { class: 'tool-sp' }), copy);
  return h('div', { class: 'fv' }, head, h('div', { class: 'fv-code' }, gutter, h('pre', { class: 'fv-src' }, code)));
}

// ---------- игры ----------
function openGames() {
  return openWindow({
    id: 'games', title: 'Игры', icon: 'folderGames', width: 560, height: 380, status: true,
    render(w) {
      const draw = () => {
        const theme = T();
        w.body.innerHTML = '';
        const list = GAMES.filter((g) => g.theme === theme);
        const other = GAMES.filter((g) => g.theme !== theme);
        w.body.append(h('div', { class: 'files files-pad' }, list.map((g) => h('button', { class: 'fi', ondblclick: () => launch('game:' + g.id), onkeydown: (e) => e.key === 'Enter' && launch('game:' + g.id), onclick: (e) => { if (window.matchMedia('(pointer: coarse)').matches) launch('game:' + g.id); }, title: g.about },
          h('span', { html: icon(g.icon, theme, 48) }), h('span', { class: 'fi-name' }, g.title)))),
        h('p', { class: 'games-note' }, `В другом стиле ещё ${other.length} игры: ${other.map((g) => g.title).join(', ')}. Переключите стиль, чтобы в них сыграть.`));
        w.status.textContent = `Игр: ${list.length}`;
      };
      draw();
      return bus.on('theme', draw);
    },
  });
}

function openGame(g) {
  return openWindow({
    id: 'game-' + g.id, title: g.title, icon: g.icon, width: g.w, height: g.h, class: 'win-game ' + (g.cls || ''), resizable: g.resizable ?? false,
    render(w) {
      const stop = g.mount(w.body, w);
      if (!g.resizable && !w.maximized) { w.el.style.height = 'auto'; w.body.style.overflow = 'visible'; }
      return stop;
    },
  });
}

// ---------- мой компьютер / об этом компьютере ----------
function openComputer() {
  return openWindow({
    id: 'computer', title: appTitle('computer'), icon: 'computer', width: 520, height: 430, resizable: false,
    render(w) {
      const draw = () => {
        const theme = T();
        const repos = vault.openRepos();
        const locked = !repos.length;
        const sum = repos.reduce((s, r) => s + r.size, 0);
        w.body.innerHTML = '';
        w.body.append(h('div', { class: 'about' },
          h('div', { class: 'about-logo', html: icon('logo', theme, 96) }),
          h('h2', {}, theme === 'mac' ? 'PCA OS X' : 'PCA XP'),
          h('p', { class: 'about-ver' }, theme === 'mac' ? 'Версия 10.6 «Снежный барс» · стиль 2009' : 'Домашний выпуск · версия 2002 · стиль Luna'),
          h('dl', { class: 'about-dl' },
            h('dt', {}, 'Владелец'), h('dd', {}, 'adleibzon-rgb (GitHub)'),
            h('dt', {}, 'Проекты'), h('dd', {}, `${state.manifest.repos.length} репозиториев`),
            h('dt', {}, 'Объём'), h('dd', {}, locked ? 'доступно после входа' : fmtSize(sum)),
            h('dt', {}, 'Игры'), h('dd', {}, `${GAMES.length} (по ${GAMES.filter((g) => g.theme === theme).length} в каждом стиле)`),
            h('dt', {}, 'Пользователь'), h('dd', {}, state.user === 'guest' || !state.user ? 'Гость' : `${state.user} (${vault.roleLabel()})`),
            h('dt', {}, 'Браузер'), h('dd', {}, navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\/[\d.]+/)?.[0] || 'неизвестен')),
          h('div', { class: 'dlg-btns' }, h('button', { class: 'btn btn-default', onclick: () => launch('projects') }, 'Открыть проекты'), h('button', { class: 'btn', onclick: () => launch('settings') }, 'Настройки…'))));
      };
      draw();
      const a = bus.on('auth', draw), b = bus.on('theme', draw);
      return () => { a(); b(); };
    },
  });
}

// ---------- настройки ----------
function openSettings() {
  return openWindow({
    id: 'settings', title: appTitle('settings'), icon: 'gear', width: 560, height: 420, resizable: false,
    render(w) {
      const draw = () => {
        const theme = T();
        w.body.innerHTML = '';
        const card = (id, title, desc, active) => h('button', { class: 'theme-card' + (active ? ' on' : ''), onclick: () => bus.emit('switch-theme', id), 'aria-pressed': active ? 'true' : 'false' },
          h('span', { class: `theme-prev theme-prev-${id}` }), h('b', {}, title), h('small', {}, desc));
        w.body.append(h('div', { class: 'settings' },
          h('h3', {}, 'Оформление'),
          h('div', { class: 'theme-cards' },
            card('xp', 'Luna · 2001', 'Синяя панель задач, меню «Пуск», зелёные холмы', theme === 'xp'),
            card('mac', 'Aqua · 2009', 'Строка меню, Dock с увеличением, стекло и хром', theme === 'mac')),
          h('h3', {}, 'Прочее'),
          h('label', { class: 'set-row' }, h('input', { type: 'checkbox', id: 'set-sound', checked: !store.get('mute', false), onchange: (e) => store.set('mute', !e.target.checked) }), ' Звуки системы'),
          h('label', { class: 'set-row' }, h('input', { type: 'checkbox', id: 'set-intro', checked: !store.get('skipIntro', false), onchange: (e) => store.set('skipIntro', !e.target.checked) }), ' Показывать 3D-заставку при входе'),
          h('div', { class: 'dlg-btns' }, h('button', { class: 'btn', onclick: () => bus.emit('intro') }, 'Открыть 3D-заставку'))));
      };
      draw();
      return bus.on('theme', draw);
    },
  });
}

// ---------- корзина ----------
function openTrash() {
  return openWindow({
    id: 'trash', title: 'Корзина', icon: 'trash', width: 460, height: 300, status: true,
    render(w) {
      w.body.append(h('div', { class: 'files files-pad' },
        ...[['старый_пароль.txt', 'notepad'], ['docker-compose.final.FINAL.yml', 'code'], ['проект_который_заработал_с_первого_раза.zip', 'file']].map(([n, i]) => h('button', { class: 'fi', onclick: () => dialog({ title: 'Корзина', text: `«${n}» удалён насовсем. Его уже не вернуть, и, честно говоря, не нужно.`, iconName: 'trash' }) }, h('span', { html: icon(i, T(), 40) }), h('span', { class: 'fi-name' }, n)))));
      w.status.textContent = 'Объектов: 3 · 0 байт';
    },
  });
}

// ---------- блокнот ----------
function openNotes() {
  return openWindow({
    id: 'notes', title: (T() === 'mac' ? 'Заметки' : 'Безымянный — Блокнот'), icon: 'notepad', width: 520, height: 380,
    render(w) {
      const ta = h('textarea', { class: 'notes', id: 'notes-text', spellcheck: 'false', 'aria-label': 'Текст заметки' });
      ta.value = store.get('notes', 'Заметки сохраняются только в этом браузере.\n\nИдеи:\n- добавить новый проект в портфолио\n- побить рекорд в «Танчиках»\n');
      ta.addEventListener('input', () => store.set('notes', ta.value));
      w.body.append(ta);
    },
  });
}

// ---------- браузер (домашняя страница портфолио) ----------
function openBrowser() {
  return openWindow({
    id: 'browser', title: (T() === 'mac' ? 'Навигатор — Домашняя' : 'Домашняя страница — Интернет'), icon: appIcon('browser'), width: 900, height: 600, toolbar: true,
    render(w) {
      w.tools.append(h('button', { class: 'tool-b', disabled: true }, '◀'), h('button', { class: 'tool-b', disabled: true }, '▶'),
        h('div', { class: 'addr' }, h('span', { html: icon(appIcon('browser'), T(), 14) }), 'pca://домашняя'), h('button', { class: 'tool-b', onclick: () => draw() }, '⟳'));
      const draw = () => {
        w.body.innerHTML = '';
        const repos = vault.openRepos();
        const closed = vault.listRepos().filter((r) => r.locked);
        const locked = !repos.length;
        const cats = {};
        for (const r of repos) (cats[r.category] ||= []).push(r);
        w.body.append(h('div', { class: 'home' },
          h('header', { class: 'home-hero' },
            h('p', { class: 'home-eyebrow' }, 'github.com/adleibzon-rgb'),
            h('h1', {}, 'Сети, VPN и роутеры Keenetic'),
            h('p', {}, `${state.manifest.repos.length} проектов: веб-панели для VPN-серверов, утилиты для Keenetic, мониторинг VPS, SSH-клиент и Telegram-боты. Python, JavaScript и Shell.`),
            h('div', { class: 'home-cta' },
              h('button', { class: 'btn btn-default', onclick: () => launch('projects') }, 'Открыть проекты'),
              h('button', { class: 'btn', onclick: () => launch('docs') }, 'Документы'),
              closed.length && !vault.unlocked() ? h('button', { class: 'btn', onclick: () => openLogin(draw) }, 'Войти') : null,
              h('button', { class: 'btn', onclick: () => launch('games') }, 'Поиграть'))),
          locked
            ? h('section', { class: 'home-locked' }, h('div', { html: icon('lock', T(), 40) }), h('p', {}, 'Описания и код проектов откроются после входа. Названия видны всем:'),
                h('ul', { class: 'home-names' }, state.manifest.repos.map((r) => h('li', {}, r.name))))
            : h('section', { class: 'home-cats' }, Object.entries(cats).map(([c, rs]) => h('div', { class: 'home-cat' },
                h('h3', {}, c, h('small', {}, ` · ${rs.length}`)),
                rs.map((r) => h('button', { class: 'home-repo', onclick: () => launch('repo:' + r.id) }, h('b', {}, r.name), h('span', {}, r.desc))))),
              closed.length ? h('div', { class: 'home-cat home-cat-locked' }, h('h3', {}, 'Для клиентов клуба', h('small', {}, ` · ${closed.length}`)),
                h('p', {}, 'Описания и код откроются после входа.'), h('ul', { class: 'home-names' }, closed.map((r) => h('li', {}, r.name)))) : null)));
      };
      draw();
      const a = bus.on('auth', draw), b = bus.on('projects', draw);
      return () => { a(); b(); };
    },
  });
}

// ---------- терминал ----------
function openTerminal() {
  return openWindow({
    id: 'terminal', title: appTitle('terminal'), icon: 'terminal', width: 640, height: 400, class: 'win-term',
    render(w) {
      const out = h('div', { class: 'term-out' });
      const input = h('input', { class: 'term-in', id: 'term-in', 'aria-label': 'Команда', autocomplete: 'off', spellcheck: 'false' });
      const prompt = h('span', { class: 'term-ps' });
      let cwd = '~';
      const ps = () => (T() === 'mac' ? `${state.user || 'guest'}@pca ${cwd} $ ` : `C:\\PCA${cwd === '~' ? '' : '\\' + cwd}> `);
      const print = (t, cls = '') => { out.append(h('div', { class: 'term-line ' + cls }, t)); out.scrollTop = out.scrollHeight; w.body.scrollTop = w.body.scrollHeight; };
      const hist = []; let hi = 0;
      const cmds = {
        help: () => print('Команды: ls, cd <проект>, cat <файл>, open <проект>, whoami, login, logout, games, play <игра>, theme xp|mac, date, clear, exit'),
        whoami: () => print(vault.unlocked() ? `${state.user} (${vault.roleLabel()})` : 'guest'),
        date: () => print(new Date().toLocaleString('ru-RU')),
        clear: () => { out.innerHTML = ''; },
        exit: () => close(w),
        login: () => openLogin(() => print('Вход выполнен.', 'ok')),
        logout: () => { vault.logout(); print('Вы вышли.'); },
        games: () => print(GAMES.map((g) => `${g.id.padEnd(10)} ${g.title} (${g.theme === 'xp' ? 'Luna' : 'Aqua'})`).join('\n')),
        play: (a) => { const g = GAMES.find((x) => x.id === a); if (g) launch('game:' + g.id); else print('Нет такой игры. Список: games', 'err'); },
        theme: (a) => { if (a === 'xp' || a === 'mac') bus.emit('switch-theme', a); else print('theme xp или theme mac', 'err'); },
        ls: () => {
          if (cwd === '~') return print(vault.listRepos().map((r) => r.name + (r.locked ? '/ 🔒' : '/')).join('  '));
          const r = findRepo(cwd); if (!r) return;
          vault.loadRepo(r.id).then((d) => print(d.tree.filter((e) => !e.p.includes('/')).map((e) => e.p).concat([...new Set(d.tree.filter((e) => e.p.includes('/')).map((e) => e.p.split('/')[0] + '/'))]).join('  ')));
        },
        cd: (a) => {
          if (!a || a === '~' || a === '..') { cwd = '~'; return; }
          if (findRepo(a)) cwd = findRepo(a).name; else print(`cd: нет такого проекта: ${a}`, 'err');
        },
        open: (a) => { const r = findRepo(a || cwd); if (r) launch('repo:' + r.id); },
        cat: (a) => {
          if (cwd === '~') return print('Сначала перейдите в проект: cd <проект>', 'err');
          const r = findRepo(cwd);
          vault.loadRepo(r.id).then((d) => { const c = d.contents[a]; print(c == null ? `cat: ${a}: не найден или двоичный` : c.startsWith('data:') ? '(изображение — откройте через open)' : c.slice(0, 6000) + (c.length > 6000 ? '\n… (обрезано, полностью — в окне проекта)' : '')); });
        },
      };
      const findRepo = (name) => {
        const any = vault.listRepos().find((x) => x.name.toLowerCase() === String(name).toLowerCase());
        if (any?.locked) { print('Доступ запрещён. Сначала выполните login.', 'err'); return null; }
        const r = any && vault.repoMeta(any.id);
        if (!r) print(`нет такого проекта: ${name}`, 'err');
        return r;
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const line = input.value.trim(); input.value = '';
          print(ps() + line, 'term-echo');
          if (line) { hist.push(line); hi = hist.length; }
          const [c, ...rest] = line.split(/\s+/);
          if (!c) return;
          (cmds[c.toLowerCase()] || (() => print(T() === 'mac' ? `-bash: ${c}: command not found` : `"${c}" не является внутренней или внешней командой.`, 'err')))(rest.join(' '));
          prompt.textContent = ps();
        } else if (e.key === 'ArrowUp') { hi = Math.max(0, hi - 1); input.value = hist[hi] || ''; e.preventDefault(); }
        else if (e.key === 'ArrowDown') { hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ''; }
        else if (e.key === 'Tab') {
          e.preventDefault();
          const [c, a = ''] = input.value.split(/\s+/);
          if (['cd', 'open'].includes(c)) { const m = vault.openRepos().find((r) => r.name.startsWith(a)); if (m) input.value = `${c} ${m.name}`; }
        }
      });
      print(T() === 'mac' ? `Last login: ${new Date().toLocaleString('ru-RU')} on ttys000` : 'PCA XP [Версия 5.1.2600]\n(С) PCA, 2002.');
      print('Введите help, чтобы увидеть команды.');
      prompt.textContent = ps();
      w.body.append(out, h('div', { class: 'term-row' }, prompt, input));
      w.body.addEventListener('click', () => input.focus());
      setTimeout(() => input.focus(), 50);
    },
  });
}

export { esc };
