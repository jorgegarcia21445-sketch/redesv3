// =========================================================
// SoluTelecom — index.js
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initHeaderShadow();
  initActiveLink();
  initScrollReveal();
  initCounters();
  initServiceModal();
  initNavExtras();
  initLogin();
  initContactForm();
  initYear();
});

/* ---------------------------------------------------------
   Mobile nav: build a hamburger button and toggle the menu
--------------------------------------------------------- */
function initMobileNav(){
  const nav = document.querySelector('header nav');
  const links = document.querySelector('.nav-links');
  const actions = document.querySelector('.nav-actions');
  if (!nav || !links) return;

  const toggle = document.createElement('button');
  toggle.className = 'nav-toggle';
  toggle.setAttribute('aria-label', 'Abrir menú');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span></span><span></span><span></span>';
  (actions || nav).appendChild(toggle);

  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    toggle.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ---------------------------------------------------------
   Header gets a shadow once the page scrolls
--------------------------------------------------------- */
function initHeaderShadow(){
  const header = document.querySelector('header');
  if (!header) return;
  const onScroll = () => {
    header.style.boxShadow = window.scrollY > 8
      ? '0 8px 24px -18px rgba(0,0,0,.8)'
      : 'none';
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---------------------------------------------------------
   Highlight the nav link of the section currently in view
--------------------------------------------------------- */
function initActiveLink(){
  const links = document.querySelectorAll('.nav-links a[href^="#"]');
  if (!links.length) return;

  const map = new Map();
  links.forEach(a => {
    const section = document.querySelector(a.getAttribute('href'));
    if (section) map.set(section, a);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const link = map.get(entry.target);
      if (!link) return;
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  map.forEach((_, section) => observer.observe(section));
}

/* ---------------------------------------------------------
   Fade-up reveal for elements marked .reveal
--------------------------------------------------------- */
function initScrollReveal(){
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  targets.forEach(el => observer.observe(el));
}

/* ---------------------------------------------------------
   Animated number counters for elements with [data-count]
--------------------------------------------------------- */
function initCounters(){
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const animate = (el) => {
    const target = parseFloat(el.getAttribute('data-count')) || 0;
    const suffix = el.getAttribute('data-suffix') || '';
    const duration = 1400;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animate(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  counters.forEach(el => observer.observe(el));
}

/* ---------------------------------------------------------
   Servicios: pantalla completa. El contenido vive en index.html
   (cada <article id="svc-...">); aquí solo se muestra el elegido.
--------------------------------------------------------- */
function initServiceModal(){
  const modal = document.getElementById('svcModal');
  if (!modal) return;
  const panels = modal.querySelectorAll('.svc-detail');

  document.querySelectorAll('[data-service]').forEach(card => {
    card.addEventListener('click', () => {
      panels.forEach(p => { p.hidden = p.id !== 'svc-' + card.dataset.service; });
      modal.showModal();
      modal.scrollTop = 0;
    });
  });
  modal.querySelector('.modal-close').addEventListener('click', () => modal.close());
  modal.querySelectorAll('.svc-cta').forEach(a => a.addEventListener('click', () => modal.close()));
}

/* ---------------------------------------------------------
   Nav extras: carrito desplegable
--------------------------------------------------------- */
function initNavExtras(){
  const btn = document.getElementById('cartBtn');
  const panel = document.getElementById('cartPanel');
  if (!btn || !panel) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.hidden = !panel.hidden;
    btn.setAttribute('aria-expanded', String(!panel.hidden));
  });
  document.addEventListener('click', () => {
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  });
  panel.addEventListener('click', (e) => e.stopPropagation());
}

/* ---------------------------------------------------------
   Login: abrir/cerrar y mostrar contraseña
   (el inicio de sesión real está en auth.js)
--------------------------------------------------------- */
function initLogin(){
  const modal = document.getElementById('loginModal');
  const openBtn = document.getElementById('loginBtn');
  if (!modal || !openBtn) return;
  const pass = document.getElementById('loginPass');

  openBtn.addEventListener('click', () => {
    if (document.body.dataset.user) return; // con sesión iniciada, auth.js cierra la sesión
    document.getElementById('loginMsg').textContent = '';
    modal.showModal();
  });
  modal.querySelector('.modal-close').addEventListener('click', () => modal.close());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
  document.getElementById('pwToggle').addEventListener('click', () => {
    pass.type = pass.type === 'password' ? 'text' : 'password';
  });
}

/* ---------------------------------------------------------
   Contact form -> opens the user's email client with a
   pre-filled message addressed to solutelecom2025@gmail.com
--------------------------------------------------------- */
function initContactForm(){
  const form = document.getElementById('contactForm');
  if (!form) return;
  const val = (id) => (document.getElementById(id)?.value || '').trim();
  const msg = document.getElementById('contactoMsg');
  const wa = document.getElementById('contactoWa');
  const boton = document.getElementById('contactoEnviar');

  // the WhatsApp button carries whatever the visitor already typed
  const textoWa = () => {
    const partes = [
      'Hola, quiero cotizar un proyecto.',
      val('nombre') && 'Nombre: ' + val('nombre'),
      val('empresa') && 'Empresa: ' + val('empresa'),
      'Servicio: ' + (document.getElementById('servicio')?.value || ''),
      val('mensaje'),
    ].filter(Boolean);
    return 'https://wa.me/523335034338?text=' + encodeURIComponent(partes.join('\n'));
  };
  form.addEventListener('input', () => { if (wa) wa.href = textoWa(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = {
      nombre: val('nombre'), empresa: val('empresa'), correo: val('correo'),
      telefono: val('telefono'), servicio: document.getElementById('servicio')?.value || '',
      mensaje: val('mensaje'), sitio: val('sitio'),
    };
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    msg.style.color = '';
    try {
      const r = await fetch(API_PAGOS + '/contacto', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'No se pudo enviar.');
      form.reset();
      msg.style.color = '#7ee787';
      msg.textContent = '¡Gracias! Recibimos tu solicitud y te enviamos una confirmación a tu correo.';
    } catch (err) {
      msg.style.color = '#ff9b93';
      msg.innerHTML = 'No pudimos enviar tu mensaje en este momento. <a href="' + textoWa() + '" target="_blank" rel="noopener" style="color:#25D366;font-weight:600">Envíalo por WhatsApp</a>, ya va con lo que escribiste.';
    } finally {
      boton.disabled = false;
      boton.textContent = 'Enviar solicitud';
    }
  });
}

/* ---------------------------------------------------------
   Footer year
--------------------------------------------------------- */
function initYear(){
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}


// ...your existing code stays here, untouched...


// ===== new code starts here =====
// ===== Syscom products menu + catalog page =====
const CARPETA = "catjson";
const PRECIO_CAMPO = "precio_lista"; // others: precio_1, precio_especial, precio_descuento, precio_map
const IVA = 0.16;                    // Mexico VAT; set to 0 to show prices without IVA
const MARGEN = 0.02;                 // price increase: 0.02 = +2%
const DESCUENTO = 0;                 // discount for later: 0.10 = -10% (0 = none)
const TIPO_CAMBIO_RESPALDO = 18.5;   // used only if the exchange rate file can't be read
const CORREO_VENTAS = "solutelecom2025@gmail.com";
const POR_PAGINA = 24;

const limpiar = (t) => String(t == null ? "" : t).replace(/\s+/g, " ").trim();
const esc = (t) =>
  limpiar(t)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

async function cargarJSON(archivo) {
  const res = await fetch(`./${CARPETA}/${archivo}.json`);
  if (!res.ok) throw new Error(`No se encontró ${CARPETA}/${archivo}.json`);
  return res.json();
}

let arbol = [];
let listaProductos = [];
let tipoCambio = TIPO_CAMBIO_RESPALDO;
let tipoCambioReal = false;
let vista = { id: null, productos: [], pagina: 1, orden: "", q: "" };
let peticionActual = 0;
let ocultos = [];
const cacheProductos = new Map();

/* ---------- Data loading ---------- */
async function leerProductos() {
  for (const ruta of ["./productos.json", "./catjson/productos.json"]) {
    try {
      const res = await fetch(ruta);
      if (res.ok) return res.json();
    } catch (e) {
      // try the next path
    }
  }
  throw new Error("No se encontró productos.json");
}

function extraerTC(d) {
  if (typeof d === "number") return d;
  if (typeof d === "string") return parseFloat(d);
  if (d && typeof d === "object") {
    for (const k of ["normal", "tipo_cambio", "tipocambio", "tipoCambio", "valor"]) {
      if (d[k] != null) {
        const n = parseFloat(d[k]);
        if (!isNaN(n)) return n;
      }
    }
    for (const v of Object.values(d)) {
      const n = extraerTC(v);
      if (n && !isNaN(n)) return n;
    }
  }
  return null;
}

async function cargarTipoCambio() {
  const rutas = [
    "./catjson/tipodecas.json",
    "./tipodecas.json",
    "./catjson/tipodecambio.json",
    "./tipodecambio.json",
  ];
  for (const ruta of rutas) {
    try {
      const res = await fetch(ruta);
      if (!res.ok) continue;
      const n = extraerTC(await res.json());
      if (n && n > 5 && n < 100) return n;
    } catch (e) {
      // try the next path
    }
  }
  return null;
}

// The full product list (productos.json) is heavy, so it is only downloaded
// when the store server can't answer. Normally the server does the searching.
let promesaLista = null;
function obtenerListaProductos() {
  if (!promesaLista) {
    promesaLista = fetch(`./${CARPETA}/buscador.json`)
      .then((r) => {
        if (!r.ok) throw new Error("sin buscador.json");
        return r.json();
      })
      .then((d) => {
        // [id, titulo, marca, modelo, precio_lista, precio_especial, existencia, foto, [categorias]]
        listaProductos = (d.p || []).map((f) => ({
          producto_id: f[0],
          titulo: f[1],
          marca: f[2],
          modelo: f[3],
          precios: { precio_lista: f[4], precio_especial: f[5] },
          total_existencia: f[6],
          img_portada: !f[7] ? "" : f[7][0] === "!" ? f[7].slice(1) : d.base + f[7],
          _cats: f[8] || [],
        }));
        return listaProductos;
      })
      .catch(() =>
        // older sites without buscador.json: use the small sample list
        leerProductos()
          .then((g) => (listaProductos = Array.isArray(g) ? g : g.productos || []))
          .catch(() => (listaProductos = []))
      );
  }
  return promesaLista;
}

async function cargarDatos() {
  const [a, t] = await Promise.allSettled([cargarJSON("arbol"), cargarTipoCambio()]);
  if (a.status === "fulfilled") arbol = a.value;
  if (t.status === "fulfilled" && t.value) {
    tipoCambio = t.value;
    tipoCambioReal = true;
  }
}

/* ---------- Side menu ---------- */
function crearMenuProductos() {
  // "Productos" button: opens the sidebar on tablets and phones
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "prod-btn";
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", "prodSidebar");
  btn.innerHTML = `
    <svg class="prod-grid-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
    <span>Productos</span>`;
  btn.setAttribute("aria-label", "Productos");
  const actions = document.querySelector(".nav-actions");
  const nav = document.querySelector("header nav");
  if (actions) actions.prepend(btn);
  else if (nav) nav.appendChild(btn);

  const ICONO = {
    buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    carrito: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L22 8H6"/>',
    factura: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  };
  const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;

  const sb = document.createElement("aside");
  sb.className = "sb";
  sb.id = "prodSidebar";
  sb.setAttribute("aria-label", "Productos");
  sb.innerHTML = `
    <form class="sb-search" role="search">
      ${svg(ICONO.buscar)}
      <input type="search" name="q" placeholder="Buscar productos…" aria-label="Buscar productos">
    </form>
    <p class="sb-label">Categorías</p>
    <div class="sb-scroll"><ul class="sb-nav sb-cats"><li class="sb-label" style="margin:6px">Cargando…</li></ul></div>
    <p class="sb-label">Tienda</p>
    <ul class="sb-nav">
      <li><a href="#/carrito"><span class="sb-ico">${svg(ICONO.carrito)}</span><span class="sb-txt">Carrito</span><span class="sb-count" id="sbCartCount"></span></a></li>
      <li><a href="#facturacion"><span class="sb-ico">${svg(ICONO.factura)}</span><span class="sb-txt">Facturación</span></a></li>
    </ul>`;

  const fly = document.createElement("div");
  fly.className = "sb-fly";
  fly.id = "prodDrawer"; // kept for the page code that skips it when showing the catalog
  fly.innerHTML = `
    <div class="sb-fly-head">
      <button type="button" class="sb-fly-back">‹ Categorías</button>
      <h3></h3>
      <button type="button" class="sb-fly-close" aria-label="Cerrar">&times;</button>
    </div>
    <div class="sb-fly-body"></div>`;

  const overlay = document.createElement("div");
  overlay.className = "sb-overlay";

  document.body.append(sb, fly, overlay);
  document.body.classList.add("con-sidebar");

  const lista = sb.querySelector(".sb-cats");
  const titulo = fly.querySelector("h3");
  const cuerpo = fly.querySelector(".sb-fly-body");
  const esMovil = () => window.matchMedia("(max-width: 1100px)").matches;

  function abrirMovil() {
    sb.classList.add("mobile-open");
    overlay.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
  }

  // clicked buttons keep focus; let it go so the sidebar can fold back
  const soltarFoco = () => {
    if (sb.contains(document.activeElement) || fly.contains(document.activeElement)) document.activeElement.blur();
  };

  function cerrarTodo() {
    soltarFoco();
    sb.classList.remove("mobile-open", "is-open");
    fly.classList.remove("open");
    overlay.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    lista.querySelectorAll("button.active").forEach((b) => b.classList.remove("active"));
  }

  function cerrarFly() {
    soltarFoco();
    fly.classList.remove("open");
    sb.classList.remove("is-open");
    lista.querySelectorAll("button.active").forEach((b) => b.classList.remove("active"));
    if (!esMovil()) overlay.classList.remove("open");
  }

  function seleccionar(id) {
    const cat = arbol.find((c) => c.id === id);
    if (!cat) return;
    lista.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.id === id));

    const columnas = (cat.subcategorias || [])
      .map((n2) => {
        const hijos = n2.subcategorias || [];
        if (!hijos.length) {
          return `<div class="prod-col prod-leaf"><h4><a href="#" data-sub="${esc(n2.id)}">${esc(n2.nombre)} ›</a></h4></div>`;
        }
        return `
          <div class="prod-col">
            <h4><a href="#" data-sub="${esc(n2.id)}">${esc(n2.nombre)}</a></h4>
            <ul>${hijos.map((n3) => `<li><a href="#" data-sub="${esc(n3.id)}">${esc(n3.nombre)}</a></li>`).join("")}</ul>
          </div>`;
      })
      .join("");

    titulo.innerHTML = `<a href="#" data-sub="${esc(cat.id)}">${esc(cat.nombre)} ›</a>`;
    cuerpo.innerHTML = columnas
      ? `<div class="prod-grid">${columnas}</div>`
      : `<p>Ver todos los productos de <a href="#" data-sub="${esc(cat.id)}" style="color:var(--yellow-300)">${esc(cat.nombre)}</a>.</p>`;
    cuerpo.scrollTop = 0;

    sb.classList.add("is-open");
    fly.classList.add("open");
    overlay.classList.add("open");
  }

  async function iniciar() {
    await datosListos;
    if (!arbol.length) {
      lista.innerHTML = `<li class="prod-error">No se encontró ${CARPETA}/arbol.json</li>`;
      return;
    }
    lista.innerHTML = arbol
      .map(
        (c) => `<li><button type="button" data-id="${esc(c.id)}" title="${esc(c.nombre)}">
            <span class="sb-ico">${svg(iconoCategoria(c.nombre))}</span>
            <span class="sb-txt">${esc(c.nombre)}</span>
            ${svg(ICONO.chev).replace("<svg", '<svg class="sb-chev"')}
          </button></li>`
      )
      .join("");
  }

  btn.addEventListener("click", () => (sb.classList.contains("mobile-open") ? cerrarTodo() : abrirMovil()));
  overlay.addEventListener("click", cerrarTodo);
  fly.querySelector(".sb-fly-close").addEventListener("click", () => (esMovil() ? cerrarTodo() : cerrarFly()));
  fly.querySelector(".sb-fly-back").addEventListener("click", cerrarFly);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cerrarTodo();
  });

  lista.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-id]");
    if (!b) return;
    if (b.classList.contains("active") && fly.classList.contains("open")) cerrarFly();
    else seleccionar(b.dataset.id);
  });

  // any heading or link opens that category's page
  fly.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-sub]");
    if (!a) return;
    e.preventDefault();
    const destino = "#/categoria/" + a.dataset.sub;
    cerrarTodo();
    if (location.hash === destino) enrutar();
    else location.hash = destino;
  });

  // links in the "Tienda" block close the mobile menu
  sb.addEventListener("click", (e) => {
    if (e.target.closest(".sb-nav a")) cerrarTodo();
  });

  sb.querySelector(".sb-search").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = e.target.elements.q.value.trim();
    if (!q) return;
    e.target.elements.q.blur();
    cerrarTodo();
    irABusqueda(q);
  });

  // remove the bottom fade once the list is scrolled to the end
  const scroll = sb.querySelector(".sb-scroll");
  const revisarFinal = () =>
    scroll.classList.toggle("al-final", scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 4);
  scroll.addEventListener("scroll", revisarFinal, { passive: true });
  datosListos.then(() => setTimeout(revisarFinal, 50));

  iniciar();
}

