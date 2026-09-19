// =========================================================
// SoluTelecom — index.js
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initHeaderShadow();
  initActiveLink();
  initScrollReveal();
  initCounters();
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
   Contact form -> opens the user's email client with a
   pre-filled message addressed to solutelecom2025@gmail.com
--------------------------------------------------------- */
function initContactForm(){
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const val = (id) => document.getElementById(id)?.value.trim() || '';
    const nombre = val('nombre');
    const empresa = val('empresa');
    const correo = val('correo');
    const telefono = val('telefono');
    const servicio = document.getElementById('servicio')?.value || '';
    const mensaje = val('mensaje');

    const subject = `Solicitud de proyecto — ${nombre || 'Sin nombre'}`;
    const bodyLines = [
      `Nombre: ${nombre}`,
      empresa ? `Empresa: ${empresa}` : null,
      `Correo: ${correo}`,
      telefono ? `Teléfono: ${telefono}` : null,
      `Servicio de interés: ${servicio}`,
      '',
      'Mensaje:',
      mensaje
    ].filter(line => line !== null);

    window.location.href =
      `mailto:solutelecom2025@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
  });
}

/* ---------------------------------------------------------
   Footer year
--------------------------------------------------------- */
function initYear(){
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}