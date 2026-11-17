// =====================================================================
// promos.js — SALES CALENDAR (Buen Fin, Hot Sale, Navidad, ...)
// =====================================================================
// The site AND the payment server read this file, so the price the customer
// sees is always the price they pay.
//
// Each campaign turns ON and OFF by itself on its dates (Mexico City time,
// from 00:00 of "inicio" to 23:59 of "fin"). You can write them weeks ahead.
//
//   nombre     : name shown in the banner and on the price ("Buen Fin")
//   descuento  : % OFF on top of the normal price (10 = 10%). 0 = off.
//   inicio/fin : "YYYY-MM-DD"
//   mensaje    : short text for the banner at the top of the page
//   marcas     : optional, only these brands get the discount, e.g. ["EZVIZ","HIKVISION"]
//   excluir    : optional, brands that never get it, e.g. ["UBIQUITI"]
//   respetar_map: true (default) = the discount never goes below Syscom's MAP price (brand rule).
//                Since normal prices ARE the MAP price, set false to really discount; the price
//                still never goes below your cost + Mercado Pago + $40 profit.
//
// RULES (this file is read as JSON):
//   - use "double quotes", put a comma between campaigns, no comma after the last one
//   - after saving: git add -A, git commit, git push (the server picks it up in about 5 min)
//   - the server still blocks any sale that would leave less than 8% over your Syscom cost
//
// THEMES ("temas"): the look of the site changes by itself on these dates, every year.
//   desde / hasta : "MM-DD" (month-day). They can cross the new year ("12-01" to "01-06").
//   tema          : navidad, muertos, patrias, amor, madres, escolar  (decorations already built)
//   saludo        : short greeting shown in a thin bar at the top (when there is no sale banner)
//   To preview any theme today: solutelecom.mx/?tema=navidad  (or muertos, patrias, amor, madres, escolar)
//   To turn themes off: "temas": []
// =====================================================================
window.PROMOS = {
  "campanas": [
    {
      "nombre": "Buen Fin",
      "descuento": 10,
      "inicio": "2026-11-13",
      "fin": "2026-11-17",
      "mensaje": "10% extra en toda la tienda",
      "marcas": [],
      "excluir": [],
      "respetar_map": true
    },
    {
      "nombre": "Cyber Monday",
      "descuento": 0,
      "inicio": "2026-11-30",
      "fin": "2026-11-30",
      "mensaje": "Ofertas solo por hoy",
      "marcas": [],
      "excluir": [],
      "respetar_map": true
    },
    {
      "nombre": "Ofertas de Navidad",
      "descuento": 0,
      "inicio": "2026-12-12",
      "fin": "2026-12-24",
      "mensaje": "Equipa tu negocio antes de fin de año",
      "marcas": [],
      "excluir": [],
      "respetar_map": true
    },
    {
      "nombre": "Fin de año",
      "descuento": 0,
      "inicio": "2026-12-26",
      "fin": "2026-12-31",
      "mensaje": "Cierra el año con tu proyecto listo",
      "marcas": [],
      "excluir": [],
      "respetar_map": true
    },
    {
      "nombre": "Día de Reyes",
      "descuento": 0,
      "inicio": "2027-01-04",
      "fin": "2027-01-06",
      "mensaje": "Ofertas de Reyes",
      "marcas": [],
      "excluir": [],
      "respetar_map": true
    },
    {
      "nombre": "Cuesta de enero",
      "descuento": 0,
      "inicio": "2027-01-07",
      "fin": "2027-01-31",
      "mensaje": "Precios especiales para empezar el año",
      "marcas": [],
      "excluir": [],
      "respetar_map": true
    },
    {
      "nombre": "Amor y Amistad",
      "descuento": 0,
      "inicio": "2027-02-08",
      "fin": "2027-02-14",
      "mensaje": "Protege a quien más quieres",
      "marcas": [],
      "excluir": [],
      "respetar_map": true
    },
    {
      "nombre": "Día de las Madres",
      "descuento": 0,
      "inicio": "2027-05-03",
      "fin": "2027-05-10",
      "mensaje": "Seguridad para mamá",
      "marcas": [],
      "excluir": [],
      "respetar_map": true
    },
    {
      "nombre": "Hot Sale",
      "descuento": 0,
      "inicio": "2027-05-24",
      "fin": "2027-06-01",
      "mensaje": "Descuento extra en línea",
      "marcas": [],
      "excluir": [],
      "respetar_map": true
    },
    {
      "nombre": "Día del Padre",
      "descuento": 0,
      "inicio": "2027-06-14",
      "fin": "2027-06-20",
      "mensaje": "Tecnología para papá",
      "marcas": [],
      "excluir": [],
      "respetar_map": true
    },
    {
      "nombre": "Regreso a clases",
      "descuento": 0,
      "inicio": "2027-08-09",
      "fin": "2027-08-27",
      "mensaje": "Equipa escuelas y oficinas",
      "marcas": [],
      "excluir": [],
      "respetar_map": true
    },
    {
      "nombre": "Fiestas Patrias",
      "descuento": 0,
      "inicio": "2027-09-08",
      "fin": "2027-09-16",
      "mensaje": "¡Viva México! Ofertas patrias",
      "marcas": [],
      "excluir": [],
      "respetar_map": true
    },
    {
      "nombre": "Buen Fin",
      "descuento": 0,
      "inicio": "2027-11-12",
      "fin": "2027-11-16",
      "mensaje": "Descuento extra en toda la tienda",
      "marcas": [],
      "excluir": [],
      "respetar_map": true
    }
  ],
  "temas": [
    {
      "nombre": "Navidad y Año Nuevo",
      "tema": "navidad",
      "desde": "12-01",
      "hasta": "01-06",
      "saludo": "🎄 ¡Felices fiestas! Te deseamos una feliz Navidad y un próspero Año Nuevo"
    },
    {
      "nombre": "Amor y Amistad",
      "tema": "amor",
      "desde": "02-07",
      "hasta": "02-14",
      "saludo": "💘 Feliz día del amor y la amistad"
    },
    {
      "nombre": "Día de las Madres",
      "tema": "madres",
      "desde": "05-03",
      "hasta": "05-10",
      "saludo": "💐 Feliz Día de las Madres"
    },
    {
      "nombre": "Regreso a clases",
      "tema": "escolar",
      "desde": "08-09",
      "hasta": "08-27",
      "saludo": "🎒 ¡Feliz regreso a clases!"
    },
    {
      "nombre": "Fiestas Patrias",
      "tema": "patrias",
      "desde": "09-01",
      "hasta": "09-16",
      "saludo": "🇲🇽 ¡Viva México! Felices fiestas patrias"
    },
    {
      "nombre": "Día de Muertos",
      "tema": "muertos",
      "desde": "10-25",
      "hasta": "11-02",
      "saludo": "🌼 Celebramos el Día de Muertos"
    }
  ]
};
