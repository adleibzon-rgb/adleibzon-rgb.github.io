// «Администрирование»: только для учётной записи администратора (режим API).
// Проекты: открыть/закрыть/скрыть, правка названия и описания, обновление с GitHub, добавление, удаление.
// Пользователи: создать, сменить пароль, заблокировать, удалить.
import { h, state, bus, fmtDate } from './state.js';
import { icon } from './icons.js';
import { openWindow, close, dialog } from './wm.js';
import * as vault from './vault.js';
import { launch } from './apps.js';

const T = () => (document.body.classList.contains('mac') ? 'mac' : 'xp');
const VIS = [['public', 'Открытый — видят все'], ['private', 'Для клиентов — после входа'], ['hidden', 'Скрыт — только администратор']];

const confirm = (title, text) => dialog({ title, text, iconName: 'info', buttons: [{ label: 'Отмена', value: false }, { label: 'Да', value: true, default: true }] });
const genPassword = () => {
  const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r = crypto.getRandomValues(new Uint32Array(14));
  return [...r].map((x) => a[x % a.length]).join('').replace(/(.{4})(?=.)/g, '$1-');
};

export function openAdmin(tab) {
  if (!vault.isAdmin()) {
    return dialog({ title: 'Администрирование', text: vault.apiMode() ? 'Раздел доступен только администратору. Войдите под учётной записью администратора.' : 'Администрирование работает, когда сайт подключён к серверу (PCA API).', iconName: 'shield' });
  }
  return openWindow({
    id: 'admin', title: 'Администрирование', icon: 'shield', width: 980, height: 620, toolbar: true, status: true,
    render(w) {
      let cur = tab === 'users' ? 'users' : 'projects';
      const draw = () => {
        if (!vault.isAdmin()) { close(w); return; }
        w.tools.innerHTML = '';
        w.tools.append(h('div', { class: 'seg' },
          h('button', { class: 'seg-b' + (cur === 'projects' ? ' on' : ''), onclick: () => { cur = 'projects'; draw(); } }, 'Проекты'),
          h('button', { class: 'seg-b' + (cur === 'users' ? ' on' : ''), onclick: () => { cur = 'users'; draw(); } }, 'Пользователи')),
          h('div', { class: 'tool-sp' }), h('span', { class: 'adm-who' }, `Администратор: ${state.user}`));
        w.body.innerHTML = '';
        const pane = h('div', { class: 'adm' });
        w.body.append(pane);
        (cur === 'projects' ? projects : users)(pane, w, draw);
      };
      draw();
      const a = bus.on('auth', draw);
      return () => a();
    },
  });
}

const busy = async (btn, fn) => {
  const t = btn.textContent; btn.disabled = true; btn.textContent = '…';
  try { return await fn(); } catch (e) { dialog({ title: 'Ошибка', text: e.message, iconName: 'info' }); return null; } finally { btn.disabled = false; btn.textContent = t; }
};

