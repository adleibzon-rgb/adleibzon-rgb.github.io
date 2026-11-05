// Доступ к проектам. Два режима:
//  • API (задан адрес сервера в <meta name="pca-api">): гость видит открытые проекты,
//    пользователь — открытые и закрытые, администратор управляет всем. Проверку делает сервер.
//  • Статический (без сервера): все проекты зашифрованы, ключ — логин и пароль владельца.
import { state, bus, store } from './state.js';

// ---------- адрес API ----------
function apiBase() {
  try {
    const q = new URLSearchParams(location.search).get('api');
    if (q != null) store.set('api', q);
  } catch { /* */ }
  const v = store.get('api', null) ?? document.querySelector('meta[name="pca-api"]')?.content ?? '';
  return String(v).trim().replace(/\/+$/, '');
}
export const API = apiBase();
export const apiMode = () => !!API;

let key = null;      // статический режим: ключ AES
let token = null;    // режим API: токен сессии
const cache = new Map();
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function ss() { try { return sessionStorage; } catch { return null; } }
function ls() { try { return localStorage; } catch { return null; } }

// ---------- API ----------
// Потоковый запрос (SSE) к API: onEvent получает каждое событие.
export async function apiStream(path, body, onEvent, signal) {
  let r;
  try {
    r = await fetch(API + path, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body || {}) });
  } catch (e) { if (e.name === 'AbortError') throw e; throw new Error('Сервер недоступен. Проверьте подключение к интернету.'); }
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || `Ошибка сервера (${r.status})`); }
  const rd = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await rd.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
      const line = chunk.split('\n').find((l) => l.startsWith('data: '));
      if (line) { try { onEvent(JSON.parse(line.slice(6))); } catch (e) { console.error(e); } }
    }
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  let r;
  try {
    r = await fetch(API + path, {
      method,
      headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Сервер недоступен. Проверьте подключение к интернету.');
  }
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && token && path !== '/api/login') { dropToken(); }
  if (!r.ok) { const e = new Error(data.error || `Ошибка сервера (${r.status})`); e.status = r.status; throw e; }
  return data;
}
// Раз в 5 минут перепроверяем доступ: если подписка закончилась, сервер вернёт гостя и уведомление.
setInterval(() => { if (API && token && document.visibilityState !== 'hidden') refresh().catch(() => {}); }, 5 * 60000);

function keepToken(t, remember) {
  token = t;
  try { (remember ? ls() : ss())?.setItem('jd.t', t); } catch { /* */ }
}
function dropToken() {
  token = null;
  try { ls()?.removeItem('jd.t'); ss()?.removeItem('jd.t'); } catch { /* */ }
}

async function loadProjects() {
  const d = await api('/api/projects');
  if (token && !d.user) dropToken(); // сеанс истёк, пароль сменили или подписка закончилась
  if (d.notice) setTimeout(() => bus.emit('notice', d.notice), 0);
  state.login = d.user?.login || 'guest';
  state.user = d.user?.name || d.user?.login || 'guest';
  state.role = d.user?.role || 'guest';
  state.manifest = { owner: d.owner, repos: d.repos.map((r) => ({ id: r.id, name: r.name, visibility: r.visibility })) };
  state.index = { owner: d.owner, repos: d.repos.filter((r) => !r.locked) };
  cache.clear();
  return state.manifest;
}

// ---------- общий интерфейс ----------
export async function loadManifest() {
  if (state.manifest) return state.manifest;
  if (API) {
    try { token = ls()?.getItem('jd.t') || ss()?.getItem('jd.t') || null; } catch { /* */ }
    return loadProjects();
  }
  const r = await fetch('data/manifest.json', { cache: 'no-cache' });
  state.manifest = await r.json();
  return state.manifest;
}

// Перечитать список (после изменений в админке).
export async function refresh() {
  if (!API) return;
  await loadProjects();
  bus.emit('projects');
}

async function open(k, text) {
  const bytes = b64(text.trim());
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, k, bytes.slice(12));
  const stream = new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}

