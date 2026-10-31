// pagos-server.mjs — quotes shipping with Syscom, charges with Mercado Pago,
// and orders from Syscom once the payment is approved
import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { randomUUID, createHmac, timingSafeEqual, createVerify } from "node:crypto";

const TOKEN = (process.env.MP_ACCESS_TOKEN || "").replace(/["'\s]/g, "");
const SYSCOM_TOKEN = (process.env.SYSCOM_TOKEN || "").replace(/["'\s]/g, "");
const SYSCOM_API = process.env.SYSCOM_API || "https://developers.syscom.mx/api/v1";
const MP_API = process.env.MP_API || "https://api.mercadopago.com";

console.log(`Mercado Pago token: ${TOKEN.length} characters, starts with ${TOKEN.slice(0, 8)}`);
console.log(`Syscom token: ${SYSCOM_TOKEN.length} characters, starts with ${SYSCOM_TOKEN.slice(0, 8)}`);

// Safety check: the Mercado Pago token always starts with APP_USR-
if (!TOKEN.startsWith("APP_USR-")) {
  console.error("MP_ACCESS_TOKEN must be the Mercado Pago Access Token (it starts with APP_USR-).");
  process.exit(1);
}
if (!SYSCOM_TOKEN) console.warn("SYSCOM_TOKEN not set: the postal code lookup is disabled.");

const CATJSON = process.env.CATJSON || "C:/Users/jg477/Documents/Webpage_Redes/catjson"; // your catjson folder
const SITE = process.env.SITE || "http://127.0.0.1:5500";                              // your site's address
const CARPETA_PEDIDOS = process.env.CARPETA_PEDIDOS || "C:/Users/jg477/Documents/pedidos-solutelecom"; // outside your website folder
fs.mkdirSync(CARPETA_PEDIDOS, { recursive: true });

// Same price rules as the page
const MARGEN = 0.02;
const DESCUENTO = 0;
const IVA = 0.16;
const PRECIO_CAMPO = "precio_lista";
// Promo price field from Syscom (must be the same in index.js). Empty = promos off.
// Only used when it is LOWER than the list price.
const PRECIO_PROMO_CAMPO = process.env.PRECIO_PROMO_CAMPO || "";

// USD base price of a product: the promo price when there is a real promo, otherwise the list price
function precioBaseUSD(p) {
  const pr = (p && p.precios) || {};
  const lista = parseFloat(pr[PRECIO_CAMPO]);
  const promo = PRECIO_PROMO_CAMPO ? parseFloat(pr[PRECIO_PROMO_CAMPO]) : NaN;
  if (isNaN(lista)) return { usd: NaN, antes: null };
  if (!isNaN(promo) && promo > 0 && promo < lista) return { usd: promo, antes: lista };
  return { usd: lista, antes: null };
}
const TIPO_CAMBIO_RESPALDO = 18.5;

// ----- Syscom order settings -----
// (docs: https://developers.syscom.mx/docs/carrito)
//   SYSCOM_METODO_PAGO: how YOU pay Syscom. "transferencia" (no credit needed),
//                       or "credito-30" etc. once Syscom gives you a credit line.
//   SYSCOM_FLETERAS:    fletera codes from "obtener fleteras", in order of preference,
//                       separated by commas. The first one that covers the customer's CP is used.
//   SYSCOM_CFDI:        Syscom invoices YOU (e.g. G01).
const SYSCOM_METODO_PAGO = process.env.SYSCOM_METODO_PAGO || "transferencia";
const SYSCOM_FLETERAS = (process.env.SYSCOM_FLETERAS || process.env.SYSCOM_FLETERA || "")
  .split(",")
  .map((f) => f.trim())
  .filter(Boolean);
const SYSCOM_CFDI = process.env.SYSCOM_CFDI || "G01";
// true = Syscom only quotes (nothing is bought). Set SYSCOM_PRUEBA=no when everything works.
const SYSCOM_PRUEBA = process.env.SYSCOM_PRUEBA !== "no";
// Does Syscom's shipping cost already include IVA? Check one quote and set ENVIO_SIN_IVA=si if not.
const ENVIO_SIN_IVA = process.env.ENVIO_SIN_IVA === "si";
// Secret from Mercado Pago > Your integrations > Webhooks (to check notifications are real)
const MP_WEBHOOK_SECRET = (process.env.MP_WEBHOOK_SECRET || "").trim();

if (!SYSCOM_TOKEN || !SYSCOM_FLETERAS.length) {
  console.warn("SYSCOM_TOKEN or SYSCOM_FLETERAS not set: shipping can't be quoted and payments are disabled.");
}
console.log(`Syscom: pay with "${SYSCOM_METODO_PAGO}", fleteras [${SYSCOM_FLETERAS.join(", ")}]`);
console.log(`Syscom orders: ${SYSCOM_PRUEBA ? "TEST MODE (nothing is bought)" : "REAL"}`);

function extraerTC(d) {
  if (typeof d === "number") return d;
  if (typeof d === "string") return parseFloat(d);
  if (d && typeof d === "object") {
    for (const k of ["normal", "tipo_cambio", "tipocambio", "tipoCambio", "valor"]) {
      if (d[k] != null && !isNaN(parseFloat(d[k]))) return parseFloat(d[k]);
    }
    for (const v of Object.values(d)) {
      const n = extraerTC(v);
      if (n && !isNaN(n)) return n;
    }
  }
  return null;
}

// ----- Product catalog -----
// Local:  CATJSON = your catjson folder (reads the files from disk)
// Online: CATALOGO_URL = your site's catjson address, e.g. https://your-site.netlify.app/catjson
//         (the server downloads the same files your page uses, and refreshes them every 6 hours)
const CATALOGO_URL = (process.env.CATALOGO_URL || "").replace(/\/+$/, "");
let productos = new Map(); // producto_id -> product
let indice = [];      // search index: [{ p, texto, modelo }]
let destacados = [];  // products for the home page carousel
let vocabulario = []; // [word, how many products]
let periodoDestacados = -1; // which 30-minute period the featured products belong to
let enExistencia = { periodo: -1, lista: [] }; // home page in-stock list
let tipoCambioActual = TIPO_CAMBIO_RESPALDO;
let catalogoListo = false;

function leerTipoCambio() {
  return tipoCambioActual;
}

function cargarCatalogoLocal() {
  for (const r of [path.join(CATJSON, "tipodecas.json"), path.join(CATJSON, "..", "tipodecas.json")]) {
    try {
      const n = extraerTC(JSON.parse(fs.readFileSync(r, "utf8")));
      if (n && n > 5 && n < 100) {
        tipoCambioActual = n;
        break;
      }
    } catch (e) {
      // try the next path
    }
  }
  const nuevos = new Map();
  for (const f of fs.readdirSync(CATJSON)) {
    if (!/^prod-.*\.json$/.test(f)) continue;
    const datos = JSON.parse(fs.readFileSync(path.join(CATJSON, f), "utf8"));
    for (const p of datos.productos || []) nuevos.set(String(p.producto_id), p);
  }
  return nuevos;
}

async function bajarJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} en ${url}`);
  return r.json();
}

async function cargarCatalogoRemoto() {
  for (const url of [`${CATALOGO_URL}/tipodecas.json`, `${CATALOGO_URL}/../tipodecas.json`]) {
    try {
      const n = extraerTC(await bajarJSON(url));
      if (n && n > 5 && n < 100) {
        tipoCambioActual = n;
        break;
      }
    } catch (e) {
      // try the next one
    }
  }

  // every category id in arbol.json -> its prod-<id>.json (missing ones are skipped)
  const arbol = await bajarJSON(`${CATALOGO_URL}/arbol.json`);
  const ids = [];
  (function recorrer(nodos) {
    for (const n of nodos || []) {
      ids.push(n.id);
      recorrer(n.subcategorias);
    }
  })(arbol);

  const nuevos = new Map();
  const LOTE = 20;
  for (let i = 0; i < ids.length; i += LOTE) {
    const listas = await Promise.all(
      ids.slice(i, i + LOTE).map((id) =>
        bajarJSON(`${CATALOGO_URL}/prod-${encodeURIComponent(id)}.json`).catch(() => null)
      )
    );
    for (const datos of listas) {
      for (const p of (datos && datos.productos) || []) nuevos.set(String(p.producto_id), p);
    }
  }
  return nuevos;
}

async function cargarCatalogo() {
  try {
    const nuevos = CATALOGO_URL ? await cargarCatalogoRemoto() : cargarCatalogoLocal();
    if (!nuevos.size) throw new Error("no products found");
    productos = nuevos;
    construirIndice();
    catalogoListo = true;
    console.log(`${productos.size} products loaded, exchange rate ${tipoCambioActual}`);
  } catch (e) {
    // keep the previous catalog if a refresh fails
    console.error("Could not load the catalog:", e.message);
  }
}

cargarCatalogo();
if (CATALOGO_URL) setInterval(cargarCatalogo, 6 * 60 * 60 * 1000);

const app = express();
app.set("trust proxy", 1); // behind the host's proxy: use the visitor's real IP for the limits
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Only your website may call this server from a browser.
// ORIGENES: comma-separated, e.g. https://solutelecom.netlify.app,https://www.solutelecom.mx
const ORIGENES = (process.env.ORIGENES || "")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);
app.use(
  cors({
    origin: (origen, listo) => {
      if (!origen || !ORIGENES.length) return listo(null, true); // local testing / server-to-server
      listo(null, ORIGENES.includes(origen));
    },
  })
);

app.get("/ping", (req, res) => res.send("pong"));

// ----- Postal code lookup (Syscom) -----
const cacheCP = new Map();

async function syscomGet(ruta) {
  const r = await fetch(`${SYSCOM_API}${ruta}`, {
    headers: { Authorization: `Bearer ${SYSCOM_TOKEN}`, Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`Syscom ${r.status} en ${ruta}`);
  return r.json();
}

async function buscarCP(cp) {
  if (cacheCP.has(cp)) return cacheCP.get(cp);

  const [est, col] = await Promise.allSettled([
    syscomGet(`/carrito/estados/${cp}`),
    syscomGet(`/carrito/colonias/${cp}`),
  ]);
  if (est.status === "rejected") console.error(est.reason.message);
  if (col.status === "rejected") console.error(col.reason.message);

  const e = est.status === "fulfilled" ? (est.value.estado || [])[0] : null;
  const colonias = col.status === "fulfilled" ? col.value.colonias || [] : [];
  if (!e && !colonias.length) return null;

  const salida = {
    cp,
    municipio: e ? e.municipio : "",
    estado: e ? e.estado_nombre : "",
    zona_extendida: e ? String(e.zona_extendida).toLowerCase().startsWith("s") : false,
    colonias,
    syscom_estado: e || null, // Syscom's own record (has the state id the order needs)
  };
  cacheCP.set(cp, salida);
  return salida;
}

app.get("/cp/:cp", async (req, res) => {
  const cp = String(req.params.cp || "");
  if (!/^\d{5}$/.test(cp)) return res.status(400).json({ error: "Código postal no válido" });
  if (!SYSCOM_TOKEN) return res.status(503).json({ error: "Servicio no disponible" });

  if (demasiadas(req, "cp", 30)) return res.status(429).json({ error: "Demasiadas consultas" });

  const d = await buscarCP(cp);
  if (!d) return res.status(404).json({ error: "Código postal no encontrado" });
  const { syscom_estado, ...publico } = d; // the page doesn't need Syscom's raw record
  res.json(publico);
});

// ----- Shared helpers -----
const limpio = (v, max = 120) =>
  String(v == null ? "" : v).replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
const norm = (s) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();
const redondear = (n) => Math.round(n * 100) / 100;

// simple limit per IP and per route
const limites = new Map();
function demasiadas(req, ruta, max) {
  const clave = ruta + "|" + req.ip;
  const ahora = Date.now();
  const lista = (limites.get(clave) || []).filter((t) => ahora - t < 60000);
  if (lista.length >= max) return true;
  lista.push(ahora);
  limites.set(clave, lista);
  return false;
}

// Cart from the browser -> checked lines with OUR prices
function revisarCarrito(lista) {
  if (!Array.isArray(lista) || !lista.length || lista.length > 30) {
    return { error: "Carrito no válido" };
  }
  const tc = leerTipoCambio();
  const lineas = [];
  for (const it of lista) {
    const p = productos.get(String(it.producto_id));
    const qty = Number.parseInt(it.cantidad, 10);
    if (!p || !(qty >= 1 && qty <= 100)) return { error: "Producto o cantidad no válidos" };
    if (qty > (Number(p.total_existencia) || 0)) {
      return { error: `Sin existencia suficiente: ${p.modelo}` };
    }
    // The price is calculated HERE, never taken from the browser
    const { usd } = precioBaseUSD(p);
    if (isNaN(usd)) return { error: "Producto sin precio" };
    lineas.push({
      producto_id: String(p.producto_id),
      modelo: p.modelo || "",
      marca: p.marca || "",
      titulo: String(p.titulo || p.modelo).slice(0, 250),
      cantidad: qty,
      precio_unitario: redondear(usd * (1 + MARGEN) * (1 - DESCUENTO) * tc * (1 + IVA)),
      // for the customer's invoice (SAT codes come with Syscom's product data when available)
      clave_sat: String(p.sat_key || p.clave_sat || p.clave_producto_sat || "").replace(/\D/g, "").slice(0, 8),
      unidad_sat: String(
        (p.unidad_de_medida && (p.unidad_de_medida.clave_unidad_sat || p.unidad_de_medida.codigo_unidad)) || ""
      ).slice(0, 3),
    });
  }
  return { lineas };
}

// Delivery data from the browser -> checked customer
// paraCotizar: only the address is needed (email, factura... come later)
function revisarCliente(d = {}, paraCotizar = false) {
  const cliente = {
    nombre: limpio(d.nombre),
    telefono: limpio(d.telefono, 20),
    email: limpio(d.email),
    calle: limpio(d.calle, 100),
    numero: limpio(d.numero, 20),
    colonia: limpio(d.colonia, 100),
    cp: limpio(d.cp, 5),
    ciudad: limpio(d.ciudad, 100),
    estado: limpio(d.estado),
    referencias: limpio(d.referencias, 300),
    factura: d.factura === true || d.factura === "true",
  };
  if (cliente.factura) {
    cliente.rfc = limpio(d.rfc, 13).toUpperCase();
    cliente.razon = limpio(d.razon, 200);
    cliente.cpfiscal = limpio(d.cpfiscal, 5);
    cliente.regimen = limpio(d.regimen, 80);
    cliente.usocfdi = limpio(d.usocfdi, 80);
  }

  const direccionOk =
    cliente.nombre &&
    cliente.calle &&
    cliente.numero &&
    cliente.colonia &&
    cliente.ciudad &&
    cliente.estado &&
    /^\d{5}$/.test(cliente.cp) &&
    cliente.telefono.replace(/\D/g, "").length >= 10;
  if (!direccionOk) return { error: "Faltan datos de entrega o son incorrectos" };
  if (paraCotizar) return { cliente };

  const restoOk =
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cliente.email) &&
    (!cliente.factura ||
      (/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(cliente.rfc) &&
        cliente.razon &&
        /^\d{5}$/.test(cliente.cpfiscal)));
  if (!restoOk) return { error: "Faltan datos de entrega o son incorrectos" };
  return { cliente };
}

// The postal code must exist and belong to the chosen state.
// Returns Syscom's state code (estado_sat, e.g. "CHIH"), needed for the order.
async function revisarCP(cliente) {
  const info = await buscarCP(cliente.cp);
  if (!info) return { error: "El código postal no existe" };

  const equivalentes = { "DISTRITO FEDERAL": "CIUDAD DE MEXICO", "MEXICO": "ESTADO DE MEXICO" };
  const delCP = equivalentes[norm(info.estado)] || norm(info.estado);
  const elegido = norm(cliente.estado);
  if (!delCP.startsWith(elegido) && !elegido.startsWith(delCP)) {
    return { error: "El estado no coincide con el código postal" };
  }

  const estadoSat = info.syscom_estado && info.syscom_estado.estado_sat;
  if (!estadoSat) return { error: "No se pudo validar el código postal, intenta de nuevo" };
  return { estadoSat: String(estadoSat).slice(0, 4) };
}

// ----- Syscom: quote and order -----
async function syscomPost(ruta, cuerpo) {
  const r = await fetch(`${SYSCOM_API}${ruta}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SYSCOM_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  let data = texto;
  try {
    data = JSON.parse(texto);
  } catch (e) {
    // keep the plain text
  }
  return { ok: r.ok, status: r.status, data };
}

// Syscom answers 200 OK even when it rejects ({ "error": "..." }), so check both
function errorSyscom(s) {
  const d = s.data && typeof s.data === "object" ? s.data : {};
  if (s.ok && !d.error) return null;
  let msg = d.error || d.message || (typeof s.data === "string" ? s.data.slice(0, 200) : "");
  if (Array.isArray(d.detalles) && d.detalles.length) msg += " " + JSON.stringify(d.detalles);
  return {
    status: s.status,
    codigo: d.error_code || null,
    mensaje: String(msg || `Syscom respondió ${s.status}`).slice(0, 500),
  };
}

// "generar pedido" body, exactly as documented by Syscom
function cuerpoSyscom({ lineas, cliente, estadoSat, fletera, referencia, real }) {
  const cuerpo = {
    tipo_entrega: "domicilio",
    direccion: {
      atencion_a: cliente.nombre.slice(0, 120),
      calle: cliente.calle.slice(0, 100),
      num_ext: cliente.numero.slice(0, 20),
      colonia: cliente.colonia.slice(0, 100),
      ciudad: cliente.ciudad.slice(0, 100),
      estado: estadoSat,
      pais: "MEX",
      codigo_postal: cliente.cp,
      telefono: cliente.telefono.replace(/\D/g, "").slice(-10),
    },
    fletera,
    moneda: "mxn",
    uso_cfdi: SYSCOM_CFDI,
    metodo_pago: SYSCOM_METODO_PAGO,
    productos: lineas.map((l) => ({
      id: Number(l.producto_id),
      cantidad: l.cantidad,
      tipo: "nuevo",
    })),
  };
  if (referencia) cuerpo.orden_compra = referencia;
  if (real) cuerpo.ordenar = true; // creates the real order and reserves stock
  else cuerpo.testmode = true;     // only quotes, nothing is created
  return cuerpo;
}

// Finds the shipping cost in Syscom's quote.
// If Syscom uses a different name, set ENVIO_CAMPO to its path (e.g. "totales.flete").
function extraerEnvio(data) {
  if (process.env.ENVIO_CAMPO) {
    const v = process.env.ENVIO_CAMPO.split(".").reduce((o, k) => (o == null ? o : o[k]), data);
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }
  const hallados = [];
  (function buscar(o, ruta) {
    if (!o || typeof o !== "object") return;
    for (const [k, v] of Object.entries(o)) {
      const r = ruta ? `${ruta}.${k}` : k;
      if (Array.isArray(v)) continue; // product lists: skip per-product values
      if (v && typeof v === "object") buscar(v, r);
      else if (/flete|envio/i.test(k) && v !== "" && v !== null && typeof v !== "boolean" && !isNaN(Number(v))) {
        hallados.push({ ruta: r, valor: Number(v) });
      }
    }
  })(data, "");
  if (!hallados.length) return null;
  // the most "total" one: prefer names with "total", then the shortest path
  hallados.sort(
    (a, b) =>
      (/total/i.test(b.ruta) ? 1 : 0) - (/total/i.test(a.ruta) ? 1 : 0) ||
      a.ruta.split(".").length - b.ruta.split(".").length
  );
  return hallados[0].valor;
}

function buscarValor(o, clave) {
  if (!o || typeof o !== "object") return null;
  if (o[clave] != null) return o[clave];
  for (const v of Object.values(o)) {
    const r = buscarValor(v, clave);
    if (r != null) return r;
  }
  return null;
}

const cacheCotizaciones = new Map(); // same cart + address for 10 minutes -> same quote

// Asks Syscom for the shipping cost, trying each fletera until one covers the CP
async function cotizarEnvio(lineas, cliente, estadoSat) {
  if (!SYSCOM_TOKEN || !SYSCOM_FLETERAS.length) {
    return { error: "El envío no está disponible en este momento" };
  }
  const clave = JSON.stringify([
    lineas.map((l) => [l.producto_id, l.cantidad]),
    cliente.cp, cliente.calle, cliente.numero, cliente.colonia, cliente.ciudad, estadoSat,
  ]);
  const guardada = cacheCotizaciones.get(clave);
  if (guardada && Date.now() - guardada.t < 10 * 60000) return guardada.r;

  let ultimoError = null;
  for (const fletera of SYSCOM_FLETERAS) {
    const s = await syscomPost(
      "/carrito/generar",
      cuerpoSyscom({ lineas, cliente, estadoSat, fletera, real: false })
    );
    const err = errorSyscom(s);

    // keep the last answer so you can check the field names
    try {
      fs.writeFileSync(
        path.join(CARPETA_PEDIDOS, "ultima-cotizacion-syscom.json"),
        JSON.stringify({ fecha: new Date().toISOString(), fletera, status: s.status, respuesta: s.data }, null, 2)
      );
    } catch (e) {
      // not important
    }

    if (err) {
      ultimoError = err;
      console.error(`Cotización Syscom con ${fletera}: ${err.status} ${err.mensaje}`);
      // no coverage for this CP or address problem with this fletera: try the next one
      if (err.status === 422 || String(err.codigo) === "9015") continue;
      break;
    }

    const costo = extraerEnvio(s.data);
    if (costo == null) {
      console.error(
        "No encontré el costo de envío en la respuesta de Syscom. Revisa ultima-cotizacion-syscom.json y pon su ruta en ENVIO_CAMPO."
      );
      return { error: "No se pudo calcular el envío" };
    }
    const r = { fletera, envio: redondear(costo * (ENVIO_SIN_IVA ? 1 + IVA : 1)) };
    cacheCotizaciones.set(clave, { t: Date.now(), r });
    return r;
  }

  if (ultimoError && (ultimoError.status === 422 || String(ultimoError.codigo) === "9015")) {
    return { error: "No hay envío disponible a tu dirección. Revisa tu código postal y colonia." };
  }
  if (ultimoError && /existencia/i.test(ultimoError.mensaje)) {
    return { error: "Uno de los productos ya no tiene existencia suficiente" };
  }
  return { error: "No se pudo calcular el envío, intenta de nuevo" };
}

// =========================================================
// Product search, featured products and stock per branch
// =========================================================
function sinAcento(t) {
  return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}


function construirIndice() {
  indice = [];
  for (const p of productos.values()) {
    indice.push({
      p,
      texto: sinAcento([p.titulo, p.marca, p.modelo].join(" ")),
      modelo: sinAcento(p.modelo),
    });
  }

  // vocabulary for "¿Quisiste decir…?" (words that appear in at least 2 products)
  const cuenta = new Map();
  for (const x of indice) for (const w of new Set(x.texto.split(/[^a-z0-9]+/))) if (w.length >= 3) cuenta.set(w, (cuenta.get(w) || 0) + 1);
  vocabulario = Array.from(cuenta).filter(([, n]) => n >= 2);
  periodoDestacados = -1; // pick the featured products again with the new catalog
  enExistencia = { periodo: -1, lista: [] };
}

// ----- Featured products: a new set every 30 minutes -----
const MINUTOS_POR_ROTACION = 30; // carousel and home products: a new random set every 30 minutes

// the same "random" order for everyone during the same 30 minutes
function mezclar(lista, semilla) {
  let a = semilla >>> 0;
  const azar = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const copia = lista.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function elegirDestacados() {
  const periodo = Math.floor(Date.now() / (MINUTOS_POR_ROTACION * 60000));
  if (periodo === periodoDestacados && destacados.length) return destacados;
  periodoDestacados = periodo;

  // good candidates: in stock, with photo and price
  const candidatos = indice
    .map((x) => x.p)
    .filter((p) => (Number(p.total_existencia) || 0) >= 5 && p.img_portada && !isNaN(precioBaseUSD(p).usd));

  // one per brand first, so the ring looks varied
  const elegidos = [];
  const marcas = new Set();
  const mezclados = mezclar(candidatos, periodo);
  for (const p of mezclados) {
    if (elegidos.length >= 10) break;
    if (marcas.has(p.marca)) continue;
    marcas.add(p.marca);
    elegidos.push(p);
  }
  for (const p of mezclados) {
    if (elegidos.length >= 10) break;
    if (!elegidos.includes(p)) elegidos.push(p);
  }
  destacados = elegidos;
  return destacados;
}

// only what the page needs (keeps answers small)
const paraPagina = (p) => ({
  producto_id: p.producto_id,
  titulo: p.titulo,
  marca: p.marca,
  modelo: p.modelo,
  img_portada: p.img_portada,
  precios: p.precios,
  total_existencia: p.total_existencia,
});

// edit distance between two words (for typos)
function distancia(a, b, max) {
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

// "camra hikvsion" -> "camara hikvision" (null if nothing better)
function corregirBusqueda(q) {
  const conocidas = new Set(vocabulario.map(([w]) => w));
  let cambio = false;
  const palabras = q.split(/\s+/).map((w) => {
    if (w.length < 3 || conocidas.has(w) || /\d/.test(w)) return w;
    const max = w.length <= 4 ? 1 : 2;
    let mejor = null;
    for (const [v, n] of vocabulario) {
      const d = distancia(w, v, max);
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

// common shorthand -> how Syscom writes it (4mp -> 4 megapixel, cat6 -> cat6 ...)
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

app.get("/buscar", (req, res) => {
  if (demasiadas(req, "buscar", 90)) return res.status(429).json({ error: "Demasiadas consultas" });
  if (!catalogoListo) return res.status(503).json({ error: "Tienda iniciando, intenta en un minuto" });

  const q = expandirBusqueda(sinAcento(limpio(req.query.q, 80)));
  const palabras = q.split(/\s+/).filter((w) => w.length >= 2);
  if (!palabras.length) return res.json({ total: 0, productos: [] });
  const limite = Math.min(Math.max(parseInt(req.query.limit, 10) || 240, 1), 240);

  const encontrados = [];
  for (const x of indice) {
    if (!palabras.every((w) => x.texto.includes(w))) continue;
    let puntos = 0;
    if (x.modelo === q) puntos += 100;
    else if (x.modelo.startsWith(q)) puntos += 40;
    if ((Number(x.p.total_existencia) || 0) > 0) puntos += 10;
    encontrados.push({ x, puntos });
  }
  encontrados.sort((a, b) => b.puntos - a.puntos);

  // most common categories among the results (deepest level, and level 2)
  const sub = new Map();
  const cat = new Map();
  const sumar = (m, c) => {
    if (!c || !c.id) return;
    const prev = m.get(String(c.id));
    m.set(String(c.id), { id: String(c.id), nombre: limpio(c.nombre, 80), n: (prev ? prev.n : 0) + 1 });
  };
  for (const { x } of encontrados) {
    const cs = Array.isArray(x.p.categorias) ? x.p.categorias : [];
    if (!cs.length) continue;
    const hoja = cs.reduce((a, b) => (Number(b.nivel) > Number(a.nivel) ? b : a), cs[0]);
    sumar(sub, hoja);
    sumar(cat, cs.find((c) => Number(c.nivel) === 2));
  }
  const top = (m, k) => Array.from(m.values()).sort((a, b) => b.n - a.n).slice(0, k);

  res.json({
    total: encontrados.length,
    productos: encontrados.slice(0, limite).map((e) => paraPagina(e.x.p)),
    categorias: { sub: top(sub, 6), cat: top(cat, 5) },
    sugerencia: encontrados.length ? null : corregirBusqueda(q),
  });
});

app.get("/destacados", (req, res) => {
  if (!catalogoListo) return res.status(503).json({ error: "Tienda iniciando" });
  res.json({ productos: elegirDestacados().map(paraPagina) });
});

// Syscom branch -> state (to show "Ciudad · Estado")
const ESTADO_SUCURSAL = [
  ["aguascalientes", "Aguascalientes"], ["cancun", "Quintana Roo"], ["juarez", "Chihuahua"],
  ["chihuahua", "Chihuahua"], ["culiacan", "Sinaloa"], ["guadalajara", "Jalisco"],
  ["hermosillo", "Sonora"], ["la paz", "Baja California Sur"], ["leon", "Guanajuato"],
  ["merida", "Yucatán"], ["mexico", "CDMX / Edo. Méx."], ["monterrey", "Nuevo León"],
  ["oaxaca", "Oaxaca"], ["puebla", "Puebla"], ["queretaro", "Querétaro"], ["tijuana", "Baja California"],
  ["mexicali", "Baja California"], ["veracruz", "Veracruz"], ["villahermosa", "Tabasco"],
  ["torreon", "Coahuila"], ["saltillo", "Coahuila"], ["san luis", "San Luis Potosí"],
  ["tuxtla", "Chiapas"], ["morelia", "Michoacán"], ["toluca", "Estado de México"],
  ["durango", "Durango"], ["zacatecas", "Zacatecas"], ["tampico", "Tamaulipas"],
  ["reynosa", "Tamaulipas"], ["obregon", "Sonora"], ["mazatlan", "Sinaloa"], ["acapulco", "Guerrero"],
  ["pachuca", "Hidalgo"], ["cuernavaca", "Morelos"], ["tepic", "Nayarit"], ["colima", "Colima"],
  ["campeche", "Campeche"], ["chetumal", "Quintana Roo"], ["tlaxcala", "Tlaxcala"], ["xalapa", "Veracruz"],
];
function estadoDeSucursal(nombre) {
  const n = sinAcento(nombre).replace(/[_-]+/g, " ");
  const hallado = ESTADO_SUCURSAL.find(([clave]) => n.includes(clave));
  return hallado ? hallado[1] : "";
}

const numero = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};
const bonito = (t) =>
  String(t || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

// common branch names written with their accents
const ACENTOS = {
  cancun: "Cancún", juarez: "Juárez", leon: "León", merida: "Mérida", queretaro: "Querétaro",
  culiacan: "Culiacán", torreon: "Torreón", mexico: "México", obregon: "Obregón", mazatlan: "Mazatlán",
  potosi: "Potosí", cd: "Cd.", tuxtla: "Tuxtla", gutierrez: "Gutiérrez", leon_: "León",
};
const conAcentos = (t) =>
  String(t || "").replace(/\p{L}+/gu, (w) => ACENTOS[sinAcento(w)] || w);

// Syscom's existencia.detalle -> [{ sucursal, estado, nuevo, transito, caja_abierta }]
// Written to accept the shapes Syscom uses (list of rows, or an object per warehouse).
function sucursalesDe(existencia) {
  const det = existencia && existencia.detalle;
  const filas = [];
  const agregar = (nombre, info) => {
    if (!nombre) return;
    let nuevo = 0, transito = 0, caja = 0;
    if (typeof info === "number" || typeof info === "string") nuevo = numero(info);
    else if (info && typeof info === "object") {
      nuevo = numero(info.nuevo ?? info.existencia ?? info.cantidad ?? info.stock ?? info.total);
      transito = numero(info.transito ?? info.en_transito ?? info.transito_nuevo);
      for (const k of ["a", "b", "c", "caja_abierta", "asterisco"]) {
        const v = info[k];
        caja += v && typeof v === "object" ? Object.values(v).reduce((s, x) => s + numero(x), 0) : numero(v);
      }
    }
    filas.push({ sucursal: conAcentos(bonito(nombre)), estado: estadoDeSucursal(nombre), nuevo, transito, caja_abierta: caja });
  };

  if (Array.isArray(det)) {
    for (const f of det) {
      if (!f || typeof f !== "object") continue;
      agregar(f.sucursal || f.almacen || f.nombre || f.ubicacion || f.key, f);
    }
  } else if (det && typeof det === "object") {
    for (const [nombre, info] of Object.entries(det)) agregar(nombre, info);
  }

  // join rows of the same branch
  const juntas = new Map();
  for (const f of filas) {
    const prev = juntas.get(f.sucursal);
    if (!prev) juntas.set(f.sucursal, f);
    else {
      prev.nuevo += f.nuevo;
      prev.transito += f.transito;
      prev.caja_abierta += f.caja_abierta;
    }
  }
  // every branch, including the ones with 0, in alphabetical order
  return Array.from(juntas.values()).sort((a, b) => a.sucursal.localeCompare(b.sucursal, "es"));
}

const cacheExistencias = new Map(); // 10 minutes per product

app.get("/existencias/:id", async (req, res) => {
  if (demasiadas(req, "existencias", 30)) return res.status(429).json({ error: "Demasiadas consultas" });
  const id = String(req.params.id || "");
  if (!/^\d{1,10}$/.test(id) || !productos.has(id)) {
    return res.status(404).json({ error: "Este producto no está en el catálogo del servidor (reinicia el servidor si acabas de actualizar el catálogo)." });
  }
  if (!SYSCOM_TOKEN) return res.status(503).json({ error: "Falta SYSCOM_TOKEN en el servidor." });

  const guardada = cacheExistencias.get(id);
  if (guardada && Date.now() - guardada.t < 10 * 60000) return res.json(guardada.d);

  try {
    const d = await syscomGet(`/productos/${id}?inventarios=true`);
    try {
      fs.writeFileSync(
        path.join(CARPETA_PEDIDOS, "ultima-existencia-syscom.json"),
        JSON.stringify({ fecha: new Date().toISOString(), id, existencia: d.existencia, total: d.total_existencia }, null, 2)
      );
    } catch (e) {
      // not important
    }
    const sucursales = sucursalesDe(d.existencia);
    const total = numero(d.total_existencia) || sucursales.reduce((s, f) => s + f.nuevo, 0);
    const salida = { id, total, sucursales };
    cacheExistencias.set(id, { t: Date.now(), d: salida });
    res.json(salida);
  } catch (e) {
    console.error("Existencias Syscom:", e.message);
    const codigo = (String(e.message).match(/Syscom (\d{3})/) || [])[1];
    const motivo =
      codigo === "401" ? "el token de Syscom expiró o no es válido" :
      codigo === "403" ? "tu token de Syscom no tiene permiso para consultar productos" :
      codigo === "404" ? "Syscom ya no tiene este producto disponible" :
      codigo === "429" ? "demasiadas consultas a Syscom, espera un minuto" :
      codigo ? `Syscom respondió ${codigo}` : "no hubo conexión con Syscom";
    res.status(502).json({ error: `No se pudo consultar el desglose: ${motivo}.` });
  }
});

// Stock per branch for many products at once (one Syscom call for the whole page)
// GET /existencias-lote?ids=1,2,3   ->  { "1": { total, sucursales: [...] }, ... }
app.get("/existencias-lote", async (req, res) => {
  if (demasiadas(req, "existencias-lote", 40)) return res.status(429).json({ error: "Demasiadas consultas" });
  if (!SYSCOM_TOKEN) return res.status(503).json({ error: "Falta SYSCOM_TOKEN en el servidor." });

  const ids = Array.from(
    new Set(String(req.query.ids || "").split(",").map((x) => x.trim()).filter((x) => /^\d{1,10}$/.test(x) && productos.has(x)))
  ).slice(0, 60);
  const salida = {};
  const faltan = [];
  for (const id of ids) {
    const g = cacheExistencias.get(id);
    if (g && Date.now() - g.t < 10 * 60000) salida[id] = g.d;
    else faltan.push(id);
  }

  if (faltan.length) {
    try {
      let d = await syscomGet(`/productos/${faltan.join(",")}?inventarios=true`);
      if (!Array.isArray(d)) d = [d];
      for (const p of d) {
        const id = String(p && p.producto_id);
        if (!faltan.includes(id)) continue;
        const sucursales = sucursalesDe(p.existencia);
        const total = numero(p.total_existencia) || sucursales.reduce((s, f) => s + f.nuevo, 0);
        const info = { id, total, sucursales };
        cacheExistencias.set(id, { t: Date.now(), d: info });
        salida[id] = info;
      }
    } catch (e) {
      console.error("Existencias (lote) Syscom:", e.message);
      if (!Object.keys(salida).length) return res.status(502).json({ error: "No se pudo consultar el inventario" });
    }
  }
  res.json(salida);
});

// "Va bien con…": complementary products for one product
// Each rule: if the product's title matches "si", suggest products that match each "sugerir" pattern.
const COMPLEMENTOS = [
  { si: /\b(camara|bala|domo|turret|ptz|eyeball)\b/, sugerir: [/\b(nvr|dvr|xvr)\b/, /disco duro|\bhdd\b/, /fuente de (poder|alimentacion)/, /\bbalun|transceptor/, /cable utp|bobina/, /switch poe/] },
  { si: /\b(nvr|dvr|xvr)\b/, sugerir: [/\b(camara|bala|domo|turret)\b/, /disco duro|\bhdd\b/, /switch poe/, /cable utp|bobina/, /monitor/] },
  { si: /\bswitch\b/, sugerir: [/cable utp|bobina/, /conector rj45|plug rj45/, /patch cord/, /gabinete|rack/, /access point|punto de acceso/] },
  { si: /access point|punto de acceso/, sugerir: [/switch poe/, /inyector poe/, /cable utp|bobina/, /conector rj45|plug rj45/] },
  { si: /cable utp|bobina/, sugerir: [/conector rj45|plug rj45/, /pinza|ponchadora/, /\bjack\b/, /patch panel/, /probador|tester/] },
  { si: /fibra optica|fibra/, sugerir: [/conector|fast connector/, /cleaver|cortadora/, /distribuidor|odf/, /jumper|patch cord/, /fusionadora/] },
  { si: /panel de alarma|alarma/, sugerir: [/sensor|detector/, /contacto magnetico/, /sirena/, /teclado/, /bateria/] },
  { si: /control de acceso|lectora|cerradura/, sugerir: [/cerradura|electroiman/, /boton de salida/, /fuente de (poder|alimentacion)/, /tarjeta|tag/] },
];

function mejorPara(patron, excluir, marca) {
  let mejor = null;
  let puntos = -1;
  for (const x of indice) {
    const p = x.p;
    if (excluir.has(String(p.producto_id))) continue;
    if (!patron.test(x.texto)) continue;
    const stock = Number(p.total_existencia) || 0;
    if (stock <= 0 || !p.img_portada || isNaN(precioBaseUSD(p).usd)) continue;
    const pts = (p.marca === marca ? 1000 : 0) + Math.min(stock, 999);
    if (pts > puntos) {
      puntos = pts;
      mejor = p;
    }
  }
  return mejor;
}

const cacheRelacionados = new Map();
app.get("/relacionados/:id", (req, res) => {
  if (!catalogoListo) return res.status(503).json({ error: "Tienda iniciando" });
  const id = String(req.params.id || "");
  const p = productos.get(id);
  if (!p) return res.status(404).json({ error: "Producto no encontrado" });
  if (cacheRelacionados.has(id)) return res.json(cacheRelacionados.get(id));

  const texto = sinAcento([p.titulo, p.modelo].join(" "));
  const excluir = new Set([id]);
  const lista = [];
  const regla = COMPLEMENTOS.find((r) => r.si.test(texto));
  for (const patron of (regla && regla.sugerir) || []) {
    const q = mejorPara(patron, excluir, p.marca);
    if (q) {
      lista.push(q);
      excluir.add(String(q.producto_id));
    }
    if (lista.length >= 6) break;
  }
  // fill with similar products of the same brand
  if (lista.length < 4) {
    const primera = (texto.match(/[a-z]{4,}/) || [""])[0];
    for (const x of indice) {
      if (lista.length >= 6) break;
      const q = x.p;
      if (excluir.has(String(q.producto_id)) || q.marca !== p.marca || !x.texto.includes(primera)) continue;
      if ((Number(q.total_existencia) || 0) <= 0 || !q.img_portada) continue;
      lista.push(q);
      excluir.add(String(q.producto_id));
    }
  }
  const salida = { productos: lista.map(paraPagina) };
  if (cacheRelacionados.size > 5000) cacheRelacionados.clear();
  cacheRelacionados.set(id, salida);
  res.json(salida);
});

// In-stock products for the home page, a different mix every 30 minutes
// GET /en-existencia?pagina=1  ->  { total, paginas, productos }
app.get("/en-existencia", (req, res) => {
  if (!catalogoListo) return res.status(503).json({ error: "Tienda iniciando" });
  const POR_PAGINA = 12;
  const periodo = Math.floor(Date.now() / (MINUTOS_POR_ROTACION * 60000));
  if (!enExistencia.lista.length || enExistencia.periodo !== periodo) {
    const buenos = indice
      .map((x) => x.p)
      .filter((p) => (Number(p.total_existencia) || 0) >= 5 && p.img_portada && !isNaN(precioBaseUSD(p).usd));
    enExistencia = { periodo, lista: mezclar(buenos, periodo + 7919) };
  }
  const total = enExistencia.lista.length;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pagina = Math.min(Math.max(parseInt(req.query.pagina, 10) || 1, 1), paginas);
  res.json({
    total,
    paginas,
    pagina,
    productos: enExistencia.lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map(paraPagina),
  });
});

// ----- Shipping quote for the checkout page -----
app.post("/cotizar-envio", async (req, res) => {
  if (!catalogoListo) return res.status(503).json({ error: "Tienda iniciando, intenta en un minuto" });
  if (demasiadas(req, "cotizar", 20)) return res.status(429).json({ error: "Demasiadas consultas" });
  const cuerpo = req.body || {};

  const c = revisarCarrito(cuerpo.items);
  if (c.error) return res.status(400).json({ error: c.error });
  const k = revisarCliente(cuerpo.cliente, true);
  if (k.error) return res.status(400).json({ error: k.error });
  const e = await revisarCP(k.cliente);
  if (e.error) return res.status(400).json({ error: e.error });

  const q = await cotizarEnvio(c.lineas, k.cliente, e.estadoSat);
  if (q.error) return res.status(400).json({ error: q.error });
  res.json({ envio: q.envio });
});

// ----- Payment -----
app.post("/crear-pago", async (req, res) => {
  if (!catalogoListo) return res.status(503).json({ error: "Tienda iniciando, intenta en un minuto" });
  if (demasiadas(req, "pago", 10)) return res.status(429).json({ error: "Demasiadas consultas" });
  const cuerpo = req.body || {};
  const lista = Array.isArray(cuerpo.items)
    ? cuerpo.items
    : [{ producto_id: cuerpo.producto_id, cantidad: cuerpo.cantidad }];

  const c = revisarCarrito(lista);
  if (c.error) return res.status(400).json({ error: c.error });
  const k = revisarCliente(cuerpo.cliente);
  if (k.error) return res.status(400).json({ error: k.error });
  const e = await revisarCP(k.cliente);
  if (e.error) return res.status(400).json({ error: e.error });

  // Shipping is quoted with Syscom HERE too, so the customer pays exactly what Syscom will charge
  const q = await cotizarEnvio(c.lineas, k.cliente, e.estadoSat);
  if (q.error) return res.status(400).json({ error: q.error });

  const itemsMP = c.lineas.map((l) => ({
    title: l.titulo,
    unit_price: l.precio_unitario.toFixed(2),
    quantity: l.cantidad,
  }));
  if (q.envio > 0) {
    itemsMP.push({ title: "Envío a domicilio", unit_price: q.envio.toFixed(2), quantity: 1 });
  }
  const centavos = itemsMP.reduce(
    (s, i) => s + Math.round(parseFloat(i.unit_price) * 100) * i.quantity,
    0
  );

  const referencia = `web-${Date.now()}`;
  const orden = {
    type: "online",
    processing_mode: "manual",
    total_amount: (centavos / 100).toFixed(2),
    external_reference: referencia,
    items: itemsMP,
    config: {
      online: {
        success_url: `${SITE}/index.html?pago=exitoso`,
        failure_url: `${SITE}/index.html?pago=fallido`,
        pending_url: `${SITE}/index.html?pago=pendiente`,
      },
    },
  };

  // Save the order BEFORE creating the payment, so it is never lost
  const pedido = {
    referencia,
    fecha: new Date().toISOString(),
    estado: "pago iniciado",
    total: orden.total_amount,
    envio: q.envio,
    fletera: q.fletera,
    estado_sat: e.estadoSat,
    productos: c.lineas,
    cliente: k.cliente,
  };
  const cuenta = await usuarioDeToken(req);
  if (cuenta) pedido.uid = cuenta.uid;
  const archivoPedido = path.join(CARPETA_PEDIDOS, `${referencia}.json`);
  try {
    guardarPedido(archivoPedido, pedido);
    console.log("Pedido guardado:", referencia);
  } catch (err) {
    console.error("No se pudo guardar el pedido:", err.message);
    return res.status(500).json({ error: "Error del servidor" });
  }

  try {
    const r = await fetch(`${MP_API}/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
        "X-Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify(orden),
    });
    const texto = await r.text();
    let data = {};
    try {
      data = JSON.parse(texto);
    } catch (err) {
      // empty or not JSON
    }

    if (!r.ok || !data.checkout_url) {
      console.error("Mercado Pago respondió:", r.status, texto.slice(0, 300));
      return res.status(502).json({ error: "No se pudo crear el pago" });
    }

    try {
      guardarPedido(archivoPedido, { ...pedido, mp_order_id: data.id });
    } catch (err) {
      // the order was already saved before
    }
    res.json({ id: data.id, init_point: data.checkout_url });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// =========================================================
// After the payment: Mercado Pago notifies us -> we order from Syscom
// =========================================================
function leerPedido(referencia) {
  if (!/^web-\d+$/.test(referencia || "")) return null; // only our own file names
  const archivo = path.join(CARPETA_PEDIDOS, `${referencia}.json`);
  try {
    return { archivo, pedido: JSON.parse(fs.readFileSync(archivo, "utf8")) };
  } catch (e) {
    return null;
  }
}

function guardarPedido(archivo, pedido) {
  fs.writeFileSync(archivo, JSON.stringify(pedido, null, 2));
}

// Checks that the notification really comes from Mercado Pago (if the secret is set)
function firmaValida(req, dataId) {
  if (!MP_WEBHOOK_SECRET) return true;
  const firma = String(req.get("x-signature") || "");
  const requestId = String(req.get("x-request-id") || "");
  const partes = Object.fromEntries(firma.split(",").map((p) => p.split("=").map((x) => x.trim())));
  if (!partes.ts || !partes.v1) return false;
  const manifiesto = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${partes.ts};`;
  const esperada = createHmac("sha256", MP_WEBHOOK_SECRET).update(manifiesto).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(esperada), Buffer.from(partes.v1));
  } catch (e) {
    return false;
  }
}

const enProceso = new Set(); // stops two notifications ordering the same thing twice

// ----- Customer invoice (CFDI 4.0) with Facturapi -----
// FACTURAPI_KEY: your secret key from facturapi.io (sk_test_... for tests, sk_live_... for real invoices)
const FACTURAPI_KEY = (process.env.FACTURAPI_KEY || "").trim();
const FACTURAPI_API = process.env.FACTURAPI_API || "https://www.facturapi.io/v2";
// SAT product code used when Syscom's data has none (ask your accountant for the best one)
const FACTURA_CLAVE_DEFAULT = process.env.FACTURA_CLAVE_DEFAULT || "01010101";
console.log(`Facturación automática: ${FACTURAPI_KEY ? (FACTURAPI_KEY.startsWith("sk_test") ? "PRUEBA" : "ACTIVA") : "apagada (falta FACTURAPI_KEY)"}`);

// how the customer paid, in SAT codes (forma de pago)
function formaPagoSAT(mp) {
  const pagos = (mp.transactions && mp.transactions.payments) || [];
  const tipo = String((pagos[0] && pagos[0].payment_method && pagos[0].payment_method.type) || "");
  return (
    { credit_card: "04", debit_card: "28", bank_transfer: "03", ticket: "01", atm: "01", account_money: "06" }[tipo] ||
    "04"
  );
}

async function facturapi(ruta, cuerpo) {
  const r = await fetch(`${FACTURAPI_API}${ruta}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${FACTURAPI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  let data = {};
  try {
    data = JSON.parse(texto);
  } catch (e) {
    data = { message: texto.slice(0, 300) };
  }
  return { ok: r.ok, status: r.status, data };
}

async function facturarPedido(pedido, mp) {
  const c = pedido.cliente;
  const factura = {
    customer: {
      legal_name: String(c.razon || "").toUpperCase().trim(),
      tax_id: c.rfc,
      tax_system: (String(c.regimen || "").match(/^\d{3}/) || [""])[0],
      email: c.email,
      address: { zip: c.cpfiscal },
    },
    items: pedido.productos.map((l) => ({
      quantity: l.cantidad,
      product: {
        description: `${l.titulo}`.slice(0, 1000),
        product_key: l.clave_sat && l.clave_sat.length === 8 ? l.clave_sat : FACTURA_CLAVE_DEFAULT,
        unit_key: l.unidad_sat || "H87",
        price: l.precio_unitario,
        tax_included: true,
        sku: l.modelo || undefined,
      },
    })),
    use: (String(c.usocfdi || "").match(/^[A-Z]\d{2}/) || ["G03"])[0],
    payment_form: formaPagoSAT(mp),
    payment_method: "PUE",
    external_id: pedido.referencia,
  };
  if (Number(pedido.envio) > 0) {
    factura.items.push({
      quantity: 1,
      product: {
        description: "Servicio de envío a domicilio",
        product_key: "78102203",
        unit_key: "E48",
        price: Number(pedido.envio),
        tax_included: true,
      },
    });
  }

  const f = await facturapi("/invoices", factura);
  if (!f.ok) {
    return { ok: false, error: String(f.data.message || `Facturapi ${f.status}`).slice(0, 500), enviado: factura };
  }
  // email the PDF and XML to the customer
  const e = await facturapi(`/invoices/${encodeURIComponent(f.data.id)}/email`, { email: c.email });
  return {
    ok: true,
    id: f.data.id,
    uuid: f.data.uuid || null,
    folio: [f.data.series, f.data.folio_number].filter(Boolean).join("-") || null,
    total: f.data.total,
    correo_enviado: e.ok,
    prueba: FACTURAPI_KEY.startsWith("sk_test"),
  };
}

async function procesarPagoAprobado(mpOrderId) {
  // 1. Ask Mercado Pago directly: never trust the notification alone
  const r = await fetch(`${MP_API}/v1/orders/${encodeURIComponent(mpOrderId)}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!r.ok) {
    console.error("No se pudo consultar la orden de Mercado Pago:", r.status);
    return;
  }
  const mp = await r.json();
  const referencia = mp.external_reference;
  console.log(`Mercado Pago ${mpOrderId}: ${mp.status} / ${mp.status_detail} (${referencia})`);

  const encontrado = leerPedido(referencia);
  if (!encontrado) {
    console.error("Pedido no encontrado para", referencia);
    return;
  }
  const { archivo, pedido } = encontrado;
  const quiereFactura = !!(pedido.cliente && pedido.cliente.factura);
  const syscomListo = pedido.syscom && pedido.syscom.ok;
  const facturaLista = !quiereFactura || (pedido.factura && pedido.factura.ok);
  if (syscomListo && facturaLista) return; // nothing left to do

  if (mp.status !== "processed") {
    // pending, cancelled, rejected... just record it
    if (!String(pedido.estado).startsWith("pagado")) {
      pedido.estado = `pago ${mp.status}`;
      guardarPedido(archivo, pedido);
    }
    return;
  }

  // 2. The amount paid must match what we charged
  const pagado = parseFloat(mp.total_paid_amount || mp.total_amount);
  if (Math.abs(pagado - parseFloat(pedido.total)) > 0.01) {
    pedido.estado = "REVISAR: monto pagado distinto";
    guardarPedido(archivo, pedido);
    console.error(`Monto distinto en ${referencia}: pagó ${pagado}, esperado ${pedido.total}`);
    return;
  }

  if (enProceso.has(referencia)) return;
  enProceso.add(referencia);
  try {
    pedido.mp_order_id = mpOrderId;
    pedido.fecha_pago = pedido.fecha_pago || new Date().toISOString();

    // 3. Order from Syscom (only once)
    if (!syscomListo) {
      const cuerpo = cuerpoSyscom({
        lineas: pedido.productos,
        cliente: pedido.cliente,
        estadoSat: pedido.estado_sat,
        fletera: pedido.fletera,
        referencia,
        real: !SYSCOM_PRUEBA,
      });
      const s = await syscomPost("/carrito/generar", cuerpo);
      const err = errorSyscom(s);
      pedido.syscom = {
        ok: !err,
        prueba: SYSCOM_PRUEBA,
        fecha: new Date().toISOString(),
        folio_pedido: err ? null : buscarValor(s.data, "folio_pedido"),
        error: err,
        enviado: cuerpo,
        respuesta: s.data,
      };
      if (err) console.error(`Syscom rechazó ${referencia} (${err.status}): ${err.mensaje}`);
      else console.log(`Syscom aceptó ${referencia}: folio ${pedido.syscom.folio_pedido || "(prueba)"}`);
    }

    // 4. Customer invoice (only if they asked for one, only once)
    if (quiereFactura && !(pedido.factura && pedido.factura.ok)) {
      if (!FACTURAPI_KEY) {
        pedido.factura = { ok: false, error: "Facturación automática apagada: falta FACTURAPI_KEY" };
      } else {
        try {
          pedido.factura = { fecha: new Date().toISOString(), ...(await facturarPedido(pedido, mp)) };
        } catch (e) {
          pedido.factura = { ok: false, error: e.message };
        }
      }
      if (pedido.factura.ok) console.log(`Factura emitida ${referencia}: ${pedido.factura.folio || pedido.factura.id}`);
      else console.error(`Factura NO emitida ${referencia}: ${pedido.factura.error}`);
    }

    // 5. One status line you can read at a glance
    const partes = ["pagado"];
    if (pedido.syscom.ok) {
      partes.push(SYSCOM_PRUEBA ? "pedido Syscom de PRUEBA" : `pedido Syscom ${pedido.syscom.folio_pedido || ""}`.trim());
    } else partes.push("ERROR SYSCOM: revisar a mano");
    if (quiereFactura) partes.push(pedido.factura.ok ? `factura ${pedido.factura.folio || "emitida"}` : "ERROR FACTURA: revisar a mano");
    pedido.estado = partes.join(" · ");
    guardarPedido(archivo, pedido);

    // 6. Confirmation email (only once)
    if (!pedido.correo_confirmacion) {
      pedido.correo_confirmacion = (await correoConfirmacion(pedido)) ? new Date().toISOString() : null;
      if (pedido.correo_confirmacion) guardarPedido(archivo, pedido);
    }
  } finally {
    enProceso.delete(referencia);
  }
}

// Mercado Pago calls this address. It must be public: localhost won't work.
app.post("/webhook-mp", (req, res) => {
  const tipo = (req.body && req.body.type) || req.query.type || req.query.topic;
  const dataId = (req.body && req.body.data && req.body.data.id) || req.query["data.id"] || req.query.id;

  if (!dataId || !firmaValida(req, dataId)) return res.sendStatus(401);
  res.sendStatus(200); // answer quickly, or Mercado Pago keeps retrying

  if (tipo !== "order") return; // we only use the Orders API
  procesarPagoAprobado(String(dataId)).catch((e) =>
    console.error("Error procesando el pago:", e.message)
  );
});

// Retry the Syscom order for a paid order by hand: open in your browser
//   http://localhost:3001/reintentar/web-123...?clave=YOUR_ADMIN_KEY
app.get("/reintentar/:ref", async (req, res) => {
  if (!process.env.ADMIN_KEY || req.query.clave !== process.env.ADMIN_KEY) return res.sendStatus(403);
  const encontrado = leerPedido(req.params.ref);
  if (!encontrado || !encontrado.pedido.mp_order_id) return res.status(404).json({ error: "Pedido no encontrado" });
  await procesarPagoAprobado(encontrado.pedido.mp_order_id);
  const despues = leerPedido(req.params.ref).pedido;
  res.json({ estado: despues.estado, syscom: despues.syscom && despues.syscom.error, factura: despues.factura && (despues.factura.error || despues.factura.folio) });
});

// =========================================================
// Email (SMTP): contact form, order confirmation, shipping notice
// =========================================================
// .env:
//   SMTP_HOST=smtp.hostinger.com   SMTP_PORT=465
//   SMTP_USER=ventas@solutelecom.mx   SMTP_PASS=...
//   CORREO_VENTAS=ventas@solutelecom.mx   (where contact messages and order copies go)
// With Gmail use SMTP_HOST=smtp.gmail.com and an "app password" (not your normal password).
let transporte = null;
try {
  const nodemailer = (await import("nodemailer")).default;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const puerto = Number(process.env.SMTP_PORT) || 465;
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: puerto,
      secure: puerto === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
} catch (e) {
  // nodemailer not installed
}
const CORREO_VENTAS = process.env.CORREO_VENTAS || process.env.SMTP_USER || "";
const REMITENTE = `SoluTelecom <${process.env.SMTP_USER || CORREO_VENTAS}>`;
console.log(`Correo: ${transporte ? "activo (" + process.env.SMTP_USER + ")" : "apagado (falta SMTP_HOST/SMTP_USER/SMTP_PASS o 'npm install nodemailer')"}`);

const escHtml = (t) =>
  String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pesos = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(n) || 0);

async function enviarCorreo({ para, asunto, html, texto, responderA }) {
  if (!transporte || !para) return false;
  try {
    await transporte.sendMail({ from: REMITENTE, to: para, subject: asunto, html, text: texto, replyTo: responderA });
    return true;
  } catch (e) {
    console.error("No se pudo enviar el correo:", e.message);
    return false;
  }
}

// one simple email layout for every message
function plantilla(titulo, cuerpoHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f3f3f5;font-family:Arial,Helvetica,sans-serif;color:#1d1d1f">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f5;padding:24px 0"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:10px;overflow:hidden">
    <tr><td style="background:#0c0c0e;padding:18px 24px;border-bottom:4px solid #f5b400">
      <img src="${SITE}/photos/solutelecom-logo-transparent.png" alt="SoluTelecom" height="36" style="display:block;height:36px"></td></tr>
    <tr><td style="padding:28px 24px"><h1 style="font-size:21px;margin:0 0 16px">${titulo}</h1>${cuerpoHtml}</td></tr>
    <tr><td style="padding:16px 24px;background:#fafafa;font-size:12px;color:#777">
      SoluTelecom · ${escHtml(CORREO_VENTAS)} · WhatsApp 33 21 86 58 21 · <a href="${SITE}" style="color:#b47f00">solutelecom.mx</a></td></tr>
  </table></td></tr></table></body></html>`;
}

function tablaProductos(pedido) {
  const filas = (pedido.productos || [])
    .map(
      (l) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${escHtml(l.titulo)}<br><small style="color:#888">${escHtml(l.modelo)} · ${l.cantidad} × ${pesos(l.precio_unitario)}</small></td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${pesos(l.precio_unitario * l.cantidad)}</td></tr>`
    )
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${filas}
    <tr><td style="padding:8px 0">Envío</td><td style="text-align:right">${pesos(pedido.envio)}</td></tr>
    <tr><td style="padding:8px 0;font-weight:bold;font-size:16px">Total (IVA incluido)</td><td style="text-align:right;font-weight:bold;font-size:16px">${pesos(pedido.total)}</td></tr></table>`;
}

async function correoConfirmacion(pedido) {
  const c = pedido.cliente || {};
  const dir = `${escHtml(c.calle)} ${escHtml(c.numero)}, ${escHtml(c.colonia)}, ${escHtml(c.ciudad)}, ${escHtml(c.estado)}, C.P. ${escHtml(c.cp)}`;
  const html = plantilla(
    "¡Gracias por tu compra!",
    `<p style="font-size:15px;line-height:1.5">Hola ${escHtml((c.nombre || "").split(" ")[0])}, recibimos tu pago. Tu pedido <b>${escHtml(pedido.referencia)}</b> ya está en preparación.</p>
     ${tablaProductos(pedido)}
     <p style="font-size:14px;line-height:1.5;margin-top:18px"><b>Se enviará a:</b><br>${escHtml(c.nombre)}<br>${dir}</p>
     <p style="font-size:14px;line-height:1.5">Te enviaremos otro correo con el número de guía cuando salga tu paquete. Puedes ver el estado en <a href="${SITE}" style="color:#b47f00">Mi cuenta → Mis pedidos</a>.</p>
     ${c.factura ? '<p style="font-size:14px">Tu factura CFDI llegará en un correo aparte.</p>' : ""}`
  );
  const ok = await enviarCorreo({ para: c.email, asunto: `Pedido ${pedido.referencia} confirmado · SoluTelecom`, html, responderA: CORREO_VENTAS });
  // copy for you
  await enviarCorreo({
    para: CORREO_VENTAS,
    asunto: `Nuevo pedido pagado ${pedido.referencia} · ${pesos(pedido.total)}`,
    html: plantilla(`Nuevo pedido ${escHtml(pedido.referencia)}`, `<p>Estado: <b>${escHtml(pedido.estado)}</b></p>${tablaProductos(pedido)}<p>${escHtml(c.nombre)} · ${escHtml(c.email)} · ${escHtml(c.telefono)}<br>${dir}</p>`),
  });
  return ok;
}

async function correoEnvio(pedido) {
  const c = pedido.cliente || {};
  const g = pedido.guia || {};
  const html = plantilla(
    "Tu pedido va en camino 🚚",
    `<p style="font-size:15px;line-height:1.5">Hola ${escHtml((c.nombre || "").split(" ")[0])}, tu pedido <b>${escHtml(pedido.referencia)}</b> ya salió.</p>
     <p style="font-size:15px;line-height:1.6;background:#fff7d6;border:1px solid #f5d36b;border-radius:8px;padding:12px 14px">
       Paquetería: <b>${escHtml(g.fletera)}</b><br>Número de guía: <b style="font-size:17px">${escHtml(g.numero)}</b></p>
     ${g.url ? `<p><a href="${escHtml(g.url)}" style="display:inline-block;background:#f5b400;color:#111;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:6px">Rastrear mi paquete</a></p>` : ""}
     ${tablaProductos(pedido)}`
  );
  return enviarCorreo({ para: c.email, asunto: `Tu pedido ${pedido.referencia} va en camino · Guía ${g.numero}`, html, responderA: CORREO_VENTAS });
}

// tracking pages of each carrier
function urlRastreo(fletera, guia) {
  const f = sinAcento(fletera).replace(/[^a-z]/g, "");
  const g = encodeURIComponent(guia);
  if (f.includes("paquete")) return `https://www.paquetexpress.com.mx/rastreo/${g}`;
  if (f.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${g}`;
  if (f.includes("estafeta")) return `https://rastreositecorp.estafeta.com/Tracking/searchByGet?wayBill=${g}&wayBillType=1&isShipmentDetail=False`;
  if (f.includes("dhl")) return `https://www.dhl.com/mx-es/home/rastreo.html?tracking-id=${g}`;
  return "";
}

// ---------- Contact form ----------
app.post("/contacto", async (req, res) => {
  if (demasiadas(req, "contacto", 5)) return res.status(429).json({ error: "Demasiados mensajes, intenta en un minuto." });
  const d = req.body || {};
  if (d.sitio) return res.json({ ok: true }); // hidden field: only bots fill it
  const m = {
    nombre: limpio(d.nombre, 100),
    empresa: limpio(d.empresa, 120),
    correo: limpio(d.correo, 120),
    telefono: limpio(d.telefono, 30),
    servicio: limpio(d.servicio, 80),
    mensaje: String(d.mensaje == null ? "" : d.mensaje).trim().slice(0, 3000),
  };
  if (!m.nombre || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.correo) || m.mensaje.length < 5) {
    return res.status(400).json({ error: "Revisa tu nombre, correo y mensaje." });
  }
  if (!transporte) return res.status(503).json({ error: "El envío de mensajes no está disponible en este momento." });

  const filas = [["Nombre", m.nombre], ["Empresa", m.empresa], ["Correo", m.correo], ["Teléfono", m.telefono], ["Servicio", m.servicio]]
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#777">${k}</td><td>${escHtml(v)}</td></tr>`)
    .join("");
  const ok = await enviarCorreo({
    para: CORREO_VENTAS,
    asunto: `Solicitud de proyecto — ${m.nombre}${m.empresa ? " (" + m.empresa + ")" : ""}`,
    html: plantilla("Nueva solicitud desde la web", `<table style="font-size:14px">${filas}</table><p style="white-space:pre-wrap;font-size:14px;line-height:1.5;border-top:1px solid #eee;padding-top:12px">${escHtml(m.mensaje)}</p>`),
    responderA: m.correo,
  });
  if (!ok) return res.status(502).json({ error: "No se pudo enviar el mensaje." });

  // short acknowledgment for the visitor
  enviarCorreo({
    para: m.correo,
    asunto: "Recibimos tu solicitud · SoluTelecom",
    html: plantilla("Recibimos tu solicitud", `<p style="font-size:15px;line-height:1.5">Hola ${escHtml(m.nombre.split(" ")[0])}, gracias por escribirnos. Revisaremos tu proyecto y te responderemos en menos de 24 horas hábiles.</p>`),
    responderA: CORREO_VENTAS,
  });
  res.json({ ok: true });
});

// =========================================================
// Customer accounts: verify the Firebase sign-in token
// =========================================================
const FIREBASE_PROJECT = process.env.FIREBASE_PROJECT_ID || "solutelecom-66b77";
let certsGoogle = { t: 0, certs: {} };

async function certificadosFirebase() {
  if (Date.now() - certsGoogle.t < 3600000 && Object.keys(certsGoogle.certs).length) return certsGoogle.certs;
  const r = await fetch(process.env.FIREBASE_CERTS_URL || "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
  if (!r.ok) throw new Error("No se pudieron leer los certificados de Firebase");
  certsGoogle = { t: Date.now(), certs: await r.json() };
  return certsGoogle.certs;
}

const b64url = (s) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

// returns { uid, email, email_verified } or null
async function usuarioDeToken(req) {
  const h = String(req.get("authorization") || "");
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token || token.split(".").length !== 3) return null;
  try {
    const [cab, carga, firma] = token.split(".");
    const head = JSON.parse(b64url(cab).toString("utf8"));
    const p = JSON.parse(b64url(carga).toString("utf8"));
    const ahora = Math.floor(Date.now() / 1000);
    if (head.alg !== "RS256" || p.aud !== FIREBASE_PROJECT || p.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT}`) return null;
    if (!p.sub || p.exp < ahora || p.iat > ahora + 300) return null;
    const cert = (await certificadosFirebase())[head.kid];
    if (!cert) return null;
    const v = createVerify("RSA-SHA256");
    v.update(`${cab}.${carga}`);
    if (!v.verify(cert, b64url(firma))) return null;
    return { uid: p.sub, email: String(p.email || "").toLowerCase(), email_verified: !!p.email_verified };
  } catch (e) {
    return null;
  }
}

// friendly status for the customer
function estadoCliente(p) {
  if (p.guia && p.guia.numero) return { clave: "enviado", texto: "Enviado" };
  if (String(p.estado).startsWith("pagado")) {
    if (p.syscom && p.syscom.ok) return { clave: "preparando", texto: "Preparando envío" };
    return { clave: "revision", texto: "En revisión: te contactaremos" };
  }
  if (/rejected|cancel|failed/.test(String(p.estado))) return { clave: "cancelado", texto: "Pago no completado" };
  return { clave: "pendiente", texto: "Pago pendiente" };
}

app.get("/mis-pedidos", async (req, res) => {
  if (demasiadas(req, "mis-pedidos", 30)) return res.status(429).json({ error: "Demasiadas consultas" });
  const u = await usuarioDeToken(req);
  if (!u) return res.status(401).json({ error: "Inicia sesión para ver tus pedidos." });
  const lista = [];
  for (const f of fs.readdirSync(CARPETA_PEDIDOS)) {
    if (!/^web-\d+\.json$/.test(f)) continue;
    let p;
    try {
      p = JSON.parse(fs.readFileSync(path.join(CARPETA_PEDIDOS, f), "utf8"));
    } catch (e) {
      continue;
    }
    const delUsuario =
      p.uid === u.uid || (u.email_verified && u.email && String((p.cliente || {}).email || "").toLowerCase() === u.email);
    if (!delUsuario) continue;
    if (p.estado === "pago iniciado" && Date.now() - Date.parse(p.fecha) > 86400000) continue; // abandoned checkouts
    lista.push({
      referencia: p.referencia,
      fecha: p.fecha,
      total: p.total,
      envio: p.envio,
      estado: estadoCliente(p),
      productos: (p.productos || []).map((l) => ({ titulo: l.titulo, modelo: l.modelo, cantidad: l.cantidad, precio_unitario: l.precio_unitario })),
      guia: p.guia || null,
      factura: p.factura && p.factura.ok ? { folio: p.factura.folio } : null,
    });
  }
  lista.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  res.json({ pedidos: lista.slice(0, 50) });
});

// Add the tracking number by hand (emails the customer):
//   http://localhost:3001/admin/guia/web-123...?clave=ADMIN_KEY&fletera=PAQUETEXPRESS&guia=ABC123
app.get("/admin/guia/:ref", async (req, res) => {
  if (!process.env.ADMIN_KEY || req.query.clave !== process.env.ADMIN_KEY) return res.sendStatus(403);
  const encontrado = leerPedido(req.params.ref);
  if (!encontrado) return res.status(404).json({ error: "Pedido no encontrado" });
  const numero = limpio(req.query.guia, 40);
  const fletera = limpio(req.query.fletera, 40) || encontrado.pedido.fletera || "";
  if (!numero) return res.status(400).json({ error: "Falta ?guia=" });
  const { archivo, pedido } = encontrado;
  pedido.guia = { numero, fletera, url: urlRastreo(fletera, numero), fecha: new Date().toISOString() };
  guardarPedido(archivo, pedido);
  const enviado = await correoEnvio(pedido);
  res.json({ ok: true, guia: pedido.guia, correo_enviado: enviado });
});

// Optional: look up the tracking number in Syscom by itself (SYSCOM_GUIAS_AUTO=si).
// Off by default: check it against your first real orders before trusting it.
// SYSCOM_FACTURAS_RUTA = the path of your "obtener facturas" request in Postman (default /facturas).
async function buscarGuiasSyscom() {
  if (process.env.SYSCOM_GUIAS_AUTO !== "si" || !SYSCOM_TOKEN) return;
  try {
    const d = await syscomGet(process.env.SYSCOM_FACTURAS_RUTA || "/facturas");
    const facturas = d.facturas || [];
    for (const f of fs.readdirSync(CARPETA_PEDIDOS)) {
      if (!/^web-\d+\.json$/.test(f)) continue;
      const enc = leerPedido(f.replace(/\.json$/, ""));
      if (!enc) continue;
      const p = enc.pedido;
      const folio = p.syscom && p.syscom.folio_pedido;
      if (!folio || (p.guia && p.guia.numero)) continue;
      const fac = facturas.find((x) => x.folio_pedido === folio);
      const envios = ((fac && fac.entrega && fac.entrega.proceso_entrega) || []).filter(
        (e) => /^[A-Z0-9]{8,}$/.test(String(e.guias || "")) && !/terrestre|interno/i.test(e.fletera || "")
      );
      if (!envios.length) continue;
      const e = envios[envios.length - 1];
      p.guia = { numero: e.guias, fletera: e.fletera, url: urlRastreo(e.fletera, e.guias), fecha: new Date().toISOString(), auto: true };
      guardarPedido(enc.archivo, p);
      await correoEnvio(p);
      console.log(`Guía encontrada para ${p.referencia}: ${e.fletera} ${e.guias}`);
    }
  } catch (e) {
    console.error("Guías Syscom:", e.message);
  }
}
setInterval(buscarGuiasSyscom, 60 * 60 * 1000);

// Always answer with JSON, and print the real error in this window
app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));
app.use((err, req, res, next) => {
  console.error("Error del servidor:", err);
  res.status(500).json({ error: "Error del servidor" });
});

const PUERTO = Number(process.env.PORT) || 3001; // the host sets PORT online
app.listen(PUERTO, () => console.log(`Server running on port ${PUERTO}`));