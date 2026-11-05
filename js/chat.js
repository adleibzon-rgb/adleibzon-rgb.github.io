// «Ассистент»: ИИ-чат для клиентов клуба. Отвечает о проектах и устанавливает их на сервер клиента.
// Пароль сервера вводится в отдельной форме и хранится только в памяти сервера на время сессии.
import { h, state, bus, sound } from './state.js';
import { icon } from './icons.js';
import { openWindow, dialog } from './wm.js';
import * as vault from './vault.js';
import { openLogin } from './apps.js';

const T = () => (document.body.classList.contains('mac') ? 'mac' : 'xp');
const md = (text) => {
  try { return window.DOMPurify.sanitize(window.marked.parse(text, { gfm: true, breaks: true })); }
  catch { return h('div', {}, text).innerHTML; }
};

const EXAMPLES = [
  'Какие у вас есть проекты для VPN?',
  'Чем amnezia_web отличается от amnezia_web-pro?',
  'Установи мне WARP Web UI на сервер',
];
const KEY_STORE = 'pca.byok'; // ключ клиента в этом браузере — только если он сам попросил запомнить
const AD_URL = 'https://zveno.ai/';
const readKey = () => { try { return JSON.parse(localStorage.getItem(KEY_STORE) || 'null'); } catch { return null; } };
const saveKey = (v) => { try { if (v) localStorage.setItem(KEY_STORE, JSON.stringify(v)); else localStorage.removeItem(KEY_STORE); } catch { /* */ } };

