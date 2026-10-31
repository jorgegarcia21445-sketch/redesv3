// =========================================================
// SoluTelecom — auth.js  (inicio de sesión REAL con Firebase)
// =========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut, updateProfile,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signInWithPopup, sendEmailVerification,
  reauthenticateWithCredential, updatePassword, EmailAuthProvider,
  multiFactor, getMultiFactorResolver, TotpMultiFactorGenerator,
  GoogleAuthProvider, FacebookAuthProvider, OAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ==========================================================
   1) PEGA AQUÍ TUS DATOS DE FIREBASE
   Firebase Console -> tu proyecto -> Configuración del proyecto
   -> "Tus apps" -> App web -> copia el objeto firebaseConfig
   ========================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyAYN7-OcOOGcJANJHRppo9F3a9sq14EYC0",
  authDomain: "solutelecom-66b77.firebaseapp.com",
  projectId: "solutelecom-66b77",
  appId: "1:839040194932:web:4e1075e6ad61e597e27421"
};

const $ = (id) => document.getElementById(id);
const msg = $('loginMsg');
const modal = $('loginModal');
const configured = !firebaseConfig.apiKey.startsWith('PEGA');
const say = (t, ok = false) => { msg.textContent = t; msg.style.color = ok ? '#7ee787' : ''; };

const ERRORS = {
  'auth/invalid-credential': 'Usuario o contraseña incorrectos.',
  'auth/user-not-found': 'No existe una cuenta con ese correo.',
  'auth/wrong-password': 'Contraseña incorrecta.',
  'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Inicie sesión.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/popup-closed-by-user': 'Cerró la ventana antes de terminar.',
  'auth/operation-not-allowed': 'Este método aún no está activado en Firebase.',
  'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase.',
  'auth/too-many-requests': 'Demasiados intentos. Intente más tarde.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana. Permita ventanas emergentes para este sitio.',
  'auth/account-exists-with-different-credential': 'Ese correo ya tiene cuenta con otro método. Entre con ese método.',
  'auth/invalid-verification-code': 'El código no es correcto. Revise su app e intente de nuevo.',
  'auth/totp-challenge-timeout': 'El código expiró. Escriba el código nuevo de su app.'
};
const fail = (e) => say(ERRORS[e.code] || 'No se pudo completar. Intente de nuevo.');

