/* Indice de Kvothesson.
   Vanilla, sin build. Los datos salen de data/catalogo.json, que regenera
   sync.py. Aca no hay curaduria: solo el render. */

const $ = (s, r = document) => r.querySelector(s);
const main = $('#main');

const nfmt = new Intl.NumberFormat('es-AR');

const vistas = n =>
  n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',') + 'k'
            : String(n);

const reloj = s => {
  const m = Math.floor(s / 60), r = s % 60;
  return m + ':' + String(r).padStart(2, '0');
};

const fecha = iso => {
  const [a, m, d] = iso.split('-');
  return `${d}.${m}.${a.slice(2)}`;
};

const esc = s => s.replace(/[&<>"]/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ─── sello procedural ────────────────────────────────────────────────────
   Los repos sin Pages no tienen nada que mostrar, asi que se les dibuja un
   sello derivado del nombre: mismo nombre, mismo sello, siempre. */

function sello(nombre) {
  let h = 2166136261;
  for (const ch of nombre) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296);

  const N = 7, celda = 14, pad = (140 - N * celda) / 2;
  let d = '';
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < Math.ceil(N / 2); x++) {
      if (rnd() > .52) continue;
      const px = pad + x * celda, py = pad + y * celda;
      const esp = pad + (N - 1 - x) * celda;
      d += `M${px} ${py}h${celda}v${celda}h${-celda}z`;
      if (esp !== px) d += `M${esp} ${py}h${celda}v${celda}h${-celda}z`;
    }
  }
  const r = 30 + rnd() * 22;
  return `<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="140" height="140" fill="#000"/>
    <circle cx="70" cy="70" r="${r.toFixed(1)}" fill="none" stroke="#ff2e88" stroke-width="1" opacity=".5"/>
    <path d="${d}" fill="#00e6c3" opacity=".72"/>
    <rect x="6" y="6" width="128" height="128" fill="none" stroke="#17201e"/>
  </svg>`;
}

/* ─── cards ─────────────────────────────────────────────────────────────── */

