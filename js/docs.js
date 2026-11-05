// «Документы»: каталог проектов, фотоальбом, карта проектов, статистика и инвентаризация.
// Гость видит открытые проекты, клиент — открытые и закрытые. Закрытые для гостя показаны только именем.
import { h, state, bus, fmtSize, fmtDate } from './state.js';
import { icon } from './icons.js';
import { openWindow, getWin } from './wm.js';
import * as vault from './vault.js';
import { launch, openLogin, visLabel } from './apps.js';

const T = () => (document.body.classList.contains('mac') ? 'mac' : 'xp');
const LANG_COLORS = { Python: '#3572A5', JavaScript: '#e3c22b', TypeScript: '#3178c6', Shell: '#89e051', HTML: '#e34c26', CSS: '#663399', PowerShell: '#2a5bb8', Go: '#00ADD8', Kotlin: '#A97BFF', Java: '#b07219', Docker: '#384d54', Lua: '#000080' };
const langColor = (l) => LANG_COLORS[l] || '#8a8f98';
const topLang = (r) => Object.entries(r.langs || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

const SECTIONS = [
  ['catalog', 'readme', 'Каталог проектов', 'Краткое описание каждого проекта'],
  ['album', 'album', 'Фотоальбом', 'Скриншоты из проектов'],
  ['map', 'map', 'Карта проектов', 'Как проекты связаны по направлениям'],
  ['stats', 'chart', 'Статистика', 'Языки, объём, активность'],
  ['inventory', 'table', 'Инвентаризация', 'Сводная таблица и выгрузка в Markdown'],
];

export function openDocs(arg) {
  let section = arg;
  if (typeof arg === 'string' && arg.startsWith('album:')) { albumPick = arg.slice(6); section = 'album'; }
  if (getWin('docs') && section) bus.emit('docs-go', section);
  return openWindow({
    id: 'docs', title: 'Документы', icon: 'folderDocs', width: 1000, height: 640, toolbar: true, status: true,
    render(w) {
      let cur = SECTIONS.some((s) => s[0] === section) ? section : null;
      const draw = () => {
        const theme = T();
        w.tools.innerHTML = '';
        w.body.innerHTML = '';
        w.tools.append(
          h('button', { class: 'tool-b', disabled: !cur, onclick: () => { cur = null; draw(); } }, '◀ Документы'),
          h('div', { class: 'crumbs' }, h('span', { class: 'crumb' }, 'Документы'), cur ? [h('span', { class: 'crumb-sep' }, '›'), h('span', { class: 'crumb' }, SECTIONS.find((s) => s[0] === cur)[2])] : null),
          h('div', { class: 'tool-sp' }),
          h('div', { class: 'seg' }, SECTIONS.map(([id, , label]) => h('button', { class: 'seg-b' + (id === cur ? ' on' : ''), onclick: () => { cur = id; draw(); } }, label))));
        const all = vault.listRepos();
        const open = all.filter((r) => !r.locked);
        const closed = all.length - open.length;
        w.status.textContent = `Проектов: ${all.length} · доступно: ${open.length}` + (closed ? ` · закрыто: ${closed}` : '') + ` · вы: ${vault.unlocked() ? state.user + ', ' + vault.roleLabel() : 'гость'}`;
        const pane = h('div', { class: 'docs' });
        w.body.append(pane);
        if (!cur) {
          pane.append(h('div', { class: 'docs-home' },
            h('div', { class: 'docs-intro' },
              h('h2', {}, 'Документация по проектам'),
              h('p', {}, `Обзор всех ${all.length} проектов: описания, скриншоты, связи и сводная таблица. ` +
                (closed && !vault.unlocked() ? `Сейчас открыто ${open.length}. Закрытые проекты (${closed}) доступны клиентам клуба после входа.` : 'Все доступные вам проекты включены.')),
              closed && !vault.unlocked() ? h('button', { class: 'btn btn-default', onclick: () => openLogin(draw) }, 'Войти') : null),
            h('div', { class: 'files files-pad docs-grid' }, SECTIONS.map(([id, ic, label, sub]) => h('button', { class: 'fi fi-doc', ondblclick: () => { cur = id; draw(); }, onclick: (e) => { if (e.detail === 1) { cur = id; draw(); } } },
              h('span', { html: icon(ic, theme, 56) }), h('span', { class: 'fi-name' }, label), h('small', {}, sub))))));
          return;
        }
        ({ catalog, album, map, stats, inventory })[cur](pane, all, open, draw);
      };
      draw();
      const a = bus.on('auth', draw), b = bus.on('projects', draw), c = bus.on('theme', draw);
      const d = bus.on('docs-go', (sec) => { cur = sec; draw(); });
      return () => { a(); b(); c(); d(); };
    },
  });
}

// ---------- каталог ----------
function catalog(pane, all) {
  const cats = {};
  for (const r of all) (cats[r.category || 'Закрытые проекты'] ||= []).push(r);
  const order = Object.keys(cats).sort((a, b) => (a === 'Закрытые проекты') - (b === 'Закрытые проекты') || cats[b].length - cats[a].length);
  pane.append(h('div', { class: 'cat' }, order.map((c) => h('section', {},
    h('h3', { class: 'cat-h' }, c, h('small', {}, ` · ${cats[c].length}`)),
    h('div', { class: 'cat-cards' }, cats[c].map((r) => card(r)))))));
}
function card(r) {
  if (r.locked) {
    return h('article', { class: 'pcard pcard-locked' },
      h('header', {}, h('span', { html: icon('folderLocked', T(), 28) }), h('b', {}, r.name)),
      h('p', {}, 'Закрытый проект для клиентов клуба. Описание откроется после входа.'),
      h('footer', {}, h('button', { class: 'btn', onclick: () => openLogin() }, 'Войти')));
  }
  const lang = topLang(r);
  return h('article', { class: 'pcard' },
    h('header', {}, h('span', { html: icon('folderCode', T(), 28) }), h('div', {}, h('b', {}, r.name), r.title && r.title !== r.name ? h('small', {}, r.title) : null)),
    h('p', {}, r.desc),
    h('div', { class: 'chips' },
      h('span', { class: 'chip' + (r.visibility === 'public' ? ' chip-open' : ' chip-lock') }, visLabel(r)),
      lang ? h('span', { class: 'chip' }, h('i', { class: 'dot', style: { background: langColor(lang) } }), lang) : null,
      r.docker ? h('span', { class: 'chip' }, 'Docker') : null,
      h('span', { class: 'chip' }, fmtDate(r.date))),
    r.install ? h('pre', { class: 'pcard-cmd', title: 'Команда установки из README' }, r.install) : null,
    h('footer', {},
      h('button', { class: 'btn btn-default', onclick: () => launch('repo:' + r.id) }, 'Открыть'),
      (r.imgs?.length ?? 0) ? h('button', { class: 'btn', onclick: () => launch('docs', 'album:' + r.id) }, `Скриншоты · ${r.imgs.length}`) : null,
      h('a', { class: 'btn', href: r.url, target: '_blank', rel: 'noopener' }, 'GitHub')));
}

// ---------- фотоальбом ----------
let albumPick = null;
function album(pane, all, open) {
  const withImgs = open.filter((r) => !Array.isArray(r.imgs) || r.imgs.length);
  if (!withImgs.length) { pane.append(h('p', { class: 'empty' }, open.length ? 'В доступных проектах нет скриншотов.' : 'Скриншоты доступны после входа.')); return; }
  if (!withImgs.some((r) => r.id === albumPick)) albumPick = withImgs[0].id;
  const list = h('nav', { class: 'alb-list', 'aria-label': 'Альбомы' });
  const grid = h('div', { class: 'alb-grid' });
  const show = async (id) => {
    albumPick = id;
    list.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
    grid.innerHTML = '<div class="loading"><span class="spin"></span> Загружаю снимки…</div>';
    try {
      const d = await vault.loadRepo(id);
      if (albumPick !== id) return;
      const meta = vault.repoMeta(id);
      const paths = (meta.imgs?.length ? meta.imgs : d.tree.filter((e) => e.t === 'img').map((e) => e.p)).filter((p) => d.contents[p]);
      grid.innerHTML = '';
      if (!paths.length) { grid.append(h('p', { class: 'empty' }, 'В этом проекте нет картинок.')); return; }
      paths.forEach((p, i) => grid.append(h('button', { class: 'alb-ph', title: p, onclick: () => lightbox(meta, paths, d, i) },
        h('img', { src: d.contents[p], alt: p.split('/').pop(), loading: 'lazy' }), h('span', {}, p.split('/').pop()))));
    } catch (e) { grid.innerHTML = ''; grid.append(h('p', { class: 'empty' }, 'Не удалось загрузить: ' + e.message)); }
  };
  for (const r of withImgs) list.append(h('button', { 'data-id': r.id, onclick: () => show(r.id) }, h('span', { html: icon('album', T(), 20) }), h('span', {}, r.name), Array.isArray(r.imgs) ? h('small', {}, r.imgs.length) : null));
  pane.append(h('div', { class: 'split alb' }, list, grid));
  show(albumPick);
}
export function pickAlbum(id) { albumPick = id; }

function lightbox(meta, paths, d, start) {
  let i = start;
  const img = h('img', { alt: '' });
  const cap = h('p', {});
  const set = () => { img.src = d.contents[paths[i]]; img.alt = paths[i]; cap.textContent = `${meta.name} · ${paths[i]} · ${i + 1} из ${paths.length}`; };
  const go = (k) => { i = (i + k + paths.length) % paths.length; set(); };
  const el = h('div', { class: 'lightbox', role: 'dialog', 'aria-label': 'Просмотр снимка', tabindex: -1 },
    h('button', { class: 'lb-x', 'aria-label': 'Закрыть', onclick: () => end() }, '×'),
    h('button', { class: 'lb-nav lb-prev', 'aria-label': 'Предыдущий', onclick: () => go(-1) }, '‹'),
    h('figure', {}, img, h('figcaption', {}, cap)),
    h('button', { class: 'lb-nav lb-next', 'aria-label': 'Следующий', onclick: () => go(1) }, '›'));
  const key = (e) => { if (e.key === 'Escape') end(); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1); };
  const end = () => { el.remove(); window.removeEventListener('keydown', key, true); };
  el.addEventListener('click', (e) => { if (e.target === el) end(); });
  window.addEventListener('keydown', key, true);
  set();
  document.body.append(el);
  el.focus();
}

