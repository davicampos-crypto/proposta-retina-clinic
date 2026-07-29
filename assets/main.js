/* ==========================================================================
   Retina Clinic — comportamento L2 (DESIGN.md §7)
   Sem GSAP, sem Lenis, sem WebGL. IntersectionObserver + rAF apenas.
   Motion effects derived from vue-bits by DavidHDev (MIT).
   ========================================================================== */
(function () {
  'use strict';

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine    = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Ano no rodapé ---------- */
  var ano = document.getElementById('ano');
  if (ano) ano.textContent = new Date().getFullYear();

  /* ---------- §4.5 Nav reativa ao scroll ---------- */
  var nav = document.getElementById('nav');
  var navTicking = false;
  function onScrollNav() {
    if (navTicking) return;
    navTicking = true;
    requestAnimationFrame(function () {
      nav.setAttribute('data-scrolled', window.scrollY > 24 ? 'true' : 'false');
      navTicking = false;
    });
  }
  onScrollNav();
  addEventListener('scroll', onScrollNav, { passive: true });

  /* ---------- Painel móvel: foco preso, Esc fecha ---------- */
  var drawer      = document.getElementById('drawer');
  var navToggle   = document.getElementById('navToggle');
  var drawerClose = document.getElementById('drawerClose');
  var lastFocus   = null;

  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.setAttribute('data-open', 'true');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    drawerClose.focus();
  }
  function closeDrawer() {
    drawer.setAttribute('data-open', 'false');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  if (navToggle && drawer) {
    navToggle.addEventListener('click', openDrawer);
    drawerClose.addEventListener('click', closeDrawer);
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeDrawer();
    });
    addEventListener('keydown', function (e) {
      if (drawer.getAttribute('data-open') !== 'true') return;
      if (e.key === 'Escape') { closeDrawer(); return; }
      if (e.key !== 'Tab') return;
      var f = drawer.querySelectorAll('a[href], button:not([disabled])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    // Fecha ao voltar para desktop
    matchMedia('(min-width: 1024px)').addEventListener('change', function (ev) {
      if (ev.matches && drawer.getAttribute('data-open') === 'true') closeDrawer();
    });
  }

  /* ---------- §7.3 ScrollFloat / §7.4 ScrollReveal ---------- */
  var animated = document.querySelectorAll('.float-in, .reveal');
  if (reduced) {
    animated.forEach(function (el) { el.classList.add('is-in'); });
  } else if ('IntersectionObserver' in window) {
    // Dois limiares: 0.14 é o gatilho normal, 0 socorre os blocos mais altos que
    // a tela. No celular a grade de médicos vira uma coluna de ~7900px — 14% dela
    // nunca cabe na viewport, e a seção ficava invisível para sempre.
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var tall = en.boundingClientRect.height > innerHeight * 0.6;
        if (!en.isIntersecting) return;
        if (!tall && en.intersectionRatio < 0.14) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { threshold: [0, 0.14], rootMargin: '0px 0px -8% 0px' });

    animated.forEach(function (el) {
      // índice para o stagger de .reveal > *
      if (el.classList.contains('reveal')) {
        Array.prototype.forEach.call(el.children, function (child, i) {
          if (!child.style.getPropertyValue('--i')) child.style.setProperty('--i', i);
        });
      }
      io.observe(el);
    });
  } else {
    animated.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- §7.6 CountUp ---------- */
  var counters = document.querySelectorAll('[data-count]');
  function runCount(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduced) { el.textContent = target + suffix; return; }
    var dur = 1200, t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window) {
    var ioc = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        runCount(en.target);
        ioc.unobserve(en.target);
      });
    }, { threshold: 0.25, rootMargin: '0px 0px -10% 0px' });
    counters.forEach(function (el) { ioc.observe(el); });
  } else {
    counters.forEach(runCount);
  }

  /* ---------- §4.4 SpotlightCard (rRF, só ponteiro fino) ---------- */
  if (fine && !reduced) {
    document.querySelectorAll('.card--spot').forEach(function (card) {
      var raf = null;
      card.addEventListener('pointermove', function (e) {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          var r = card.getBoundingClientRect();
          card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          card.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
      });
    });
  }

  /* ---------- §7.5 Magnet (CTA) ---------- */
  if (fine && !reduced) {
    document.querySelectorAll('[data-magnet]').forEach(function (el) {
      var raf = null;
      el.addEventListener('pointermove', function (e) {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          var r = el.getBoundingClientRect();
          var dx = (e.clientX - r.left - r.width / 2) * 0.22;
          var dy = (e.clientY - r.top - r.height / 2) * 0.30;
          el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        });
      });
      el.addEventListener('pointerleave', function () {
        if (raf) cancelAnimationFrame(raf);
        el.style.transform = '';
      });
    });
  }

  /* ---------- §7.7 Parallax leve (≤ 60px, só transform, ≥ 900px) ---------- */
  var parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length && !reduced && matchMedia('(min-width: 900px)').matches) {
    var pTicking = false;
    var onScrollP = function () {
      if (pTicking) return;
      pTicking = true;
      requestAnimationFrame(function () {
        var vh = innerHeight;
        parallaxEls.forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.bottom < 0 || r.top > vh) return;
          var factor = parseFloat(el.getAttribute('data-parallax')) || 0.05;
          var offset = (r.top + r.height / 2 - vh / 2) * factor;
          offset = Math.max(-60, Math.min(60, offset)); // teto de 60px
          el.style.transform = 'translate3d(0,' + offset.toFixed(2) + 'px,0)';
        });
        pTicking = false;
      });
    };
    onScrollP();
    addEventListener('scroll', onScrollP, { passive: true });
    addEventListener('resize', onScrollP, { passive: true });
  }

  /* ---------- §4.10 Acordeão ---------- */
  document.querySelectorAll('.acc__trigger').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var acc  = btn.closest('.acc');
      var open = btn.getAttribute('aria-expanded') === 'true';
      // fecha todos os irmãos do mesmo acordeão
      acc.querySelectorAll('.acc__trigger').forEach(function (o) {
        o.setAttribute('aria-expanded', 'false');
      });
      acc.querySelectorAll('.acc__panel').forEach(function (p) {
        p.classList.remove('is-open');
      });
      if (!open) {
        btn.setAttribute('aria-expanded', 'true');
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        if (panel) panel.classList.add('is-open');
      }
    });
  });

  /* ---------- Formulário: validação em cliente ---------- */
  var form   = document.getElementById('contactForm');
  var status = document.getElementById('formStatus');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('[required]').forEach(function (f) {
        var valid = f.type === 'checkbox' ? f.checked : f.checkValidity() && f.value.trim() !== '';
        if (f.classList.contains('field__input')) {
          f.setAttribute('aria-invalid', valid ? 'false' : 'true');
        }
        if (!valid && ok) { ok = false; f.focus(); }
      });
      if (!ok) {
        status.textContent = 'Por favor, revise os campos destacados antes de enviar.';
        status.style.color = 'var(--danger)';
        return;
      }
      // Sem backend nesta entrega — encaminha para o WhatsApp da clínica.
      var msg = 'Olá! Meu nome é ' + form.nome.value + '. ' + form.msg.value +
                ' (E-mail: ' + form.email.value + ' · Telefone: ' + form.tel.value + ')';
      status.textContent = 'Abrindo o WhatsApp da clínica para concluir seu contato…';
      status.style.color = 'var(--brand-ink)';
      window.open('https://wa.me/551140047821?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    });
  }

  /* ---------- Nav: marca a seção ativa ---------- */
  var navLinks = document.querySelectorAll('.nav__link[href^="#"]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    navLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var ios = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = map[en.target.id];
        if (!a) return;
        if (en.isIntersecting) {
          navLinks.forEach(function (l) { l.removeAttribute('aria-current'); });
          a.setAttribute('aria-current', 'page');
        }
      });
    }, { threshold: 0.35, rootMargin: '-88px 0px -55% 0px' });
    Object.keys(map).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) ios.observe(s);
    });
  }
})();
