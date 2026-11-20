/* Nexus Freight — shared behaviour for every page.
   html.anim  = motion allowed (set in <head>; off for ?figma and prefers-reduced-motion)
   html.figma = capture mode for html.to.figma: nothing sticky, nothing hidden, video on its poster */
(function () {
  var d = document.documentElement;
  var anim = d.classList.contains('anim');
  var figma = d.classList.contains('figma');
  var mobile = window.matchMedia('(max-width: 760px)');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* Sticky header: transparent over the dark top, solid once the page scrolls */
  var header = $('.header');
  function onScroll() { if (header) header.classList.toggle('is-stuck', window.scrollY > 8); }
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  /* Mobile menu */
  var btn = $('.menu-btn'), panel = $('#mnav');
  function setMenu(open) {
    if (!btn || !panel) return;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    panel.hidden = !open;
    header.classList.toggle('is-open', open);
    d.classList.toggle('menu-open', open);
  }
  if (btn) {
    btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
    $$('a', panel).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    mobile.addEventListener && mobile.addEventListener('change', function (e) { if (!e.matches) setMenu(false); });
  }

  /* Services dropdown: also opens on click/tap for touch laptops */
  $$('.nav-dd > button').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      b.parentNode.classList.toggle('is-open', open);
    });
    b.parentNode.addEventListener('mouseleave', function () { b.setAttribute('aria-expanded', 'false'); b.parentNode.classList.remove('is-open'); });
  });

  /* FAQ: everything open for capture */
  if (figma) $$('details.faq-item').forEach(function (x) { x.open = true; });

  /* Quote form: ?eq=reefer preselects the equipment (service pages link here) */
  var EQ = { dryvan: 'Dry van 53′', reefer: 'Reefer 53′', flatbed: 'Flatbed / step deck', ltl: 'LTL / partial', warehousing: 'Warehousing' };
  var m = location.search.match(/eq=([a-z]+)/);
  if (m && EQ[m[1]]) $$('.js-eq').forEach(function (el) { el.firstChild.nodeValue = EQ[m[1]] + ' '; });

  /* Team slider */
  $$('.slider').forEach(function (s) {
    var track = $('.track', s), prevs = $$('.sl-prev', s.parentNode), nexts = $$('.sl-next', s.parentNode);
    if (!track) return;
    function step() { var c = $('.person', track); return c ? c.getBoundingClientRect().width + 16 : 300; }
    function upd() {
      prevs.forEach(function (b) { b.disabled = track.scrollLeft < 4; });
      nexts.forEach(function (b) { b.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4; });
    }
    function go(dir) {
      var from = track.scrollLeft, to = from + dir * step();
      track.scrollTo({ left: to, behavior: anim ? 'smooth' : 'auto' });
      // some browsers drop smooth scrolling on snap containers: jump if nothing moved
      setTimeout(function () { if (Math.abs(track.scrollLeft - from) < 2) track.scrollTo({ left: to }); upd(); }, 450);
      setTimeout(upd, 900);
    }
    prevs.forEach(function (b) { b.addEventListener('click', function () { go(-1); }); });
    nexts.forEach(function (b) { b.addEventListener('click', function () { go(1); }); });
    track.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd); upd();
  });

  /* Hero video: loads after the page, lighter file on phones, nothing on Save-Data;
     a small pause button bottom-right, the choice is remembered */
  var v = $('video.hero-bg'), vt = $('.vid-toggle');
  var KEY = 'nexus-video-paused';
  function paused() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function remember(p) { try { localStorage.setItem(KEY, p ? '1' : '0'); } catch (e) {} }
  function setBtn(isPaused) {
    if (!vt) return;
    vt.setAttribute('aria-pressed', isPaused ? 'true' : 'false');
    vt.setAttribute('aria-label', isPaused ? 'Play background video' : 'Pause background video');
    vt.classList.toggle('is-paused', isPaused);
  }
  if (v) {
    var small = mobile.matches;
    if (small && v.dataset.posterM) v.poster = v.dataset.posterM;
    var saveData = navigator.connection && navigator.connection.saveData;
    if (!anim || saveData) { if (vt) vt.hidden = true; }
    else {
      window.addEventListener('load', function () {
        v.src = small && v.dataset.srcM ? v.dataset.srcM : v.dataset.src;
        if (paused()) { setBtn(true); } else { var p = v.play(); p && p.catch && p.catch(function () {}); setBtn(false); }
      });
      vt && vt.addEventListener('click', function () {
        if (v.paused) { v.play(); remember(false); setBtn(false); } else { v.pause(); remember(true); setBtn(true); }
      });
    }
  }

  /* Phone: Call / Get a quote bar after the first screen, hidden while a form is on screen */
  var bar = $('#mbar');
  if (bar && !figma && 'IntersectionObserver' in window) {
    var seen = [], past = false;
    function updBar() { bar.classList.toggle('show', past && seen.length === 0 && !d.classList.contains('menu-open')); }
    window.addEventListener('scroll', function () { past = window.scrollY > window.innerHeight * 0.8; updBar(); }, { passive: true });
    var fio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var k = seen.indexOf(e.target);
        if (e.isIntersecting && k < 0) seen.push(e.target);
        if (!e.isIntersecting && k >= 0) seen.splice(k, 1);
      });
      updBar();
    });
    $$('.quote-card, .form-card, .footer').forEach(function (f) { fio.observe(f); });
  }

  /* Analytics hooks: every call / quote click is tagged data-track; wire to GA4 later */
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-track]');
    if (t && window.gtag) window.gtag('event', t.dataset.track, { link_url: t.href, page: location.pathname });
  });

  if (!anim) return;

  /* On-scroll reveals */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(function (el) { io.observe(el); });

  /* Steps: one numeral lit at a time; hover takes over */
  var steps = $$('.step'), i = 0, hold = false;
  if (steps.length) {
    var lit = function (n) { steps.forEach(function (s, k) { s.classList.toggle('is-on', k === n); }); };
    steps.forEach(function (s, k) {
      s.addEventListener('mouseenter', function () { hold = true; i = k; lit(k); });
      s.addEventListener('mouseleave', function () { hold = false; });
    });
    setInterval(function () { if (!hold) { i = (i + 1) % steps.length; lit(i); } }, 2600);
  }
})();