// ---------- карта проектов ----------
// Радиальная схема: в центре владелец, на внутреннем кольце направления, на внешнем — проекты.
function map(pane, all) {
  const W = 1000, H = 640, cx = W / 2, cy = H / 2;
  const cats = {};
  for (const r of all) (cats[r.category || 'Закрытые'] ||= []).push(r);
  const names = Object.keys(cats).sort((a, b) => cats[b].length - cats[a].length);
  const NS = 'http://www.w3.org/2000/svg';
  const s = (tag, attrs, ...kids) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); kids.forEach((k) => e.append(k)); return e; };
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'pmap', role: 'img', 'aria-label': 'Карта проектов по направлениям' });
  const maxSize = Math.max(1, ...all.filter((r) => !r.locked).map((r) => r.size));
  const edges = s('g', { class: 'pm-edges' });
  const nodes = s('g', {});
  const cats2 = s('g', {});
  const total = all.length + names.length; // пустой слот между направлениями
  const RX = 300, RY = 225, CRX = 150, CRY = 112;
  let slot = 0;
  for (const c of names) {
    const list = cats[c];
    const a0 = slot, a1 = slot + list.length - 1;
    const ang = (k) => (k / total) * Math.PI * 2 - Math.PI / 2;
    const am = ang((a0 + a1) / 2);
    const kx = cx + Math.cos(am) * CRX, ky = cy + Math.sin(am) * CRY;
    edges.append(s('line', { x1: cx, y1: cy, x2: kx, y2: ky, class: 'pm-e1' }));
    list.forEach((r, i) => {
      const a = ang(slot + i);
      const x = cx + Math.cos(a) * RX, y = cy + Math.sin(a) * RY;
      edges.append(s('path', { d: `M${kx},${ky} Q${cx + Math.cos(a) * (CRX + 60)},${cy + Math.sin(a) * (CRY + 45)} ${x},${y}`, class: 'pm-e2' }));
      const size = r.locked ? 8 : 7 + Math.sqrt(r.size / maxSize) * 15;
      const lang = topLang(r);
      const right = Math.cos(a) >= -0.02;
      const lx = x + Math.cos(a) * (size + 6), ly = y + Math.sin(a) * (size + 6) + 4;
      const title = s('title', {}); title.textContent = r.locked ? `${r.name} — закрыт` : `${r.name}\n${r.desc}\n${lang || ''} · ${fmtSize(r.size)}`;
      const g = s('g', { class: 'pm-node' + (r.locked ? ' pm-locked' : ''), tabindex: 0, role: 'button', 'aria-label': r.name },
        title,
        s('circle', { cx: x, cy: y, r: size, fill: r.locked ? '#9aa3af' : langColor(lang) }),
        r.locked ? s('text', { x, y: y + 4, 'text-anchor': 'middle', class: 'pm-lock' }, '🔒') : '',
        s('text', { x: lx, y: ly, 'text-anchor': Math.abs(Math.cos(a)) < 0.2 ? 'middle' : right ? 'start' : 'end', class: 'pm-label' }, r.name));
      const go = () => (r.locked ? openLogin() : launch('repo:' + r.id));
      g.addEventListener('click', go);
      g.addEventListener('keydown', (e) => e.key === 'Enter' && go());
      nodes.append(g);
    });
    const label = `${c} · ${list.length}`;
    const lw = Math.max(70, label.length * 7.4 + 18);
    cats2.append(s('g', { class: 'pm-cat' }, s('rect', { x: kx - lw / 2, y: ky - 12, width: lw, height: 24, rx: 12 }), s('text', { x: kx, y: ky + 4.5, 'text-anchor': 'middle' }, label)));
    slot += list.length + 1;
  }
  const hub = s('g', { class: 'pm-hub' }, s('circle', { cx, cy, r: 50 }), s('text', { x: cx, y: cy - 3, 'text-anchor': 'middle' }, state.manifest?.owner || 'проекты'), s('text', { x: cx, y: cy + 15, 'text-anchor': 'middle', class: 'pm-sub' }, `${all.length} проектов`));
  svg.append(edges, hub, cats2, nodes);
  const langs = [...new Set(all.filter((r) => !r.locked).map(topLang).filter(Boolean))];
  pane.append(h('div', { class: 'pmap-wrap' }, svg,
    h('div', { class: 'pmap-legend' }, langs.map((l) => h('span', {}, h('i', { style: { background: langColor(l) } }), l)),
      all.some((r) => r.locked) ? h('span', {}, h('i', { style: { background: '#9aa3af' } }), 'закрыт') : null,
      h('span', { class: 'pmap-hint' }, 'Размер кружка — объём кода. Щёлкните, чтобы открыть проект.'))));
}

