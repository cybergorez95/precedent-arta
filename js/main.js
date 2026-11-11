(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Заставка: логотип «прорисовывается», затем шторка уходит вверх.
        Показывается один раз за визит. ── */
  function ready() { body.classList.add('is-ready'); kickScales(); }

  var seen = false;
  try { seen = sessionStorage.getItem('pa-intro') === '1'; } catch (e) {}

  if (reduce || seen) {
    setTimeout(ready, 60);
  } else {
    var pre = document.createElement('div');
    pre.className = 'preloader';
    pre.setAttribute('aria-hidden', 'true');
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 1140 690');
    var sym = document.getElementById('logo');
    Array.prototype.forEach.call(sym.children, function (n) { svg.appendChild(n.cloneNode(true)); });
    pre.appendChild(svg);

    var start = function () {
      body.appendChild(pre);
      setTimeout(function () {
        pre.classList.add('is-done');
        setTimeout(ready, 350);
        setTimeout(function () { pre.remove(); }, 1400);
      }, 2300);
      try { sessionStorage.setItem('pa-intro', '1'); } catch (e) {}
    };
    // ждём шрифт, чтобы буквы АРТА не мигнули запасной гарнитурой
    var fontsReady = document.fonts && document.fonts.load ? document.fonts.load('430px Forum', 'АРТ') : Promise.resolve();
    Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 1200); })]).then(start, start);
  }

  /* ── Весы на первом экране: коромысло качается как затухающий маятник,
        отзывается на прокрутку и возвращается в равновесие. ── */
  var beam = document.getElementById('sc-beam');
  var panL = document.getElementById('sc-left');
  var panR = document.getElementById('sc-right');
  var th = 0, vel = 0, running = false, last = 0;
  var ARM = 180, PX = 240, PY = 90;

  function drawScales() {
    var c = Math.cos(th), s = Math.sin(th);
    beam.setAttribute('transform', 'rotate(' + (th * 57.2958).toFixed(3) + ' ' + PX + ' ' + PY + ')');
    panL.setAttribute('transform', 'translate(' + (PX - ARM * c).toFixed(2) + ' ' + (PY - ARM * s).toFixed(2) + ')');
    panR.setAttribute('transform', 'translate(' + (PX + ARM * c).toFixed(2) + ' ' + (PY + ARM * s).toFixed(2) + ')');
  }
  function stepScales(t) {
    var dt = Math.min((t - last) / 1000, 0.033); last = t;
    var acc = -9 * th - 1.5 * vel;
    vel += acc * dt; th += vel * dt;
    if (th > 0.2) th = 0.2; if (th < -0.2) th = -0.2;
    drawScales();
    if (Math.abs(th) < 0.0004 && Math.abs(vel) < 0.0004) { th = 0; vel = 0; drawScales(); running = false; return; }
    requestAnimationFrame(stepScales);
  }
  function runScales() {
    if (running || reduce || !beam) return;
    running = true; last = performance.now();
    requestAnimationFrame(stepScales);
  }
  function kickScales() {
    if (!beam || reduce) return;
    th = 0.13; vel = 0; drawScales(); runScales();
  }

  /* ── Шапка: прячется при прокрутке вниз, возвращается при прокрутке вверх ── */
  var header = document.getElementById('header');
  var lastY = window.scrollY;
  function onScroll() {
    var y = window.scrollY, d = y - lastY;
    header.classList.toggle('is-scrolled', y > 24);
    if (Math.abs(d) > 6) {
      header.classList.toggle('is-hidden', d > 0 && y > 320 && !body.classList.contains('menu-open'));
      if (y < window.innerHeight) { vel += Math.max(-0.5, Math.min(0.5, d * 0.006)); runScales(); }
      lastY = y;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Мобильное меню ── */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  function setMenu(open) {
    body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
  }
  burger.addEventListener('click', function () { setMenu(!body.classList.contains('menu-open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* ── Появление блоков при прокрутке (соседи — с небольшой задержкой) ── */
  var items = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.style.setProperty('--d', (n++ * 0.09) + 's');
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });

    var steps = document.getElementById('steps');
    var io2 = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { steps.classList.add('is-in'); io2.disconnect(); }
    }, { threshold: 0.25 });
    io2.observe(steps);
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
    document.getElementById('steps').classList.add('is-in');
  }

  /* ── Активный пункт меню ── */
  var links = {};
  nav.querySelectorAll('a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var a = links[en.target.id];
        if (a) a.classList.toggle('is-active', en.isIntersecting);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ── Практики: аккордеон, открыт один пункт ── */
  var plist = document.getElementById('plist');
  plist.addEventListener('click', function (e) {
    var head = e.target.closest('.pitem__head');
    if (!head) return;
    var item = head.parentElement;
    var open = !item.classList.contains('is-open');
    plist.querySelectorAll('.pitem.is-open').forEach(function (it) {
      it.classList.remove('is-open');
      it.querySelector('.pitem__head').setAttribute('aria-expanded', 'false');
    });
    item.classList.toggle('is-open', open);
    head.setAttribute('aria-expanded', String(open));
  });

  /* ── Форма: без серверной части письмо собирается в почтовом клиенте посетителя.
        Когда появится обработчик на сервере — заменить блок с mailto на fetch(). ── */
  var form = document.getElementById('form');
  var msg = document.getElementById('form-msg');
  form.addEventListener('input', function (e) {
    var w = e.target.closest('.field, .check');
    if (w) w.classList.remove('is-bad');
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true, first = null;
    form.querySelectorAll('[required]').forEach(function (el) {
      var bad = el.type === 'checkbox' ? !el.checked : !el.value.trim();
      el.closest('.field, .check').classList.toggle('is-bad', bad);
      if (bad) { ok = false; first = first || el; }
    });
    if (!ok) { msg.textContent = 'Заполните отмеченные поля.'; first.focus(); return; }
    var f = form.elements;
    var text = 'Имя: ' + f.name.value.trim() +
      '\nКомпания: ' + (f.company.value.trim() || '—') +
      '\nКонтакт: ' + f.reply.value.trim() +
      '\n\n' + f.message.value.trim();
    window.location.href = 'mailto:' + form.dataset.email +
      '?subject=' + encodeURIComponent('Обращение с сайта') +
      '&body=' + encodeURIComponent(text);
    msg.textContent = 'Открываем почтовую программу — письмо осталось только отправить.';
  });
})();