// A simple line icon for each Syscom category, picked by its name
function iconoCategoria(nombre) {
  const n = String(nombre || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const iconos = [
    [/video|camara|cctv|vigilancia/, '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>'],
    [/radio/, '<rect x="5" y="8" width="14" height="13" rx="2"/><path d="M8 8 16 3M9 13h6M9 17h6"/>'],
    [/red|network|it\b|wifi|inalambric/, '<path d="M12 20h.01M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 14 0M2 9.5a15 15 0 0 1 20 0"/>'],
    [/fibra|optic/, '<path d="M2 12h4l2-8 4 16 2-8h4"/><circle cx="20" cy="12" r="2"/>'],
    [/cable|cableado|estructurado/, '<path d="M4 4v6a4 4 0 0 0 4 4h8a4 4 0 0 1 4 4v2"/><circle cx="4" cy="4" r="2"/><circle cx="20" cy="20" r="2"/>'],
    [/acceso|asistencia/, '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 9.2-9.2M17 6l3 3M14 9l2 2"/>'],
    [/fuego|incendio|deteccion/, '<path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-9-1 3-3 4-4 4 0-2-1-4-2-6-2 3-4 7-4 11a7 7 0 0 0 7 7z"/>'],
    [/intrusion|alarma|automatiza/, '<path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5z"/>'],
    [/herramienta|ferreteria/, '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>'],
    [/energia|solar|ups|electric/, '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'],
    [/iot|gps|telematica|rastreo/, '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'],
    [/audio|sonido|voceo/, '<path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'],
    [/telefon|voz/, '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'],
    [/marketing|promocion|libro|capacitacion/, '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 8a5 5 0 0 1 0 8"/>'],
    [/monitor|pantalla|display/, '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'],
    [/almacen|disco|servidor|storage/, '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>'],
  ];
  const hallado = iconos.find(([re]) => re.test(n));
  return hallado ? hallado[1] : '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>';
}

/* ---------- Prices (USD from Syscom -> MXN with IVA) ---------- */
// Promo price field from Syscom (must be the same as PRECIO_PROMO_CAMPO on the server).
// Empty = no promos. It is only used when it is LOWER than the list price.
const PRECIO_PROMO_CAMPO = "";

// USD base price: the promo price when there is a real promo, otherwise the list price
function precioBase(p) {
  const pr = (p && p.precios) || {};
  const lista = parseFloat(pr[PRECIO_CAMPO]);
  const promo = PRECIO_PROMO_CAMPO ? parseFloat(pr[PRECIO_PROMO_CAMPO]) : NaN;
  if (isNaN(lista)) return { usd: NaN, antes: null };
  if (!isNaN(promo) && promo > 0 && promo < lista) return { usd: promo, antes: lista };
  return { usd: lista, antes: null };
}

function precioUSD(p) {
  const n = precioBase(p).usd;
  return isNaN(n) ? Infinity : n;
}

// price block shared by the cards and the carousel
function htmlPrecio(p) {
  const b = precioBase(p);
  if (isNaN(b.usd)) return { html: "Consultar precio", descuento: 0 };
  const ahora = dinero(precioUnitario(b.usd));
  if (!b.antes) return { html: "MXN " + ahora + " <small>IVA incluido</small>", descuento: 0 };
  const descuento = Math.round((1 - b.usd / b.antes) * 100);
  return {
    html: "<s>MXN " + dinero(precioUnitario(b.antes)) + "</s>MXN " + ahora + " <small>IVA incluido</small>",
    descuento,
  };
}

function formatoPesos(usd) {
  const n = parseFloat(usd);
  if (isNaN(n)) return null;
  return dinero(precioUnitario(n));
}

/* ---------- Products of a category (leaf or heading) ---------- */
function pertenece(p, id) {
  const enLista = (p.categorias || []).some((c) => c.id === id);
  const enTodas = (p.categorias_producto_todas || []).some((cadena) =>
    cadena.some((c) => c.id === id)
  );
  return enLista || enTodas;
}

function buscarNodo(id, nodos = arbol) {
  for (const n of nodos) {
    if (n.id === id) return n;
    const r = buscarNodo(id, n.subcategorias || []);
    if (r) return r;
  }
  return null;
}

// every leaf category under a node (a leaf returns itself)
function hojasDe(nodo) {
  const hijos = nodo.subcategorias || [];
  if (!hijos.length) return [nodo.id];
  let ids = [];
  hijos.forEach((h) => {
    ids = ids.concat(hojasDe(h));
  });
  return ids;
}

async function leerArchivoProductos(id) {
  if (cacheProductos.has(id)) return cacheProductos.get(id);
  let lista = [];
  try {
    const res = await fetch(`./${CARPETA}/prod-${id}.json`);
    if (res.ok) {
      const datos = await res.json();
      lista = datos.productos || [];
    }
  } catch (e) {
    // no file for this category
  }
  cacheProductos.set(id, lista);
  return lista;
}

async function productosDeCategoria(id, progreso) {
  const nodo = buscarNodo(id);
  const ids = nodo ? hojasDe(nodo) : [id];
  const vistos = new Map();
  const LOTE = 12;

  for (let i = 0; i < ids.length; i += LOTE) {
    const lote = ids.slice(i, i + LOTE);
    const listas = await Promise.all(lote.map(leerArchivoProductos));
    listas.forEach((l) =>
      l.forEach((p) => {
        if (!vistos.has(p.producto_id)) vistos.set(p.producto_id, p);
      })
    );
    if (progreso) progreso(Math.min(i + LOTE, ids.length), ids.length);
  }

  let resultado = Array.from(vistos.values());
  if (!resultado.length) resultado = (await obtenerListaProductos()).filter((p) => pertenece(p, id));
  return resultado;
}

/* ---------- Catalog page ---------- */
function rutaDe(id, nodos = arbol, camino = []) {
  for (const n of nodos) {
    const actual = camino.concat([{ id: n.id, nombre: limpiar(n.nombre) }]);
    if (n.id === id) return actual;
    const r = rutaDe(id, n.subcategorias || [], actual);
    if (r) return r;
  }
  return null;
}

// filters for the product lists (brand, price, only in stock)
let filtros = { marca: "", min: "", max: "", stock: true };

function precioMXN(p) {
  const u = precioBase(p).usd;
  return isNaN(u) ? null : precioUnitario(u);
}

function productosFiltrados() {
  const q = vista.q.toLowerCase();
  const min = filtros.min === "" ? null : Number(filtros.min);
  const max = filtros.max === "" ? null : Number(filtros.max);
  let lista = vista.productos.filter((p) => {
    if (q && !((p.titulo || "") + " " + (p.marca || "") + " " + (p.modelo || "")).toLowerCase().includes(q)) return false;
    if (filtros.marca && p.marca !== filtros.marca) return false;
    if (filtros.stock && !((Number(p.total_existencia) || 0) > 0)) return false;
    if (min !== null || max !== null) {
      const precio = precioMXN(p);
      if (precio === null) return false;
      if (min !== null && precio < min) return false;
      if (max !== null && precio > max) return false;
    }
    return true;
  });
  if (vista.orden) {
    lista = lista.slice().sort((a, b) => {
      const pa = precioUSD(a);
      const pb = precioUSD(b);
      if (pa === Infinity && pb === Infinity) return 0;
      if (pa === Infinity) return 1;
      if (pb === Infinity) return -1;
      return vista.orden === "asc" ? pa - pb : pb - pa;
    });
  }
  return lista;
}

// Products shown anywhere on the page, so "Comprar" and "Poner al carrito" find them
const productosMostrados = new Map();
function recordarProducto(p) {
  if (p && p.producto_id != null) productosMostrados.set(String(p.producto_id), p);
}
function buscarProductoMostrado(id) {
  return (
    productosMostrados.get(String(id)) ||
    (vista.productos || []).find((x) => String(x.producto_id) === String(id)) ||
    null
  );
}

// One product card (used by the catalog, the search and the home page)
// Simple on purpose: photo, name, price, stock and one button. The rest is in the quick view.
function htmlTarjeta(p) {
  recordarProducto(p);
  const precio = htmlPrecio(p);
  const stock = Number(p.total_existencia) || 0;
  const id = esc(p.producto_id);
  return `
    <article class="pc-card" data-vista="${id}" tabindex="0" role="button" aria-label="Ver ${esc(p.titulo)}">
      <div class="pc-img">
        <img src="${esc(p.img_portada)}" alt="" loading="lazy" decoding="async" onerror="this.style.visibility='hidden'">
        ${precio.descuento > 0 ? `<span class="pc-badge">-${precio.descuento}%</span>` : ""}
      </div>
      <div class="pc-body">
        <span class="pc-brand">${esc(p.marca)}</span>
        <h3 class="pc-title">${esc(p.titulo)}</h3>
        <strong class="pc-price">${precio.html}</strong>
        <span class="pc-stock ${stock > 0 ? "ok" : "no"}">${stock > 0 ? "● " + stock.toLocaleString("es-MX") + " en existencia" : "Sin existencia"}</span>
        ${
          stock > 0
            ? `<button type="button" class="pc-btn pc-agregar" data-add="${id}">Agregar al carrito</button>`
            : `<button type="button" class="pc-btn pc-agregar pc-cotizar" data-vista="${id}">Cotizar</button>`
        }
      </div>
    </article>`;
}

function pintarCatalogo() {
  const grid = document.getElementById("productosGrid");
  const info = document.getElementById("catalogoInfo");
  const pager = document.getElementById("paginacion");
  if (!grid) return;

  const lista = productosFiltrados();
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  if (vista.pagina > paginas) vista.pagina = paginas;
  const inicio = (vista.pagina - 1) * POR_PAGINA;
  const pagina = lista.slice(inicio, inicio + POR_PAGINA);

  info.textContent =
    lista.length +
    " producto(s) · Precios en MXN, IVA " +
    (IVA ? "incluido" : "no incluido") +
    " · Tipo de cambio $" +
    tipoCambio.toFixed(2) +
    (tipoCambioReal ? "" : " (referencia)");

  if (!lista.length) {
    const conFiltros = filtros.marca || filtros.min !== "" || filtros.max !== "" || vista.q;
    grid.innerHTML = conFiltros
      ? '<p>Ningún producto coincide con los filtros. <button type="button" class="pc-f-limpiar" onclick="document.getElementById(\'fLimpiar\').click()">Quitar filtros</button></p>'
      : "<p>No hay productos con existencia en esta categoría. Desmarca “Solo con existencia” en Filtros para ver todos.</p>";
    pager.innerHTML = "";
    return;
  }

  grid.innerHTML = pagina.map(htmlTarjeta).join("");

  pager.innerHTML =
    paginas > 1
      ? `<button type="button" data-pag="${vista.pagina - 1}" ${vista.pagina === 1 ? "disabled" : ""}>‹ Anterior</button>
         <span>Página ${vista.pagina} de ${paginas}</span>
         <button type="button" data-pag="${vista.pagina + 1}" ${vista.pagina === paginas ? "disabled" : ""}>Siguiente ›</button>`
      : "";
}

function pintarMigas(id) {
  const migas = document.getElementById("catMigas");
  const titulo = document.getElementById("catalogoTitulo");
  const ruta = rutaDe(id) || [];

  if (titulo) titulo.textContent = ruta.length ? ruta[ruta.length - 1].nombre : "Productos";
  if (!migas) return;

  const partes = ['<a href="#top">Inicio</a>'];
  ruta.forEach((n, i) => {
    partes.push(
      i === ruta.length - 1
        ? `<span>${esc(n.nombre)}</span>`
        : `<a href="#/categoria/${esc(n.id)}">${esc(n.nombre)}</a>`
    );
  });
  migas.innerHTML = partes.join(" › ");
}

/* ---------- Show the catalog as its own page ---------- */
// hides every block of the home page except the header, the menu and floating buttons
function ocultarInicio() {
  if (ocultos.length) return;
  Array.from(document.body.children).forEach((el) => {
    if (["HEADER", "SCRIPT", "STYLE", "LINK", "DIALOG"].includes(el.tagName)) return;
        if (el.id === "catalogo" || el.id === "prodDrawer" || el.id === "carritoPage") return;
    if (el.classList.contains("prod-overlay")) return;
    if (getComputedStyle(el).position === "fixed") return;
    el.classList.add("oculto-catalogo");
    ocultos.push(el);
  });
}

function mostrarInicio() {
  ocultos.forEach((el) => el.classList.remove("oculto-catalogo"));
  ocultos = [];
}

async function abrirCatalogo(id) {
  const mia = ++peticionActual;
  ocultarInicio();
  document.body.classList.add("vista-catalogo");

  const grid = document.getElementById("productosGrid");
  const info = document.getElementById("catalogoInfo");
  const pager = document.getElementById("paginacion");
  if (grid) grid.innerHTML = htmlEsqueletos(8);
  if (pager) pager.innerHTML = "";
  window.scrollTo(0, 0);

  await datosListos;
  if (mia !== peticionActual) return;
  pintarMigas(id);

  const productos = await productosDeCategoria(id, (hechos, total) => {
    if (mia === peticionActual && info) info.textContent = "Cargando… " + hechos + " de " + total;
  });
  if (mia !== peticionActual) return;

  vista = { id, productos, pagina: 1, orden: "", q: "" };
  prepararFiltros();
  document.getElementById("buscarProducto").value = "";
  document.getElementById("ordenProducto").value = "";
  pintarCatalogo();
}

function cerrarCatalogo() {
  if (!document.body.classList.contains("vista-catalogo")) return;
  peticionActual++;
  mostrarInicio();
  document.body.classList.remove("vista-catalogo");

  const h = location.hash;
  if (h.length > 1 && !h.startsWith("#/")) {
    try {
      const el = document.querySelector(h);
      if (el) el.scrollIntoView();
    } catch (e) {
      // not a valid selector
    }
  } else {
    window.scrollTo(0, 0);
  }
}

async function enrutar() {
  const m = location.hash.match(/^#\/categoria\/(\d+)/);
  const b = location.hash.match(/^#\/buscar\/(.+)$/);
  if (m) await abrirCatalogo(m[1]);
  else if (b) {
    let q = "";
    try {
      q = decodeURIComponent(b[1]);
    } catch (e) {
      q = b[1];
    }
    await abrirBusqueda(q);
  } else cerrarCatalogo();
}

function prepararFiltros() {
  filtros = { marca: "", min: "", max: "", stock: true };
  const sel = document.getElementById("fMarca");
  if (!sel) return;
  const cuenta = new Map();
  vista.productos.forEach((p) => p.marca && cuenta.set(p.marca, (cuenta.get(p.marca) || 0) + 1));
  sel.innerHTML =
    '<option value="">Todas</option>' +
    Array.from(cuenta)
      .sort((a, b) => a[0].localeCompare(b[0], "es"))
      .map(([m, n]) => `<option value="${esc(m)}">${esc(m)} (${n})</option>`)
      .join("");
  document.getElementById("fMin").value = "";
  document.getElementById("fMax").value = "";
  document.getElementById("fStock").checked = true;
  pintarCuentaFiltros();
}

function pintarCuentaFiltros() {
  const n = (filtros.marca ? 1 : 0) + (filtros.min !== "" ? 1 : 0) + (filtros.max !== "" ? 1 : 0) + (filtros.stock ? 0 : 1);
  const el = document.getElementById("filtrosCuenta");
  if (el) el.textContent = n ? `(${n})` : "";
}

(function eventosFiltros() {
  const caja = document.getElementById("filtros");
  const btn = document.getElementById("filtrosBtn");
  if (!caja || !btn) return;
  btn.addEventListener("click", () => {
    caja.hidden = !caja.hidden;
    btn.setAttribute("aria-expanded", String(!caja.hidden));
  });
  const leer = () => {
    filtros = {
      marca: document.getElementById("fMarca").value,
      min: document.getElementById("fMin").value.trim(),
      max: document.getElementById("fMax").value.trim(),
      stock: document.getElementById("fStock").checked,
    };
    vista.pagina = 1;
    pintarCuentaFiltros();
    pintarCatalogo();
  };
  let t = null;
  caja.addEventListener("change", leer);
  caja.addEventListener("input", (e) => {
    if (e.target.type !== "number") return;
    clearTimeout(t);
    t = setTimeout(leer, 400);
  });
  document.getElementById("fLimpiar").addEventListener("click", () => {
    document.getElementById("fMarca").value = "";
    document.getElementById("fMin").value = "";
    document.getElementById("fMax").value = "";
    document.getElementById("fStock").checked = true;
    leer();
  });
})();

function iniciarEventosCatalogo() {
  const buscar = document.getElementById("buscarProducto");
  const orden = document.getElementById("ordenProducto");
  const pager = document.getElementById("paginacion");

  if (buscar) {
    buscar.addEventListener("input", () => {
      vista.q = buscar.value.trim();
      vista.pagina = 1;
      pintarCatalogo();
    });
  }
  if (orden) {
    orden.addEventListener("change", () => {
      vista.orden = orden.value;
      vista.pagina = 1;
      pintarCatalogo();
    });
  }
  if (pager) {
    pager.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-pag]");
      if (!b || b.disabled) return;
      vista.pagina = Number(b.dataset.pag);
      pintarCatalogo();
      document.getElementById("catalogo").scrollIntoView({ block: "start" });
    });
  }
}

