// Собственный набор иконок (SVG). Градиенты лежат в одном общем <defs>,
// чтобы иконки можно было вставлять сколько угодно раз.
const DEFS = `
<linearGradient id="g-fold-xp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a6"/><stop offset="1" stop-color="#e8b33c"/></linearGradient>
<linearGradient id="g-fold-xp-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c95a"/><stop offset="1" stop-color="#c98b1a"/></linearGradient>
<linearGradient id="g-fold-mac" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8d4fb"/><stop offset="1" stop-color="#4f97e0"/></linearGradient>
<linearGradient id="g-fold-mac-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cb7ef"/><stop offset="1" stop-color="#3b7cc7"/></linearGradient>
<linearGradient id="g-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fb4ff"/><stop offset="1" stop-color="#1f57c9"/></linearGradient>
<linearGradient id="g-green" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9be36b"/><stop offset="1" stop-color="#2f8f1f"/></linearGradient>
<linearGradient id="g-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a8a"/><stop offset="1" stop-color="#c62a1c"/></linearGradient>
<linearGradient id="g-orange" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#e07a10"/></linearGradient>
<linearGradient id="g-purple" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4a5ff"/><stop offset="1" stop-color="#6b2fc4"/></linearGradient>
<linearGradient id="g-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f9"/><stop offset="1" stop-color="#9aa3af"/></linearGradient>
<linearGradient id="g-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5260"/><stop offset="1" stop-color="#14171c"/></linearGradient>
<linearGradient id="g-paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe5ee"/></linearGradient>
<linearGradient id="g-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1a8"/><stop offset="1" stop-color="#d49b12"/></linearGradient>
<linearGradient id="g-screen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5ad1ff"/><stop offset=".55" stop-color="#2a6fe0"/><stop offset="1" stop-color="#58c35a"/></linearGradient>
<radialGradient id="g-globe" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#bff0ff"/><stop offset=".5" stop-color="#3aa0ee"/><stop offset="1" stop-color="#0d4ea8"/></radialGradient>
<linearGradient id="g-gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
`;

export function installIconDefs() {
  if (document.getElementById('icon-defs')) return;
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.id = 'icon-defs';
  s.setAttribute('width', '0'); s.setAttribute('height', '0');
  s.style.position = 'absolute';
  s.innerHTML = `<defs>${DEFS}</defs>`;
  document.body.prepend(s);
}

const gloss = '<path d="M8 8h32a4 4 0 0 1 4 4v6c-10 4-30 4-40 0v-6a4 4 0 0 1 4-4z" fill="url(#g-gloss)" opacity=".55"/>';

function folder(theme, extra = '') {
  const a = theme === 'mac' ? 'g-fold-mac' : 'g-fold-xp';
  const b = theme === 'mac' ? 'g-fold-mac-b' : 'g-fold-xp-b';
  return `<path d="M4 12a3 3 0 0 1 3-3h11l4 4h19a3 3 0 0 1 3 3v3H4z" fill="url(#${b})"/>
  <path d="M4 17h40v21a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="url(#${a})" stroke="rgba(0,0,0,.18)"/>
  <path d="M5 18h38v4c-12 3-26 3-38 0z" fill="#fff" opacity=".35"/>${extra}`;
}

