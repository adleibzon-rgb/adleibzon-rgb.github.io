// «Пятнашки» — виджет в духе приборной панели.
import { h, store } from '../state.js';

export default {
  id: 'fifteen', title: 'Пятнашки', icon: 'puzzle', theme: 'mac', w: 360, h: 470, resizable: false,
  about: 'Расставьте плитки по порядку от 1 до 15.',
  mount(root) {
    let tiles, moves, t0, tid, size = 4;
    const grid = h('div', { class: 'ft-grid' });
    const info = h('div', { class: 'ft-info' });
    const sizeSel = h('div', { class: 'seg' }, [3, 4, 5].map((n) => h('button', { class: 'seg-b' + (n === 4 ? ' on' : ''), onclick: (e) => { size = n; sizeSel.querySelectorAll('.seg-b').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); shuffle(); } }, `${n}×${n}`)));
    root.append(h('div', { class: 'ft' }, h('div', { class: 'ft-head' }, sizeSel, h('button', { class: 'btn', onclick: () => shuffle() }, 'Перемешать')), grid, info));

    function solvable(a) {
      let inv = 0;
      const f = a.filter((x) => x);
      for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) if (f[i] > f[j]) inv++;
      if (size % 2) return inv % 2 === 0;
      const blankRowFromBottom = size - Math.floor(a.indexOf(0) / size);
      return (inv + blankRowFromBottom) % 2 === 1;
    }
    function shuffle() {
      do {
        tiles = [...Array(size * size).keys()].map((i) => (i + 1) % (size * size));
        for (let i = tiles.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [tiles[i], tiles[j]] = [tiles[j], tiles[i]]; }
      } while (!solvable(tiles) || done());
      moves = 0; clearInterval(tid); t0 = 0;
      grid.style.setProperty('--n', size);
      draw();
    }
    const done = () => tiles.every((v, i) => v === (i + 1) % (size * size));
    function tap(i) {
      const z = tiles.indexOf(0);
      const r = Math.floor(i / size), c = i % size, zr = Math.floor(z / size), zc = z % size;
      if (r !== zr && c !== zc) return;
      if (!t0) { t0 = Date.now(); tid = setInterval(stat, 500); }
      // сдвиг целого ряда, как на настоящей коробочке
      const step = r === zr ? (c < zc ? -1 : 1) : (r < zr ? -size : size);
      let k = z;
      while (k !== i) { tiles[k] = tiles[k + step]; k += step; moves++; }
      tiles[i] = 0;
      draw();
      if (done()) {
        clearInterval(tid);
        const secs = Math.round((Date.now() - t0) / 1000);
        const key = 'fifteen.rec.' + size, prev = store.get(key, null);
        if (prev == null || moves < prev) store.set(key, moves);
        info.textContent = `Готово! ${moves} ходов за ${secs} с.` + (prev == null || moves < prev ? ' Новый рекорд.' : ` Рекорд: ${prev} ходов.`);
        grid.classList.add('ft-win');
      }
    }
    function stat() {
      const rec = store.get('fifteen.rec.' + size, null);
      info.textContent = `Ходов: ${moves} · Время: ${t0 ? Math.round((Date.now() - t0) / 1000) : 0} с` + (rec != null ? ` · Рекорд: ${rec}` : '');
    }
    function draw() {
      grid.classList.remove('ft-win');
      grid.innerHTML = '';
      tiles.forEach((v, i) => grid.append(v
        ? h('button', { class: 'ft-t', style: { '--hue': (v * 360 / (size * size)) | 0 }, onclick: () => tap(i), 'aria-label': 'Плитка ' + v }, v)
        : h('span', { class: 'ft-hole' })));
      stat();
    }
    shuffle();
    return () => clearInterval(tid);
  },
};
