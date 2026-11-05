// 3D-сцена выбора стиля и 3D-хранитель экрана (three.js).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { h, reducedMotion, sound, state } from './state.js';

function screenTexture(kind) {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 480;
  const x = c.getContext('2d');
  if (kind === 'xp') {
    const sky = x.createLinearGradient(0, 0, 0, 300); sky.addColorStop(0, '#2d6fe0'); sky.addColorStop(1, '#a8d8ff');
    x.fillStyle = sky; x.fillRect(0, 0, 640, 480);
    x.fillStyle = 'rgba(255,255,255,.75)';
    [[120, 90, 60], [420, 70, 80], [540, 140, 40]].forEach(([cx, cy, r]) => { x.beginPath(); x.ellipse(cx, cy, r * 1.6, r * .5, 0, 0, 7); x.fill(); });
    const hill = (y0, c1, c2, a, b) => { const g = x.createLinearGradient(0, y0, 0, 480); g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.beginPath(); x.moveTo(0, y0); x.bezierCurveTo(200, y0 - a, 440, y0 - b, 640, y0 + 10); x.lineTo(640, 480); x.lineTo(0, 480); x.fill(); };
    hill(300, '#7cc95a', '#3f8f2c', 70, 20); hill(360, '#a6ef6e', '#2a6e1a', 90, 30);
    // окно
    x.fillStyle = '#ece9d8'; x.fillRect(150, 110, 330, 210);
    const tb = x.createLinearGradient(0, 110, 0, 136); tb.addColorStop(0, '#3d8af7'); tb.addColorStop(1, '#0a4fd4');
    x.fillStyle = tb; x.fillRect(150, 110, 330, 26);
    x.fillStyle = '#e24b26'; x.fillRect(452, 114, 20, 18);
    x.fillStyle = '#fff'; x.font = 'bold 14px Tahoma, sans-serif'; x.fillText('Мои проекты', 160, 128);
    for (let i = 0; i < 8; i++) { const px = 168 + (i % 4) * 76, py = 152 + Math.floor(i / 4) * 78; x.fillStyle = '#f6c95a'; x.fillRect(px, py + 8, 46, 34); x.fillStyle = '#e8b33c'; x.fillRect(px, py, 20, 10); }
    // панель задач
    const bar = x.createLinearGradient(0, 444, 0, 480); bar.addColorStop(0, '#3168d5'); bar.addColorStop(1, '#1941a5');
    x.fillStyle = bar; x.fillRect(0, 444, 640, 36);
    const st = x.createLinearGradient(0, 444, 0, 480); st.addColorStop(0, '#5eb95e'); st.addColorStop(1, '#2f8f2f');
    x.fillStyle = st; x.beginPath(); x.roundRect(0, 444, 120, 36, [0, 16, 16, 0]); x.fill();
    x.fillStyle = '#fff'; x.font = 'italic bold 20px Tahoma, sans-serif'; x.fillText('пуск', 30, 469);
  } else {
    const g = x.createLinearGradient(0, 0, 0, 480); g.addColorStop(0, '#05051a'); g.addColorStop(.6, '#22104a'); g.addColorStop(1, '#4a1a74');
    x.fillStyle = g; x.fillRect(0, 0, 640, 480);
    x.globalCompositeOperation = 'lighter';
    [[285, 0], [215, 1.7], [320, 3.1]].forEach(([hue, ph]) => {
      x.beginPath();
      for (let i = 0; i <= 640; i += 8) { const y = 250 + 70 * Math.sin(i / 640 * 3.2 + ph) + 20 * Math.sin(i / 70 + ph); i ? x.lineTo(i, y) : x.moveTo(i, y); }
      x.lineTo(640, 480); x.lineTo(0, 480);
      const gg = x.createLinearGradient(0, 160, 0, 480); gg.addColorStop(0, `hsla(${hue},100%,65%,0)`); gg.addColorStop(.3, `hsla(${hue},100%,62%,.45)`); gg.addColorStop(1, `hsla(${hue},100%,40%,0)`);
      x.fillStyle = gg; x.fill();
    });
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = 'rgba(240,240,245,.85)'; x.fillRect(0, 0, 640, 22);
    x.fillStyle = '#222'; x.font = 'bold 13px "Lucida Grande", sans-serif'; x.fillText('Проекты    Файл    Вид    Окно', 34, 16);
    // окно
    x.fillStyle = '#e8e8e8'; x.beginPath(); x.roundRect(140, 80, 360, 230, 6); x.fill();
    const tb = x.createLinearGradient(0, 80, 0, 104); tb.addColorStop(0, '#e9e9e9'); tb.addColorStop(1, '#b9b9b9');
    x.fillStyle = tb; x.beginPath(); x.roundRect(140, 80, 360, 24, [6, 6, 0, 0]); x.fill();
    [['#ff5f57', 156], ['#febc2e', 174], ['#28c840', 192]].forEach(([c, cx]) => { x.fillStyle = c; x.beginPath(); x.arc(cx, 92, 6, 0, 7); x.fill(); });
    for (let i = 0; i < 8; i++) { const px = 166 + (i % 4) * 80, py = 124 + Math.floor(i / 4) * 86; x.fillStyle = '#5a9fe6'; x.beginPath(); x.roundRect(px, py + 8, 50, 38, 4); x.fill(); x.fillStyle = '#7cb7ef'; x.fillRect(px, py, 22, 10); }
    // dock
    x.fillStyle = 'rgba(255,255,255,.28)'; x.beginPath(); x.moveTo(110, 470); x.lineTo(530, 470); x.lineTo(510, 440); x.lineTo(130, 440); x.fill();
    const cols = ['#4f97e0', '#ff9f2e', '#28c840', '#c13dff', '#ff5f57', '#ffd23f', '#5ac8fa'];
    cols.forEach((c, i) => { const gg = x.createLinearGradient(0, 410, 0, 452); gg.addColorStop(0, '#fff'); gg.addColorStop(.25, c); gg.addColorStop(1, c); x.fillStyle = gg; x.beginPath(); x.roundRect(150 + i * 50, 412, 40, 40, 9); x.fill(); });
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function crtMonitor() {
  const g = new THREE.Group();
  const plastic = new THREE.MeshStandardMaterial({ color: 0xe9e2cf, roughness: .55, metalness: .05 });
  const plasticDark = new THREE.MeshStandardMaterial({ color: 0xcfc6ae, roughness: .6 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.3, 1.95, .5, 6, .12), plastic);
  g.add(body);
  const back = new THREE.Mesh(new RoundedBoxGeometry(1.7, 1.45, 1.1, 6, .25), plasticDark);
  back.position.z = -.7; g.add(back);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.84, 1.38), new THREE.MeshBasicMaterial({ map: screenTexture('xp'), toneMapped: false }));
  screen.position.set(0, .1, .256); g.add(screen);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.84, 1.38), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .12, roughness: .05, metalness: 0, clearcoat: 1 }));
  glass.position.set(0, .1, .262); g.add(glass);
  const led = new THREE.Mesh(new THREE.CircleGeometry(.035, 16), new THREE.MeshBasicMaterial({ color: 0x47e07a }));
  led.position.set(.95, -.82, .256); g.add(led);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.22, .3, .3, 24), plasticDark);
  neck.position.set(0, -1.12, -.3); g.add(neck);
  const foot = new THREE.Mesh(new RoundedBoxGeometry(1.3, .12, .9, 4, .05), plastic);
  foot.position.set(0, -1.3, -.3); g.add(foot);
  g.userData.screen = screen;
  return g;
}