/* ---------- Start ---------- */
const datosListos = cargarDatos();
crearMenuProductos();
iniciarEventosCatalogo();
window.addEventListener("hashchange", enrutar);
datosListos.then(enrutar);



function pagarCarrito(btn) {
  if (!carrito.length) return;
  return pagarItems(
    carrito.map((i) => ({ producto_id: i.id, cantidad: i.qty })),
    btn
  );
}


// ===== Shopping cart (own page) + Mercado Pago =====
// Address of pagos-server.mjs: localhost while testing, your online server when the site is live
const API_PAGOS_ONLINE = "https://api.solutelecom.mx"; // your server on Railway (DNS record in Hostinger)
const API_PAGOS = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "http://localhost:3001"
  : API_PAGOS_ONLINE;
window.API_PAGOS = API_PAGOS;
const CLAVE_CARRITO = "solutelecom_carrito";
let carrito = [];

const ICONO_BASURA =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>';

function guardarCarrito() {
  try {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
  } catch (e) {
    // storage not available
  }
}

function cargarCarrito() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_CARRITO) || "[]");
    carrito = Array.isArray(d) ? d.filter((i) => i && i.id && i.qty > 0) : [];
  } catch (e) {
    carrito = [];
  }
}

// same rule as the server: USD + margin - discount, x exchange rate, + IVA
function precioUnitario(usd) {
  const m = typeof MARGEN === "number" ? MARGEN : 0.02;
  const d = typeof DESCUENTO === "number" ? DESCUENTO : 0;
  const iva = typeof IVA === "number" ? IVA : 0.16;
  const tc = typeof tipoCambio === "number" ? tipoCambio : 18.5;
  return Math.round(usd * (1 + m) * (1 - d) * tc * (1 + iva) * 100) / 100;
}

function dinero(n) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

function agregarAlCarrito(p, cantidad = 1) {
  const n = Math.max(1, Math.floor(Number(cantidad) || 1));
  const usd = precioBase(p).usd;
  const max = Number(p.total_existencia) || 0;
  if (isNaN(usd) || max <= 0) return false;

  const id = String(p.producto_id);
  const actual = carrito.find((i) => i.id === id);
  if (actual) {
    actual.qty = Math.min(actual.qty + n, max, 100);
    actual.max = max;
    actual.sel = true;
  } else {
    carrito.push({
      id,
      titulo: p.titulo || p.modelo,
      marca: p.marca || "",
      modelo: p.modelo || "",
      img: p.img_portada || "",
      usd,
      max,
      qty: Math.min(n, max, 100),
      sel: true,
    });
  }
  guardarCarrito();
  renderCarrito();
  return true;
}

// updates the header button, and the cart page when it is open
function renderCarrito() {
  const btn = document.getElementById("cartBtn");
  const cantidad = carrito.reduce((s, i) => s + i.qty, 0);
  if (btn) btn.textContent = "Carrito" + (cantidad ? " (" + cantidad + ")" : "");
  const enBarra = document.getElementById("sbCartCount");
  if (enBarra) enBarra.textContent = cantidad ? String(cantidad) : "";
  const prodBtn = document.querySelector(".prod-btn");
  if (prodBtn) prodBtn.setAttribute("data-carrito", cantidad ? String(cantidad) : "");
  if (document.body.classList.contains("vista-carrito")) pintarPaginaCarrito();
}
const CLAVE_DATOS = "solutelecom_datos";
let pasoCarrito = "carrito"; // "carrito" | "datos"

const ESTADOS = ["Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"];
const REGIMENES = ["601 - General de Ley Personas Morales", "612 - Personas Físicas con Actividades Empresariales y Profesionales", "626 - Régimen Simplificado de Confianza (RESICO)", "605 - Sueldos y Salarios", "616 - Sin obligaciones fiscales"];
const USOS_CFDI = ["G01 - Adquisición de mercancías", "G03 - Gastos en general", "S01 - Sin efectos fiscales"];

function leerDatos() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_DATOS) || "{}") || {};
  } catch (e) {
    return {};
  }
}

function guardarDatos(d) {
  try {
    localStorage.setItem(CLAVE_DATOS, JSON.stringify(d));
  } catch (e) {
    // storage not available
  }
}

function guardarDatosForm(form) {
  const d = leerDatos();
  new FormData(form).forEach((v, k) => {
    if (k !== "acepto") d[k] = String(v);
  });
  d.factura = !!(form.elements.factura && form.elements.factura.checked);
  guardarDatos(d);
}

function cfCampo(nombre, etiqueta, o = {}) {
  const d = leerDatos();
  return `<label class="cf-field ${o.cls || ""}"><span>${etiqueta}</span><input name="${nombre}" type="${o.tipo || "text"}" value="${esc(d[nombre] || "")}" ${o.req === false ? "" : "required"} ${o.attrs || ""}></label>`;
}

function cfSelect(nombre, etiqueta, opciones) {
  const d = leerDatos();
  const ops = opciones
    .map((o) => `<option value="${esc(o)}" ${d[nombre] === o ? "selected" : ""}>${esc(o)}</option>`)
    .join("");
  return `<label class="cf-field"><span>${etiqueta}</span><select name="${nombre}" required><option value="">Selecciona…</option>${ops}</select></label>`;
}

// Signed-in customers: fill in empty fields from "Mi cuenta"
function aplicarCuenta() {
  const c = window.cuentaCliente;
  if (!c) return;
  const d = leerDatos();
  const dir = (c.direcciones || [])[0];
  if (dir && !d.calle) Object.assign(d, dir);
  if (!d.email && c.email) d.email = c.email;
  if (!d.telefono && c.telefono) d.telefono = c.telefono;
  if (c.fiscal && c.fiscal.rfc && !d.rfc) Object.assign(d, c.fiscal);
  guardarDatos(d);
}

function htmlDireccionesGuardadas() {
  const c = window.cuentaCliente;
  const lista = (c && c.direcciones) || [];
  if (!lista.length) {
    return c
      ? `<p class="cf-guardadas-nota">¿Compras seguido? Guarda tus direcciones en <a href="#" data-cuenta-dir>Mi cuenta</a>.</p>`
      : "";
  }
  return `<label class="cf-field cf-full cf-guardadas"><span>Usar una dirección guardada</span>
      <select id="dirGuardada">
        <option value="">Elegir…</option>
        ${lista.map((d, i) => `<option value="${i}">${esc(d.nombre)} · ${esc(d.calle)} ${esc(d.numero)}, ${esc(d.ciudad)}</option>`).join("")}
      </select></label>`;
}

function htmlFormulario() {
  aplicarCuenta();
  const d = leerDatos();
  const fact = !!d.factura;
  return `
    <form id="datosForm" class="cp-card cf-card" autocomplete="on">
      <h3>Datos de entrega</h3>
      ${htmlDireccionesGuardadas()}
      <div class="cf-grid">
        ${cfCampo("nombre", "Nombre completo", { cls: "cf-full", attrs: 'autocomplete="name"' })}
        ${cfCampo("telefono", "Teléfono (10 dígitos)", { tipo: "tel", attrs: 'minlength="10" autocomplete="tel"' })}
        ${cfCampo("email", "Correo electrónico", { tipo: "email", attrs: 'autocomplete="email"' })}
        ${cfCampo("calle", "Calle", { cls: "cf-wide", attrs: 'autocomplete="address-line1"' })}
        ${cfCampo("numero", "Número", { cls: "cf-narrow" })}
        ${cfCampo("colonia", "Colonia")}
        ${cfCampo("cp", "Código postal", { attrs: 'pattern="[0-9]{5}" maxlength="5" inputmode="numeric" autocomplete="postal-code"' })}
        ${cfCampo("ciudad", "Ciudad o municipio")}
        ${cfSelect("estado", "Estado", ESTADOS)}
        <label class="cf-field cf-full"><span>Referencias de entrega (opcional)</span><textarea name="referencias" rows="2">${esc(d.referencias || "")}</textarea></label>
      </div>

      <label class="cp-check cf-fact"><input type="checkbox" name="factura" ${fact ? "checked" : ""}> Necesito factura (CFDI)</label>
      ${
        fact
          ? `<div class="cf-grid">
        ${cfCampo("rfc", "RFC", { attrs: 'pattern="[A-Za-zÑñ&]{3,4}[0-9]{6}[A-Za-z0-9]{3}" maxlength="13" style="text-transform:uppercase"' })}
        ${cfCampo("razon", "Nombre o razón social")}
        <p class="cf-hint">Escríbelo exactamente como en tu Constancia de Situación Fiscal, sin “S.A. de C.V.”. Tu factura llegará a tu correo al aprobarse el pago.</p>
        ${cfCampo("cpfiscal", "Código postal fiscal", { attrs: 'pattern="[0-9]{5}" maxlength="5" inputmode="numeric"' })}
        ${cfSelect("regimen", "Régimen fiscal", REGIMENES)}
        ${cfSelect("usocfdi", "Uso de CFDI", USOS_CFDI)}
      </div>`
          : ""
      }

      <p class="cf-note">El costo de envío se calcula con tu dirección y se suma al total.</p>
      <label class="cp-check cf-terms"><input type="checkbox" name="acepto" required> <span>Acepto los <a href="terminos.html" target="_blank">términos y condiciones</a> y el <a href="privacidad.html" target="_blank">aviso de privacidad</a>.</span></label>
    </form>`;
}

