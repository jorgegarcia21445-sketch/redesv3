// =====================================================================
// contenido.js — CONTENIDO EDITABLE DE LA PÁGINA
// =====================================================================
// Aquí agregas testimonios, certificaciones, equipo, casos de éxito, etc.
// REGLA: cada sección aparece en la página SOLO cuando tiene información.
//        Si una lista está vacía [], la sección queda oculta.
//
// Cómo editar:
//  - Copia un bloque de ejemplo (lo que está entre { }), quítale las //
//    del inicio de cada línea y cambia los textos.
//  - Las fotos van en la carpeta photos/ (mejor en .webp). Escribe la ruta
//    como "photos/proyectos/mi-foto.webp".
//  - Cuida las comas: entre un bloque { } y otro va una coma.
//  - Después de guardar, recarga la página con Ctrl+F5.
// =====================================================================

window.CONTENIDO = {

  // ---------- GALERÍA DE PROYECTOS (fotos reales de campo) ----------
  // Usa SOLO fotos de trabajos de SoluTelecom (no fotos de internet).
  galeria: [
    { foto: "photos/inata3.webp", titulo: "Instalación de OLT", lugar: "Torreón, Coah." },
    { foto: "photos/insta4.webp", titulo: "Rack de OLT y distribución de fibra", lugar: "Torreón, Coah." },
    { foto: "photos/cctv3.webp", titulo: "Cámaras de videovigilancia instaladas", lugar: "" },
    { foto: "photos/cctv4.webp", titulo: "Cámara en poste para vía pública", lugar: "" },
    // { foto: "photos/proyectos/tendido-fibra.webp", titulo: "Tendido de fibra aérea", lugar: "Monterrey, N.L." },
  ],

  // ---------- CASOS DE ÉXITO ----------
  // Pide permiso al cliente antes de publicar su nombre.
  casos: [
    // {
    //   cliente: "Nombre del cliente",
    //   titulo: "Red G-PON para 12,000 hogares",
    //   lugar: "Torreón, Coah.",
    //   problema: "Qué necesitaba el cliente.",
    //   solucion: "Qué hizo SoluTelecom.",
    //   resultado: "Cómo terminó: tiempo, calidad, entrega.",
    //   cifras: [ { valor: "320 km", etiqueta: "de fibra construidos" }, { valor: "8 semanas", etiqueta: "de ejecución" } ],
    //   foto: "photos/proyectos/caso1.webp",
    // },
  ],

  // ---------- TESTIMONIOS ----------
  // Solo frases REALES, con permiso de la persona.
  testimonios: [
    // { texto: "Entregaron el proyecto en tiempo y con toda la documentación.", nombre: "Nombre Apellido", puesto: "Gerente de Ingeniería", empresa: "Empresa" },
  ],

  // ---------- CERTIFICACIONES Y RESPALDOS ----------
  // Solo las que realmente tengan (constancia, número de registro, etc.).
  certificaciones: [
    // { nombre: "REPSE", detalle: "Registro de Prestadoras de Servicios Especializados", logo: "" },
    // { nombre: "DC-3", detalle: "Constancias de competencias del personal", logo: "" },
    // { nombre: "Distribuidor autorizado", detalle: "Marca X", logo: "photos/certificaciones/marca.webp" },
  ],

  // ---------- EQUIPO ----------
  equipo: [
    // { nombre: "Nombre Apellido", puesto: "Director de Operaciones", foto: "photos/equipo/nombre.webp" },
  ],

  // ---------- SEGURIDAD Y CALIDAD (HSE) ----------
  // Revisa que cada punto sea verdad para la empresa y cambia mostrar a true.
  seguridad: {
    mostrar: false,
    puntos: [
      { titulo: "Equipo de protección personal", texto: "Casco, arnés, guantes y calzado de seguridad en cada cuadrilla." },
      { titulo: "Trabajo en alturas", texto: "Protocolos y personal capacitado para trabajo en postes y torres." },
      { titulo: "Evidencia fotográfica", texto: "Cada etapa queda documentada con fotos georreferenciadas." },
      { titulo: "Entrega documentada", texto: "Archivos ATP, pruebas .SOR, OPMT y planos as built de cada enlace." },
    ],
  },

  // ---------- BOLSA DE TRABAJO ----------
  empleo: {
    mostrar: true,
    puestos: ["Técnicos de fibra óptica", "Liniero / instalador", "Fusionador", "Instalador de CCTV", "Dibujante CAD / digitalizador"],
  },

  // ---------- MAPA DE COBERTURA ----------
  // Estados con presencia (claves: AGS BC BCS CAM CHP CHH CDMX COA COL DUR GTO GRO HGO JAL MEX MIC
  // MOR NAY NL OAX PUE QRO QROO SLP SIN SON TAB TAM TLX VER YUC ZAC).
  // La página dice "17 estados": agrega aquí los 2 que faltan.
  estados: ["NL", "COA", "DUR", "BC", "JAL", "GTO", "AGS", "SLP", "QRO", "CDMX", "PUE", "TAM", "VER", "TAB", "YUC"],

  // ---------- VIDEO EN LA PORTADA (opcional) ----------
  // Video corto (20-30 s, sin audio, menos de 8 MB, .mp4). Ejemplo: "photos/video-portada.mp4"
  videoPortada: "",

  // ---------- ESTADÍSTICAS (opcional) ----------
  // ID de Google Analytics 4 (G-XXXXXXX) y de Meta Pixel. Vacío = apagado.
  googleAnalytics: "",
  metaPixel: "",
};
