// =========================================================
// SoluTelecom — auth.js  (inicio de sesión REAL con Firebase)
// =========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut, updateProfile,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signInWithPopup,
  GoogleAuthProvider, FacebookAuthProvider, OAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
  'auth/too-many-requests': 'Demasiados intentos. Intente más tarde.'
};
const fail = (e) => say(ERRORS[e.code] || 'No se pudo completar. Intente de nuevo.');

if (!configured) {
  // Sin configuración: la página funciona, pero el login avisa qué falta.
  $('loginForm').addEventListener('submit', (e) => { e.preventDefault(); say('Falta pegar la configuración de Firebase en auth.js'); });
  modal.querySelectorAll('[data-provider]').forEach(b => b.addEventListener('click', () => say('Falta pegar la configuración de Firebase en auth.js')));
} else {
  const auth = getAuth(initializeApp(firebaseConfig));
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
        await signInWithEmailAndPassword(auth, user, pass);
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
      try { await signInWithPopup(auth, PROVIDERS[b.dataset.provider]()); modal.close(); }
      catch (err) { fail(err); }
    });
  });

  // Estado de sesión: el botón del menú muestra el nombre y sirve para salir
  onAuthStateChanged(auth, (user) => {
    const label = $('loginLabel');
    if (user) {
      document.body.dataset.user = user.uid;
      label.textContent = (user.displayName || user.email || 'Mi cuenta').split(' ')[0] + ' · Salir';
    } else {
      delete document.body.dataset.user;
      label.textContent = 'Iniciar Sesión';
    }
  });
  $('loginBtn').addEventListener('click', () => { if (document.body.dataset.user) signOut(auth); });
}