function pintarPaginaCarrito() {
  const pagina = document.getElementById("carritoPage");
  if (!pagina) return;

  try {
    if (!carrito.length) {
      pasoCarrito = "carrito";
      pagina.innerHTML = `
        <div class="cp-wrap">
          <h2>Carrito</h2>
          <div class="cp-card cp-empty">
            <p>Tu carrito está vacío.</p>
            <button type="button" class="pc-btn cp-pay" data-cp="productos">Ver productos</button>
          </div>
        </div>`;
      return;
    }

    const elegidos = carrito.filter((i) => i.sel !== false);
    if (!elegidos.length && pasoCarrito === "datos") pasoCarrito = "carrito";

    const todos = elegidos.length === carrito.length;
    let subtotal = 0;
    let unidades = 0;
    elegidos.forEach((i) => {
      subtotal += Math.round(precioUnitario(i.usd) * i.qty * 100) / 100;
      unidades += i.qty;
    });

    // ---- Step 2: delivery data ----
    if (pasoCarrito === "datos") {
      const lineas = elegidos
        .map(
          (i) =>
            `<div class="cp-line"><span>${esc(String(i.titulo).slice(0, 50))} × ${i.qty}</span><span>${dinero(Math.round(precioUnitario(i.usd) * i.qty * 100) / 100)}</span></div>`
        )
        .join("");

      pagina.innerHTML = `
        <div class="cp-wrap">
          <h2>Datos de entrega</h2>
          <div class="cp-layout">
            ${htmlFormulario()}
            <aside class="cp-card cp-summary">
              <h3>Resumen de compra</h3>
              ${lineas}
              <div class="cp-line"><span>Envío</span><span id="cpEnvio">Completa tu dirección</span></div>
              <div class="cp-total"><span>Total</span><strong id="cpTotal" data-subtotal="${subtotal}">${dinero(subtotal)}</strong></div>
              <small id="cpEnvioMsg" class="cp-envio-msg"></small>
              <small class="cp-iva">IVA incluido</small>
              <button type="submit" form="datosForm" class="pc-btn cp-pay" id="cpPagar" disabled>Pagar con Mercado Pago</button>
              <p class="cp-note">Pago seguro con Mercado Pago: tarjeta, efectivo o transferencia SPEI.</p>
              <button type="button" class="cp-back cp-linkbtn" data-cp="volver">← Volver al carrito</button>
            </aside>
          </div>
        </div>`;
      return;
    }

    // ---- Step 1: the cart ----
    const filas = carrito
      .map((i) => {
        const unit = precioUnitario(i.usd);
        return `
          <div class="cp-item">
            <label class="cp-check"><input type="checkbox" data-cp="sel" data-id="${esc(i.id)}" ${i.sel !== false ? "checked" : ""} aria-label="Seleccionar"></label>
            <img class="cp-img" src="${esc(i.img)}" alt="" onerror="this.style.visibility='hidden'">
            <div class="cp-main">
              <div class="cp-top">
                <span class="cp-title">${esc(i.titulo)}</span>
                <button type="button" class="cp-del" data-cp="quitar" data-id="${esc(i.id)}" aria-label="Eliminar">${ICONO_BASURA}</button>
              </div>
              <span class="cp-sub">${esc(i.marca)}${i.modelo ? " · " + esc(i.modelo) : ""}</span>
              <div class="cp-qtyrow">
                <div class="cp-stepper">
                  <button type="button" data-cp="menos" data-id="${esc(i.id)}" ${i.qty <= 1 ? "disabled" : ""} aria-label="Menos">−</button>
                  <span>${i.qty}</span>
                  <button type="button" data-cp="mas" data-id="${esc(i.id)}" ${i.qty >= i.max ? "disabled" : ""} aria-label="Más">+</button>
                </div>
                <span class="cp-stock">${i.max} disponibles</span>
              </div>
            </div>
            <div class="cp-price">
              <strong>${dinero(Math.round(unit * i.qty * 100) / 100)}</strong>
              ${i.qty > 1 ? `<small>${dinero(unit)} c/u</small>` : ""}
            </div>
          </div>`;
      })
      .join("");

    pagina.innerHTML = `
      <div class="cp-wrap">
        <h2>Carrito</h2>
        <div class="cp-layout">
          <div class="cp-list">
            <div class="cp-card">
              <div class="cp-head">
                <label class="cp-check"><input type="checkbox" data-cp="todos" ${todos ? "checked" : ""}> Todos los productos</label>
                <button type="button" class="cp-link" data-cp="vaciar">Vaciar carrito</button>
              </div>
              ${filas}
            </div>
          </div>
          <aside class="cp-card cp-summary">
            <h3>Resumen de compra</h3>
            <div class="cp-line"><span>Productos (${unidades})</span><span>${dinero(subtotal)}</span></div>
            <div class="cp-line"><span>Envío</span><span>Se calcula con tu dirección</span></div>
            <div class="cp-total"><span>Subtotal</span><strong>${dinero(subtotal)}</strong></div>
            <small class="cp-iva">IVA incluido</small>
            <button type="button" class="pc-btn cp-pay" data-cp="continuar" ${elegidos.length ? "" : "disabled"}>Continuar compra</button>
            <button type="button" class="cp-linkbtn cp-cot" data-cp="cotizacion" ${elegidos.length ? "" : "disabled"}>Descargar cotización (PDF)</button>
            <p class="cp-note">Pago seguro con Mercado Pago: tarjeta, efectivo o transferencia SPEI.</p>
            <a class="cp-back" href="#top">← Seguir comprando</a>
          </aside>
        </div>
      </div>`;
  } catch (err) {
    console.error("Error al dibujar el carrito:", err);
    pagina.innerHTML =
      '<div class="cp-wrap"><p>No se pudo mostrar el carrito: ' + esc(err.message) + "</p></div>";
  }
}
///
async function pagarItems(items, btn, cliente) {
  const texto = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Un momento…";

  try {
    const cabeceras = { "Content-Type": "application/json" };
    const token = window.obtenerTokenCuenta ? await window.obtenerTokenCuenta() : null;
    if (token) cabeceras.Authorization = "Bearer " + token;
    const r = await fetch(API_PAGOS + "/crear-pago", {
      method: "POST",
      headers: cabeceras,
      body: JSON.stringify({ items, cliente }),
    });
    const d = await r.json();
    if (!r.ok || !d.init_point) throw new Error(d.error || "Error");
    window.location.href = d.init_point;
  } catch (err) {
    alert("No se pudo iniciar el pago: " + err.message);
    btn.disabled = false;
    btn.textContent = texto;
  }
}

// clicks inside the cart page
function clicPaginaCarrito(e) {
  const el = e.target.closest("[data-cp]");
  if (!el) return;
  const acc = el.dataset.cp;

  if (acc === "continuar") {
    if (!carrito.some((i) => i.sel !== false)) return;
    pasoCarrito = "datos";
    pintarPaginaCarrito();
    window.scrollTo(0, 0);
    return;
  }
  if (acc === "volver") {
    pasoCarrito = "carrito";
    pintarPaginaCarrito();
    window.scrollTo(0, 0);
    return;
  }
  if (acc === "productos") {
    location.hash = "#top";
    setTimeout(() => {
      const b = document.querySelector(".prod-btn");
      if (b) b.click();
    }, 80);
    return;
  }
  if (acc === "vaciar") {
    carrito = [];
  } else if (acc === "todos") {
    const v = el.checked;
    carrito.forEach((i) => {
      i.sel = v;
    });
  } else {
    const item = carrito.find((i) => i.id === el.dataset.id);
    if (!item) return;
    if (acc === "mas") item.qty = Math.min(item.qty + 1, item.max, 100);
    if (acc === "menos") item.qty = Math.max(1, item.qty - 1);
    if (acc === "quitar") item.qty = 0;
    if (acc === "sel") item.sel = el.checked;
  }

  carrito = carrito.filter((i) => i.qty > 0);
  guardarCarrito();
  renderCarrito();
}

// "Comprar" and "Poner al carrito" buttons on the product cards
document.addEventListener("click", async (e) => {
  const add = e.target.closest("button[data-add]");
  const buy = e.target.closest("button[data-buy]");
  if (!add && !buy) return;

  const boton = add || buy;
  const id = boton.dataset.add || boton.dataset.buy;
  
  // Ensure we search using the correct property key (producto_id)
  const p = buscarProductoMostrado(id);
  if (!p) return;

  const cantidad = Number(boton.dataset.qty) || 1;
  if (add) {
    if (!agregarAlCarrito(p, cantidad)) return;
    if (window.cerrarVistaRapida) window.cerrarVistaRapida();
    if (window.abrirCarritoLateral) window.abrirCarritoLateral(p.producto_id);
    return;
  }

  // Comprar: add this product, select only it, and go to the delivery data step
  if (window.cerrarVistaRapida) window.cerrarVistaRapida();
  if (!agregarAlCarrito(p, cantidad)) return;
  
  // Make sure cart item matching uses the correct property (change 'i.id' to 'i.producto_id' if needed)
  carrito.forEach((i) => {
    const itemId = String(i.producto_id || i.id);
    i.sel = itemId === String(id);
  });
  
  guardarCarrito();
  pasoCarrito = "datos";
  if (location.hash === "#/carrito") renderCarrito();
  else location.hash = "#/carrito";
});