// ---------- проекты ----------
function projects(pane, w) {
  const repos = vault.listRepos();
  const add = h('form', { class: 'adm-add' },
    h('b', {}, 'Добавить проект с GitHub'),
    h('input', { name: 'repo', placeholder: 'имя репозитория или owner/repo', required: true, autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Репозиторий' }),
    h('select', { name: 'vis', 'aria-label': 'Доступ' }, h('option', { value: '' }, 'доступ как на GitHub'), VIS.map(([v, l]) => h('option', { value: v }, l))),
    h('button', { class: 'btn btn-default', type: 'submit' }, 'Добавить'));
  add.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = add.querySelector('button');
    busy(btn, async () => {
      const d = await vault.api('/api/admin/projects', { method: 'POST', body: { repo: add.repo.value.trim(), visibility: add.vis.value || undefined } });
      add.reset();
      await vault.refresh();
      w.status.textContent = `Добавлен: ${d.project.name} (${d.project.visibility})`;
    });
  });
  const body = h('tbody');
  for (const r of repos) {
    const sel = h('select', { 'aria-label': 'Доступ к ' + r.name, class: 'vis-' + r.visibility },
      VIS.map(([v, l]) => h('option', { value: v, selected: v === r.visibility ? true : null }, l)));
    sel.addEventListener('change', async () => {
      sel.disabled = true;
      try { await vault.api('/api/admin/projects/' + r.id, { method: 'PATCH', body: { visibility: sel.value } }); await vault.refresh(); w.status.textContent = `${r.name}: ${sel.selectedOptions[0].textContent}`; }
      catch (e) { dialog({ title: 'Ошибка', text: e.message }); sel.value = r.visibility; }
      finally { sel.disabled = false; }
    });
    const meta = vault.repoMeta(r.id) || r;
    body.append(h('tr', {},
      h('td', {}, h('span', { class: 'cell-ico', html: icon('folderCode', T(), 18) }), h('b', {}, r.name), h('div', { class: 'adm-desc' }, meta.desc || '')),
      h('td', {}, meta.category || '—'),
      h('td', {}, sel),
      h('td', { class: 'num' }, meta.date ? new Date(meta.date).toLocaleDateString('ru-RU') : '—'),
      h('td', { class: 'adm-acts' },
        h('button', { class: 'btn', onclick: () => launch('repo:' + r.id) }, 'Открыть'),
        h('button', { class: 'btn', onclick: () => editProject(meta) }, 'Изменить'),
        h('button', { class: 'btn', title: 'Забрать свежую версию с GitHub', onclick: (e) => busy(e.currentTarget, async () => { await vault.api(`/api/admin/projects/${r.id}/sync`, { method: 'POST' }); await vault.refresh(); w.status.textContent = `${r.name} обновлён с GitHub`; }) }, 'Обновить'),
        h('button', { class: 'btn btn-danger', onclick: async (e) => {
          const btn = e.currentTarget;
          if (!(await confirm('Удалить проект', `Убрать «${r.name}» с сайта? Репозиторий на GitHub не пострадает, проект можно добавить снова.`))) return;
          busy(btn, async () => { await vault.api('/api/admin/projects/' + r.id, { method: 'DELETE' }); await vault.refresh(); });
        } }, 'Удалить'))));
  }
  pane.append(add, h('div', { class: 'inv-scroll' }, h('table', { class: 'grid adm-table' },
    h('thead', {}, h('tr', {}, ['Проект', 'Категория', 'Доступ', 'Обновлён', ''].map((c) => h('th', {}, c)))), body)));
  const n = (v) => repos.filter((r) => r.visibility === v).length;
  w.status.textContent = `Проектов: ${repos.length} · открытых: ${n('public')} · для клиентов: ${n('private')} · скрытых: ${n('hidden')}`;
}

function editProject(meta) {
  return openWindow({
    id: 'adm-edit-' + meta.id, title: 'Проект ' + meta.name, icon: 'folderCode', width: 520, height: 420, resizable: false, class: 'win-dialog',
    render(w) {
      const f = h('form', { class: 'adm-form' },
        h('label', {}, 'Название', h('input', { name: 'title', value: meta.title || meta.name, maxlength: 120 })),
        h('label', {}, 'Категория', h('input', { name: 'category', value: meta.category || '', maxlength: 120, list: 'adm-cats' })),
        h('datalist', { id: 'adm-cats' }, [...new Set(vault.openRepos().map((r) => r.category))].map((c) => h('option', { value: c }))),
        h('label', {}, 'Краткое описание', h('textarea', { name: 'desc', rows: 5, maxlength: 600 }, meta.desc || '')),
        h('p', { class: 'adm-hint' }, 'Пустое поле вернёт значение из README.'),
        h('div', { class: 'dlg-btns' }, h('button', { class: 'btn', type: 'button', onclick: () => close(w) }, 'Отмена'), h('button', { class: 'btn btn-default', type: 'submit' }, 'Сохранить')));
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        busy(f.querySelector('[type=submit]'), async () => {
          await vault.api('/api/admin/projects/' + meta.id, { method: 'PATCH', body: { title: f.title.value, category: f.category.value, desc: f.desc.value } });
          await vault.refresh();
          close(w);
        });
      });
      w.body.append(f);
    },
  });
}