function card(it) {
  const tipo = it.tipo;
  let href, medio, titulo, sub, meta;

  if (tipo === 'video') {
    href = `https://www.youtube.com/watch?v=${it.id}`;
    // hq720 es 16:9 limpio; hqdefault seria 4:3 con banda negra arriba y abajo.
    // mqdefault es el mismo encuadre en chico y existe para todos los videos.
    const corto = it.seg <= 61;
    medio = `<img loading="lazy" decoding="async" alt=""
        class="${corto ? 'vert' : ''}"
        src="https://i.ytimg.com/vi/${it.id}/hq720.jpg"
        onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${it.id}/mqdefault.jpg'">
      <span class="dur">${reloj(it.seg)}</span>`;
    titulo = it.titulo;
    sub = '';
    meta = [fecha(it.fecha), `${vistas(it.views)} vistas`,
            it.seg <= 61 ? 'short' : null].filter(Boolean);
  } else if (tipo === 'page') {
    href = it.url;
    medio = `<div class="prev" data-url="${esc(it.url)}"></div>`;
    titulo = it.titulo;
    sub = it.desc;
    meta = [it.url.replace(/^https?:\/\//, '').replace(/\/$/, ''),
            it.lenguaje, `push ${fecha(it.fecha)}`].filter(Boolean);
  } else {
    href = it.url;
    medio = sello(it.id);
    titulo = it.titulo;
    sub = it.desc;
    meta = ['solo repo', it.lenguaje, `push ${fecha(it.fecha)}`].filter(Boolean);
  }

  const et = { video: 'video', page: 'corre', repo: 'repo' }[tipo];
  const li = document.createElement('li');
  li.innerHTML =
    `<a class="card" data-t="${tipo}" href="${esc(href)}" target="_blank" rel="noopener">
       <div class="shot"><span class="tag">${et}</span>${medio}</div>
       <div class="body">
         <h3>${esc(titulo)}</h3>
         ${sub ? `<p>${esc(sub)}</p>` : ''}
         <div class="meta">${meta.map(m => `<span>${esc(m)}</span>`).join('')}</div>
       </div>
     </a>`;
  li.dataset.t = tipo;
  li.dataset.buscar = (titulo + ' ' + sub + ' ' + meta.join(' ')).toLowerCase();
  return li;
}

/* ─── previews en vivo ────────────────────────────────────────────────────
   Cada Page se muestra corriendo de verdad, no con una captura. Se montan al
   entrar en pantalla y se desmontan al salir, para no dejar diez apps con su
   render loop girando a la vez. */

const previews = new IntersectionObserver(entradas => {
  for (const e of entradas) {
    const caja = e.target;
    if (e.isIntersecting && !caja.firstChild) {
      const f = document.createElement('iframe');
      f.src = caja.dataset.url;
      f.loading = 'lazy';
      f.tabIndex = -1;
      f.setAttribute('scrolling', 'no');
      f.setAttribute('aria-hidden', 'true');
      caja.appendChild(f);
      escalar(caja);
    } else if (!e.isIntersecting && caja.firstChild) {
      caja.replaceChildren();
    }
  }
}, { rootMargin: '300px 0px' });

function escalar(caja) {
  const f = caja.firstChild;
  if (!f) return;
  f.style.transform = `scale(${caja.clientWidth / 1280})`;
}

const medidor = new ResizeObserver(es => es.forEach(e => escalar(e.target)));

/* ─── render ────────────────────────────────────────────────────────────── */

let datos;

function pintar(d) {
  datos = d;

  $('#stats').innerHTML = [
    ['páginas vivas', d.obsesiones.reduce((a, o) => a + o.n_pages, 0)],
    ['videos en el índice', d.obsesiones.reduce((a, o) => a + o.n_videos, 0)],
    ['obsesiones', d.obsesiones.length],
    ['suscriptores', nfmt.format(d.canal.subs)],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd><b>${v}</b></dd></div>`).join('');

  $('#jump').innerHTML = d.obsesiones
    .map((o, i) => `<a href="#${o.id}">${String(i + 1).padStart(2, '0')} ${esc(o.nombre)}</a>`)
    .join('');

  const frag = document.createDocumentFragment();
  d.obsesiones.forEach((o, i) => {
    const sec = document.createElement('section');
    sec.className = 'obs';
    sec.id = o.id;
    sec.innerHTML =
      `<div class="obs-head">
         <div>
           <div class="obs-num">${String(i + 1).padStart(2, '0')} / ${d.obsesiones.length}</div>
           <h2>${esc(o.nombre)}</h2>
           <p class="tesis">${esc(o.tesis)}</p>
         </div>
         <p class="detalle">${esc(o.detalle)}</p>
       </div>
       <p class="tally">${o.n_pages} que corren · ${o.n_videos} que se ven</p>`;
    const ul = document.createElement('ul');
    ul.className = 'grid';
    o.items.forEach(it => ul.appendChild(card(it)));
    sec.appendChild(ul);
    frag.appendChild(sec);
  });
  main.replaceChildren(frag);

  main.querySelectorAll('.prev').forEach(p => {
    previews.observe(p);
    medidor.observe(p);
  });

  $('#pie-txt').textContent =
    `${d.canal.videos} videos publicados en total; el índice muestra ${
      d.obsesiones.reduce((a, o) => a + o.n_videos, 0)
    } porque lista series, no archivo. Datos al ${d.generado}.`;

  espiar();
}

/* ─── filtros ───────────────────────────────────────────────────────────── */

let filtro = 'todo', consulta = '';
const chips = [...document.querySelectorAll('.chip')];

function aplicar() {
  const q = consulta.trim().toLowerCase();
  let total = 0;

  main.querySelectorAll('.obs').forEach(sec => {
    let vivos = 0;
    sec.querySelectorAll('.grid > li').forEach(li => {
      const okT = filtro === 'todo' || li.dataset.t === filtro ||
                  (filtro === 'page' && li.dataset.t === 'repo');
      const okQ = !q || li.dataset.buscar.includes(q);
      const ok = okT && okQ;
      li.classList.toggle('off', !ok);
      if (ok) vivos++;
    });
    sec.classList.toggle('off', vivos === 0);
    total += vivos;
  });

  $('#void').hidden = total > 0;
  $('#clear').hidden = !q;
}

$('#q').addEventListener('input', e => { consulta = e.target.value; aplicar(); });

$('#clear').addEventListener('click', () => {
  $('#q').value = consulta = '';
  aplicar();
  $('#q').focus();
});

$('.chips').addEventListener('click', e => {
  const b = e.target.closest('.chip');
  if (!b) return;
  filtro = b.dataset.f;
  chips.forEach(c => c.classList.toggle('on', c === b));
  aplicar();
});

addEventListener('keydown', e => {
  const escribiendo = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
  if (e.key === '/' && !escribiendo) {
    e.preventDefault();
    $('#q').focus();
    $('#q').select();
  } else if (e.key === 'Escape' && (consulta || escribiendo)) {
    $('#q').value = consulta = '';
    aplicar();
    $('#q').blur();
  }
});

/* ─── scrollspy ─────────────────────────────────────────────────────────── */

function espiar() {
  const links = [...document.querySelectorAll('.jump a')];
  const io = new IntersectionObserver(es => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle('here', a.hash === '#' + e.target.id));
    });
  }, { rootMargin: '-25% 0px -65% 0px' });
  main.querySelectorAll('.obs').forEach(s => io.observe(s));
}

/* ─── arranque ──────────────────────────────────────────────────────────── */

fetch('data/catalogo.json')
  .then(r => {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  })
  .then(pintar)
  .catch(err => {
    main.innerHTML =
      `<p class="void">no se pudo leer data/catalogo.json (${esc(String(err))}).
       Corré <code>python sync.py</code>.</p>`;
  });