// show / hide the cart page (#/carrito)
function rutaCarrito() {
  const body = document.body;

  if (location.hash === "#/carrito") {
    body.classList.remove("vista-catalogo");
    ocultarInicio();
    body.classList.add("vista-carrito");
    pintarPaginaCarrito();
    window.scrollTo(0, 0);
    return;
  }

  if (!body.classList.contains("vista-carrito")) return;
  body.classList.remove("vista-carrito");

  // going to a category: the catalog code takes over
  if (/^#\/(categoria|buscar)\//.test(location.hash)) return;

  mostrarInicio();
  const h = location.hash;
  if (h.length > 1 && !h.startsWith("#/")) {
    try {
      const el = document.querySelector(h);
      if (el) el.scrollIntoView();
    } catch (e) {
      // not a valid selector
    }
  } else {
    window.scrollTo(0, 0);
  }
}

(function iniciarCarrito() {
  cargarCarrito();

  // empty the cart after an approved payment
  if (new URLSearchParams(location.search).get("pago") === "exitoso") {
    carrito = [];
    guardarCarrito();
  }

  let pagina = document.getElementById("carritoPage");
  if (!pagina) {
    pagina = document.createElement("section");
    pagina.id = "carritoPage";
    pagina.className = "cp-section";
    document.body.appendChild(pagina);
  }
  pagina.addEventListener("click", clicPaginaCarrito);

  // the header "Carrito" button opens the page instead of a dropdown
  document.addEventListener(
    "click",
    (e) => {
      if (!e.target.closest("#cartBtn")) return;
      e.preventDefault();
      e.stopPropagation();
      location.hash = "#/carrito";
    },
    true
  );

  window.addEventListener("hashchange", rutaCarrito);
  renderCarrito();
  datosListos.then(renderCarrito); // recalculate prices once the exchange rate loads
  rutaCarrito();
})();


// ===== Cart page styles (self-contained) =====
(function estilosCarrito() {
  if (document.getElementById("cp-styles")) return;

  const css = `
    #carritoPage { display: none; min-height: 70vh; padding: 32px 20px 70px; color: #fff; box-sizing: border-box; }
    body.vista-carrito #carritoPage { display: block; }
    #carritoPage *, #carritoPage *::before, #carritoPage *::after { box-sizing: border-box; }

    .cp-wrap { max-width: 1100px; margin: 0 auto; }
    .cp-wrap h2 { margin: 0 0 20px; font-size: 1.8rem; }

    .cp-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 20px; align-items: start; }

    .cp-card { background: #1a1a1d; border: 1px solid #2b2b2f; border-radius: 14px; overflow: hidden; }

    .cp-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; }
    .cp-check { display: flex; align-items: center; gap: 12px; cursor: pointer; font-weight: 600; }
    .cp-check input { width: 18px; height: 18px; accent-color: #ffd21f; cursor: pointer; margin: 0; }
    .cp-link { background: none; border: 0; padding: 0; color: #ffd21f; font: inherit; cursor: pointer; }
    .cp-link:hover { text-decoration: underline; }

    .cp-item { display: grid; grid-template-columns: auto 96px minmax(0, 1fr) auto; gap: 16px; align-items: start; padding: 18px 20px; border-top: 1px solid #2b2b2f; }
    .cp-img { width: 96px; height: 96px; object-fit: contain; background: #fff; border-radius: 10px; display: block; }

    .cp-main { min-width: 0; }
    .cp-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
    .cp-title { line-height: 1.35; font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .cp-sub { display: block; margin-top: 4px; color: #9a9aa0; font-size: 0.85rem; }
    .cp-del { background: none; border: 0; color: #9a9aa0; cursor: pointer; padding: 4px; line-height: 0; flex: none; }
    .cp-del:hover { color: #ff7b72; }

    .cp-qtyrow { display: flex; align-items: center; flex-wrap: wrap; gap: 14px; margin-top: 12px; }
    .cp-stepper { display: inline-flex; align-items: center; border: 1px solid #3a3a3f; border-radius: 8px; overflow: hidden; background: #111113; }
    .cp-stepper button { width: 34px; height: 34px; background: transparent; border: 0; color: #ffd21f; font-size: 1.2rem; cursor: pointer; padding: 0; }
    .cp-stepper button:hover:not(:disabled) { background: #232327; }
    .cp-stepper button:disabled { color: #555; cursor: default; }
    .cp-stepper span { min-width: 38px; text-align: center; }
    .cp-stock { color: #9a9aa0; font-size: 0.85rem; }

    .cp-price { text-align: right; white-space: nowrap; }
    .cp-price strong { display: block; font-size: 1.2rem; }
    .cp-price small { color: #9a9aa0; }

    .cp-summary { padding: 22px; position: sticky; top: 96px; }
    .cp-summary h3 { margin: 0 0 14px; font-size: 1.15rem; }
    .cp-line, .cp-total { display: flex; justify-content: space-between; gap: 10px; padding: 6px 0; }
    .cp-total { margin-top: 8px; padding-top: 14px; border-top: 1px solid #2b2b2f; font-size: 1.2rem; }
    .cp-iva { display: block; margin-bottom: 16px; color: #9a9aa0; }
    .cp-pay { display: block; width: 100%; padding: 14px; border: 0; border-radius: 10px; background: #ffd21f; color: #111; font: inherit; font-weight: 700; cursor: pointer; text-align: center; }
    .cp-pay:hover:not(:disabled) { background: #ffe066; }
    .cp-pay:disabled { opacity: 0.5; cursor: not-allowed; }
    .cp-note { margin: 12px 0 0; font-size: 0.78rem; color: #9a9aa0; text-align: center; }
    .cp-back { display: block; margin-top: 14px; text-align: center; color: #ffd21f; text-decoration: none; }
    .cp-back:hover { text-decoration: underline; }

    .cp-empty { padding: 48px 20px; text-align: center; }
    .cp-empty p { margin: 0 0 18px; }
    .cp-empty .cp-pay { display: inline-block; width: auto; padding: 12px 28px; }

    @media (max-width: 860px) {
      .cp-layout { grid-template-columns: 1fr; }
      .cp-item { grid-template-columns: auto 72px minmax(0, 1fr); }
      .cp-img { width: 72px; height: 72px; }
      .cp-price { grid-column: 3; text-align: left; }
      .cp-summary { position: static; }
    }
  `;

  const st = document.createElement("style");
  st.id = "cp-styles";
  st.textContent = css;
  document.head.appendChild(st);
})();

// ===== Delivery form: events and styles =====
(function formularioEntrega() {
  const pagina = document.getElementById("carritoPage");
  if (pagina) {
    pagina.addEventListener("input", (e) => {
      const f = e.target.closest("#datosForm");
      if (f) guardarDatosForm(f);
    });

    pagina.addEventListener("change", (e) => {
      const f = e.target.closest("#datosForm");
      if (!f) return;
      guardarDatosForm(f);
      if (e.target.name === "factura") pintarPaginaCarrito();
    });

    pagina.addEventListener("submit", (e) => {
      const f = e.target.closest("#datosForm");
      if (!f) return;
      e.preventDefault();
      guardarDatosForm(f);

      const elegidos = carrito.filter((i) => i.sel !== false);
      if (!elegidos.length) return;

      const btn = document.querySelector('button[form="datosForm"]');
      pagarItems(
        elegidos.map((i) => ({ producto_id: i.id, cantidad: i.qty })),
        btn,
        leerDatos()
      );
    });
  }

  if (document.getElementById("cf-styles")) return;
  const css = `
    .cf-card { padding: 22px; }
    .cf-card h3 { margin: 0 0 16px; }
    .cf-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; margin-bottom: 8px; }
    .cf-field { display: flex; flex-direction: column; gap: 6px; grid-column: span 3; font-size: 0.9rem; color: #c9ccd4; }
    .cf-field.cf-full { grid-column: 1 / -1; }
    .cf-field.cf-wide { grid-column: span 4; }
    .cf-field.cf-narrow { grid-column: span 2; }
    .cf-field input, .cf-field select, .cf-field textarea { width: 100%; padding: 12px; background: #111113; border: 1px solid #3a3a3f; border-radius: 8px; color: #fff; font: inherit; }
    .cf-field textarea { resize: vertical; min-height: 70px; }
    .cf-field input:focus, .cf-field select:focus, .cf-field textarea:focus { outline: none; border-color: #ffd21f; }
    .cf-field input:user-invalid, .cf-field select:user-invalid { border-color: #ff7b72; }
    .cf-fact { margin: 18px 0 12px; }
    .cf-terms { margin-top: 14px; font-size: 0.9rem; font-weight: 400; }
    .cf-note { margin: 6px 0 0; color: #9a9aa0; font-size: 0.85rem; }
    .cp-linkbtn { display: block; width: 100%; background: none; border: 0; font: inherit; cursor: pointer; }
    @media (max-width: 600px) {
      .cf-field, .cf-field.cf-wide, .cf-field.cf-narrow { grid-column: 1 / -1; }
    }
  `;
  const st = document.createElement("style");
  st.id = "cf-styles";
  st.textContent = css;
  document.head.appendChild(st);
})();

// ===== Postal code: fills state, city and colonias =====
const cacheCPpagina = {};

const sinAcentos = (t) =>
  String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

const tituloCase = (t) =>
  String(t || "").toLowerCase().replace(/(^|\s)([a-záéíóúñü])/g, (m, a, b) => a + b.toUpperCase());

function estadoDeSyscom(nombre) {
  const n = sinAcentos(nombre);
  const alias = {
    "DISTRITO FEDERAL": "Ciudad de México",
    "CDMX": "Ciudad de México",
    "MEXICO": "Estado de México",
  };
  if (alias[n]) return alias[n];
  return (
    ESTADOS.find((e) => sinAcentos(e) === n) ||
    ESTADOS.find((e) => n.startsWith(sinAcentos(e))) ||
    ""
  );
}

async function consultarCP(cp) {
  if (cacheCPpagina[cp]) return cacheCPpagina[cp];
  const r = await fetch(API_PAGOS + "/cp/" + cp);
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Error");
  cacheCPpagina[cp] = d;
  return d;
}

// modo "input": the customer changed the postal code. modo "abrir": the form was just drawn.
async function enlazarCP(modo) {
  const f = document.getElementById("datosForm");
  if (!f) return;
  const cp = (f.elements.cp.value || "").trim();

  let msg = f.querySelector("#cpMsg");
  if (!msg) {
    msg = document.createElement("small");
    msg.id = "cpMsg";
    msg.className = "cf-note";
    msg.style.gridColumn = "1 / -1";
    f.elements.cp.closest("label").insertAdjacentElement("afterend", msg);
  }

  if (!/^\d{5}$/.test(cp)) {
    msg.textContent = "";
    return;
  }

  try {
    const d = await consultarCP(cp);
    if ((f.elements.cp.value || "").trim() !== cp) return; // changed meanwhile

    const est = estadoDeSyscom(d.estado);
    const cambio = modo === "input";
    const distinto = !!est && f.elements.estado.value !== est;

    if (est && (cambio || !f.elements.estado.value || distinto)) f.elements.estado.value = est;
    if (d.municipio && (cambio || !f.elements.ciudad.value || distinto)) {
      f.elements.ciudad.value = tituloCase(d.municipio);
    }

    let dl = document.getElementById("coloniasLista");
    if (!dl) {
      dl = document.createElement("datalist");
      dl.id = "coloniasLista";
      f.appendChild(dl);
    }
    dl.innerHTML = (d.colonias || []).map((c) => `<option value="${esc(tituloCase(c))}">`).join("");
    f.elements.colonia.setAttribute("list", "coloniasLista");

    const colonia = f.elements.colonia.value;
    if (
      colonia &&
      (cambio || distinto) &&
      !(d.colonias || []).some((c) => sinAcentos(c) === sinAcentos(colonia))
    ) {
      f.elements.colonia.value = "";
    }

    msg.textContent = d.zona_extendida
      ? "Zona extendida: el envío puede tardar más o tener costo adicional."
      : d.colonias && d.colonias.length
      ? "Elige tu colonia de la lista o escríbela."
      : "";
    guardarDatosForm(f);
    programarCotizacion(0);
  } catch (err) {
    msg.textContent = "No se pudo consultar el código postal. Captura tu estado y ciudad.";
  }
}

(function enlazarCodigoPostal() {
  const pagina = document.getElementById("carritoPage");
  if (!pagina) return;

  pagina.addEventListener("input", (e) => {
    if (e.target && e.target.name === "cp") enlazarCP("input");
  });

  // when the form is drawn (or redrawn), check the postal code that is already filled in
  new MutationObserver(() => {
    const f = document.getElementById("datosForm");
    if (f && !f.dataset.cpListo) {
      f.dataset.cpListo = "1";
      enlazarCP("abrir");
      programarCotizacion(0);
    }
  }).observe(pagina, { childList: true });
})();


// ===== Shipping quote (Syscom, through our server) =====
let envioActual = { clave: "", envio: null, error: "" };
let timerCotizacion = null;
let cotizacionEnCurso = 0;

const CAMPOS_DIRECCION = ["nombre", "telefono", "calle", "numero", "colonia", "cp", "ciudad", "estado"];

function claveEnvio(f, elegidos) {
  return JSON.stringify([
    elegidos.map((i) => [i.id, i.qty]),
    CAMPOS_DIRECCION.map((n) => (f.elements[n] ? f.elements[n].value.trim() : "")),
  ]);
}

function pintarEnvio(estado, texto) {
  const celda = document.getElementById("cpEnvio");
  const total = document.getElementById("cpTotal");
  const msg = document.getElementById("cpEnvioMsg");
  const pagar = document.getElementById("cpPagar");
  if (!celda || !total) return;

  const subtotal = parseFloat(total.dataset.subtotal) || 0;
  if (estado === "ok") {
    celda.textContent = envioActual.envio > 0 ? dinero(envioActual.envio) : "Gratis";
    total.textContent = dinero(Math.round((subtotal + envioActual.envio) * 100) / 100);
  } else {
    celda.textContent = estado === "cargando" ? "Calculando…" : "—";
    total.textContent = dinero(subtotal);
  }
  if (msg) msg.textContent = estado === "error" ? texto : "";
  if (pagar) pagar.disabled = estado !== "ok";
}

function programarCotizacion(espera = 700) {
  clearTimeout(timerCotizacion);
  timerCotizacion = setTimeout(cotizarEnvioPagina, espera);
}

async function cotizarEnvioPagina() {
  const f = document.getElementById("datosForm");
  if (!f) return;
  const elegidos = carrito.filter((i) => i.sel !== false);
  if (!elegidos.length) return;

  const completo = CAMPOS_DIRECCION.every((n) => f.elements[n] && f.elements[n].value.trim() && f.elements[n].checkValidity());
  if (!completo) {
    pintarEnvio("vacio");
    const celda = document.getElementById("cpEnvio");
    if (celda) celda.textContent = "Completa tu dirección";
    return;
  }

  const clave = claveEnvio(f, elegidos);
  if (clave === envioActual.clave) {
    // same cart and address: reuse the last answer
    return envioActual.error ? pintarEnvio("error", envioActual.error) : pintarEnvio("ok");
  }

  const mia = ++cotizacionEnCurso;
  pintarEnvio("cargando");
  try {
    const r = await fetch(API_PAGOS + "/cotizar-envio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: elegidos.map((i) => ({ producto_id: i.id, cantidad: i.qty })),
        cliente: leerDatos(),
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (mia !== cotizacionEnCurso) return; // the address changed meanwhile

    if (r.ok && typeof d.envio === "number") {
      envioActual = { clave, envio: d.envio, error: "" };
      pintarEnvio("ok");
    } else {
      envioActual = { clave, envio: null, error: d.error || "No se pudo calcular el envío" };
      pintarEnvio("error", envioActual.error);
    }
  } catch (err) {
    if (mia !== cotizacionEnCurso) return;
    envioActual = { clave: "", envio: null, error: "" }; // network problem: try again next time
    pintarEnvio("error", "No se pudo calcular el envío. Revisa tu conexión.");
  }
}

(function enlazarCotizacion() {
  const pagina = document.getElementById("carritoPage");
  if (!pagina) return;
  pagina.addEventListener("input", (e) => {
    if (e.target.closest("#datosForm") && CAMPOS_DIRECCION.includes(e.target.name)) programarCotizacion();
  });
  pagina.addEventListener("change", (e) => {
    if (e.target.closest("#datosForm") && CAMPOS_DIRECCION.includes(e.target.name)) programarCotizacion(0);
  });

  const st = document.createElement("style");
  st.textContent = ".cp-envio-msg { display: block; margin: -8px 0 12px; color: #ff7b72; font-size: 0.85rem; } .cp-envio-msg:empty { display: none; }";
  document.head.appendChild(st);
})();

// =========================================================
// Product search (#/buscar/...), 3D header, carousel,
// and stock per state/city
// =========================================================
const sinAcentosQ = (t) =>
  String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// asks the server (it has the whole catalog); if it is not reachable, searches the local list
// asks the server (it has the whole catalog); if it is not reachable, searches catjson/buscador.json
async function buscarProductos(q, limite = 240) {
  try {
    const r = await fetch(API_PAGOS + "/buscar?q=" + encodeURIComponent(q) + "&limit=" + limite);
    if (r.ok) {
      const d = await r.json();
      return { total: d.total || 0, productos: d.productos || [], categorias: d.categorias || { sub: [], cat: [] }, sugerencia: d.sugerencia || null };
    }
  } catch (e) {
    // server not reachable: search locally
  }
  await datosListos;
  await obtenerListaProductos();
  const frase = expandirBusqueda(sinAcentosQ(q).trim());
  const palabras = frase.split(/\s+/).filter((w) => w.length >= 2);
  if (!palabras.length) return { total: 0, productos: [], categorias: { sub: [], cat: [] } };

  const encontrados = [];
  for (const p of listaProductos) {
    if (!p._texto) p._texto = sinAcentosQ([p.titulo, p.marca, p.modelo].join(" "));
    if (!palabras.every((w) => p._texto.includes(w))) continue;
    const modelo = sinAcentosQ(p.modelo);
    let puntos = 0;
    if (modelo === frase) puntos += 100;
    else if (modelo.startsWith(frase)) puntos += 40;
    if (sinAcentosQ(p.titulo).startsWith(palabras[0])) puntos += 15;
    if ((Number(p.total_existencia) || 0) > 0) puntos += 10;
    encontrados.push({ p, puntos });
  }
  encontrados.sort((a, b) => b.puntos - a.puntos);
  return {
    total: encontrados.length,
    productos: encontrados.slice(0, limite).map((e) => e.p),
    categorias: categoriasDe(encontrados.map((e) => e.p)),
    sugerencia: encontrados.length ? null : corregirLocal(frase),
  };
}

// "¿Quisiste decir…?" without the server: compares each word with the words in the catalog
let vocabularioLocal = null;
function distanciaPalabras(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const fila = [i];
    let menor = i;
    for (let j = 1; j <= b.length; j++) {
      fila[j] = Math.min(prev[j] + 1, fila[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (fila[j] < menor) menor = fila[j];
    }
    if (menor > max) return max + 1;
    prev = fila;
  }
  return prev[b.length];
}
function corregirLocal(q) {
  if (!vocabularioLocal) {
    const cuenta = new Map();
    for (const p of listaProductos) {
      for (const w of new Set((p._texto || sinAcentosQ([p.titulo, p.marca, p.modelo].join(" "))).split(/[^a-z0-9]+/))) {
        if (w.length >= 3) cuenta.set(w, (cuenta.get(w) || 0) + 1);
      }
    }
    vocabularioLocal = Array.from(cuenta).filter(([, n]) => n >= 2);
  }
  const conocidas = new Set(vocabularioLocal.map(([w]) => w));
  let cambio = false;
  const palabras = q.split(/\s+/).map((w) => {
    if (w.length < 3 || conocidas.has(w) || /\d/.test(w)) return w;
    const max = w.length <= 4 ? 1 : 2;
    let mejor = null;
    for (const [v, n] of vocabularioLocal) {
      const d = distanciaPalabras(w, v, max);
      if (d <= max && (!mejor || d < mejor.d || (d === mejor.d && n > mejor.n))) mejor = { v, d, n };
    }
    if (mejor) {
      cambio = true;
      return mejor.v;
    }
    return w;
  });
  return cambio ? palabras.join(" ") : null;
}

// recent searches (this browser only)
const CLAVE_BUSQUEDAS = "solutelecom_busquedas";
function busquedasRecientes() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_BUSQUEDAS) || "[]");
  } catch (e) {
    return [];
  }
}
function recordarBusqueda(q) {
  const t = String(q || "").trim();
  if (t.length < 2) return;
  const lista = [t].concat(busquedasRecientes().filter((x) => x.toLowerCase() !== t.toLowerCase())).slice(0, 6);
  try {
    localStorage.setItem(CLAVE_BUSQUEDAS, JSON.stringify(lista));
  } catch (e) {
    // storage not available
  }
}

// common shorthand -> how Syscom writes it (4mp -> 4 megapixel, 1tb -> 1 tb, cat6 -> cat 6 ...)
function expandirBusqueda(t) {
  return t
    .replace(/(\d+(?:\.\d+)?)\s*mpx?\b/g, "$1 megapixel")
    .replace(/\bmegapixeles\b/g, "megapixel")
    .replace(/(\d+)\s*(tb|gb)\b/g, "$1 $2")
    .replace(/\bcat\s*(5e|6a|6|7)\b/g, "cat$1")
    .replace(/\bcamaras\b/g, "camara")
    .replace(/\s+/g, " ")
    .trim();
}

const rutasCache = new Map();
// most common categories among the results (deepest level, and the level above it)
function categoriasDe(lista) {
  const sub = new Map();
  const cat = new Map();
  for (const p of lista) {
    for (const id of p._cats || []) {
      if (!rutasCache.has(id)) rutasCache.set(id, rutaDe(id) || []);
      const ruta = rutasCache.get(id);
      if (ruta.length) {
        const hoja = ruta[ruta.length - 1];
        sub.set(hoja.id, { id: hoja.id, nombre: hoja.nombre, n: ((sub.get(hoja.id) || {}).n || 0) + 1 });
      }
      if (ruta.length >= 2) {
        const medio = ruta[1];
        cat.set(medio.id, { id: medio.id, nombre: medio.nombre, n: ((cat.get(medio.id) || {}).n || 0) + 1 });
      }
    }
  }
  const top = (m, k) => Array.from(m.values()).sort((a, b) => b.n - a.n).slice(0, k);
  return { sub: top(sub, 6), cat: top(cat, 5) };
}

function irABusqueda(q) {
  recordarBusqueda(q);
  const destino = "#/buscar/" + encodeURIComponent(q.trim());
  if (location.hash === destino) enrutar();
  else location.hash = destino;
}

async function abrirBusqueda(q) {
  const mia = ++peticionActual;
  ocultarInicio();
  document.body.classList.add("vista-catalogo");

  const grid = document.getElementById("productosGrid");
  const info = document.getElementById("catalogoInfo");
  const pager = document.getElementById("paginacion");
  const titulo = document.getElementById("catalogoTitulo");
  const migas = document.getElementById("catMigas");
  if (grid) grid.innerHTML = htmlEsqueletos(8);
  if (pager) pager.innerHTML = "";
  if (info) info.textContent = "";
  if (titulo) titulo.textContent = `Resultados para “${q}”`;
  if (migas) migas.innerHTML = '<a href="#top">Inicio</a> › <span>Búsqueda</span>';
  window.scrollTo(0, 0);

  const r = await buscarProductos(q);
  if (mia !== peticionActual) return;

  vista = { id: null, productos: r.productos, pagina: 1, orden: "", q: "" };
  prepararFiltros();
  const buscar = document.getElementById("buscarProducto");
  buscar.value = "";
  buscar.placeholder = "Filtrar estos resultados";
  document.getElementById("ordenProducto").value = "";
  pintarCatalogo();
  if (!r.productos.length && grid) {
    grid.innerHTML = r.sugerencia
      ? `<p>No encontramos productos para “${esc(q)}”. ¿Quisiste decir <a class="quisiste" href="#/buscar/${encodeURIComponent(r.sugerencia)}">${esc(r.sugerencia)}</a>?</p>`
      : `<p>No encontramos productos para “${esc(q)}”. Prueba con otra palabra o con el modelo.</p>`;
  }
  if (info && r.total > r.productos.length) {
    info.textContent += ` · Mostrando los primeros ${r.productos.length} de ${r.total}, escribe algo más específico`;
  }
}

// the category page resets the search box text
(function () {
  const original = abrirCatalogo;
  abrirCatalogo = async function (id) {
    const buscar = document.getElementById("buscarProducto");
    if (buscar) buscar.placeholder = "Buscar en esta categoría";
    return original(id);
  };
})();