// ---------- пользователи ----------
async function users(pane, w, redraw) {
  const add = h('form', { class: 'adm-add' },
    h('b', {}, 'Новый клиент'),
    h('input', { name: 'login', placeholder: 'логин (латиница)', required: true, autocomplete: 'off', spellcheck: 'false', pattern: '[a-zA-Z0-9._\\-]{3,32}', 'aria-label': 'Логин' }),
    h('input', { name: 'password', placeholder: 'пароль', required: true, minlength: 8, autocomplete: 'new-password', 'aria-label': 'Пароль' }),
    h('button', { class: 'btn', type: 'button', onclick: () => { add.password.value = genPassword(); } }, 'Сгенерировать'),
    h('input', { name: 'note', placeholder: 'заметка: имя, компания', maxlength: 200, 'aria-label': 'Заметка' }),
    h('label', { class: 'adm-chk' }, h('input', { type: 'checkbox', name: 'chat' }), ' ИИ-ассистент'),
    h('button', { class: 'btn btn-default', type: 'submit' }, 'Создать'));
  add.addEventListener('submit', (e) => {
    e.preventDefault();
    const login = add.login.value.trim().toLowerCase(), password = add.password.value;
    busy(add.querySelector('[type=submit]'), async () => {
      await vault.api('/api/admin/users', { method: 'POST', body: { login, password, note: add.note.value, chat: add.chat.checked } });
      add.reset();
      await credentials('Клиент создан', login, password);
      redraw();
    });
  });
  pane.append(add);
  const box = h('div', { class: 'inv-scroll' }, h('div', { class: 'loading' }, h('span', { class: 'spin' }), ' Загружаю пользователей…'));
  pane.append(box);
  let list, usage = { users: {}, totalUsd: 0, totalLimitUsd: 0 };
  try {
    list = (await vault.api('/api/admin/users')).users;
    usage = await vault.api('/api/admin/usage').catch(() => usage);
  } catch (e) { box.innerHTML = ''; box.append(h('p', { class: 'empty' }, e.message)); return; }
  const body = h('tbody');
  for (const u of list.sort((a, b) => (b.role === 'admin') - (a.role === 'admin') || a.login.localeCompare(b.login))) {
    const isAdm = u.role === 'admin';
    body.append(h('tr', { class: u.disabled ? 'tr-locked' : null },
      h('td', {}, h('span', { class: 'cell-ico', html: icon(isAdm ? 'shield' : 'user', T(), 18) }),
        u.tg ? h('span', {}, h('b', {}, u.tg.username ? '@' + u.tg.username : u.tg.name || u.login), h('div', { class: 'adm-desc' }, `Telegram · ${u.tg.name || ''} · id ${u.tg.id}`)) : h('b', {}, u.login)),
      h('td', {}, isAdm ? 'администратор' : 'клиент'),
      h('td', {}, u.note || '—'),
      h('td', {}, u.disabled ? 'заблокирован' : u.tg ? (u.tg.member ? h('span', { class: 'adm-ok' }, 'подписка активна') : h('span', { class: 'adm-bad' }, 'нет в группе' + (u.tg.leftAt ? ` с ${new Date(u.tg.leftAt).toLocaleDateString('ru-RU')}` : ''))) : 'активен'),
      h('td', {}, isAdm ? `$${(usage.users[u.login]?.usd ?? 0).toFixed(2)} · без лимита` : (() => {
        const x = usage.users[u.login] || { usd: 0, today: 0, installs: 0, limitUsd: usage.defaults?.usd ?? 0, limitDaily: usage.defaults?.daily ?? 0, limitInstalls: usage.defaults?.installs ?? 0 };
        return h('button', { class: 'btn adm-lim', title: 'Изменить лимиты', onclick: () => editLimits(u, x, redraw) }, `установок ${x.installs || 0}/${x.limitInstalls ?? usage.defaults?.installs ?? 0} · $${x.usd.toFixed(2)}`);
      })()),
      h('td', {}, isAdm ? 'да' : h('label', { class: 'adm-chk' }, h('input', { type: 'checkbox', checked: u.chat ? true : null, 'aria-label': 'ИИ-ассистент для ' + u.login, onchange: async (e) => {
        const cb = e.currentTarget; cb.disabled = true;
        try { await vault.api('/api/admin/users/' + u.login, { method: 'PATCH', body: { chat: cb.checked } }); w.status.textContent = `${u.login}: ассистент ${cb.checked ? 'включён' : 'выключен'}`; }
        catch (ex) { cb.checked = !cb.checked; dialog({ title: 'Ошибка', text: ex.message }); } finally { cb.disabled = false; }
      } }), ' включён')),
      h('td', { class: 'num' }, u.lastLogin ? fmtDate(u.lastLogin) : 'не входил'),
      h('td', { class: 'adm-acts' }, isAdm ? h('small', {}, 'пароль — в настройках сервера') : [
        u.tg ? null : h('button', { class: 'btn', onclick: () => setPassword(u, redraw) }, 'Сменить пароль'),
        h('button', { class: 'btn', onclick: (e) => busy(e.currentTarget, async () => { await vault.api('/api/admin/users/' + u.login, { method: 'PATCH', body: { disabled: !u.disabled } }); redraw(); }) }, u.disabled ? 'Разблокировать' : 'Заблокировать'),
        h('button', { class: 'btn btn-danger', onclick: async (e) => {
          const btn = e.currentTarget;
          if (!(await confirm('Удалить пользователя', `Удалить «${u.login}»? Он сразу потеряет доступ к закрытым проектам.`))) return;
          busy(btn, async () => { await vault.api('/api/admin/users/' + u.login, { method: 'DELETE' }); redraw(); });
        } }, 'Удалить')])));
  }
  box.innerHTML = '';
  box.append(h('table', { class: 'grid adm-table' }, h('thead', {}, h('tr', {}, ['Пользователь', 'Роль', 'Заметка', 'Статус', 'Расход ИИ за месяц', 'ИИ-ассистент', 'Последний вход', ''].map((c) => h('th', {}, c)))), body));
  const subs = list.filter((u) => u.tg);
  w.status.textContent = `Пользователей: ${list.length} · из Telegram: ${subs.length} (с подпиской: ${subs.filter((u) => u.tg.member).length}) · заблокировано: ${list.filter((u) => u.disabled).length} · ИИ за месяц: $${usage.totalUsd.toFixed(2)} из $${usage.totalLimitUsd}`;
}