if (!configured) {
  // Sin configuración: la página funciona, pero el login avisa qué falta.
  $('loginForm').addEventListener('submit', (e) => { e.preventDefault(); say('Falta pegar la configuración de Firebase en auth.js'); });
  modal.querySelectorAll('[data-provider]').forEach(b => b.addEventListener('click', () => say('Falta pegar la configuración de Firebase en auth.js')));
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  let signupMode = false;

  // Cambiar entre "Acceder" y "Crear cuenta"
  $('loginSwitch').addEventListener('click', () => {
    signupMode = !signupMode;
    $('signupNameWrap').hidden = !signupMode;
    $('loginTitle').textContent = signupMode ? 'Crear cuenta' : 'Bienvenido de nuevo';
    $('loginSubmit').textContent = signupMode ? 'Crear cuenta' : 'Acceder';
    $('loginSwitch').textContent = signupMode ? '¿Ya tiene cuenta? Inicie sesión' : '¿No tiene cuenta? Cree una';
    say('');
  });

  // ---- Second step at sign-in (accounts with 2-step verification) ----
  // Shows a 6-digit code box inside the login window.
  const paso2 = document.createElement('form');
  paso2.className = 'mfa-paso';
  paso2.hidden = true;
  paso2.innerHTML = `
    <h3>Verificación en dos pasos</h3>
    <p class="login-sub">Abre tu app de autenticación (Google Authenticator, Microsoft Authenticator…) y escribe el código de 6 dígitos para <b>SoluTelecom</b>.</p>
    <input id="mfaCodigo" class="mfa-codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="000000" required>
    <button type="submit" class="btn btn-block">Verificar</button>
    <p class="login-msg" id="mfaMsg" role="status"></p>
    <button type="button" class="login-switch" id="mfaCancelar">Cancelar</button>`;
  $('loginForm').insertAdjacentElement('afterend', paso2);
  let resolver = null;

  function pedirSegundoPaso(err) {
    resolver = getMultiFactorResolver(auth, err);
    $('loginForm').hidden = true;
    modal.classList.add('en-mfa');
    paso2.hidden = false;
    $('mfaMsg').textContent = '';
    $('mfaCodigo').value = '';
    setTimeout(() => $('mfaCodigo').focus(), 50);
  }
  function salirSegundoPaso() {
    resolver = null;
    paso2.hidden = true;
    $('loginForm').hidden = false;
    modal.classList.remove('en-mfa');
  }
  // every sign-in goes through here: asks for the code when needed
  async function conSegundoPaso(intento) {
    try {
      await intento();
      return true;
    } catch (err) {
      if (err.code === 'auth/multi-factor-auth-required') {
        pedirSegundoPaso(err);
        return false;
      }
      throw err;
    }
  }
  paso2.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!resolver) return;
    const pista = resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID) || resolver.hints[0];
    try {
      $('mfaMsg').textContent = 'Verificando…';
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(pista.uid, $('mfaCodigo').value.trim());
      await resolver.resolveSignIn(assertion);
      salirSegundoPaso();
      $('loginForm').reset();
      say('');
      modal.close();
    } catch (err) {
      $('mfaMsg').textContent = ERRORS[err.code] || 'No se pudo verificar. Intente de nuevo.';
    }
  });
  $('mfaCancelar').addEventListener('click', () => { salirSegundoPaso(); say(''); });
  modal.addEventListener('close', salirSegundoPaso);

  // Correo + contraseña
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = $('loginUser').value.trim();
    const pass = $('loginPass').value;
    if (!user.includes('@')) return say('Por ahora ingrese su correo electrónico.');
    say('Un momento…', true);
    try {
      if (signupMode) {
        const cred = await createUserWithEmailAndPassword(auth, user, pass);
        const name = $('signupName').value.trim();
        if (name) await updateProfile(cred.user, { displayName: name });
      } else {
        if (!(await conSegundoPaso(() => signInWithEmailAndPassword(auth, user, pass)))) return say('');
      }
      $('loginForm').reset();
      say('');
      modal.close();
    } catch (err) { fail(err); }
  });

  // Olvidó su contraseña
  $('loginForgot').addEventListener('click', async (e) => {
    e.preventDefault();
    const user = $('loginUser').value.trim();
    if (!user.includes('@')) return say('Escriba su correo arriba y vuelva a presionar este enlace.');
    try { await sendPasswordResetEmail(auth, user); say('Le enviamos un correo para restablecer su contraseña.', true); }
    catch (err) { fail(err); }
  });

  // Google / Facebook / Apple / Microsoft
  const PROVIDERS = {
    Google: () => new GoogleAuthProvider(),
    Facebook: () => new FacebookAuthProvider(),
    Apple: () => new OAuthProvider('apple.com'),
    Microsoft: () => new OAuthProvider('microsoft.com')
  };
  modal.querySelectorAll('[data-provider]').forEach(b => {
    b.addEventListener('click', async () => {
      try {
        if (await conSegundoPaso(() => signInWithPopup(auth, PROVIDERS[b.dataset.provider]()))) modal.close();
      }
      catch (err) { fail(err); }
    });
  });

  // =========================================================
  // Cuenta: menú del usuario y "Mi perfil" (nombre y foto)
  // =========================================================
  // La foto subida se guarda en Firestore: usuarios/{uid} -> { nombre, foto }
  let perfil = { nombre: "", foto: "", telefono: "", direcciones: [], fiscal: {} };
  const datosCuenta = (user) => ({
    nombre: perfil.nombre || user.displayName || (user.email || "").split("@")[0] || "Mi cuenta",
    foto: perfil.foto || user.photoURL || "",
    email: user.email || "",
  });
  const avisarCuenta = () => {
    const u = auth.currentUser;
    if (window.mostrarCuenta) window.mostrarCuenta(u ? datosCuenta(u) : null);
  };
  const iniciales = (n) =>
    String(n || "").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "•";
  const escHtml = (t) => String(t || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---- menú bajo el botón de la cuenta ----
  const menu = document.createElement("div");
  menu.className = "acct-menu";
  menu.hidden = true;
  menu.innerHTML = `
    <div class="acct-head">
      <span class="acct-av" id="acctMenuAv"></span>
      <span><strong id="acctMenuName"></strong><small id="acctMenuEmail"></small></span>
    </div>
    <button type="button" data-acct="perfil">Mi cuenta</button>
    <button type="button" data-acct="pedidos">Mis pedidos</button>
    <button type="button" data-acct="direcciones">Mis direcciones</button>
    <a href="#/carrito" data-acct="carrito">Carrito</a>
    <button type="button" data-acct="salir" class="acct-out">Cerrar sesión</button>`;
  document.body.appendChild(menu);

  function pintarAvatar(el, d) {
    el.innerHTML = "";
    if (d.foto) {
      const img = document.createElement("img");
      img.alt = "";
      img.referrerPolicy = "no-referrer";
      img.src = d.foto;
      img.onerror = () => (el.textContent = iniciales(d.nombre));
      el.appendChild(img);
    } else {
      el.textContent = iniciales(d.nombre);
    }
  }

  function abrirMenu() {
    const u = auth.currentUser;
    if (!u) return;
    const d = datosCuenta(u);
    pintarAvatar($("acctMenuAv"), d);
    $("acctMenuName").textContent = d.nombre;
    $("acctMenuEmail").textContent = d.email;
    const r = $("loginBtn").getBoundingClientRect();
    menu.style.top = Math.round(r.bottom + 8) + "px";
    menu.style.right = Math.max(12, Math.round(window.innerWidth - r.right)) + "px";
    menu.hidden = false;
    $("loginBtn").setAttribute("aria-expanded", "true");
  }
  function cerrarMenu() {
    menu.hidden = true;
    $("loginBtn").setAttribute("aria-expanded", "false");
  }

  $("loginBtn").setAttribute("aria-haspopup", "menu");
  $("loginBtn").addEventListener("click", (e) => {
    if (!auth.currentUser) return; // sin sesión: index.js abre el inicio de sesión
    e.stopPropagation();
    menu.hidden ? abrirMenu() : cerrarMenu();
  });
  document.addEventListener("click", (e) => {
    if (!menu.hidden && !menu.contains(e.target)) cerrarMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cerrarMenu();
  });
  window.addEventListener("scroll", cerrarMenu, { passive: true });
  menu.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-acct]");
    if (!b) return;
    cerrarMenu();
    if (b.dataset.acct === "perfil") abrirPerfil("perfil");
    if (b.dataset.acct === "direcciones") abrirPerfil("direcciones");
    if (b.dataset.acct === "pedidos") abrirPerfil("pedidos");
    if (b.dataset.acct === "salir") await signOut(auth);
  });

  // =========================================================
  // "Mi cuenta": Perfil · Direcciones · Datos fiscales · Seguridad
  // Todo se guarda en Firestore: usuarios/{uid}
  // =========================================================

  // Firestore puede quedarse esperando si la base de datos no existe: cortamos a los 10 s
  const conLimite = (promesa, ms = 10000) =>
    Promise.race([
      promesa,
      new Promise((_, mal) => setTimeout(() => mal(Object.assign(new Error("timeout"), { code: "timeout" })), ms)),
    ]);
  const errorFirestore = (err) =>
    err.code === "timeout" || err.code === "unavailable"
      ? "No se pudo conectar con la base de datos. Revise que Firestore esté creado en Firebase."
      : err.code === "permission-denied"
      ? "Firestore rechazó el guardado: revise las reglas (Rules) en Firebase."
      : "No se pudo guardar. Intente de nuevo.";
  const guardarUsuario = (cambios) =>
    conLimite(setDoc(doc(db, "usuarios", auth.currentUser.uid), { ...cambios, actualizado: new Date().toISOString() }, { merge: true }));

  const ESTADOS_MX = ["Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"];
  const REGIMENES_MX = ["601 - General de Ley Personas Morales", "612 - Personas Físicas con Actividades Empresariales y Profesionales", "626 - Régimen Simplificado de Confianza (RESICO)", "605 - Sueldos y Salarios", "616 - Sin obligaciones fiscales"];
  const USOS_MX = ["G01 - Adquisición de mercancías", "G03 - Gastos en general", "S01 - Sin efectos fiscales"];
  const opciones = (lista, actual) =>
    `<option value="">Selecciona…</option>` + lista.map((o) => `<option ${o === actual ? "selected" : ""}>${escHtml(o)}</option>`).join("");

  const dlg = document.createElement("dialog");
  dlg.className = "modal cuenta-modal";
  dlg.setAttribute("aria-labelledby", "cuentaTitle");
  dlg.innerHTML = `
    <button type="button" class="modal-close" aria-label="Cerrar">&times;</button>
    <div class="cuenta-wrap">
      <aside class="cuenta-nav">
        <h3 id="cuentaTitle">Mi cuenta</h3>
        <button type="button" data-tab="perfil" class="active">Perfil</button>
        <button type="button" data-tab="pedidos">Mis pedidos</button>
        <button type="button" data-tab="direcciones">Direcciones</button>
        <button type="button" data-tab="fiscal">Datos fiscales</button>
        <button type="button" data-tab="seguridad">Seguridad</button>
      </aside>
      <div class="cuenta-body">

        <form class="cuenta-tab" data-panel="perfil" id="perfilForm">
          <h4>Perfil</h4>
          <div class="perfil-foto">
            <span class="acct-av perfil-av" id="perfilAv"></span>
            <div>
              <label class="btn btn-sm perfil-subir">Cambiar foto
                <input type="file" id="perfilArchivo" accept="image/*" hidden>
              </label>
              <button type="button" class="perfil-quitar" id="perfilQuitar">Quitar foto</button>
              <small class="perfil-nota">JPG o PNG. Se recorta en cuadrado.</small>
            </div>
          </div>
          <label for="perfilNombre">Nombre</label>
          <input type="text" id="perfilNombre" maxlength="60" autocomplete="name" required>
          <label for="perfilTel">Teléfono (10 dígitos)</label>
          <input type="tel" id="perfilTel" maxlength="15" autocomplete="tel">
          <label for="perfilEmail">Correo</label>
          <input type="email" id="perfilEmail" disabled>
          <p class="perfil-msg" role="status"></p>
          <button type="submit" class="btn">Guardar cambios</button>
        </form>

        <div class="cuenta-tab" data-panel="pedidos" hidden>
          <h4>Mis pedidos</h4>
          <p class="cuenta-nota">Estado de tus compras y número de guía cuando salen.</p>
          <div id="pedidosLista" class="ped-lista"></div>
        </div>

        <div class="cuenta-tab" data-panel="direcciones" hidden>
          <h4>Direcciones de entrega</h4>
          <p class="cuenta-nota">Se usan para llenar tus datos de entrega al comprar.</p>
          <div id="dirLista" class="dir-lista"></div>
          <button type="button" class="btn btn-outline btn-sm" id="dirNueva">+ Agregar dirección</button>
          <form id="dirForm" class="dir-form" hidden>
            <div class="cuenta-grid">
              <label class="full">Nombre de quien recibe<input name="nombre" required maxlength="120"></label>
              <label>Teléfono<input name="telefono" type="tel" required minlength="10" maxlength="15"></label>
              <label>Código postal<input name="cp" required pattern="[0-9]{5}" maxlength="5" inputmode="numeric"></label>
              <label class="full">Calle<input name="calle" required maxlength="100"></label>
              <label>Número<input name="numero" required maxlength="20"></label>
              <label>Colonia<input name="colonia" required maxlength="100"></label>
              <label>Ciudad o municipio<input name="ciudad" required maxlength="100"></label>
              <label>Estado<select name="estado" required>${opciones(ESTADOS_MX)}</select></label>
              <label class="full">Referencias (opcional)<input name="referencias" maxlength="300"></label>
            </div>
            <p class="perfil-msg" role="status"></p>
            <div class="perfil-acciones">
              <button type="submit" class="btn">Guardar dirección</button>
              <button type="button" class="btn btn-outline" id="dirCancelar">Cancelar</button>
            </div>
          </form>
        </div>

        <form class="cuenta-tab" data-panel="fiscal" id="fiscalForm" hidden>
          <h4>Datos fiscales</h4>
          <p class="cuenta-nota">Para emitir tu factura CFDI 4.0 automáticamente. Escríbelos como aparecen en tu Constancia de Situación Fiscal.</p>
          <div class="cuenta-grid">
            <label>RFC<input name="rfc" maxlength="13" pattern="[A-Za-zÑñ&]{3,4}[0-9]{6}[A-Za-z0-9]{3}" style="text-transform:uppercase"></label>
            <label>Código postal fiscal<input name="cpfiscal" pattern="[0-9]{5}" maxlength="5" inputmode="numeric"></label>
            <label class="full">Nombre o razón social (sin “S.A. de C.V.”)<input name="razon" maxlength="200"></label>
            <label class="full">Régimen fiscal<select name="regimen">${opciones(REGIMENES_MX)}</select></label>
            <label class="full">Uso de CFDI<select name="usocfdi">${opciones(USOS_MX)}</select></label>
          </div>
          <p class="perfil-msg" role="status"></p>
          <button type="submit" class="btn">Guardar datos fiscales</button>
        </form>

        <div class="cuenta-tab" data-panel="seguridad" hidden>
          <h4>Seguridad</h4>
          <div class="seg-item">
            <div><strong>Método de acceso</strong><span id="segMetodo"></span></div>
          </div>
          <div class="seg-item">
            <div><strong>Correo verificado</strong><span id="segVerif"></span></div>
            <button type="button" class="btn btn-outline btn-sm" id="segVerificar" hidden>Enviar verificación</button>
          </div>
          <div class="seg-item seg-mfa">
            <div><strong>Verificación en dos pasos</strong><span id="mfaEstado"></span></div>
            <button type="button" class="btn btn-sm" id="mfaActivar">Activar</button>
            <button type="button" class="btn btn-outline btn-sm" id="mfaQuitar" hidden>Desactivar</button>
          </div>
          <form id="mfaAlta" class="mfa-alta" hidden>
            <strong>Activar verificación en dos pasos</strong>
            <ol>
              <li>Instala una app de autenticación en tu celular: <b>Google Authenticator</b>, <b>Microsoft Authenticator</b> o <b>Authy</b>.</li>
              <li>En la app, toca <b>+</b> y escanea este código:</li>
            </ol>
            <div class="mfa-qr" id="mfaQr"></div>
            <p class="cuenta-nota">¿No puedes escanear? Escribe esta clave en la app: <code id="mfaClave"></code></p>
            <label>3. Escribe el código de 6 dígitos que muestra la app
              <input id="mfaAltaCodigo" class="mfa-codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="000000" required>
            </label>
            <p class="perfil-msg" role="status"></p>
            <div class="perfil-acciones">
              <button type="submit" class="btn btn-sm">Confirmar y activar</button>
              <button type="button" class="btn btn-outline btn-sm" id="mfaAltaCancelar">Cancelar</button>
            </div>
          </form>
          <form id="segPassForm" class="seg-pass" hidden>
            <strong>Cambiar contraseña</strong>
            <label>Contraseña actual<input type="password" name="actual" autocomplete="current-password" required></label>
            <label>Nueva contraseña<input type="password" name="nueva" autocomplete="new-password" minlength="8" required></label>
            <label>Repite la nueva contraseña<input type="password" name="repite" autocomplete="new-password" minlength="8" required></label>
            <p class="perfil-msg" role="status"></p>
            <button type="submit" class="btn btn-sm">Cambiar contraseña</button>
          </form>
          <p class="cuenta-nota" id="segSocial" hidden>Tu contraseña la maneja tu cuenta de Google o Facebook; cámbiala desde ahí.</p>
          <p class="perfil-msg" id="segMsg" role="status"></p>
          <div class="seg-item seg-salir">
            <div><strong>Cerrar sesión</strong><span>Salir de tu cuenta en este dispositivo.</span></div>
            <button type="button" class="btn btn-outline btn-sm" id="perfilSalir">Cerrar sesión</button>
          </div>
        </div>

      </div>
    </div>`;
  document.body.appendChild(dlg);

  const panel = (n) => dlg.querySelector(`[data-panel="${n}"]`);
  const aviso = (n, t, ok = false) => {
    const el = n.nodeType ? n : panel(n).querySelector(".perfil-msg");
    el.textContent = t;
    el.style.color = ok ? "#7ee787" : "";
  };
  function mostrarTab(n) {
    dlg.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === n));
    dlg.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== n));
    if (n === "pedidos") cargarPedidos();
  }

  // ---------- Mis pedidos ----------
  const pesosMX = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(n) || 0);
  const PASOS = ["pendiente", "preparando", "enviado"];
  async function cargarPedidos() {
    const caja = $("pedidosLista");
    caja.innerHTML = '<p class="cuenta-nota">Cargando tus pedidos…</p>';
    try {
      const token = await auth.currentUser.getIdToken();
      const r = await conLimite(fetch((window.API_PAGOS || "") + "/mis-pedidos", { headers: { Authorization: "Bearer " + token } }), 12000);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "error");
      const lista = d.pedidos || [];
      if (!lista.length) {
        caja.innerHTML = '<p class="cuenta-nota">Aún no tienes pedidos. Cuando compres, aquí verás su estado y tu número de guía.</p>';
        return;
      }
      caja.innerHTML = lista
        .map((p) => {
          const paso = PASOS.indexOf(p.estado.clave);
          const barra =
            paso >= 0
              ? `<ol class="ped-pasos">${["Pagado", "Preparando", "Enviado"]
                  .map((t, i) => `<li class="${i <= Math.max(paso, 0) && p.estado.clave !== "pendiente" ? "ok" : ""}">${t}</li>`)
                  .join("")}</ol>`
              : "";
          return `<article class="ped">
              <header class="ped-head">
                <div><strong>${escHtml(p.referencia)}</strong><span>${new Date(p.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</span></div>
                <span class="ped-estado ped-${escHtml(p.estado.clave)}">${escHtml(p.estado.texto)}</span>
              </header>
              ${barra}
              <ul class="ped-prods">${p.productos.map((l) => `<li><span>${l.cantidad} × ${escHtml(l.titulo)}</span><b>${pesosMX(l.precio_unitario * l.cantidad)}</b></li>`).join("")}</ul>
              <div class="ped-total"><span>Total (con envío)</span><b>${pesosMX(p.total)}</b></div>
              ${
                p.guia && p.guia.numero
                  ? `<div class="ped-guia">${escHtml(p.guia.fletera)} · Guía <b>${escHtml(p.guia.numero)}</b>${p.guia.url ? ` <a href="${escHtml(p.guia.url)}" target="_blank" rel="noopener">Rastrear</a>` : ""}</div>`
                  : ""
              }
              ${p.factura ? `<div class="ped-fact">Factura ${escHtml(p.factura.folio || "emitida")}: enviada a tu correo</div>` : ""}
            </article>`;
        })
        .join("");
    } catch (err) {
      caja.innerHTML = `<p class="cuenta-nota">${
        err.message && err.message !== "error" && err.code !== "timeout" ? escHtml(err.message) : "No pudimos cargar tus pedidos en este momento. Intenta de nuevo en un minuto."
      }</p>`;
    }
  }
  dlg.querySelector(".cuenta-nav").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) mostrarTab(b.dataset.tab);
  });

  // ---------- Perfil ----------
  let fotoNueva = null; // null = sin cambios, "" = quitar, "data:..." = nueva

  function abrirPerfil(tab = "perfil") {
    const u = auth.currentUser;
    if (!u) return;
    const d = datosCuenta(u);
    fotoNueva = null;
    $("perfilNombre").value = d.nombre === "Mi cuenta" ? "" : d.nombre;
    $("perfilTel").value = perfil.telefono || "";
    $("perfilEmail").value = d.email;
    pintarAvatar($("perfilAv"), d);
    $("perfilQuitar").hidden = !d.foto;
    dlg.querySelectorAll(".perfil-msg").forEach((m) => (m.textContent = ""));
    pintarDirecciones();
    llenarFiscal();
    pintarSeguridad();
    mostrarTab(tab);
    if (!dlg.open) dlg.showModal();
  }
  window.abrirMiCuenta = abrirPerfil;
  window.obtenerTokenCuenta = async () => {
    try {
      return auth.currentUser ? await auth.currentUser.getIdToken() : null;
    } catch (e) {
      return null;
    }
  };

  // la foto se reduce a 256x256 en el navegador (pesa ~20 KB)
  function reducirFoto(archivo) {
    return new Promise((ok, mal) => {
      if (!archivo.type.startsWith("image/")) return mal(new Error("Elija una imagen JPG o PNG."));
      if (archivo.size > 15 * 1024 * 1024) return mal(new Error("La imagen pesa más de 15 MB."));
      const url = URL.createObjectURL(archivo);
      const img = new Image();
      img.onload = () => {
        const lado = Math.min(img.width, img.height);
        const c = document.createElement("canvas");
        c.width = c.height = 256;
        c.getContext("2d").drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 256, 256);
        URL.revokeObjectURL(url);
        ok(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => mal(new Error("No se pudo leer la imagen."));
      img.src = url;
    });
  }

  $("perfilArchivo").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      fotoNueva = await reducirFoto(f);
      pintarAvatar($("perfilAv"), { foto: fotoNueva, nombre: $("perfilNombre").value });
      $("perfilQuitar").hidden = false;
      aviso("perfil", "Foto lista. Presione “Guardar cambios”.", true);
    } catch (err) {
      aviso("perfil", err.message);
    }
  });
  $("perfilQuitar").addEventListener("click", () => {
    fotoNueva = "";
    pintarAvatar($("perfilAv"), { foto: "", nombre: $("perfilNombre").value });
    $("perfilQuitar").hidden = true;
    aviso("perfil", "Presione “Guardar cambios” para quitarla.", true);
  });

  $("perfilForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const u = auth.currentUser;
    if (!u) return;
    const nombre = $("perfilNombre").value.trim().slice(0, 60);
    const telefono = $("perfilTel").value.replace(/[^\d+ ]/g, "").trim().slice(0, 15);
    if (!nombre) return aviso("perfil", "Escriba su nombre.");
    const boton = e.target.querySelector("[type=submit]");
    boton.disabled = true;
    aviso("perfil", "Guardando…", true);
    try {
      if (nombre !== u.displayName) await conLimite(updateProfile(u, { displayName: nombre }));
      const cambios = { nombre, telefono };
      if (fotoNueva !== null) cambios.foto = fotoNueva;
      await guardarUsuario(cambios);
      Object.assign(perfil, cambios);
      fotoNueva = null;
      avisarCuenta();
      aviso("perfil", "Cambios guardados.", true);
    } catch (err) {
      aviso("perfil", errorFirestore(err));
    } finally {
      boton.disabled = false;
    }
  });

  // ---------- Direcciones ----------
  let editando = -1;
  function pintarDirecciones() {
    const lista = perfil.direcciones || [];
    $("dirLista").innerHTML = lista.length
      ? lista
          .map(
            (d, i) => `<div class="dir-item">
              <div>
                <strong>${escHtml(d.nombre)}${i === 0 ? ' <span class="dir-pred">Predeterminada</span>' : ""}</strong>
                <span>${escHtml(d.calle)} ${escHtml(d.numero)}, ${escHtml(d.colonia)}</span>
                <span>${escHtml(d.ciudad)}, ${escHtml(d.estado)} · C.P. ${escHtml(d.cp)} · Tel. ${escHtml(d.telefono)}</span>
              </div>
              <div class="dir-acc">
                ${i > 0 ? `<button type="button" data-dir="pred" data-i="${i}">Usar como predeterminada</button>` : ""}
                <button type="button" data-dir="editar" data-i="${i}">Editar</button>
                <button type="button" data-dir="borrar" data-i="${i}">Eliminar</button>
              </div>
            </div>`
          )
          .join("")
      : '<p class="cuenta-nota">Aún no tienes direcciones guardadas.</p>';
    $("dirForm").hidden = true;
    $("dirNueva").hidden = lista.length >= 5;
  }
  function abrirDirForm(i) {
    editando = i;
    const f = $("dirForm");
    f.reset();
    const d = i >= 0 ? perfil.direcciones[i] : { nombre: perfil.nombre || "", telefono: perfil.telefono || "" };
    Object.entries(d).forEach(([k, v]) => {
      if (f.elements[k]) f.elements[k].value = v;
    });
    f.hidden = false;
    $("dirNueva").hidden = true;
    aviso("direcciones", "");
    f.elements.nombre.focus();
  }
  async function guardarDirecciones(lista, mensaje) {
    try {
      await guardarUsuario({ direcciones: lista });
      perfil.direcciones = lista;
      window.cuentaCliente = { ...perfil };
      pintarDirecciones();
      aviso("direcciones", mensaje, true);
    } catch (err) {
      aviso("direcciones", errorFirestore(err));
    }
  }
  $("dirNueva").addEventListener("click", () => abrirDirForm(-1));
  $("dirCancelar").addEventListener("click", pintarDirecciones);
  $("dirLista").addEventListener("click", (e) => {
    const b = e.target.closest("[data-dir]");
    if (!b) return;
    const i = Number(b.dataset.i);
    const lista = (perfil.direcciones || []).slice();
    if (b.dataset.dir === "editar") return abrirDirForm(i);
    if (b.dataset.dir === "borrar") {
      if (!confirm("¿Eliminar esta dirección?")) return;
      lista.splice(i, 1);
      return guardarDirecciones(lista, "Dirección eliminada.");
    }
    if (b.dataset.dir === "pred") {
      lista.unshift(lista.splice(i, 1)[0]);
      return guardarDirecciones(lista, "Dirección predeterminada actualizada.");
    }
  });
  $("dirForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target).entries());
    Object.keys(d).forEach((k) => (d[k] = String(d[k]).trim()));
    const lista = (perfil.direcciones || []).slice();
    if (editando >= 0) lista[editando] = d;
    else lista.push(d);
    guardarDirecciones(lista, "Dirección guardada.");
  });

  // ---------- Datos fiscales ----------
  function llenarFiscal() {
    const f = $("fiscalForm");
    f.reset();
    Object.entries(perfil.fiscal || {}).forEach(([k, v]) => {
      if (f.elements[k]) f.elements[k].value = v;
    });
  }
  $("fiscalForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target).entries());
    Object.keys(d).forEach((k) => (d[k] = String(d[k]).trim()));
    d.rfc = d.rfc.toUpperCase();
    try {
      aviso("fiscal", "Guardando…", true);
      await guardarUsuario({ fiscal: d });
      perfil.fiscal = d;
      window.cuentaCliente = { ...perfil };
      aviso("fiscal", "Datos fiscales guardados.", true);
    } catch (err) {
      aviso("fiscal", errorFirestore(err));
    }
  });

  // ---------- Seguridad ----------
  function pintarSeguridad() {
    const u = auth.currentUser;
    const metodos = (u.providerData || []).map((p) => p.providerId);
    const nombres = { password: "Correo y contraseña", "google.com": "Google", "facebook.com": "Facebook", "apple.com": "Apple", "microsoft.com": "Microsoft" };
    $("segMetodo").textContent = metodos.map((m) => nombres[m] || m).join(" · ") || "—";
    const conPass = metodos.includes("password");
    $("segVerif").textContent = u.emailVerified ? "Sí" : "No";
    $("segVerificar").hidden = u.emailVerified || !conPass;
    $("segPassForm").hidden = !conPass;
    $("segSocial").hidden = conPass;
    $("segPassForm").reset();
    aviso($("segMsg"), "");
    pintarMfa();
  }

  // ---------- Two-step verification (authenticator app) ----------
  let secretoMfa = null;
  function pintarMfa() {
    const u = auth.currentUser;
    const factores = multiFactor(u).enrolledFactors || [];
    const activo = factores.some((f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID);
    $("mfaEstado").textContent = activo
      ? "Activada: al iniciar sesión te pediremos el código de tu app."
      : (u.providerData || []).some((p) => p.providerId === "password")
      ? "Protege tu cuenta con un código de tu celular además de tu contraseña."
      : "Protege tu cuenta con un código de tu celular además de tu inicio de sesión con Google o Facebook.";
    $("mfaEstado").classList.toggle("mfa-on", activo);
    $("mfaActivar").hidden = activo;
    $("mfaQuitar").hidden = !activo;
    $("mfaAlta").hidden = true;
    secretoMfa = null;
  }

  function errorMfa(err) {
    return err.code === "auth/requires-recent-login"
      ? "Por seguridad, cierra sesión y vuelve a entrar; luego actívala de nuevo."
      : err.code === "auth/unverified-email"
      ? "Primero verifica tu correo (botón “Enviar verificación” arriba)."
      : err.code === "auth/operation-not-allowed" || err.code === "auth/admin-restricted-operation"
      ? "La verificación en dos pasos aún no está habilitada en la tienda. Intenta más tarde."
      : ERRORS[err.code] || "No se pudo completar. Intenta de nuevo.";
  }

  // QR code drawn with a small library loaded only when needed
  function cargarQr() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    return new Promise((ok, mal) => {
      const sc = document.createElement("script");
      sc.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js";
      sc.onload = () => ok(window.qrcode);
      sc.onerror = mal;
      document.head.appendChild(sc);
    });
  }

  $("mfaActivar").addEventListener("click", async () => {
    const u = auth.currentUser;
    aviso($("segMsg"), "Preparando…", true);
    try {
      const sesion = await multiFactor(u).getSession();
      secretoMfa = await TotpMultiFactorGenerator.generateSecret(sesion);
      const url = secretoMfa.generateQrCodeUrl(u.email || "cliente", "SoluTelecom");
      $("mfaClave").textContent = secretoMfa.secretKey;
      $("mfaQr").innerHTML = "";
      try {
        const qrcode = await cargarQr();
        const qr = qrcode(0, "M");
        qr.addData(url);
        qr.make();
        $("mfaQr").innerHTML = qr.createSvgTag({ cellSize: 5, margin: 3, scalable: true });
      } catch (e) {
        $("mfaQr").innerHTML = `<a class="btn btn-outline btn-sm" href="${escHtml(url)}">Abrir en la app</a>`;
      }
      $("mfaAlta").reset();
      $("mfaAlta").hidden = false;
      $("mfaActivar").hidden = true;
      aviso($("segMsg"), "");
      $("mfaAltaCodigo").focus();
    } catch (err) {
      aviso($("segMsg"), errorMfa(err));
    }
  });

  $("mfaAlta").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = e.target.querySelector(".perfil-msg");
    if (!secretoMfa) return;
    try {
      aviso(msgEl, "Verificando…", true);
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secretoMfa, $("mfaAltaCodigo").value.trim());
      await multiFactor(auth.currentUser).enroll(assertion, "App de autenticación");
      pintarMfa();
      aviso($("segMsg"), "Verificación en dos pasos activada. Guarda tu app: la necesitarás para entrar.", true);
    } catch (err) {
      aviso(msgEl, errorMfa(err));
    }
  });
  $("mfaAltaCancelar").addEventListener("click", pintarMfa);

  $("mfaQuitar").addEventListener("click", async () => {
    if (!confirm("¿Desactivar la verificación en dos pasos? Tu cuenta quedará protegida solo con tu contraseña.")) return;
    const u = auth.currentUser;
    try {
      const f = (multiFactor(u).enrolledFactors || []).find((x) => x.factorId === TotpMultiFactorGenerator.FACTOR_ID);
      if (f) await multiFactor(u).unenroll(f);
      pintarMfa();
      aviso($("segMsg"), "Verificación en dos pasos desactivada.", true);
    } catch (err) {
      aviso($("segMsg"), errorMfa(err));
    }
  });
  $("segVerificar").addEventListener("click", async () => {
    try {
      await sendEmailVerification(auth.currentUser);
      aviso($("segMsg"), "Te enviamos un correo de verificación.", true);
    } catch (err) {
      aviso($("segMsg"), "No se pudo enviar. Intente más tarde.");
    }
  });
  $("segPassForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const msgEl = e.target.querySelector(".perfil-msg");
    if (f.nueva.value !== f.repite.value) return aviso(msgEl, "Las contraseñas nuevas no coinciden.");
    try {
      const u = auth.currentUser;
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, f.actual.value));
      await updatePassword(u, f.nueva.value);
      e.target.reset();
      aviso(msgEl, "Contraseña actualizada.", true);
    } catch (err) {
      aviso(
        msgEl,
        err.code === "auth/invalid-credential" || err.code === "auth/wrong-password"
          ? "La contraseña actual no es correcta."
          : err.code === "auth/weak-password"
          ? "La nueva contraseña es muy débil."
          : "No se pudo cambiar. Intente de nuevo."
      );
    }
  });

  dlg.querySelector(".modal-close").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close();
  });
  $("perfilSalir").addEventListener("click", async () => {
    dlg.close();
    await signOut(auth);
  });

  // ---- estado de sesión ----
  const vacio = () => ({ nombre: "", foto: "", telefono: "", direcciones: [], fiscal: {} });
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      document.body.dataset.user = user.uid;
      perfil = vacio();
      avisarCuenta();
      try {
        const snap = await conLimite(getDoc(doc(db, "usuarios", user.uid)), 8000);
        if (snap.exists()) {
          const d = snap.data();
          perfil = {
            nombre: d.nombre || "",
            foto: d.foto || "",
            telefono: d.telefono || "",
            direcciones: Array.isArray(d.direcciones) ? d.direcciones : [],
            fiscal: d.fiscal || {},
          };
          avisarCuenta();
        }
      } catch (e) {
        console.warn("Firestore no disponible:", e.code || e.message);
      }
      // checkout (index.js) reads this to fill in the address and invoice data
      window.cuentaCliente = { ...perfil, email: user.email || "" };
      document.dispatchEvent(new CustomEvent("cuenta-lista"));
    } else {
      delete document.body.dataset.user;
      perfil = vacio();
      window.cuentaCliente = null;
      cerrarMenu();
      if (window.mostrarCuenta) window.mostrarCuenta(null);
      $("loginLabel").textContent = "Iniciar Sesión";
    }
  });
}