function flatMonitor() {
  const g = new THREE.Group();
  const alu = new THREE.MeshStandardMaterial({ color: 0xd6d9de, roughness: .28, metalness: .85 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0e, roughness: .08, metalness: .2, clearcoat: 1, clearcoatRoughness: .05 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.7, 2.05, .12, 6, .05), alu);
  g.add(body);
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(2.58, 1.62, .02, 2, .01), black);
  bezel.position.set(0, .14, .065); g.add(bezel);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshBasicMaterial({ map: screenTexture('mac'), toneMapped: false }));
  screen.position.set(0, .14, .078); g.add(screen);
  const chin = new THREE.Mesh(new THREE.CircleGeometry(.09, 32), new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: .9, roughness: .2 }));
  chin.position.set(0, -.8, .062); g.add(chin);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(.7, 1.1, .08), alu);
  stand.position.set(0, -1.1, -.35); stand.rotation.x = -.35; g.add(stand);
  const foot = new THREE.Mesh(new RoundedBoxGeometry(.8, .04, .75, 3, .02), alu);
  foot.position.set(0, -1.62, -.42); g.add(foot);
  g.userData.screen = screen;
  return g;
}

function glossyMat(hue) { return new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setHSL(hue, .85, .58), roughness: .15, metalness: .1, clearcoat: 1, clearcoatRoughness: .08 }); }

function baseScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1a0d3a, 12, 42);
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
  scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x402060, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 5, 6); scene.add(key);
  const rimA = new THREE.PointLight(0x4fa8ff, 30, 12); rimA.position.set(-4, 1.5, -1); scene.add(rimA);
  const rimB = new THREE.PointLight(0xff4fd8, 30, 12); rimB.position.set(4, 1.5, -1); scene.add(rimB);
  // пол-сетка
  const grid = new THREE.GridHelper(40, 40, 0x8a5cff, 0x5a2ca8);
  grid.position.y = -1.65; grid.material.transparent = true; grid.material.opacity = .35; scene.add(grid);
  // частицы
  const N = 600, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - .5) * 26; pos[i * 3 + 1] = Math.random() * 10 - 2; pos[i * 3 + 2] = (Math.random() - .5) * 18 - 3;
    const c = new THREE.Color().setHSL(.55 + Math.random() * .35, .9, .7); col.set([c.r, c.g, c.b], i * 3);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(pg, new THREE.PointsMaterial({ size: .05, vertexColors: true, transparent: true, opacity: .85, depthWrite: false }));
  scene.add(points);
  const resize = () => {
    const w = canvas.clientWidth, hh = canvas.clientHeight;
    renderer.setSize(w, hh, false);
    camera.aspect = w / hh; camera.updateProjectionMatrix();
  };
  return { renderer, scene, camera, points, resize };
}

