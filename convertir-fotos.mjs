// convertir-fotos.mjs — converts photos/*.jpg|jpeg|png to .webp and updates index.html
//
// Run once in the project folder (Git Bash or PowerShell):
//   npm install --no-save sharp
//   node convertir-fotos.mjs
//
// - Keeps your original files (you can delete them later).
// - Makes images at most 1600 px wide, quality 80 (looks the same, weighs much less).
// - Skips the logo and favicons so they stay sharp and transparent.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CARPETA = "photos";
const HTML = "index.html";
const NO_TOCAR = /logo|favicon|apple-touch/i;

const archivos = fs
  .readdirSync(CARPETA)
  .filter((f) => /\.(jpe?g|png)$/i.test(f) && !NO_TOCAR.test(f));

let html = fs.readFileSync(HTML, "utf8");
let antes = 0;
let despues = 0;

for (const f of archivos) {
  const origen = path.join(CARPETA, f);
  const destino = path.join(CARPETA, f.replace(/\.(jpe?g|png)$/i, ".webp"));
  await sharp(origen).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toFile(destino);

  const a = fs.statSync(origen).size;
  const d = fs.statSync(destino).size;
  antes += a;
  despues += d;
  console.log(`${f.padEnd(32)} ${(a / 1024).toFixed(0).padStart(6)} KB -> ${(d / 1024).toFixed(0).padStart(5)} KB`);

  // update every reference in index.html (photos/name.jpg -> photos/name.webp)
  const viejo = `${CARPETA}/${f}`;
  const nuevo = `${CARPETA}/${path.basename(destino)}`;
  html = html.split(viejo).join(nuevo);
}

fs.writeFileSync(HTML, html);
console.log(`\nTotal: ${(antes / 1048576).toFixed(1)} MB -> ${(despues / 1048576).toFixed(1)} MB`);
console.log("index.html updated. Check the site, then you can delete the old .jpg/.png files.");