// ---------- статистика ----------
function stats(pane, all, open) {
  if (!open.length) { pane.append(h('p', { class: 'empty' }, 'Статистика доступна после входа.')); return; }
  const langs = {};
  for (const r of open) for (const [l, b] of Object.entries(r.langs || {})) langs[l] = (langs[l] || 0) + b;
  const L = Object.entries(langs).sort((a, b) => b[1] - a[1]);
  const lt = L.reduce((s, [, b]) => s + b, 0) || 1;
  const bySize = [...open].sort((a, b) => b.size - a.size);
  const maxS = bySize[0]?.size || 1;
  const byDate = [...open].sort((a, b) => new Date(b.date) - new Date(a.date));
  const tile = (n, l) => h('div', { class: 'st-tile' }, h('b', {}, n), h('span', {}, l));
  pane.append(h('div', { class: 'stats' },
    h('div', { class: 'st-tiles' },
      tile(all.length, 'проектов всего'),
      tile(open.filter((r) => r.visibility === 'public').length, 'открытых'),
      tile(all.length - open.filter((r) => r.visibility === 'public').length, 'для клиентов'),
      tile(fmtSize(open.reduce((s, r) => s + r.size, 0)), 'объём доступных'),
      tile(open.reduce((s, r) => s + (r.files || 0), 0), 'файлов')),
    h('section', {}, h('h3', {}, 'Языки'),
      h('div', { class: 'langbar' }, L.map(([l, b]) => h('i', { style: { flex: b / lt, background: langColor(l) }, title: `${l} ${(b / lt * 100).toFixed(1)}%` }))),
      h('div', { class: 'langs' }, L.slice(0, 10).map(([l, b]) => h('span', {}, h('i', { style: { background: langColor(l) } }), `${l} ${(b / lt * 100).toFixed(1)}%`)))),
    h('section', {}, h('h3', {}, 'Объём проектов'),
      h('div', { class: 'bars' }, bySize.map((r) => h('button', { class: 'bar-row', onclick: () => launch('repo:' + r.id) },
        h('span', { class: 'bar-l' }, r.name), h('span', { class: 'bar-t' }, h('i', { style: { width: Math.max(2, r.size / maxS * 100) + '%', background: langColor(topLang(r)) } })), h('span', { class: 'bar-v' }, fmtSize(r.size)))))),
    h('section', {}, h('h3', {}, 'Последние обновления'),
      h('ol', { class: 'timeline' }, byDate.slice(0, 12).map((r) => h('li', {}, h('time', {}, fmtDate(r.date)), h('b', {}, r.name), h('span', {}, r.msg)))))));
}

