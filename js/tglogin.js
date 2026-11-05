// Кнопка «Войти через Telegram» (официальный виджет Telegram).
// Пускает только подписчиков: сервер проверяет, что человек состоит в закрытой группе.
import { h } from './state.js';
import * as vault from './vault.js';

let seq = 0;
// container — куда вставить кнопку; onDone(err) вызывается после попытки входа.
export async function telegramButton(container, onDone, { size = 'large' } = {}) {
  const cfg = await vault.serverConfig();
  if (!cfg.telegram?.bot) return false;
  const cb = '__pcaTg' + (++seq);
  window[cb] = async (user) => {
    try { await vault.loginTelegram(user); onDone?.(null); } catch (e) { onDone?.(e); }
  };
  const box = h('div', { class: 'tg-login' });
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://telegram.org/js/telegram-widget.js?22';
  s.setAttribute('data-telegram-login', cfg.telegram.bot);
  s.setAttribute('data-size', size);
  s.setAttribute('data-radius', '8');
  s.setAttribute('data-lang', 'ru');
  s.setAttribute('data-request-access', 'write');
  s.setAttribute('data-onauth', `${cb}(user)`);
  box.append(s);
  container.append(box);
  return true;
}