// Личные лимиты ассистента: пустое поле — значение по умолчанию с сервера.
function editLimits(u, x, redraw) {
  return openWindow({
    id: 'adm-lim-' + u.login, title: 'Лимиты ИИ: ' + (u.tg?.username ? '@' + u.tg.username : u.login), icon: 'assistant', width: 420, height: 400, resizable: false, class: 'win-dialog',
    render(w) {
      const f = h('form', { class: 'adm-form' },
        h('p', { class: 'adm-hint' }, `В этом месяце: установок ${x.installs || 0}, потрачено $${x.usd.toFixed(2)}; сегодня сообщений: ${x.today || 0}.`),
        h('label', {}, 'Установок в месяц', h('input', { name: 'installs', type: 'number', min: 0, step: 1, value: u.limits?.installs ?? '', placeholder: 'по умолчанию' })),
        h('label', {}, 'Страховочный бюджет на месяц, $', h('input', { name: 'usd', type: 'number', min: 0, step: '0.5', value: u.limits?.usd ?? '', placeholder: 'по умолчанию' })),
        h('label', {}, 'Сообщений в сутки', h('input', { name: 'daily', type: 'number', min: 0, step: 1, value: u.limits?.daily ?? '', placeholder: 'по умолчанию' })),
        h('p', { class: 'adm-hint' }, 'Пустое поле — значение по умолчанию из настроек сервера. 0 — ассистент недоступен.'),
        h('div', { class: 'dlg-btns' }, h('button', { class: 'btn', type: 'button', onclick: () => close(w) }, 'Отмена'), h('button', { class: 'btn btn-default', type: 'submit' }, 'Сохранить')));
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        busy(f.querySelector('[type=submit]'), async () => {
          await vault.api('/api/admin/users/' + u.login, { method: 'PATCH', body: { limitInstalls: f.installs.value === '' ? null : Number(f.installs.value), limitUsd: f.usd.value === '' ? null : Number(f.usd.value), limitDaily: f.daily.value === '' ? null : Number(f.daily.value) } });
          close(w); redraw();
        });
      });
      w.body.append(f);
    },
  });
}

function setPassword(u, redraw) {
  return openWindow({
    id: 'adm-pw-' + u.login, title: 'Пароль для ' + u.login, icon: 'key', width: 420, height: 260, resizable: false, class: 'win-dialog',
    render(w) {
      const f = h('form', { class: 'adm-form' },
        h('label', {}, 'Новый пароль', h('div', { class: 'adm-row' }, h('input', { name: 'pw', required: true, minlength: 8, autocomplete: 'new-password', value: genPassword() }), h('button', { class: 'btn', type: 'button', onclick: () => { f.pw.value = genPassword(); } }, '↻'))),
        h('p', { class: 'adm-hint' }, 'Все текущие сеансы пользователя будут завершены.'),
        h('div', { class: 'dlg-btns' }, h('button', { class: 'btn', type: 'button', onclick: () => close(w) }, 'Отмена'), h('button', { class: 'btn btn-default', type: 'submit' }, 'Сохранить')));
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const pw = f.pw.value;
        busy(f.querySelector('[type=submit]'), async () => {
          await vault.api('/api/admin/users/' + u.login, { method: 'PATCH', body: { password: pw } });
          close(w);
          await credentials('Пароль изменён', u.login, pw);
          redraw();
        });
      });
      w.body.append(f);
    },
  });
}

// Показывает логин и пароль один раз, чтобы их можно было скопировать и передать клиенту.
function credentials(title, login, password) {
  const text = `Сайт: ${location.origin}${location.pathname}\nЛогин: ${login}\nПароль: ${password}`;
  return new Promise((res) => openWindow({
    id: 'adm-cred', title, icon: 'key', width: 440, height: 280, resizable: false, class: 'win-dialog',
    render(w) {
      const pre = h('pre', { class: 'adm-cred' }, text);
      w.body.append(h('div', { class: 'adm-form' }, h('p', {}, 'Передайте эти данные клиенту. Пароль больше нигде не показывается.'), pre,
        h('div', { class: 'dlg-btns' },
          h('button', { class: 'btn', onclick: (e) => { navigator.clipboard?.writeText(text).then(() => { e.target.textContent = 'Скопировано'; }).catch(() => {}); } }, 'Копировать'),
          h('button', { class: 'btn btn-default', onclick: () => close(w) }, 'Готово'))));
      return () => res();
    },
  }));
}
