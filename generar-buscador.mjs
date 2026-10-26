// generar-buscador.mjs — builds catjson/buscador.json, the search file the page uses
// when the store server is offline (so the search covers the WHOLE catalog).
//
// Run it in the project folder every time you update the catalog (catjson/prod-*.json):
//   node generar-buscador.mjs
import fs from "node:fs";
import path from "node:path";

const CARPETA = "catjson";
const SALIDA = path.join(CARPETA, "buscador.json");
const BASE_IMG = "https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/";

const filas = new Map(); // producto_id -> row
for (const f of fs.readdirSync(CARPETA)) {
  const m = f.match(/^prod-(\d+)\.json$/);
  if (!m) continue;
  const cat = m[1];
  let datos;
  try {
    datos = JSON.parse(fs.readFileSync(path.join(CARPETA, f), "utf8"));
  } catch (e) {
    console.warn("Skipped (not valid JSON):", f);
    continue;
  }
  for (const p of datos.productos || []) {
    const id = String(p.producto_id);
    const fila = filas.get(id);
    if (fila) {
      if (!fila[8].includes(cat)) fila[8].push(cat);
      continue;
    }
    const pr = p.precios || {};
    const img = String(p.img_portada || "");
    filas.set(id, [
      id,
      String(p.titulo || "").replace(/\s+/g, " ").trim(),
      String(p.marca || ""),
      String(p.modelo || ""),
      pr.precio_lista != null ? Number(pr.precio_lista) : null,
      pr.precio_especial != null ? Number(pr.precio_especial) : null,
      Math.round(Number(p.total_existencia) || 0),
      img.startsWith(BASE_IMG) ? img.slice(BASE_IMG.length) : img ? "!" + img : "",
      [cat],
    ]);
  }
}

const salida = {
  v: 1,
  generado: new Date().toISOString(),
  base: BASE_IMG,
  // [id, titulo, marca, modelo, precio_lista, precio_especial, existencia, foto, [categorias]]
  p: Array.from(filas.values()),
};
fs.writeFileSync(SALIDA, JSON.stringify(salida));
const mb = (fs.statSync(SALIDA).size / 1048576).toFixed(1);
console.log(`${salida.p.length} products -> ${SALIDA} (${mb} MB)`);