async function derive(login, password, extractable = false) {
  const m = await loadManifest();
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(`${login}:${password}`), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: m.kdf.hash, salt: b64(m.kdf.salt), iterations: m.kdf.iterations },
    base, { name: 'AES-GCM', length: 256 }, extractable, ['decrypt'],
  );
}

async function unlockWith(k, login) {
  const r = await fetch('data/index.txt');
  const idx = await open(k, await r.text()); // бросает исключение при неверном пароле
  key = k;
  for (const x of idx.repos) x.visibility ||= 'private';
  state.index = idx;
  state.user = login;
  state.role = 'user';
  bus.emit('auth', login);
  return idx;
}

// Настройки сервера: есть ли вход через Telegram.
export async function serverConfig() {
  if (!API) return {};
  if (state.config) return state.config;
  try { state.config = await api('/api/config'); } catch { state.config = {}; }
  return state.config;
}

// Вход через Telegram: data — объект, который вернул виджет Telegram.
export async function loginTelegram(data) {
  const d = await api('/api/login/telegram', { method: 'POST', body: data });
  keepToken(d.token, true);
  await loadProjects();
  bus.emit('auth', state.user);
}

export async function login(login, password, remember) {
  const l = String(login || '').trim();
  if (API) {
    const d = await api('/api/login', { method: 'POST', body: { login: l, password } });
    keepToken(d.token, remember);
    await loadProjects();
    bus.emit('auth', state.user);
    return;
  }
  const k = await derive(l, password, remember);
  try {
    await unlockWith(k, l);
  } catch {
    throw new Error('Неверное имя пользователя или пароль. Проверьте раскладку и Caps Lock.');
  }
  if (remember) {
    try {
      const raw = await crypto.subtle.exportKey('raw', k);
      sessionStorage.setItem('jd.k', btoa(String.fromCharCode(...new Uint8Array(raw))) + '|' + l);
    } catch { /* не страшно */ }
  }
}

export async function restoreSession() {
  if (API) return !!token && state.user !== 'guest';
  try {
    const s = sessionStorage.getItem('jd.k');
    if (!s) return false;
    const [raw, who] = s.split('|');
    const k = await crypto.subtle.importKey('raw', b64(raw), 'AES-GCM', false, ['decrypt']);
    await unlockWith(k, who);
    return true;
  } catch { return false; }
}

export function logout() {
  key = null; cache.clear();
  if (API) {
    if (token) api('/api/logout', { method: 'POST' }).catch(() => {});
    dropToken();
    state.user = 'guest'; state.role = 'guest';
    loadProjects().catch(() => {}).finally(() => { bus.emit('auth', 'guest'); bus.emit('projects'); });
    return;
  }
  state.index = null; state.user = 'guest'; state.role = 'guest';
  try { sessionStorage.removeItem('jd.k'); } catch { /* */ }
  bus.emit('auth', 'guest');
}

// Вошёл ли пользователь (клиент или администратор).
export const unlocked = () => (API ? !!token && state.role !== 'guest' && !!state.role : !!key);
export const isAdmin = () => API && state.role === 'admin';
export const roleLabel = () => (state.role === 'admin' ? 'администратор' : unlocked() ? 'клиент' : 'гость');

export const repoMeta = (id) => state.index?.repos.find((r) => r.id === id);
export const canOpen = (id) => !!repoMeta(id);
// Все проекты: доступные — с описанием, остальные — только имя и замок.
export function listRepos() {
  return (state.manifest?.repos || []).map((r) => repoMeta(r.id) || { ...r, locked: true });
}
export const openRepos = () => state.index?.repos || [];

export async function loadRepo(id) {
  if (!canOpen(id)) throw new Error('locked');
  if (cache.has(id)) return cache.get(id);
  const p = API ? api('/api/projects/' + encodeURIComponent(id)) : fetch(`data/r/${id}.txt`).then((r) => r.text()).then((b) => open(key, b));
  cache.set(id, p);
  try { return await p; } catch (e) { cache.delete(id); throw e; }
}