// Инструкция для клиентов: docs/CLIENT_GUIDE.md, показывается в отдельном окне.
export function openGuide() {
  return openWindow({
    id: 'as-guide', title: 'Инструкция: ассистент PCA', icon: 'info', width: 760, height: 620,
    render(w) {
      w.body.innerHTML = '<div class="loading"><span class="spin"></span> Загружаю инструкцию…</div>';
      fetch('docs/CLIENT_GUIDE.md', { cache: 'no-cache' }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
        .then((t) => { w.body.innerHTML = ''; w.body.append(h('div', { class: 'as-guide md', html: md(t) })); w.body.querySelectorAll('a[href^="http"]').forEach((a) => { a.target = '_blank'; a.rel = 'noopener'; }); })
        .catch(() => { w.body.innerHTML = ''; w.body.append(h('p', { class: 'empty' }, 'Не удалось загрузить инструкцию. Проверьте подключение к интернету.')); });
    },
  });
}

export function openChat() {
  if (!vault.apiMode()) return dialog({ title: 'Ассистент', text: 'Ассистент работает, когда сайт подключён к серверу PCA API.', iconName: 'info' });
  if (!vault.unlocked()) return openLogin(() => openChat());
  return openWindow({
    id: 'chat', title: 'Ассистент PCA', icon: 'assistant', width: 1000, height: 660, status: true,
    render(w) {
      let chatId = null;
      let target = null;
      let mode = 'confirm';
      let busy = false;
      let ctrl = null;
      let usage = null;
      let byok = null;      // { provider, model } — подключён ли свой ключ
      let clubAllowed = true;
      const usageBox = h('div', { class: 'as-usage', hidden: true });
      const drawUsage = () => {
        usageBox.innerHTML = '';
        if (byok) {
          usageBox.hidden = false; usageBox.classList.remove('hi');
          usageBox.append(h('small', {}, h('b', {}, 'Работает на вашем ключе'), ` · ${byok.provider}, ${byok.model}`), h('small', {}, 'Лимиты клуба не действуют, доработки разрешены.'));
          return;
        }
        if (!usage) { usageBox.hidden = true; return; }
        usageBox.hidden = false;
        if (usage.unlimited) { usageBox.append(h('small', {}, `Без лимита · всего клиенты за месяц: $${usage.totalUsd.toFixed(2)} из $${usage.totalLimitUsd}`)); return; }
        const used = usage.installs - usage.installsLeft;
        const pct = usage.installs ? Math.round(used / usage.installs * 100) : 100;
        usageBox.classList.toggle('hi', usage.installsLeft === 0);
        usageBox.append(h('small', {}, h('b', {}, `Установок осталось: ${usage.installsLeft} из ${usage.installs}`), ' в этом месяце'),
          h('i', {}, h('b', { style: { width: pct + '%' } })),
          h('small', {}, `Сообщений сегодня: осталось ${usage.msgsLeft} из ${usage.daily}`));
      };
      const loadUsage = () => vault.api('/api/chat/status').then((s) => { usage = s.usage; drawUsage(); }).catch(() => {});

      const log = h('div', { class: 'as-log', role: 'log', 'aria-live': 'polite' });
      const input = h('textarea', { class: 'as-in', rows: 2, placeholder: 'Напишите, что нужно: «установи панель WARP на мой сервер»…', 'aria-label': 'Сообщение ассистенту' });
      const sendBtn = h('button', { class: 'btn btn-default as-send', onclick: () => send() }, 'Отправить');
      const stopBtn = h('button', { class: 'btn as-stop', hidden: true, onclick: () => ctrl?.abort() }, 'Стоп');
      const side = h('aside', { class: 'as-side' });
      w.body.append(h('div', { class: 'as' }, side, h('div', { class: 'as-main' }, log, h('div', { class: 'as-bar' }, input, h('div', { class: 'as-btns' }, sendBtn, stopBtn)))));
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
      const status = (t) => { w.status.textContent = t; };
      const scroll = () => { log.scrollTop = log.scrollHeight; };

      // ---------- левая панель ----------
      const drawSide = () => {
        side.innerHTML = '';
        side.append(h('h4', {}, 'Сервер'));
        if (target) {
          side.append(h('div', { class: 'as-card as-ok' },
            h('b', {}, `${target.user}@${target.host}${target.port !== 22 ? ':' + target.port : ''}`),
            h('small', {}, target.info || 'подключён'),
            h('button', { class: 'btn', onclick: disconnect }, 'Отключить')));
        } else {
          const f = h('form', { class: 'as-form', autocomplete: 'off' },
            h('label', {}, 'Адрес (IP или домен)', h('input', { name: 'host', required: true, placeholder: '203.0.113.10', spellcheck: 'false', autocapitalize: 'off' })),
            h('div', { class: 'as-row' },
              h('label', {}, 'Логин', h('input', { name: 'login', value: 'root', spellcheck: 'false', autocapitalize: 'off' })),
              h('label', { class: 'as-port' }, 'Порт', h('input', { name: 'port', value: '22', inputmode: 'numeric' }))),
            h('label', {}, 'Пароль', h('input', { name: 'password', type: 'password', autocomplete: 'new-password' })),
            h('details', {}, h('summary', {}, 'Вход по SSH-ключу'),
              h('label', {}, 'Закрытый ключ', h('textarea', { name: 'key', rows: 4, placeholder: '-----BEGIN OPENSSH PRIVATE KEY-----', spellcheck: 'false' })),
              h('label', {}, 'Пароль ключа (если есть)', h('input', { name: 'keyPass', type: 'password', autocomplete: 'new-password' }))),
            h('p', { class: 'as-hint' }, 'Пароль не передаётся ИИ и не сохраняется: он хранится в памяти сервера, пока открыт чат.'),
            h('button', { class: 'btn btn-default', type: 'submit' }, 'Подключить сервер'));
          f.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = f.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Подключаюсь…';
            try {
              await ensureChat();
              const d = await vault.api(`/api/chat/${chatId}/target`, { method: 'POST', body: { host: f.host.value.trim(), login: f.login.value.trim(), port: Number(f.port.value) || 22, password: f.password.value || undefined, key: f.key.value.trim() || undefined, keyPass: f.keyPass.value || undefined } });
              target = d.target; sound('ding');
              note(`Сервер подключён: ${target.user}@${target.host} · ${target.info}`);
              drawSide();
            } catch (ex) { dialog({ title: 'Подключение', text: ex.message, iconName: 'info' }); btn.disabled = false; btn.textContent = 'Подключить сервер'; }
          });
          side.append(f);
        }
        side.append(h('h4', {}, 'Свой ключ API'));
        if (byok) {
          side.append(h('div', { class: 'as-card as-ok' }, h('b', {}, `${byok.provider} · ${byok.model}`), h('small', {}, 'Можно дорабатывать проекты и делать на сервере всё, что нужно. Оплата — по вашему ключу.'),
            h('button', { class: 'btn', onclick: dropKey }, 'Отключить ключ')));
        } else {
          const saved = readKey();
          const kf = h('form', { class: 'as-form', autocomplete: 'off' },
            h('label', {}, 'Сервис', h('select', { name: 'provider', onchange: () => toggleCustom() },
              h('option', { value: 'zveno', selected: !saved || saved.provider === 'zveno' ? true : null }, 'zveno.ai'),
              h('option', { value: 'custom', selected: saved?.provider === 'custom' ? true : null }, 'Другой сервис ключей'),
              h('option', { value: 'anthropic', selected: saved?.provider === 'anthropic' ? true : null }, 'Anthropic напрямую'))),
            h('label', {}, 'Ключ', h('input', { name: 'key', type: 'password', autocomplete: 'off', spellcheck: 'false', placeholder: 'вставьте ключ', value: saved?.key || '' })),
            h('label', { class: 'as-custom' }, 'Адрес API сервиса', h('input', { name: 'baseURL', spellcheck: 'false', autocapitalize: 'off', placeholder: 'https://… из инструкции сервиса', value: saved?.baseURL || '' })),
            h('label', {}, 'Модель', h('input', { name: 'model', spellcheck: 'false', autocapitalize: 'off', placeholder: 'можно не заполнять', value: saved?.model || '' })),
            h('label', { class: 'as-check' }, h('input', { type: 'checkbox', name: 'remember', checked: saved ? true : null }), ' Запомнить в этом браузере'),
            h('button', { class: 'btn btn-default', type: 'submit' }, 'Подключить ключ'),
            h('p', { class: 'as-hint as-ad' }, 'Нет ключа? Возьмите на ', h('a', { href: AD_URL, target: '_blank', rel: 'noopener' }, 'zveno.ai'), ' — ключ к любой модели за пару минут. ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); openGuide(); } }, 'Как подключить')));
          const toggleCustom = () => {
            kf.querySelector('.as-custom').hidden = kf.provider.value !== 'custom';
            kf.model.placeholder = kf.provider.value === 'anthropic' ? 'claude-sonnet-5-5' : 'можно не заполнять — выберу сам';
          };
          toggleCustom();
          kf.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = kf.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Проверяю ключ…';
            const v = { provider: kf.provider.value, key: kf.key.value.trim(), baseURL: kf.baseURL.value.trim(), model: kf.model.value.trim() };
            try {
              await connectKey(v);
              saveKey(kf.remember.checked ? v : null);
            } catch (ex) { dialog({ title: 'Свой ключ API', text: ex.message, iconName: 'info' }); btn.disabled = false; btn.textContent = 'Подключить ключ'; }
          });
          side.append(h('details', { class: 'as-keybox', open: !clubAllowed ? true : null }, h('summary', {}, 'Подключить свой ключ'), kf));
        }
        side.append(h('h4', {}, 'Команды на сервере'),
          h('label', { class: 'as-radio' }, h('input', { type: 'radio', name: 'as-mode', checked: mode === 'confirm' ? true : null, onchange: () => setMode('confirm') }), h('span', {}, h('b', {}, 'Спрашивать'), h('small', {}, 'каждая команда — после вашего «Выполнить»'))),
          h('label', { class: 'as-radio' }, h('input', { type: 'radio', name: 'as-mode', checked: mode === 'auto' ? true : null, onchange: () => setMode('auto') }), h('span', {}, h('b', {}, 'Выполнять сразу'), h('small', {}, 'ассистент работает сам, вы видите все команды'))),
          h('div', { class: 'as-sp' }),
          usageBox,
          h('div', { class: 'as-row' }, h('button', { class: 'btn', onclick: () => openGuide() }, 'Инструкция'), h('button', { class: 'btn', onclick: () => reset() }, 'Новый чат')));
      };
      const setMode = async (m) => {
        mode = m;
        if (!chatId) return;
        try { await vault.api(`/api/chat/${chatId}/mode`, { method: 'POST', body: { mode } }); } catch (e) { status(e.message); }
      };
      const disconnect = async () => {
        try { if (chatId) await vault.api(`/api/chat/${chatId}/target`, { method: 'DELETE' }); } catch { /* */ }
        target = null; note('Сервер отключён, пароль удалён из памяти.'); drawSide();
      };
      const ensureChat = async () => {
        if (chatId) return chatId;
        chatId = (await vault.api('/api/chat', { method: 'POST' })).id;
        if (mode !== 'confirm') await setMode(mode);
        return chatId;
      };
      async function connectKey(v, quiet) {
        await ensureChat();
        const d = await vault.api(`/api/chat/${chatId}/key`, { method: 'POST', body: v });
        byok = d.byok; sound('ding');
        if (!quiet) note(`Подключён ваш ключ: ${byok.provider}, модель ${byok.model}. Лимиты клуба не действуют, доработки разрешены.`);
        drawSide(); drawUsage();
      }
      async function dropKey() {
        try { if (chatId) await vault.api(`/api/chat/${chatId}/key`, { method: 'DELETE' }); } catch { /* */ }
        byok = null; saveKey(null);
        note('Ваш ключ отключён и удалён из памяти. Дальше — ассистент клуба: только установка и проверка.');
        drawSide(); drawUsage();
      }
      const reset = () => {
        ctrl?.abort();
        chatId = null; target = null; byok = null; busy = false;
        log.innerHTML = '';
        welcome(); drawSide(); setBusy(false);
      };

      // ---------- лента ----------
      const note = (t) => { log.append(h('div', { class: 'as-note' }, t)); scroll(); };
      const bubble = (who, text) => {
        const b = h('div', { class: 'as-msg as-' + who }, h('div', { class: 'as-who' }, who === 'me' ? state.user : 'PCA'), h('div', { class: 'as-text md' }));
        if (text) b.querySelector('.as-text').textContent = text;
        log.append(b); scroll();
        return b;
      };
      const welcome = () => {
        log.append(h('div', { class: 'as-welcome' },
          h('div', { html: icon('assistant', T(), 56) }),
          h('h3', {}, 'Здравствуйте! Я PCA.'),
          h('p', {}, 'Подскажу, какой проект подойдёт, установлю его на ваш сервер и проверю, что всё работает. Подключите сервер слева — и просто напишите, что нужно.'),
          h('p', { class: 'as-small' }, 'Ассистент клуба только устанавливает и чинит. Чтобы дорабатывать проект под себя (внешний вид, функции), подключите свой ключ API. ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); openGuide(); } }, 'Инструкция')),
          h('div', { class: 'as-ex' }, EXAMPLES.map((x) => h('button', { class: 'btn', onclick: () => { input.value = x; send(); } }, x)))));
      };
      const setBusy = (b) => {
        busy = b; sendBtn.disabled = b; stopBtn.hidden = !b; input.disabled = b;
        if (!b) setTimeout(() => input.focus(), 30);
      };

      // Отрисовка событий потока
      let cur = null, curText = '', tools = {};
      const flushText = () => { if (cur) cur.querySelector('.as-text').innerHTML = md(curText); };
      let raf = 0;
      const onEvent = (ev) => {
        if (ev.type === 'text') {
          if (!cur) { cur = bubble('ai'); curText = ''; }
          curText += ev.t;
          if (!raf) raf = requestAnimationFrame(() => { raf = 0; flushText(); scroll(); });
        } else if (ev.type === 'turn_end') {
          flushText(); cur = null;
        } else if (ev.type === 'tool_start') {
          const out = h('pre', { class: 'as-out' });
          const st = h('span', { class: 'as-st as-run' }, 'выполняется…');
          const box = h('details', { class: 'as-tool', open: true },
            h('summary', {}, h('span', { class: 'as-purpose' }, ev.purpose || 'Команда'), st),
            h('code', { class: 'as-cmd' }, '$ ' + ev.command), out);
          tools[ev.id] = { box, out, st };
          log.append(box); scroll();
          status('Выполняю команду на сервере…');
        } else if (ev.type === 'tool_output') {
          const t = tools[ev.id]; if (!t) return;
          t.out.textContent += ev.chunk;
          if (t.out.textContent.length > 60000) t.out.textContent = '…' + t.out.textContent.slice(-50000);
          t.out.scrollTop = t.out.scrollHeight; scroll();
        } else if (ev.type === 'tool_end') {
          const t = tools[ev.id]; if (!t) return;
          t.st.className = 'as-st ' + (ev.code === 0 ? 'as-okc' : 'as-err');
          t.st.textContent = ev.code === 0 ? 'готово' : `ошибка (код ${ev.code})`;
          if (ev.code === 0 && t.out.textContent.length > 600) t.box.open = false;
        } else if (ev.type === 'tool_declined') {
          note('Команда отклонена: ' + ev.command);
        } else if (ev.type === 'install') {
          note(`Начата установка «${ev.name}». Осталось установок в этом месяце: ${ev.left} из ${ev.limit}.`);
        } else if (ev.type === 'install_done') {
          note(ev.ok ? `Установка «${ev.name}» завершена и проверена.` : `Установку «${ev.name}» довести не удалось — она возвращена в ваш лимит.`);
        } else if (ev.type === 'approval') {
          approval(ev.commands);
        } else if (ev.type === 'error') {
          note('⚠ ' + ev.message); sound('error');
        }
      };
      const approval = (cmds) => {
        const card = h('div', { class: 'as-approve' },
          h('b', {}, cmds.length > 1 ? `Ассистент хочет выполнить ${cmds.length} команды:` : 'Ассистент хочет выполнить команду:'),
          cmds.map((c) => h('div', { class: 'as-ap-item' }, h('span', {}, c.purpose), h('code', {}, '$ ' + c.command))),
          h('div', { class: 'dlg-btns' },
            h('button', { class: 'btn', onclick: () => decide(card, false) }, 'Отклонить'),
            h('button', { class: 'btn', onclick: () => decide(card, true, true) }, 'Выполнять без вопросов'),
            h('button', { class: 'btn btn-default', onclick: () => decide(card, true) }, 'Выполнить')));
        log.append(card); scroll(); sound('ding');
        status('Ждёт вашего подтверждения');
      };
      const decide = (card, approve, always) => {
        card.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        card.classList.add('as-decided');
        if (always) { mode = 'auto'; drawSide(); }
        run(`/api/chat/${chatId}/approve`, { approve, always: !!always });
      };
      const run = async (path, body) => {
        setBusy(true); status('Ассистент думает…');
        ctrl = new AbortController();
        let state = null;
        try {
          await vault.apiStream(path, body, (ev) => { if (ev.type === 'done') state = ev.state; onEvent(ev); }, ctrl.signal);
        } catch (e) {
          if (e.name !== 'AbortError') { note('⚠ ' + e.message); sound('error'); }
          else note('Остановлено.');
        } finally {
          flushText(); cur = null; ctrl = null; setBusy(state === 'awaiting'); loadUsage();
          if (state === 'awaiting') { sendBtn.disabled = true; input.disabled = true; stopBtn.hidden = true; }
          else status(target ? `Сервер: ${target.user}@${target.host}` : 'Сервер не подключён');
        }
      };
      async function send() {
        const text = input.value.trim();
        if (!text || busy) return;
        try { await ensureChat(); } catch (e) { note('⚠ ' + e.message); return; }
        log.querySelector('.as-welcome')?.remove();
        input.value = '';
        bubble('me', text);
        run(`/api/chat/${chatId}/message`, { text });
      }

      // проверка доступности
      vault.api('/api/chat/status').then((s) => {
        usage = s.usage; drawUsage();
        clubAllowed = s.allowed && s.enabled;
        if (!clubAllowed) { note(s.allowed ? 'Ассистент клуба ещё не настроен. Можно работать со своим ключом API — блок «Свой ключ API» слева.' : 'Ассистент клуба для вашей учётной записи не включён. Можно работать со своим ключом API — блок «Свой ключ API» слева.'); drawSide(); }
        const saved = readKey();
        if (saved?.key) connectKey(saved, true).catch((e) => note('Сохранённый ключ не подошёл: ' + e.message));
      }).catch(() => {});
      welcome(); drawSide(); setBusy(false);
      status('Сервер не подключён');
      const off = bus.on('auth', () => { if (!vault.unlocked()) w.el.querySelector('.wb-close')?.click(); });
      return () => { off(); ctrl?.abort(); if (chatId && target) vault.api(`/api/chat/${chatId}/target`, { method: 'DELETE' }).catch(() => {}); };
    },
  });
}