// ---------- инвентаризация ----------
function inventory(pane, all) {
  const rows = all.map((r) => r.locked ? { name: r.name, vis: visLabel(r), locked: true } : {
    name: r.name, vis: visLabel(r), cat: r.category, lang: topLang(r) || '—', files: r.files, size: fmtSize(r.size),
    commits: r.commits, date: new Date(r.date).toLocaleDateString('ru-RU'), docker: r.docker ? 'да' : '—', install: r.install || '', readme: r.readme ? 'есть' : 'нет', desc: r.desc, url: r.url, id: r.id,
  });
  const cols = [['name', 'Проект'], ['vis', 'Доступ'], ['cat', 'Категория'], ['lang', 'Язык'], ['files', 'Файлов'], ['size', 'Объём'], ['commits', 'Коммитов'], ['date', 'Обновлён'], ['docker', 'Docker'], ['readme', 'README']];
  const tb = h('table', { class: 'grid inv' }, h('thead', {}, h('tr', {}, cols.map(([, t]) => h('th', {}, t)), h('th', {}, 'Установка'))),
    h('tbody', {}, rows.map((r) => h('tr', { class: r.locked ? 'tr-locked' : null, ondblclick: () => (r.locked ? openLogin() : launch('repo:' + r.id)) },
      cols.map(([k]) => h('td', { class: ['files', 'commits'].includes(k) ? 'num' : null }, r.locked && !['name', 'vis'].includes(k) ? '—' : r[k] ?? '—')),
      h('td', { class: 'inv-cmd' }, r.install ? h('code', {}, r.install) : '—')))));
  const md = () => {
    const lines = [`# Инвентаризация проектов ${state.manifest?.owner || ''}`.trim(), '', `Дата: ${new Date().toLocaleDateString('ru-RU')} · проектов: ${all.length}`, '',
      '| Проект | Доступ | Категория | Язык | Файлов | Объём | Коммитов | Обновлён | Docker |', '|---|---|---|---|---:|---:|---:|---|---|'];
    for (const r of rows) lines.push(r.locked ? `| ${r.name} | ${r.vis} | — | — | — | — | — | — | — |` : `| [${r.name}](${r.url}) | ${r.vis} | ${r.cat} | ${r.lang} | ${r.files} | ${r.size} | ${r.commits} | ${r.date} | ${r.docker} |`);
    lines.push('', '## Описания', '');
    for (const r of rows) if (!r.locked) {
      lines.push(`### ${r.name}`, '', r.desc, '');
      if (r.install) lines.push('Установка:', '', '```bash', r.install, '```', '');
    }
    return lines.join('\n');
  };
  const save = () => {
    const a = h('a', { href: URL.createObjectURL(new Blob([md()], { type: 'text/markdown' })), download: 'inventory.md' });
    document.body.append(a); a.click(); a.remove();
  };
  pane.append(h('div', { class: 'inv-wrap' },
    h('div', { class: 'inv-bar' }, h('p', {}, 'Двойной щелчок по строке открывает проект.'), h('div', { class: 'tool-sp' }), h('button', { class: 'btn', onclick: save }, 'Скачать .md')),
    h('div', { class: 'inv-scroll' }, tb)));
}