const SHAPES = {
  folder: (t) => folder(t),
  folderLocked: (t) => folder(t, `<rect x="27" y="27" width="14" height="11" rx="2" fill="url(#g-gold)" stroke="#8a6200"/>
    <path d="M30 27v-3a4 4 0 0 1 8 0v3" fill="none" stroke="#8a6200" stroke-width="2.2"/><circle cx="34" cy="32" r="1.6" fill="#6b4a00"/>`),
  folderGames: (t) => folder(t, `<rect x="16" y="24" width="18" height="11" rx="5" fill="url(#g-dark)"/><circle cx="21" cy="29.5" r="1.8" fill="#fff"/>
    <circle cx="29" cy="28" r="1.5" fill="#ff5c5c"/><circle cx="31" cy="31" r="1.5" fill="#5cd65c"/>`),
  folderDocs: (t) => folder(t, `<rect x="16" y="22" width="16" height="15" rx="1.5" fill="#fff" stroke="rgba(0,0,0,.25)" transform="rotate(-6 24 30)"/><path d="M19 27h10M19 30.5h10M19 34h6" stroke="#5b8fd9" stroke-width="1.8" transform="rotate(-6 24 30)"/>`),
  album: () => `<rect x="7" y="8" width="30" height="24" rx="2" fill="url(#g-paper)" stroke="#7d8591" transform="rotate(-8 22 20)"/><rect x="11" y="14" width="30" height="24" rx="2" fill="#fff" stroke="#7d8591"/><rect x="14" y="17" width="24" height="15" fill="#8fd0ff"/><path d="M14 32l7-8 5 5 4-3 8 6z" fill="#58c35a"/><circle cx="33" cy="21" r="2.4" fill="#ffe14a"/>`,
  chart: () => `<rect x="5" y="5" width="38" height="38" rx="4" fill="url(#g-paper)" stroke="#7d8591"/><rect x="11" y="26" width="6" height="12" fill="url(#g-blue)"/><rect x="21" y="16" width="6" height="22" fill="url(#g-green)"/><rect x="31" y="21" width="6" height="17" fill="url(#g-orange)"/>`,
  map: () => `<circle cx="24" cy="24" r="19" fill="url(#g-paper)" stroke="#7d8591"/><path d="M24 24L12 14M24 24l14-6M24 24l-2 15M24 24l13 9" stroke="#7d8591" stroke-width="1.6"/><circle cx="24" cy="24" r="5" fill="url(#g-purple)"/><circle cx="12" cy="14" r="3.5" fill="url(#g-blue)"/><circle cx="38" cy="18" r="3.5" fill="url(#g-green)"/><circle cx="22" cy="39" r="3.5" fill="url(#g-orange)"/><circle cx="37" cy="33" r="3.5" fill="url(#g-red)"/>`,
  table: () => `<rect x="5" y="8" width="38" height="32" rx="3" fill="url(#g-paper)" stroke="#7d8591"/><rect x="5" y="8" width="38" height="7" rx="3" fill="#5b8fd9"/><path d="M5 22h38M5 29h38M5 35h38M18 15v25M31 15v25" stroke="#b7c2d0" stroke-width="1.4"/>`,
  assistant: () => `<rect x="5" y="7" width="38" height="28" rx="9" fill="url(#g-purple)" stroke="#4b1f94"/><path d="M14 35l-3 8 10-8z" fill="#6b2fc4"/><circle cx="17" cy="21" r="3.2" fill="#fff"/><circle cx="31" cy="21" r="3.2" fill="#fff"/><path d="M18 28c3.5 2.5 8.5 2.5 12 0" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M24 7V3" stroke="#4b1f94" stroke-width="2.4"/><circle cx="24" cy="3" r="2" fill="#ffe14a"/>`,
  shield: () => `<path d="M24 4l16 6v12c0 10-7 18-16 22C15 40 8 32 8 22V10z" fill="url(#g-blue)" stroke="#123f99"/><path d="M24 8l12 4.5V22c0 7.5-5 14-12 17z" fill="#fff" opacity=".25"/><path d="M17 24l5 5 9-10" stroke="#fff" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  folderCode: (t) => folder(t,`<path d="M19 26l-4 4 4 4M29 26l4 4-4 4M26 24l-4 12" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  computer: () => `<rect x="5" y="6" width="38" height="27" rx="3" fill="url(#g-steel)" stroke="#6b7480"/>
    <rect x="8" y="9" width="32" height="20" rx="1" fill="url(#g-screen)"/><path d="M8 9h32v7c-10 3-22 3-32 0z" fill="#fff" opacity=".3"/>
    <path d="M18 33h12l2 6H16z" fill="#aab2bd"/><rect x="11" y="39" width="26" height="4" rx="2" fill="url(#g-steel)" stroke="#6b7480"/>`,
  trash: (t) => t === 'mac'
    ? `<path d="M11 13h26l-3 29H14z" fill="url(#g-steel)" stroke="#7c8693"/><ellipse cx="24" cy="13" rx="13" ry="3.5" fill="#dfe4ea" stroke="#7c8693"/>
       <path d="M17 18l1.5 20M24 18v20M31 18l-1.5 20" stroke="#8b95a1" stroke-width="1.4"/>`
    : `<path d="M12 14h24l-2.5 28h-19z" fill="url(#g-paper)" stroke="#6f8bb0"/><path d="M10 11h28v4H10z" fill="#bcd0ea" stroke="#6f8bb0"/>
       <path d="M18 18l1 20M24 18v20M30 18l-1 20" stroke="#8fa8c8" stroke-width="1.6"/><path d="M15 26c6-4 12 4 18 0" stroke="#3aa53a" stroke-width="2.4" fill="none"/>`,
  tank: () => `<rect x="7" y="30" width="34" height="10" rx="5" fill="url(#g-dark)"/><g fill="#9aa3af"><circle cx="13" cy="35" r="2.6"/><circle cx="20" cy="35" r="2.6"/><circle cx="28" cy="35" r="2.6"/><circle cx="35" cy="35" r="2.6"/></g>
    <rect x="11" y="22" width="26" height="9" rx="2" fill="url(#g-green)" stroke="#215c16"/><rect x="17" y="15" width="13" height="9" rx="3" fill="url(#g-green)" stroke="#215c16"/>
    <rect x="29" y="17.5" width="15" height="3.4" rx="1.4" fill="#2d6b21"/><circle cx="23.5" cy="19.5" r="1.8" fill="#ffe36b"/>`,
  snake: () => `<rect x="6" y="5" width="36" height="38" rx="7" fill="#2b3a2a"/><rect x="9" y="8" width="30" height="24" rx="2" fill="#a7c957"/>
    <path d="M13 26h6v-6h6v-6h8" stroke="#1f2d14" stroke-width="3.2" fill="none" stroke-linejoin="miter"/><rect x="33" y="22" width="3" height="3" fill="#1f2d14"/>
    <g fill="#6c7a6b"><circle cx="17" cy="37" r="2"/><circle cx="24" cy="37" r="2"/><circle cx="31" cy="37" r="2"/></g>`,
  mines: () => `<rect x="5" y="5" width="38" height="38" rx="3" fill="#c9ced6" stroke="#7d8591"/>
    <circle cx="24" cy="25" r="10" fill="#1b1d22"/><g stroke="#1b1d22" stroke-width="3" stroke-linecap="round"><path d="M24 10v30M9 25h30M13.5 14.5l21 21M34.5 14.5l-21 21"/></g>
    <circle cx="20.5" cy="21.5" r="3" fill="#fff"/>`,
  cards: () => `<rect x="7" y="10" width="22" height="30" rx="3" fill="url(#g-paper)" stroke="#7d8591" transform="rotate(-12 18 25)"/>
    <rect x="18" y="7" width="22" height="30" rx="3" fill="url(#g-paper)" stroke="#7d8591" transform="rotate(10 29 22)"/>
    <path d="M30 14c-3-4-8 0-4 4l4 5 4-5c4-4-1-8-4-4z" fill="#d22" transform="rotate(10 29 22)"/>`,
  chess: () => `<path d="M17 41h14l-1.5-4h-11z" fill="url(#g-dark)"/><path d="M19 37c0-8 2-12 2-15h6c0 3 2 7 2 15z" fill="url(#g-dark)"/>
    <path d="M18 22c-1-6 3-12 9-14 1 2 3 4 3 7l-4 1 3 6z" fill="url(#g-dark)"/><circle cx="23" cy="13" r="1.2" fill="#fff"/>
    <path d="M14 43h20" stroke="#14171c" stroke-width="3" stroke-linecap="round"/>`,
  puzzle: () => `<rect x="6" y="6" width="36" height="36" rx="5" fill="url(#g-steel)" stroke="#6b7480"/>
    <g font-family="PT Sans, sans-serif" font-weight="700" font-size="9" text-anchor="middle" fill="#fff">
    <rect x="9" y="9" width="14" height="14" rx="3" fill="url(#g-blue)"/><text x="16" y="19.5">1</text>
    <rect x="25" y="9" width="14" height="14" rx="3" fill="url(#g-orange)"/><text x="32" y="19.5">2</text>
    <rect x="9" y="25" width="14" height="14" rx="3" fill="url(#g-green)"/><text x="16" y="35.5">3</text></g>`,
  breakout: () => `<rect x="5" y="5" width="38" height="38" rx="6" fill="url(#g-dark)"/>
    <g><rect x="9" y="10" width="9" height="4" fill="#ff5a5a"/><rect x="19.5" y="10" width="9" height="4" fill="#ffb03a"/><rect x="30" y="10" width="9" height="4" fill="#ffe14a"/>
    <rect x="9" y="15.5" width="9" height="4" fill="#5ad65a"/><rect x="30" y="15.5" width="9" height="4" fill="#4aa8ff"/></g>
    <circle cx="25" cy="28" r="2.4" fill="#fff"/><rect x="16" y="36" width="16" height="3" rx="1.5" fill="#cfd6e0"/>`,
  blocks: () => `<g stroke="rgba(0,0,0,.25)"><rect x="8" y="30" width="10" height="10" fill="url(#g-purple)"/><rect x="18" y="30" width="10" height="10" fill="url(#g-purple)"/><rect x="28" y="30" width="10" height="10" fill="url(#g-blue)"/>
    <rect x="18" y="20" width="10" height="10" fill="url(#g-purple)"/><rect x="28" y="20" width="10" height="10" fill="url(#g-blue)"/><rect x="28" y="10" width="10" height="10" fill="url(#g-blue)"/>
    <rect x="12" y="4" width="10" height="10" fill="url(#g-orange)"/></g>`,
  terminal: (t) => `<rect x="4" y="7" width="40" height="34" rx="${t === 'mac' ? 5 : 2}" fill="#101418" stroke="#59616c"/>
    <rect x="4" y="7" width="40" height="6" rx="${t === 'mac' ? 5 : 2}" fill="${t === 'mac' ? '#c9ced6' : '#2557c8'}"/>
    <path d="M11 20l6 5-6 5" stroke="#5cf26a" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 31h10" stroke="#5cf26a" stroke-width="2.6" stroke-linecap="round"/>`,
  globe: () => `<circle cx="24" cy="24" r="18" fill="url(#g-globe)" stroke="#0b3f8a"/>
    <path d="M14 15c4 2 6 0 9 3s-2 6 2 9 6 1 6 6M28 8c-2 3 0 5 4 6s5 4 9 3" stroke="#7ee07a" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>
    <ellipse cx="18" cy="15" rx="7" ry="4" fill="#fff" opacity=".35"/>`,
  compass: () => `<circle cx="24" cy="24" r="19" fill="url(#g-steel)" stroke="#6b7480"/><circle cx="24" cy="24" r="15.5" fill="url(#g-globe)"/>
    <g stroke="#fff" stroke-width="1" opacity=".7"><path d="M24 9.5v3M24 35.5v3M9.5 24h3M35.5 24h3"/></g>
    <path d="M31 17l-9.5 5.5L17 31l9.5-5.5z" fill="#fff"/><path d="M31 17l-4.5 8.5-5-3z" fill="#e33"/>`,
  gear: () => `<g transform="translate(24 24)"><g fill="url(#g-steel)" stroke="#5b6370">
    ${Array.from({ length: 8 }, (_, i) => `<rect x="-3.5" y="-20" width="7" height="9" rx="1.5" transform="rotate(${i * 45})"/>`).join('')}
    <circle r="13.5"/></g><circle r="5.5" fill="#5b6370"/><circle r="13.5" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1"/></g>`,
  notepad: () => `<rect x="9" y="6" width="30" height="37" rx="2" fill="url(#g-paper)" stroke="#7d8591"/><rect x="9" y="6" width="30" height="6" fill="#5b8fd9"/>
    <g stroke="#9fb4d1" stroke-width="1.6"><path d="M13 18h22M13 23h22M13 28h22M13 33h15M13 38h18"/></g>`,
  readme: () => `<rect x="9" y="5" width="30" height="38" rx="2" fill="url(#g-paper)" stroke="#7d8591"/><path d="M31 5l8 8h-8z" fill="#cdd5e0"/>
    <text x="24" y="31" text-anchor="middle" font-family="PT Sans, sans-serif" font-weight="700" font-size="10" fill="#1f57c9">MD</text>`,
  code: () => `<rect x="9" y="5" width="30" height="38" rx="2" fill="url(#g-paper)" stroke="#7d8591"/><path d="M31 5l8 8h-8z" fill="#cdd5e0"/>
    <path d="M19 22l-5 5 5 5M29 22l5 5-5 5" stroke="#6b2fc4" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  file: () => `<rect x="9" y="5" width="30" height="38" rx="2" fill="url(#g-paper)" stroke="#7d8591"/><path d="M31 5l8 8h-8z" fill="#cdd5e0"/>`,
  image: () => `<rect x="5" y="9" width="38" height="30" rx="3" fill="url(#g-paper)" stroke="#7d8591"/><rect x="9" y="13" width="30" height="22" fill="#8fd0ff"/>
    <path d="M9 35l9-11 7 8 5-5 9 8z" fill="#3c9a3c"/><circle cx="32" cy="19" r="3" fill="#ffe14a"/>`,
  user: () => `<rect x="4" y="4" width="40" height="40" rx="6" fill="url(#g-orange)"/><circle cx="24" cy="19" r="8" fill="#fff" opacity=".95"/>
    <path d="M10 41c2-9 8-13 14-13s12 4 14 13z" fill="#fff" opacity=".95"/>`,
  guest: () => `<rect x="4" y="4" width="40" height="40" rx="6" fill="url(#g-blue)"/><circle cx="24" cy="19" r="8" fill="#fff" opacity=".85"/>
    <path d="M10 41c2-9 8-13 14-13s12 4 14 13z" fill="#fff" opacity=".85"/>`,
  power: () => `<circle cx="24" cy="24" r="19" fill="url(#g-red)" stroke="#8a1a10"/><path d="M17 16a11 11 0 1 0 14 0" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M24 11v13" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>`,
  restart: () => `<circle cx="24" cy="24" r="19" fill="url(#g-green)" stroke="#1f5c14"/><path d="M33 20a10 10 0 1 0 1 8" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M35 12v9h-9" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  sleep: () => `<circle cx="24" cy="24" r="19" fill="url(#g-gold)" stroke="#8a6200"/><path d="M28 13a11 11 0 1 0 8 15 9 9 0 0 1-8-15z" fill="#fff"/>`,
  logout: () => `<rect x="6" y="6" width="36" height="36" rx="5" fill="url(#g-orange)"/><path d="M20 14h-6v20h6" stroke="#fff" stroke-width="3" fill="none"/><path d="M21 24h14M30 18l6 6-6 6" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  lock: () => `<rect x="10" y="21" width="28" height="22" rx="4" fill="url(#g-gold)" stroke="#8a6200"/><path d="M16 21v-5a8 8 0 0 1 16 0v5" fill="none" stroke="#8a6200" stroke-width="3.4"/><circle cx="24" cy="31" r="3" fill="#6b4a00"/><path d="M24 33v5" stroke="#6b4a00" stroke-width="2.4"/>`,
  key: () => `<circle cx="15" cy="24" r="9" fill="url(#g-gold)" stroke="#8a6200"/><circle cx="13" cy="24" r="3" fill="#fff"/><path d="M23 24h19v5M36 24v5" stroke="#8a6200" stroke-width="4" fill="none"/>`,
  swap: () => `<circle cx="24" cy="24" r="19" fill="url(#g-purple)"/><path d="M14 19h18l-5-5M34 29H16l5 5" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  info: () => `<circle cx="24" cy="24" r="19" fill="url(#g-blue)" stroke="#123f99"/><circle cx="24" cy="15" r="2.6" fill="#fff"/><path d="M24 21v14" stroke="#fff" stroke-width="4.2" stroke-linecap="round"/>`,
  search: () => `<circle cx="20" cy="20" r="11" fill="#e8f3ff" stroke="#3b5f8f" stroke-width="3.5"/><path d="M28 28l11 11" stroke="#3b5f8f" stroke-width="5" stroke-linecap="round"/>`,
  github: () => `<circle cx="24" cy="24" r="19" fill="url(#g-dark)"/><path d="M24 12c-6.6 0-12 5.4-12 12 0 5.3 3.4 9.8 8.2 11.4.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 36 24c0-6.6-5.4-12-12-12z" fill="#fff"/>`,
  star: () => `<path d="M24 5l5.6 12 13 1.6-9.6 9 2.5 13L24 34.3 12.5 40.6l2.5-13-9.6-9 13-1.6z" fill="url(#g-gold)" stroke="#8a6200"/>`,
  phone: () => `<rect x="13" y="3" width="22" height="42" rx="6" fill="url(#g-dark)"/><rect x="16" y="8" width="16" height="14" rx="1" fill="#a7c957"/>
    <g fill="#9aa3af">${[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => `<rect x="${16.5 + c * 5.5}" y="${26 + r * 4.5}" width="4" height="3" rx="1"/>`).join('')).join('')}</g>`,
  logo: (t) => t === 'mac'
    ? `<path d="M24 4l17 10v20L24 44 7 34V14z" fill="url(#g-steel)" stroke="#6b7480"/><path d="M24 4l17 10-17 10L7 14z" fill="#fff" opacity=".55"/><text x="24" y="33" font-family="PT Sans, sans-serif" font-weight="700" font-size="15" text-anchor="middle" fill="#2c3440">P</text>`
    : `<circle cx="24" cy="24" r="19" fill="url(#g-green)" stroke="#1f5c14"/><path d="M8 27c8-6 22-8 33-3" stroke="#ffe14a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
       <text x="24" y="33" font-family="PT Sans, sans-serif" font-weight="700" font-style="italic" font-size="20" text-anchor="middle" fill="#fff">P</text><ellipse cx="20" cy="14" rx="10" ry="5" fill="#fff" opacity=".35"/>`,
};

export function icon(name, theme = 'xp', size = 48) {
  const draw = SHAPES[name] || SHAPES.file;
  return `<svg class="ico" viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">${draw(theme)}</svg>`;
}

export function fileIcon(path) {
  const p = path.toLowerCase();
  if (/readme|\.md$/.test(p)) return 'readme';
  if (/\.(png|jpe?g|gif|webp|svg|ico)$/.test(p)) return 'image';
  if (/\.(py|js|mjs|ts|sh|ps1|bat|go|kt|java|swift|c|h|cpp|rs|html|css|vue|php|rb|lua|sql)$/.test(p)) return 'code';
  if (/\.(txt|json|ya?ml|toml|conf|service|cfg|ini|env\.example|example)$/.test(p) || !/\./.test(p.split('/').pop())) return 'notepad';
  return 'file';
}

export { gloss };
