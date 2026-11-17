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
      "nombre": "Hot Sale",
      "descuento": 0,
      "inicio": "2027-05-24",
      "fin": "2027-06-01",
      "mensaje": "Descuento extra en línea",
      "marcas": [],
      "excluir": [],
      "respetar_map": true
    }
  ]
};