// ----- Hero search with live suggestions -----
(function buscadorHero() {
  const form = document.getElementById("heroSearch");
  const input = document.getElementById("heroQ");
  const caja = document.getElementById("heroSug");
  if (!form || !input || !caja) return;

  let timer = null;
  let ultima = 0;
  let activo = -1;

  const cerrar = () => {
    caja.hidden = true;
    activo = -1;
    input.setAttribute("aria-expanded", "false");
  };
  const items = () => Array.from(caja.querySelectorAll(".hs-item"));

  async function sugerir() {
    const q = input.value.trim();
    if (q.length < 2) return cerrar();
    const mia = ++ultima;
    const r = await buscarProductos(q, 8);
    if (mia !== ultima) return;

    const cats = r.categorias || { sub: [], cat: [] };
    const lista = (t, arr) =>
      arr.length
        ? `<h5>${t}</h5><ul>${arr.map((c) => `<li><a href="#/categoria/${esc(c.id)}">${esc(c.nombre)}</a></li>`).join("")}</ul>`
        : "";
    const columna = lista("Subcategorías relevantes", cats.sub || []) + lista("Categorías", cats.cat || []);

    const productosHtml = r.productos.length
      ? r.productos
          .map((p) => {
            recordarProducto(p);
            const b = precioBase(p);
            const stock = Number(p.total_existencia) || 0;
            const id = esc(p.producto_id);
            return `<div class="hs-item" role="option" data-vista="${id}" tabindex="-1">
                <img src="${esc(p.img_portada)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
                <div class="hs-info">
                  <span class="hs-t">${esc(p.titulo)}</span>
                  <span class="hs-m"><span>${esc(p.modelo)}</span><span class="hs-marca">${esc(p.marca)}</span></span>
                  <div class="hs-fila">
                    <span class="hs-p">${isNaN(b.usd) ? "Consultar" : "MXN " + dinero(precioUnitario(b.usd))}<small>IVA incluido</small></span>
                    ${stock > 0 ? `<span class="hs-stock">${stock > 500 ? "500+" : stock}</span>` : `<span class="hs-stock no">Sin stock</span>`}
                    ${
                      stock > 0
                        ? `<span class="hs-cant"><button type="button" data-sq="-1" aria-label="Menos">−</button><input type="number" value="1" min="1" max="${Math.min(stock, 100)}" aria-label="Cantidad"><button type="button" data-sq="1" aria-label="Más">+</button></span>
                           <button type="button" class="hs-add" data-add="${id}" data-qty="1">Agregar</button>`
                        : ""
                    }
                  </div>
                </div>
              </div>`;
          })
          .join("") +
        `<a class="hs-all" href="#/buscar/${encodeURIComponent(q)}">Ver los ${r.total.toLocaleString("es-MX")} resultados ›</a>`
      : r.sugerencia
      ? `<p class="hs-empty">Sin resultados para “${esc(q)}”. ¿Quisiste decir <a class="quisiste" href="#" data-quisiste="${esc(r.sugerencia)}">${esc(r.sugerencia)}</a>?</p>`
      : `<p class="hs-empty">Sin resultados para “${esc(q)}”. Prueba con otra palabra o el modelo.</p>`;

    caja.innerHTML = `${columna ? `<div class="hs-cats">${columna}</div>` : ""}<div class="hs-prods">${productosHtml}</div>`;
    caja.classList.toggle("con-cats", !!columna);
    caja.hidden = false;
    activo = -1;
    input.setAttribute("aria-expanded", "true");
  }

  // quantity buttons inside the suggestions
  caja.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sq]");
    if (!b) return;
    e.stopPropagation();
    const fila = b.closest(".hs-item");
    const campo = fila.querySelector(".hs-cant input");
    const max = Number(campo.max) || 100;
    campo.value = Math.min(Math.max((Number(campo.value) || 1) + Number(b.dataset.sq), 1), max);
    fila.querySelector(".hs-add").dataset.qty = campo.value;
  });
  caja.addEventListener("change", (e) => {
    if (!e.target.matches(".hs-cant input")) return;
    const max = Number(e.target.max) || 100;
    e.target.value = Math.min(Math.max(Math.floor(Number(e.target.value) || 1), 1), max);
    e.target.closest(".hs-item").querySelector(".hs-add").dataset.qty = e.target.value;
  });
  caja.addEventListener("click", (e) => {
    if (e.target.closest(".hs-cant input")) e.stopPropagation();
  }, true);

  function mostrarRecientes() {
    const lista = busquedasRecientes();
    if (input.value.trim() || !lista.length) return;
    caja.classList.remove("con-cats");
    caja.innerHTML = `<div class="hs-prods hs-recientes">
        <div class="hs-rec-head"><span>Búsquedas recientes</span><button type="button" data-rec-borrar>Borrar</button></div>
        ${lista.map((t) => `<a href="#" class="hs-rec" data-quisiste="${esc(t)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${esc(t)}</a>`).join("")}
      </div>`;
    caja.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }
  input.addEventListener("focus", mostrarRecientes);
  input.addEventListener("input", () => {
    clearTimeout(timer);
    if (!input.value.trim()) return mostrarRecientes();
    timer = setTimeout(sugerir, 220);
  });
  // "¿Quisiste decir…?" and recent searches: run that search
  caja.addEventListener("click", (e) => {
    const borrar = e.target.closest("[data-rec-borrar]");
    if (borrar) {
      e.stopPropagation();
      try { localStorage.removeItem(CLAVE_BUSQUEDAS); } catch (err) { /* ignore */ }
      return cerrar();
    }
    const q = e.target.closest("[data-quisiste]");
    if (!q) return;
    e.preventDefault();
    e.stopPropagation();
    input.value = q.dataset.quisiste;
    sugerir();
    input.focus();
  });

  input.addEventListener("keydown", (e) => {
    const lista = items();
    if (caja.hidden || !lista.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      activo = (activo + (e.key === "ArrowDown" ? 1 : -1) + lista.length) % lista.length;
      lista.forEach((a, i) => a.classList.toggle("active", i === activo));
    } else if (e.key === "Enter" && activo >= 0) {
      e.preventDefault();
      cerrar();
      if (window.abrirVistaRapida) window.abrirVistaRapida(lista[activo].dataset.vista);
    } else if (e.key === "Escape") {
      cerrar();
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return input.focus();
    cerrar();
    irABusqueda(q);
  });

  caja.addEventListener("click", (e) => {
    if (e.target.closest("[data-quisiste], [data-rec-borrar]")) return;
    if (e.target.closest("a, [data-add]") || (e.target.closest("[data-vista]") && !e.target.closest(".hs-cant"))) {
      recordarBusqueda(input.value);
      cerrar();
    }
  });
  document.addEventListener("click", (e) => {
    if (!form.contains(e.target)) cerrar();
  });
})();

// ----- 3D header: the waves and the grid floor follow the mouse -----
(function header3D() {
  const hero = document.getElementById("hero");
  if (!hero) return;
  if (!window.matchMedia("(pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let pendiente = null;
  hero.addEventListener("mousemove", (e) => {
    const caja = hero.getBoundingClientRect();
    const x = (e.clientX - caja.left) / caja.width - 0.5;
    const y = (e.clientY - caja.top) / caja.height - 0.5;
    if (pendiente) return;
    pendiente = requestAnimationFrame(() => {
      hero.style.setProperty("--ry", (x * 8).toFixed(2) + "deg");
      hero.style.setProperty("--rx", (y * -6).toFixed(2) + "deg");
      pendiente = null;
    });
  });
  hero.addEventListener("mouseleave", () => {
    hero.style.setProperty("--ry", "0deg");
    hero.style.setProperty("--rx", "0deg");
  });
})();

// ----- 3D carousel of featured products -----
(function carrusel3D() {
  const cont = document.getElementById("heroCarousel");
  const ring = document.getElementById("hcRing");
  if (!cont || !ring) return;

  const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let productos = [];
  let paso = 36;
  let angulo = 0;
  let objetivo = null;
  let pausado = false;
  let arrastre = null;
  let movido = false;
  let antes = performance.now();

  async function cargar() {
    let lista = [];
    try {
      const r = await fetch(API_PAGOS + "/destacados");
      if (r.ok) lista = (await r.json()).productos || [];
    } catch (e) {
      // server not reachable: use the local list
    }
    if (!lista.length) {
      await datosListos;
      // without the server: also a different set every 30 minutes
      const periodo = Math.floor(Date.now() / (30 * 60000));
      await obtenerListaProductos();
      const buenos = listaProductos.filter(
        (p) => (Number(p.total_existencia) || 0) >= 5 && p.img_portada && !isNaN(precioBase(p).usd)
      );
      const inicio = buenos.length ? (periodo * 10) % buenos.length : 0;
      lista = buenos.slice(inicio, inicio + 10);
      if (lista.length < 10) lista = lista.concat(buenos.slice(0, 10 - lista.length));
    }
    productos = lista.slice(0, 10);
    if (productos.length < 4) return; // not enough to make a ring
    pintar();
    cont.hidden = false;
    medir();
    requestAnimationFrame(cuadro);
  }

  function pintar() {
    paso = 360 / productos.length;
    ring.style.setProperty("--step", paso + "deg");
    ring.innerHTML = productos
      .map((p, i) => {
        const b = precioBase(p);
        const precio = isNaN(b.usd) ? "Consultar" : dinero(precioUnitario(b.usd));
        const desc = b.antes ? Math.round((1 - b.usd / b.antes) * 100) : 0;
        return `<a class="hc-card" style="--i:${i}" data-i="${i}" draggable="false"
                   href="#/buscar/${encodeURIComponent(p.modelo || p.titulo)}" aria-label="${esc(p.titulo)}">
            <div class="hc-img"><img src="${esc(p.img_portada)}" alt="" loading="lazy" decoding="async" onerror="this.style.visibility='hidden'"></div>
            ${desc > 0 ? `<span class="hc-badge">-${desc}%</span>` : ""}
            <div class="hc-body">
              <span class="hc-brand">${esc(p.marca)}</span>
              <span class="hc-title">${esc(p.titulo)}</span>
              <span class="hc-price">${b.antes ? `<s>${dinero(precioUnitario(b.antes))}</s>` : ""}${precio}</span>
            </div>
          </a>`;
      })
      .join("");
  }

  // ring radius from the card width, so the cards never overlap
  function medir() {
    const w = parseFloat(getComputedStyle(cont).getPropertyValue("--card-w")) || 200;
    const r = Math.round(w / 2 / Math.tan(Math.PI / productos.length)) + 26;
    cont.style.setProperty("--r", r + "px");
  }
  window.addEventListener("resize", () => productos.length && medir());

  function cuadro(ahora) {
    const dt = Math.min(ahora - antes, 50);
    antes = ahora;

    if (objetivo !== null) {
      angulo += (objetivo - angulo) * Math.min(1, dt / 140);
      if (Math.abs(objetivo - angulo) < 0.05) {
        angulo = objetivo;
        objetivo = null;
      }
    } else if (!pausado && !arrastre && !reducido) {
      angulo -= dt * 0.012; // about 12 degrees per second
    }
    ring.style.setProperty("--angle", angulo + "deg");

    // the card facing the visitor is bright, the ones behind are dimmer
    const tarjetas = ring.children;
    for (let i = 0; i < tarjetas.length; i++) {
      const rel = (((i * paso + angulo) % 360) + 540) % 360 - 180;
      const frente = Math.cos((rel * Math.PI) / 180);
      tarjetas[i].style.filter = `brightness(${(0.42 + 0.58 * Math.max(frente, 0)).toFixed(2)})`;
      tarjetas[i].classList.toggle("front", Math.abs(rel) < paso / 2);
    }
    requestAnimationFrame(cuadro);
  }

  const ajustar = (a) => Math.round(a / paso) * paso;

  cont.addEventListener("click", (e) => {
    const flecha = e.target.closest("[data-hc]");
    if (flecha) objetivo = ajustar(objetivo ?? angulo) - Number(flecha.dataset.hc) * paso;
  });

  // a card that is not in front rotates into view instead of opening
  ring.addEventListener("click", (e) => {
    const card = e.target.closest(".hc-card");
    if (!card) return;
    if (movido) {
      e.preventDefault();
      return;
    }
    if (!card.classList.contains("front")) {
      e.preventDefault();
      const i = Number(card.dataset.i);
      const destino = -i * paso;
      objetivo = angulo + ((((destino - angulo) % 360) + 540) % 360 - 180);
    }
  });

  // drag to spin
  ring.addEventListener("pointerdown", (e) => {
    arrastre = { x: e.clientX, a: angulo };
    movido = false;
    objetivo = null;
  });
  window.addEventListener("pointermove", (e) => {
    if (!arrastre) return;
    const dx = e.clientX - arrastre.x;
    if (Math.abs(dx) > 6) {
      movido = true;
      ring.classList.add("dragging");
    }
    if (movido) angulo = arrastre.a + dx * 0.35;
  });
  window.addEventListener("pointerup", () => {
    if (!arrastre) return;
    arrastre = null;
    ring.classList.remove("dragging");
    if (movido) objetivo = ajustar(angulo);
    setTimeout(() => (movido = false), 0);
  });

  cont.addEventListener("mouseenter", () => (pausado = true));
  cont.addEventListener("mouseleave", () => (pausado = false));
  cont.addEventListener("focusin", () => (pausado = true));
  cont.addEventListener("focusout", () => (pausado = false));

  cargar();
})();

// ----- Stock per branch (state / city) -----
(function disponibilidad() {
  const modal = document.getElementById("dispModal");
  if (!modal) return;
  const titulo = document.getElementById("dispTitle");
  const total = document.getElementById("dispTotal");
  const filas = document.getElementById("dispFilas");
  const filtro = document.getElementById("dispFiltro");
  let sucursales = [];

  const PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';

  function pintar() {
    const q = sinAcentosQ(filtro.value);
    const lista = sucursales.filter((s) => !q || sinAcentosQ(s.sucursal + " " + s.estado).includes(q));
    filas.innerHTML = lista.length
      ? lista
          .map(
            (s) => `<div class="disp-row" role="row">
                <span class="disp-suc" role="cell">${PIN}<span>${esc(s.sucursal)}${s.estado ? `<small>${esc(s.estado)}</small>` : ""}</span></span>
                <span role="cell">${s.nuevo ? `<span class="disp-n">${s.nuevo}</span>` : '<span class="disp-cero">0</span>'}</span>
                <span role="cell">${s.transito ? `<span class="disp-t">🚚 ${s.transito}</span>` : ""}</span>
                <span role="cell">${s.caja_abierta ? `<span class="disp-t">${s.caja_abierta}</span>` : ""}</span>
              </div>`
          )
          .join("")
      : `<p class="disp-msg">${sucursales.length ? "Ninguna sucursal coincide." : "Sin desglose por sucursal para este producto."}</p>`;
  }

  async function abrir(id) {
    const p = buscarProductoMostrado(id);
    titulo.textContent = "Disponibilidad" + (p && p.modelo ? " · " + p.modelo : "");
    total.textContent = p ? (Number(p.total_existencia) || 0) + " unidades" : "—";
    filtro.value = "";
    sucursales = [];
    filas.innerHTML = '<p class="disp-msg">Consultando existencias…</p>';
    if (!modal.open) modal.showModal();

    try {
      const r = await fetch(API_PAGOS + "/existencias/" + encodeURIComponent(id));
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error");
      sucursales = d.sucursales || [];
      if (d.total) total.textContent = d.total.toLocaleString("es-MX") + " unidades";
      pintar();
    } catch (err) {
      // "Ruta no encontrada" means the server is still running an old version
      const motivo = /Ruta no encontrada/.test(err.message)
        ? "El servidor tiene una versión anterior: reinícialo para activar esta función."
        : err.message === "Failed to fetch"
        ? "No hay conexión con el servidor de la tienda."
        : err.message;
      filas.innerHTML = `<p class="disp-msg">${esc(motivo)}<br><small style="color:var(--slate-dim)">El total de existencias de arriba sí está actualizado.</small></p>`;
    }
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-disp]");
    if (b) abrir(b.dataset.disp);
  });
  filtro.addEventListener("input", pintar);
  modal.querySelector(".disp-close").addEventListener("click", () => modal.close());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.close();
  });
})();

// =========================================================
// WhatsApp tooltip: shows once a few seconds after loading
// =========================================================
(function whatsappTip() {
  const wa = document.querySelector(".wa-fab");
  if (!wa) return;
  const tip = document.createElement("span");
  tip.className = "wa-tip";
  tip.textContent = "¿Dudas con tu proyecto? Escríbenos";
  wa.appendChild(tip);
  setTimeout(() => {
    wa.classList.add("tip-on");
    setTimeout(() => wa.classList.remove("tip-on"), 6000);
  }, 4000);
})();


// =========================================================
// Header height: the sidebar and menus sit right below it
// =========================================================
(function altoHeader() {
  const header = document.querySelector("body > header");
  if (!header) return;
  // its own variable: --header-h also sizes the header itself, which would make it grow forever
  // the header scrolls away, so this is how much of it is still on screen (0 once it is gone)
  let pendiente = false;
  const medir = () => {
    pendiente = false;
    const visible = Math.max(0, Math.round(header.getBoundingClientRect().bottom));
    document.documentElement.style.setProperty("--alto-header", visible + "px");
  };
  const pedir = () => {
    if (!pendiente) {
      pendiente = true;
      requestAnimationFrame(medir);
    }
  };
  medir();
  window.addEventListener("scroll", pedir, { passive: true });
  window.addEventListener("resize", pedir);
  if (window.ResizeObserver) new ResizeObserver(pedir).observe(header);
})();

// =========================================================
// Account chip: photo (or initials) + name once signed in
// =========================================================
// auth.js can pass the user's data with:
//   window.mostrarCuenta({ nombre: "Ramón Torres", foto: "https://…" })   // on sign in
//   window.mostrarCuenta(null)                                          // on sign out
// Without it, the chip uses the name auth.js writes in "loginLabel" and shows initials.
(function cuentaUsuario() {
  const avatar = document.getElementById("navAvatar");
  const label = document.getElementById("loginLabel");
  if (!avatar || !label) return;
  const ICONO = avatar.innerHTML;
  let pintando = false;

  const iniciales = (nombre) =>
    String(nombre || "")
      .replace(/[^\p{L}\s]/gu, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

  function pintar() {
    if (pintando) return;
    pintando = true;
    const conSesion = !!document.body.dataset.user;
    const u = window.usuarioActual || {};

    if (!conSesion) {
      avatar.innerHTML = ICONO;
      if (label.textContent.trim() !== "Iniciar Sesión") label.textContent = "Iniciar Sesión";
      document.getElementById("loginBtn").title = "";
    } else {
      const textoActual = label.textContent.trim();
      const nombre =
        u.nombre ||
        (textoActual && !/^(iniciar sesi[oó]n|cerrar sesi[oó]n|salir)$/i.test(textoActual) ? textoActual : "") ||
        "Mi cuenta";
      const corto = nombre.split(/\s+/).slice(0, 2).join(" ");
      if (label.textContent !== corto) label.textContent = corto;

      if (u.foto) {
        if (!avatar.querySelector("img") || avatar.querySelector("img").src !== u.foto) {
          avatar.innerHTML = "";
          const img = document.createElement("img");
          img.alt = "";
          img.referrerPolicy = "no-referrer";
          img.src = u.foto;
          img.onerror = () => (avatar.textContent = iniciales(nombre) || "•");
          avatar.appendChild(img);
        }
      } else {
        avatar.textContent = iniciales(nombre) || "•";
      }
      document.getElementById("loginBtn").title = nombre + (u.email ? " · " + u.email : "");
    }
    pintando = false;
  }

  window.mostrarCuenta = (u) => {
    window.usuarioActual = u || null;
    pintar();
  };

  // follow auth.js: it marks the body with data-user and may write the name in the label
  new MutationObserver(pintar).observe(document.body, { attributes: true, attributeFilter: ["data-user"] });
  new MutationObserver(pintar).observe(label, { childList: true, characterData: true, subtree: true });
  pintar();
})();

// =========================================================
// Branch stock shown on each card, without clicking
// Cards ask the server in groups when they come into view.
// =========================================================
const sucursalesCache = new Map(); // id -> { total, sucursales }
const sucursalesPendientes = new Set();
let sucursalesTimer = null;

function pintarSucursalesEn(caja, info) {
  const con = (info.sucursales || []).filter((s) => s.nuevo > 0).sort((a, b) => b.nuevo - a.nuevo);
  if (!con.length) {
    caja.innerHTML = '<span class="pc-suc-cargando">Stock en tránsito o bajo pedido</span>';
    return;
  }
  const top = con.slice(0, 3);
  caja.innerHTML =
    top
      .map((s) => `<span class="pc-suc-item" title="${esc(s.estado || s.sucursal)}">${esc(s.sucursal)} <b>${s.nuevo.toLocaleString("es-MX")}</b></span>`)
      .join("") +
    (con.length > 3 ? `<span class="pc-suc-mas">+${con.length - 3} sucursales</span>` : "");
}

async function pedirSucursales() {
  sucursalesTimer = null;
  const ids = Array.from(sucursalesPendientes).slice(0, 60);
  ids.forEach((id) => sucursalesPendientes.delete(id));
  if (!ids.length) return;
  let datos = {};
  try {
    const r = await fetch(API_PAGOS + "/existencias-lote?ids=" + ids.join(","));
    if (r.ok) datos = await r.json();
  } catch (e) {
    // server not reachable: the cards keep the total only
  }
  ids.forEach((id) => {
    if (datos[id]) sucursalesCache.set(id, datos[id]);
    document.querySelectorAll(`.pc-suc[data-suc="${id}"]`).forEach((caja) => {
      if (datos[id]) pintarSucursalesEn(caja, datos[id]);
      else caja.remove(); // no breakdown available: the "Ver todas" button still works
    });
  });
  if (sucursalesPendientes.size) pedirSucursales();
}

const observadorSucursales =
  "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entradas) => {
          entradas.forEach((e) => {
            if (!e.isIntersecting) return;
            observadorSucursales.unobserve(e.target);
            const id = e.target.dataset.suc;
            if (sucursalesCache.has(id)) return pintarSucursalesEn(e.target, sucursalesCache.get(id));
            sucursalesPendientes.add(id);
            if (!sucursalesTimer) sucursalesTimer = setTimeout(pedirSucursales, 150);
          });
        },
        { rootMargin: "300px 0px" }
      )
    : null;

function cargarSucursales(contenedor) {
  if (!contenedor) return;
  contenedor.querySelectorAll(".pc-suc[data-suc]").forEach((caja) => {
    if (observadorSucursales) observadorSucursales.observe(caja);
    else {
      sucursalesPendientes.add(caja.dataset.suc);
      if (!sucursalesTimer) sucursalesTimer = setTimeout(pedirSucursales, 150);
    }
  });
}

// =========================================================
// Home page: "Productos en existencia" (no search needed)
// =========================================================
(function productosInicio() {
  const grid = document.getElementById("inicioGrid");
  const mas = document.getElementById("inicioMas");
  const info = document.getElementById("inicioInfo");
  if (!grid || !mas) return;
  let pagina = 0;
  let paginas = 1;
  let cargando = false;

  async function cargar() {
    if (cargando || pagina >= paginas) return;
    cargando = true;
    mas.disabled = true;
    mas.textContent = "Cargando…";
    let d = null;
    try {
      const r = await fetch(API_PAGOS + "/en-existencia?pagina=" + (pagina + 1));
      if (r.ok) d = await r.json();
    } catch (e) {
      // server not reachable: use the local list
    }
    if (!d) {
      await datosListos;
      await obtenerListaProductos();
      const buenos = listaProductos.filter(
        (p) => (Number(p.total_existencia) || 0) >= 5 && p.img_portada && !isNaN(precioBase(p).usd)
      );
      // a different starting point every 30 minutes
      const giro = buenos.length ? (Math.floor(Date.now() / (30 * 60000)) * 12) % buenos.length : 0;
      const ordenados = buenos.slice(giro).concat(buenos.slice(0, giro));
      const desde = pagina * 12;
      d = { total: buenos.length, paginas: Math.max(1, Math.ceil(buenos.length / 12)), productos: ordenados.slice(desde, desde + 12) };
    }
    pagina += 1;
    paginas = d.paginas || 1;
    if (pagina === 1) grid.innerHTML = "";
    const temp = document.createElement("div");
    temp.innerHTML = (d.productos || []).map(htmlTarjeta).join("");
    const nuevos = Array.from(temp.children);
    nuevos.forEach((n) => grid.appendChild(n));
    if (info && d.total) info.textContent = d.total.toLocaleString("es-MX") + " productos con existencia";
    if (!grid.children.length) grid.innerHTML = "<p>Pronto verás aquí nuestros productos.</p>";
    mas.hidden = pagina >= paginas;
    mas.disabled = false;
    mas.textContent = "Ver más productos";
    cargando = false;
  }

  mas.addEventListener("click", cargar);
  // load when the section gets close to the screen
  if ("IntersectionObserver" in window) {
    const o = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) {
        o.disconnect();
        cargar();
      }
    }, { rootMargin: "400px 0px" });
    o.observe(grid);
  } else cargar();
})();


// pick a saved address in checkout
document.addEventListener("change", (e) => {
  if (e.target.id !== "dirGuardada" || e.target.value === "") return;
  const dir = ((window.cuentaCliente || {}).direcciones || [])[Number(e.target.value)];
  const f = document.getElementById("datosForm");
  if (!dir || !f) return;
  ["nombre", "telefono", "calle", "numero", "colonia", "cp", "ciudad", "estado", "referencias"].forEach((k) => {
    if (f.elements[k] && dir[k] != null) f.elements[k].value = dir[k];
  });
  guardarDatosForm(f);
  if (typeof enlazarCP === "function") enlazarCP("abrir");
  if (typeof programarCotizacion === "function") programarCotizacion(0);
});
document.addEventListener("click", (e) => {
  if (!e.target.closest("[data-cuenta-dir]")) return;
  e.preventDefault();
  if (window.abrirMiCuenta) window.abrirMiCuenta("direcciones");
});
// when the account finishes loading while the delivery form is open, refresh it once
document.addEventListener("cuenta-lista", () => {
  if (document.body.classList.contains("vista-carrito") && pasoCarrito === "datos" && !leerDatos().calle) pintarPaginaCarrito();
});

// =========================================================
// Quick view: click a card to see the product in detail
// =========================================================
const WHATSAPP_VENTAS = "523335034338";

(function vistaRapida() {
  const dlg = document.createElement("dialog");
  dlg.className = "modal qv-modal";
  dlg.setAttribute("aria-labelledby", "qvTitulo");
  dlg.innerHTML = `
    <button type="button" class="modal-close" aria-label="Cerrar">&times;</button>
    <div class="qv-grid">
      <div class="qv-foto"><img id="qvImg" alt=""></div>
      <div class="qv-info">
        <span class="pc-brand" id="qvMarca"></span>
        <h3 id="qvTitulo"></h3>
        <span class="qv-modelo" id="qvModelo"></span>
        <strong class="pc-price qv-precio" id="qvPrecio"></strong>
        <span class="pc-stock" id="qvStock"></span>
        <div class="qv-comprar" id="qvComprar">
          <div class="qv-cant">
            <button type="button" data-qv="menos" aria-label="Menos">−</button>
            <input type="number" id="qvCant" value="1" min="1" aria-label="Cantidad">
            <button type="button" data-qv="mas" aria-label="Más">+</button>
          </div>
          <button type="button" class="btn qv-agregar" id="qvAgregar" data-add="">Agregar al carrito</button>
          <button type="button" class="btn btn-outline" id="qvComprarYa" data-buy="">Comprar ahora</button>
        </div>
        <a class="qv-wa" id="qvWa" target="_blank" rel="noopener">Cotizar por WhatsApp</a>
        <div class="qv-suc">
          <div class="qv-suc-head"><strong>Disponible en</strong><button type="button" class="pc-disp" id="qvTodas" data-disp="">Ver todas las sucursales</button></div>
          <div class="pc-suc" id="qvSuc"><span class="pc-suc-cargando">Consultando sucursales…</span></div>
        </div>
        <ul class="qv-trust">
          <li>Envío a todo México</li><li>Factura CFDI automática</li><li>Garantía del fabricante</li>
        </ul>
      </div>
    </div>
    <div class="qv-rel" id="qvRel" hidden>
      <h4>Va bien con</h4>
      <div class="qv-rel-grid" id="qvRelGrid"></div>
    </div>`;
  document.body.appendChild(dlg);

  let actual = null;
  const $q = (id) => document.getElementById(id);

  function cantidad() {
    const max = Math.min(Number(actual && actual.total_existencia) || 1, 100);
    let n = Math.floor(Number($q("qvCant").value) || 1);
    n = Math.min(Math.max(n, 1), max);
    $q("qvCant").value = n;
    $q("qvAgregar").dataset.qty = n;
    $q("qvComprarYa").dataset.qty = n;
    return n;
  }

  async function cargarSucursalesQV(id) {
    const caja = $q("qvSuc");
    const pintar = (info) => {
      if (actual && String(actual.producto_id) === id) pintarSucursalesEn(caja, info);
    };
    if (sucursalesCache.has(id)) return pintar(sucursalesCache.get(id));
    caja.innerHTML = '<span class="pc-suc-cargando">Consultando sucursales…</span>';
    try {
      const r = await fetch(API_PAGOS + "/existencias/" + encodeURIComponent(id));
      if (!r.ok) throw new Error();
      const d = await r.json();
      sucursalesCache.set(id, d);
      pintar(d);
    } catch (e) {
      if (actual && String(actual.producto_id) === id) caja.innerHTML = '<span class="pc-suc-cargando">Desglose no disponible en este momento.</span>';
    }
  }

  async function cargarRelacionados(id) {
    $q("qvRel").hidden = true;
    try {
      const r = await fetch(API_PAGOS + "/relacionados/" + encodeURIComponent(id));
      if (!r.ok) return;
      const d = await r.json();
      if (!actual || String(actual.producto_id) !== id || !(d.productos || []).length) return;
      $q("qvRelGrid").innerHTML = d.productos
        .map((q) => {
          recordarProducto(q);
          const b = precioBase(q);
          return `<div class="qv-rel-item" data-vista="${esc(q.producto_id)}" tabindex="0" role="button">
              <img src="${esc(q.img_portada)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
              <span class="qv-rel-t">${esc(q.titulo)}</span>
              <span class="qv-rel-p">${isNaN(b.usd) ? "" : dinero(precioUnitario(b.usd))}</span>
              <button type="button" class="qv-rel-add" data-add="${esc(q.producto_id)}" aria-label="Agregar ${esc(q.titulo)}">+</button>
            </div>`;
        })
        .join("");
      $q("qvRel").hidden = false;
    } catch (e) {
      // server not reachable: no suggestions
    }
  }

  function abrir(id) {
    const p = buscarProductoMostrado(id);
    if (!p) return;
    actual = p;
    const stock = Number(p.total_existencia) || 0;
    const precio = htmlPrecio(p);
    $q("qvImg").src = p.img_portada || "";
    $q("qvMarca").textContent = p.marca || "";
    $q("qvTitulo").textContent = p.titulo || "";
    $q("qvModelo").textContent = "Modelo: " + (p.modelo || "—");
    $q("qvPrecio").innerHTML = precio.html;
    $q("qvStock").className = "pc-stock " + (stock > 0 ? "ok" : "no");
    $q("qvStock").textContent = stock > 0 ? "● " + stock.toLocaleString("es-MX") + " en existencia" : "Sin existencia por ahora";
    $q("qvComprar").hidden = stock <= 0;
    $q("qvCant").max = Math.min(stock || 1, 100);
    $q("qvCant").value = 1;
    $q("qvAgregar").dataset.add = p.producto_id;
    $q("qvComprarYa").dataset.buy = p.producto_id;
    $q("qvTodas").dataset.disp = p.producto_id;
    cantidad();
    const texto = `Hola, quiero cotizar: ${p.titulo || ""} (Modelo: ${p.modelo || ""}, ${p.marca || ""})`;
    $q("qvWa").href = "https://wa.me/" + WHATSAPP_VENTAS + "?text=" + encodeURIComponent(texto);
    $q("qvSuc").closest(".qv-suc").hidden = stock <= 0;
    if (stock > 0) cargarSucursalesQV(String(p.producto_id));
    cargarRelacionados(String(p.producto_id));
    dlg.querySelector(".qv-grid").scrollTop = 0;
    if (!dlg.open) dlg.showModal();
  }
  window.abrirVistaRapida = abrir;
  window.cerrarVistaRapida = () => dlg.open && dlg.close();

  // open from a card (but not when the click was on a button inside it)
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-vista]");
    if (!t) return;
    if (e.target.closest("button[data-add], button[data-buy]") && !e.target.closest("button[data-vista]")) return;
    e.preventDefault();
    abrir(t.dataset.vista);
  });
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("[data-vista][tabindex]")) {
      e.preventDefault();
      abrir(e.target.dataset.vista);
    }
  });
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close();
    const b = e.target.closest("[data-qv]");
    if (!b) return;
    $q("qvCant").value = Number($q("qvCant").value || 1) + (b.dataset.qv === "mas" ? 1 : -1);
    cantidad();
  });
  $q("qvCant").addEventListener("change", cantidad);
  dlg.querySelector(".modal-close").addEventListener("click", () => dlg.close());
})();

// =========================================================
// Slide-in cart after adding a product
// =========================================================
(function carritoLateral() {
  const panel = document.createElement("aside");
  panel.className = "cl-panel";
  panel.setAttribute("aria-label", "Carrito");
  panel.innerHTML = `
    <div class="cl-head">
      <strong>Agregado al carrito ✓</strong>
      <button type="button" class="cl-cerrar" aria-label="Cerrar">&times;</button>
    </div>
    <div class="cl-items" id="clItems"></div>
    <div class="cl-foot">
      <div class="cl-sub"><span>Subtotal</span><strong id="clSub"></strong></div>
      <small>IVA incluido · el envío se calcula con tu dirección</small>
      <a href="#/carrito" class="btn cl-pagar" data-cl="pagar">Ir a pagar</a>
      <button type="button" class="btn btn-outline" data-cl="seguir">Seguir comprando</button>
      <button type="button" class="cl-cot" data-cl="cotizacion">Descargar cotización (PDF)</button>
    </div>`;
  const velo = document.createElement("div");
  velo.className = "cl-velo";
  document.body.append(velo, panel);

  function pintar(resaltar) {
    const items = carrito.filter((i) => i.qty > 0);
    let sub = 0;
    document.getElementById("clItems").innerHTML = items.length
      ? items
          .map((i) => {
            const unit = precioUnitario(i.usd);
            sub += Math.round(unit * i.qty * 100) / 100;
            return `<div class="cl-item${String(i.id) === String(resaltar) ? " nuevo" : ""}">
                <img src="${esc(i.img)}" alt="" onerror="this.style.visibility='hidden'">
                <div><span class="cl-t">${esc(i.titulo)}</span><span class="cl-q">${i.qty} × ${dinero(unit)}</span></div>
                <strong>${dinero(Math.round(unit * i.qty * 100) / 100)}</strong>
              </div>`;
          })
          .join("")
      : "<p>Tu carrito está vacío.</p>";
    document.getElementById("clSub").textContent = dinero(sub);
  }

  function abrir(resaltar) {
    pintar(resaltar);
    panel.classList.add("open");
    velo.classList.add("open");
  }
  function cerrar() {
    panel.classList.remove("open");
    velo.classList.remove("open");
  }
  window.abrirCarritoLateral = abrir;

  velo.addEventListener("click", cerrar);
  panel.querySelector(".cl-cerrar").addEventListener("click", cerrar);
  document.addEventListener("keydown", (e) => e.key === "Escape" && cerrar());
  panel.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cl]");
    if (!b) return;
    if (b.dataset.cl === "seguir") cerrar();
    if (b.dataset.cl === "pagar") cerrar();
    if (b.dataset.cl === "cotizacion") generarCotizacion();
  });
})();

// =========================================================
// PDF quote (opens a printable page; "Guardar como PDF")
// =========================================================
function generarCotizacion() {
  const items = carrito.filter((i) => i.qty > 0 && i.sel !== false);
  if (!items.length) return alert("Agrega productos al carrito para generar la cotización.");
  const ahora = new Date();
  const dos = (n) => String(n).padStart(2, "0");
  const folio = `COT-${ahora.getFullYear()}${dos(ahora.getMonth() + 1)}${dos(ahora.getDate())}-${dos(ahora.getHours())}${dos(ahora.getMinutes())}`;
  const vigencia = new Date(ahora.getTime() + 7 * 86400000);
  const fecha = (d) => d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  const c = window.cuentaCliente || {};
  const d = leerDatos();
  const cliente = {
    nombre: d.razon || d.nombre || c.nombre || "",
    rfc: d.rfc || (c.fiscal && c.fiscal.rfc) || "",
    email: d.email || c.email || "",
    tel: d.telefono || c.telefono || "",
  };
  const fIVA = 1 + (typeof IVA === "number" ? IVA : 0.16);
  let subtotal = 0;
  const filas = items
    .map((i, n) => {
      const unit = precioUnitario(i.usd) / fIVA;
      const imp = unit * i.qty;
      subtotal += imp;
      return `<tr><td>${n + 1}</td><td>${esc(i.modelo)}</td><td>${esc(i.titulo)}<br><small>${esc(i.marca)}</small></td>
        <td class="n">${i.qty}</td><td class="n">${dinero(unit)}</td><td class="n">${dinero(imp)}</td></tr>`;
    })
    .join("");
  const iva = subtotal * (fIVA - 1);
  const logo = new URL("photos/solutelecom-logo-transparent.png", location.href).href;

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${folio} · SoluTelecom</title>
  <style>
    *{box-sizing:border-box} body{font:13px/1.45 Arial,Helvetica,sans-serif;color:#1d1d1f;margin:0;padding:32px}
    .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #f5b400;padding-bottom:16px;margin-bottom:20px}
    .top img{height:48px} h1{font-size:22px;margin:0 0 4px} .muted{color:#666}
    .cols{display:flex;gap:24px;margin-bottom:20px} .box{flex:1;border:1px solid #ddd;border-radius:6px;padding:10px 12px}
    .box b{display:block;font-size:11px;text-transform:uppercase;color:#888;margin-bottom:4px}
    table{width:100%;border-collapse:collapse} th{background:#1d1d1f;color:#fff;text-align:left;padding:8px;font-size:12px}
    td{padding:8px;border-bottom:1px solid #e5e5e5;vertical-align:top} td small{color:#888} .n{text-align:right;white-space:nowrap}
    .tot{margin:16px 0 0 auto;width:280px} .tot div{display:flex;justify-content:space-between;padding:4px 0}
    .tot .g{border-top:2px solid #1d1d1f;margin-top:6px;padding-top:8px;font-size:16px;font-weight:bold}
    .notas{margin-top:28px;font-size:11.5px;color:#555} .notas li{margin-bottom:4px}
    .pie{margin-top:28px;border-top:1px solid #ddd;padding-top:12px;font-size:11.5px;color:#666;display:flex;justify-content:space-between}
    .btn{position:fixed;bottom:20px;right:20px;background:#f5b400;border:0;padding:12px 20px;border-radius:6px;font-weight:bold;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,.25)}
    @media print{.btn{display:none} body{padding:0}}
  </style></head><body>
  <button class="btn" onclick="print()">Guardar como PDF</button>
  <div class="top">
    <img src="${logo}" alt="SoluTelecom" onerror="this.outerHTML='<h2>SoluTelecom</h2>'">
    <div style="text-align:right"><h1>Cotización</h1><div class="muted">Folio <b>${folio}</b></div>
      <div class="muted">Fecha: ${fecha(ahora)}</div><div class="muted">Vigencia: ${fecha(vigencia)}</div></div>
  </div>
  <div class="cols">
    <div class="box"><b>Cliente</b>${esc(cliente.nombre) || "Público en general"}${cliente.rfc ? "<br>RFC: " + esc(cliente.rfc) : ""}${cliente.email ? "<br>" + esc(cliente.email) : ""}${cliente.tel ? "<br>Tel. " + esc(cliente.tel) : ""}</div>
    <div class="box"><b>Proveedor</b>SoluTelecom<br>Progreso, Monterrey, N.L. · C.P. 64420<br>${esc(CORREO_VENTAS)}<br>Tel. 33 21 86 58 21</div>
  </div>
  <table><thead><tr><th>#</th><th>Modelo</th><th>Descripción</th><th class="n">Cant.</th><th class="n">P. unitario</th><th class="n">Importe</th></tr></thead>
  <tbody>${filas}</tbody></table>
  <div class="tot"><div><span>Subtotal</span><span>${dinero(subtotal)}</span></div>
    <div><span>IVA ${Math.round((fIVA - 1) * 100)}%</span><span>${dinero(iva)}</span></div>
    <div class="g"><span>Total MXN</span><span>${dinero(subtotal + iva)}</span></div></div>
  <ul class="notas">
    <li>Precios en pesos mexicanos. Tipo de cambio de referencia: $${(typeof tipoCambio === "number" ? tipoCambio : 0).toFixed(2)} MXN/USD.</li>
    <li>Precios sujetos a cambio sin previo aviso después de la fecha de vigencia y a disponibilidad de existencias.</li>
    <li>No incluye envío ni instalación; el envío se calcula al confirmar la dirección de entrega.</li>
    <li>Para confirmar tu pedido, compra en solutelecom.mx o responde a esta cotización por correo o WhatsApp indicando el folio.</li>
  </ul>
  <div class="pie"><span>SoluTelecom · solutelecom.mx</span><span>${esc(CORREO_VENTAS)} · WhatsApp 33 21 86 58 21</span></div>
  <script>setTimeout(function(){print()},600)<\/script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) return alert("Permite las ventanas emergentes para descargar la cotización.");
  w.document.open();
  w.document.write(html);
  w.document.close();
}
document.addEventListener("click", (e) => {
  if (e.target.closest('[data-cp="cotizacion"]')) generarCotizacion();
});

// =========================================================
// Loading placeholders (gray cards while products load)
// =========================================================
function htmlEsqueletos(n = 8) {
  return Array.from({ length: n }, () => `
    <div class="pc-card sk-card" aria-hidden="true">
      <div class="pc-img sk"></div>
      <div class="pc-body"><span class="sk sk-l" style="width:40%"></span><span class="sk sk-l"></span><span class="sk sk-l" style="width:70%"></span><span class="sk sk-l sk-g" style="width:50%"></span><span class="sk sk-b"></span></div>
    </div>`).join("");
}
(function esqueletosIniciales() {
  const g = document.getElementById("inicioGrid");
  if (g && !g.children.length) g.innerHTML = htmlEsqueletos(8);
})();

// =========================================================
// "Vistos recientemente" (this browser only)
// =========================================================
const CLAVE_VISTOS = "solutelecom_vistos";
function leerVistos() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_VISTOS) || "[]");
    return Array.isArray(d) ? d : [];
  } catch (e) {
    return [];
  }
}
function recordarVisto(p) {
  if (!p || p.producto_id == null) return;
  const corto = {
    producto_id: String(p.producto_id),
    titulo: p.titulo,
    marca: p.marca,
    modelo: p.modelo,
    img_portada: p.img_portada,
    precios: p.precios,
    total_existencia: p.total_existencia,
  };
  const lista = [corto].concat(leerVistos().filter((x) => x.producto_id !== corto.producto_id)).slice(0, 12);
  try {
    localStorage.setItem(CLAVE_VISTOS, JSON.stringify(lista));
  } catch (e) {
    // storage not available
  }
  pintarVistos();
}
function pintarVistos() {
  const sec = document.getElementById("vistos");
  const fila = document.getElementById("vistosFila");
  if (!sec || !fila) return;
  const lista = leerVistos();
  sec.hidden = !lista.length;
  fila.innerHTML = lista
    .map((p) => {
      recordarProducto(p);
      const b = precioBase(p);
      return `<div class="vistos-item" data-vista="${esc(p.producto_id)}" tabindex="0" role="button" aria-label="${esc(p.titulo)}">
          <img src="${esc(p.img_portada)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
          <span class="vistos-t">${esc(p.titulo)}</span>
          <strong>${isNaN(b.usd) ? "Consultar" : dinero(precioUnitario(b.usd))}</strong>
        </div>`;
    })
    .join("");
}
(function iniciarVistos() {
  // remember every product opened in the quick view
  const original = window.abrirVistaRapida;
  if (original) {
    window.abrirVistaRapida = (id) => {
      original(id);
      recordarVisto(buscarProductoMostrado(id));
    };
  }
  document.addEventListener(
    "click",
    (e) => {
      const t = e.target.closest("[data-vista]");
      if (t && !e.target.closest("button[data-add], button[data-buy]")) setTimeout(() => recordarVisto(buscarProductoMostrado(t.dataset.vista)), 0);
    },
    true
  );
  const borrar = document.getElementById("vistosBorrar");
  if (borrar)
    borrar.addEventListener("click", () => {
      try {
        localStorage.removeItem(CLAVE_VISTOS);
      } catch (e) {
        // ignore
      }
      pintarVistos();
    });
  pintarVistos();
})();

// =========================================================
// Bottom bar on phones: Inicio · Categorías · Buscar · Carrito · Cuenta
// =========================================================
(function barraInferior() {
  const ico = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const nav = document.createElement("nav");
  nav.className = "bb";
  nav.setAttribute("aria-label", "Navegación rápida");
  nav.innerHTML = `
    <a href="#top" data-bb="inicio">${ico('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>')}<span>Inicio</span></a>
    <button type="button" data-bb="categorias">${ico('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>')}<span>Categorías</span></button>
    <button type="button" data-bb="buscar">${ico('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>')}<span>Buscar</span></button>
    <a href="#/carrito" data-bb="carrito">${ico('<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L22 8H6"/>')}<span>Carrito</span><b class="bb-num" id="bbNum"></b></a>
    <button type="button" data-bb="cuenta">${ico('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>')}<span>Cuenta</span></button>`;
  document.body.appendChild(nav);

  nav.addEventListener("click", (e) => {
    const b = e.target.closest("[data-bb]");
    if (!b) return;
    const que = b.dataset.bb;
    if (que === "inicio") {
      e.preventDefault();
      if (location.hash.startsWith("#/")) location.hash = "#top";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (que === "categorias") document.querySelector(".prod-btn")?.click();
    if (que === "buscar") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => document.getElementById("heroQ")?.focus(), 250);
    }
    if (que === "cuenta") document.getElementById("loginBtn")?.click();
  });

  // highlight where you are, and the cart count
  const marcar = () => {
    const h = location.hash;
    nav.querySelectorAll("[data-bb]").forEach((x) => x.classList.remove("on"));
    const activo = h === "#/carrito" ? "carrito" : h.startsWith("#/") ? "" : "inicio";
    if (activo) nav.querySelector(`[data-bb="${activo}"]`).classList.add("on");
  };
  window.addEventListener("hashchange", marcar);
  marcar();
  const contar = () => {
    const n = (typeof carrito !== "undefined" ? carrito : []).reduce((s, i) => s + (i.qty || 0), 0);
    document.getElementById("bbNum").textContent = n ? String(n) : "";
  };
  contar();
  const sb = document.getElementById("sbCartCount");
  if (sb) new MutationObserver(contar).observe(sb, { childList: true, characterData: true, subtree: true });
})();