// ---------- выбор стиля ----------
export function intro(stage) {
  return new Promise((resolve) => {
    const canvas = h('canvas', { class: 'intro-cv' });
    const pick = (t) => { if (!busy) choose(t); };
    const el = h('div', { class: 'intro' },
      h('div', { class: 'intro-bg' }), canvas,
      h('header', { class: 'intro-head' },
        h('p', { class: 'intro-eyebrow' }, 'github.com/adleibzon-rgb · 20 проектов'),
        h('h1', {}, 'Выберите эпоху'),
        h('p', {}, 'Один и тот же рабочий стол в двух стилях. Переключить можно в любой момент.')),
      h('div', { class: 'intro-picks' },
        h('button', { class: 'intro-pick ip-xp', onclick: () => pick('xp') }, h('b', {}, 'Luna · 2001'), h('span', {}, 'Пуск, панель задач, Танчики, Змейка, Сапёр, Косынка')),
        h('button', { class: 'intro-pick ip-mac', onclick: () => pick('mac') }, h('b', {}, 'Aqua · 2009'), h('span', {}, 'Dock, строка меню, Шахматы, Пятнашки, Арканоид, Блоки'))),
      h('p', { class: 'intro-hint' }, 'Наведите на монитор и щёлкните. Клавиши ← и → тоже работают.'));
    stage.append(el);

    let ctx;
    try { ctx = baseScene(canvas); } catch (e) { console.warn('WebGL недоступен', e); el.classList.add('no-gl'); }
    let busy = false, raf = 0;
    const mouse = new THREE.Vector2(0, 0);
    let hovered = null;
    let monitors = [];
    if (ctx) {
      const { scene, camera } = ctx;
      const crt = crtMonitor(); crt.position.set(-1.9, 0, 0); crt.rotation.y = .32; crt.userData.theme = 'xp';
      const flat = flatMonitor(); flat.position.set(1.9, .05, 0); flat.rotation.y = -.32; flat.userData.theme = 'mac';
      scene.add(crt, flat);
      monitors = [crt, flat];
      // летающие глянцевые фигуры
      const floaters = [];
      const shapes = [new THREE.IcosahedronGeometry(.32, 0), new THREE.TorusGeometry(.28, .1, 16, 40), new RoundedBoxGeometry(.45, .45, .45, 4, .1), new THREE.OctahedronGeometry(.3), new THREE.SphereGeometry(.24, 32, 16)];
      for (let i = 0; i < 14; i++) {
        const m = new THREE.Mesh(shapes[i % shapes.length], glossyMat(Math.random()));
        const ang = i / 14 * Math.PI * 2;
        m.position.set(Math.cos(ang) * (5 + Math.random() * 2), Math.random() * 3.5 - .5, Math.sin(ang) * 3 - 4);
        m.userData = { sp: .2 + Math.random() * .5, ph: Math.random() * 6, y: m.position.y };
        scene.add(m); floaters.push(m);
      }
      camera.position.set(0, .5, 7.2);
      ctx.resize();
      const ro = new ResizeObserver(() => ctx.resize()); ro.observe(canvas);
      const ray = new THREE.Raycaster();
      const onMove = (e) => {
        const r = canvas.getBoundingClientRect();
        mouse.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      };
      const onClick = () => { if (hovered) pick(hovered.userData.theme); };
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('click', onClick);
      const t0 = performance.now();
      const loop = (now) => {
        const t = (now - t0) / 1000;
        if (!busy) {
          ray.setFromCamera(mouse, camera);
          const hit = ray.intersectObjects(monitors, true)[0];
          let m = hit?.object; while (m && !m.userData.theme) m = m.parent;
          hovered = m || null;
          canvas.style.cursor = hovered ? 'pointer' : 'default';
          el.querySelector('.ip-xp').classList.toggle('hot', hovered?.userData.theme === 'xp');
          el.querySelector('.ip-mac').classList.toggle('hot', hovered?.userData.theme === 'mac');
          const motion = reducedMotion() ? 0 : 1;
          camera.position.x += ((mouse.x * .8) * motion - camera.position.x) * .04;
          camera.position.y += ((.5 + mouse.y * .35) * motion - camera.position.y) * .04;
          const baseZ = camera.aspect < 1.25 ? 7.2 * 1.25 / Math.max(.42, camera.aspect) * .92 : 7.2;
          camera.position.z += (baseZ - camera.position.z) * .08;
          camera.lookAt(0, 0, 0);
          for (const mon of monitors) {
            const isH = mon === hovered;
            const base = mon.userData.theme === 'xp' ? .32 : -.32;
            mon.rotation.y += ((isH ? base * .25 : base) + Math.sin(t * .6 + (isH ? 0 : 1)) * .03 * motion - mon.rotation.y) * .08;
            mon.position.y += ((isH ? .18 : 0) + Math.sin(t * 1.1 + (mon.userData.theme === 'xp' ? 0 : 2)) * .05 * motion - mon.position.y) * .08;
            const s = isH ? 1.06 : 1; mon.scale.lerp(new THREE.Vector3(s, s, s), .1);
          }
        }
        for (const f of floaters) { f.rotation.x += .004 * f.userData.sp * 3; f.rotation.y += .006 * f.userData.sp * 3; f.position.y = f.userData.y + Math.sin(t * f.userData.sp + f.userData.ph) * .3; }
        ctx.points.rotation.y = t * .02;
        ctx.renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      el.cleanup = () => { cancelAnimationFrame(raf); ro.disconnect(); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('click', onClick); ctx.renderer.dispose(); };
    }
    const onKey = (e) => { if (e.key === 'ArrowLeft') pick('xp'); if (e.key === 'ArrowRight') pick('mac'); };
    window.addEventListener('keydown', onKey);

    function choose(theme) {
      busy = true; sound('click');
      window.removeEventListener('keydown', onKey);
      el.classList.add('leaving');
      const finish = () => { el.cleanup?.(); el.remove(); resolve(theme); };
      if (!ctx || reducedMotion()) return setTimeout(finish, 300);
      // камера влетает в экран выбранного монитора
      const mon = monitors.find((m) => m.userData.theme === theme);
      mon.rotation.y = 0; mon.updateMatrixWorld(true);
      const target = new THREE.Vector3(); mon.userData.screen.getWorldPosition(target);
      const from = ctx.camera.position.clone();
      const to = target.clone().add(new THREE.Vector3(0, 0, theme === 'xp' ? 1.32 : 1.42));
      const start = performance.now(), dur = 1300;
      const fly = (now) => {
        const k = Math.min(1, (now - start) / dur), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        ctx.camera.position.lerpVectors(from, to, e);
        ctx.camera.lookAt(target.x * e, target.y * e, target.z * e);
        if (k < 1) requestAnimationFrame(fly); else { el.classList.add('flash'); setTimeout(finish, 280); }
      };
      requestAnimationFrame(fly);
    }
  });
}

// ---------- 3D-хранитель экрана ----------
export function screensaver(stage) {
  const canvas = h('canvas', { class: 'intro-cv' });
  const el = h('div', { class: 'saver', role: 'img', 'aria-label': 'Хранитель экрана' }, canvas, h('p', { class: 'saver-hint' }, 'Нажмите любую клавишу или пошевелите мышью'));
  stage.append(el);
  let ctx;
  try { ctx = baseScene(canvas); } catch { el.addEventListener('pointerdown', stop); return stop; }
  const { scene, camera } = ctx;
  scene.fog = new THREE.Fog(0x05051a, 6, 26);
  const names = (state.manifest?.repos || []).map((r) => r.name);
  const group = new THREE.Group(); scene.add(group);
  names.forEach((n, i) => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const x = c.getContext('2d');
    const hue = (i / names.length) * 360;
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, `hsl(${hue} 90% 72%)`); g.addColorStop(1, `hsl(${hue} 80% 40%)`);
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, 0, 256, 90);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    let fs = 34; x.font = `700 ${fs}px "PT Sans", sans-serif`;
    while (x.measureText(n).width > 230 && fs > 14) { fs -= 2; x.font = `700 ${fs}px "PT Sans", sans-serif`; }
    x.fillText(n, 128, 140);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new RoundedBoxGeometry(1.1, 1.1, 1.1, 4, .12), new THREE.MeshPhysicalMaterial({ map: tex, roughness: .2, clearcoat: 1 }));
    const a = i / names.length * Math.PI * 2;
    m.position.set(Math.cos(a) * 4.5, Math.sin(i * 1.7) * 1.2, Math.sin(a) * 4.5);
    m.userData = { sp: .3 + (i % 5) * .1 };
    group.add(m);
  });
  camera.position.set(0, 1.5, 9);
  ctx.resize();
  let raf = 0; const t0 = performance.now();
  const loop = (now) => {
    const t = (now - t0) / 1000;
    group.rotation.y = t * .15;
    group.children.forEach((m, i) => { m.rotation.x = t * m.userData.sp; m.rotation.y = t * m.userData.sp * 1.3; m.position.y = Math.sin(t * .8 + i) * 1.2; });
    camera.position.y = 1.5 + Math.sin(t * .2) * 1;
    camera.lookAt(0, 0, 0);
    ctx.points.rotation.y = -t * .03;
    ctx.renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  let armed = false; setTimeout(() => { armed = true; }, 600);
  const wake = () => { if (armed) stop(); };
  window.addEventListener('pointermove', wake); window.addEventListener('keydown', wake); window.addEventListener('pointerdown', wake);
  function stop() {
    cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', wake); window.removeEventListener('keydown', wake); window.removeEventListener('pointerdown', wake);
    ctx?.renderer.dispose(); el.remove();
  }
  return stop;
}
