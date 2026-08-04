/* Animação de background do hero — canvas 2D, sem dependências.
   Respeita prefers-reduced-motion, pausa fora da viewport e em aba oculta. */
(function () {
  'use strict';
  var HERO = document.querySelector('.hero');
  if (!HERO || HERO.querySelector('canvas[data-hero-anim]')) return;
  var ctxTest = document.createElement('canvas').getContext && true;
  if (!ctxTest) return;

  var kids = Array.prototype.slice.call(HERO.children);
  if (getComputedStyle(HERO).position === 'static') HERO.style.position = 'relative';
  kids.forEach(function (el) {
    var p = getComputedStyle(el).position;
    if (p === 'absolute' || p === 'fixed') return;
    if (p === 'static') el.style.position = 'relative';
    if (getComputedStyle(el).zIndex === 'auto') el.style.zIndex = '2';
  });

  var cv = document.createElement('canvas');
  cv.setAttribute('data-hero-anim', '');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;z-index:0;pointer-events:none';
  HERO.insertBefore(cv, HERO.firstChild);

  var ctx = cv.getContext('2d');
  if (!ctx) { cv.parentNode.removeChild(cv); return; }

  var w = 1, h = 1, dpr = 1, T = 0, raf = 0, visible = true;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = HERO.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width));
    h = Math.max(1, Math.round(r.height));
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    setup();
  }

  /* ---- animação ---- */

  var segs = [], total = 0, cx = 0, cy = 0;
  var TEAL = '59,180,161', NAVY = '29,50,123';

  function grow(x, y, ang, len, wd, depth, out) {
    if (depth > 5 || len < 8) return;
    var steps = 6, px = x, py = y, i;
    var a = ang;
    for (i = 1; i <= steps; i++) {
      a += (Math.sin(depth * 3.7 + i * 1.9 + x * .01) * .18);
      var nx = px + Math.cos(a) * len / steps, ny = py + Math.sin(a) * len / steps;
      out.push({ x1: px, y1: py, x2: nx, y2: ny, wd: wd * (1 - i / steps * .25), d: depth });
      px = nx; py = ny;
    }
    var spread = .42 + (depth % 2) * .12;
    grow(px, py, a - spread, len * .72, wd * .68, depth + 1, out);
    grow(px, py, a + spread, len * .68, wd * .64, depth + 1, out);
  }

  function setup() {
    cx = w * (w > 900 ? .5 : .5);
    cy = h * (w > 900 ? .48 : .34);
    var base = Math.min(Math.max(w, h) * .17, 165);
    segs = [];
    for (var b = 0; b < 7; b++) {
      grow(cx, cy, b / 7 * 6.2831853 + .4, base, 3.4, 0, segs);
    }
    total = segs.length;
  }

  function frame() {
    var cycle = 11;
    var p = (T % cycle) / cycle;
    var reveal = Math.min(1, p / .62);
    var fade = p > .86 ? 1 - (p - .86) / .14 : 1;
    var n = Math.floor(total * reveal);
    var i;
    ctx.lineCap = 'round';
    for (i = 0; i < n; i++) {
      var s = segs[i];
      var edge = i > n - 26 ? (n - i) / 26 : 1;
      var al = (.13 + (5 - s.d) * .045) * fade;
      ctx.strokeStyle = 'rgba(' + (s.d < 2 ? NAVY : TEAL) + ',' + (al * (0.35 + edge * .65)).toFixed(3) + ')';
      ctx.lineWidth = Math.max(.8, s.wd * 1.35);
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
      if (edge < 1) {
        ctx.fillStyle = 'rgba(' + TEAL + ',' + ((1 - edge) * .3 * fade).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(s.x2, s.y2, 1.8, 0, 6.2832); ctx.fill();
      }
    }
    /* disco óptico */
    var R = Math.min(w, h) * .06;
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 2.4);
    g.addColorStop(0, 'rgba(' + TEAL + ',' + (.20 * fade).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + TEAL + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R * 2.4, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = 'rgba(' + NAVY + ',' + (.18 * fade).toFixed(3) + ')';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.stroke();
  }

  /* ---- /animação ---- */

  var last = 0;
  function loop(ts) {
    raf = requestAnimationFrame(loop);
    var dt = ts - last;
    if (!last || dt > 100) dt = 16;
    last = ts;
    T += dt / 1000;
    ctx.clearRect(0, 0, w, h);
    frame(dt / 1000);
  }
  function start() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  try { resize(); } catch (e) { cv.parentNode.removeChild(cv); return; }

  if (window.ResizeObserver) { new ResizeObserver(function () { resize(); }).observe(HERO); }
  else { window.addEventListener('resize', resize); }

  if (reduce) {
    ctx.clearRect(0, 0, w, h);
    try { frame(0); } catch (e) {}
    return;
  }
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && !document.hidden) start(); else stop();
    }, { threshold: 0 }).observe(HERO);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else if (visible) start();
  });
  start();
})();
