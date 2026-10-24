/* La Madera – úvodná stránka e-shopu, návrh 2: len správanie UI, nič sa nikam neodosiela.
   V Next.js to nahradia hooky @darwon/storefront (katalóg a filtre, useCart) a nastavenia obchodu (otváracie hodiny a výnimky). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var plural = function (n, forms) { return n === 1 ? forms[0] : n > 1 && n < 5 ? forms[1] : forms[2]; };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var page = $$('[data-page]');

  function focusHeading(target) {
    var h = target.matches('h1, h2, h3') ? target : $('h2, h3', target) || target;
    h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: true });
  }
  function scrollToEl(el) { el.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' }); }

  /* prekrytia (menu, vyhľadávanie): pozadie je inert, Esc zatvorí, fokus ostáva vnútri a vráti sa na tlačidlo */
  var openSheet = null;
  var opener = null;
  function focusables(el) {
    return $$('a[href], button:not([disabled]), input', el).filter(function (n) { return n.offsetParent !== null; });
  }
  function setSheet(sheet, open, from, returnFocus) {
    if (open && openSheet && openSheet !== sheet) setSheet(openSheet, false, null, false);
    sheet.hidden = !open;
    $$('[data-open="' + sheet.id + '"]').forEach(function (b) { b.setAttribute('aria-expanded', String(open)); });
    page.forEach(function (el) { el.inert = open; });
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      openSheet = sheet;
      opener = from || null;
      var first = $('input', sheet) || focusables(sheet)[0];
      if (first) first.focus();
    } else {
      openSheet = null;
      if (returnFocus !== false && opener && document.contains(opener)) opener.focus();
      opener = null;
    }
  }
  $$('[data-open]').forEach(function (btn) {
    btn.addEventListener('click', function () { setSheet(document.getElementById(btn.getAttribute('data-open')), true, btn); });
  });
  $$('.sheet').forEach(function (sheet) {
    $$('[data-close]', sheet).forEach(function (el) {
      el.addEventListener('click', function () { if (!sheet.hidden) setSheet(sheet, false); });
    });
    sheet.addEventListener('click', function (e) { if (e.target === sheet) setSheet(sheet, false); });
  });
  document.addEventListener('keydown', function (e) {
    if (!openSheet) return;
    if (e.key === 'Escape') { setSheet(openSheet, false); return; }
    if (e.key !== 'Tab') return;
    var f = focusables(openSheet);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  /* odkazy na sekcie (Salón, Doprava): zavrú menu, posunú na sekciu a fokus dajú na jej nadpis */
  $$('[data-jump]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      if (openSheet) setSheet(openSheet, false, null, false);
      history.pushState(history.state, '', a.getAttribute('href'));
      scrollToEl(target);
      focusHeading(target);
    });
  });

  /* kategórie: záložky filtrujú ten istý cenník (UX pravidlá §1), stav je v URL a Späť ho vráti */
  var cats = ['all', 'telo', 'tvar', 'sady'];
  var titles = { all: 'Všetky produkty', telo: 'Telo', tvar: 'Tvár', sady: 'Sady' };
  var chips = $$('[data-chip]');
  var rows = $$('.rows .row');
  var status = $('[data-chip-status]');
  var list = document.getElementById('produkty');
  var listH = document.getElementById('produkty-h');
  var current = null;
  function fromUrl() {
    var c = new URLSearchParams(location.search).get('kategoria');
    return cats.indexOf(c) > -1 ? c : 'all';
  }
  function urlFor(cat) {
    var p = new URLSearchParams(location.search);
    if (cat === 'all') p.delete('kategoria'); else p.set('kategoria', cat);
    var q = p.toString();
    return location.pathname + (q ? '?' + q : '') + '#produkty';
  }
  function filter(cat, announce) {
    if (cat === current) return;
    current = cat;
    var shown = 0;
    listH.textContent = titles[cat];
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-chip') === cat)); });
    rows.forEach(function (row) {
      var ok = cat === 'all' || row.getAttribute('data-cat') === cat;
      row.hidden = !ok;
      if (ok) shown++;
    });
    $$('[data-cat-link]').forEach(function (a) { a.classList.toggle('is-active', cat !== 'all' && a.getAttribute('data-cat-link') === cat); });
    if (announce) status.textContent = plural(shown, ['Zobrazený', 'Zobrazené', 'Zobrazených']) + ' ' + shown + ' ' + plural(shown, ['produkt', 'produkty', 'produktov']) + '.';
  }
  function go(cat) {
    if (cat === current) return;
    filter(cat, true);
    history.pushState({ cat: cat }, '', urlFor(cat));
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () { go(c.getAttribute('data-chip')); });
  });
  $$('[data-cat-link]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      if (openSheet) setSheet(openSheet, false, null, false);
      go(a.getAttribute('data-cat-link'));
      scrollToEl(list);
      focusHeading(listH);
    });
  });
  window.addEventListener('popstate', function () {
    filter(fromUrl(), true);
    /* návrat na stav bez kotvy: fokus nesmie ostať na nadpise mimo obrazovky */
    var a = document.activeElement;
    if (!location.hash && a && a.getAttribute('tabindex') === '-1') a.blur();
  });
  filter(fromUrl(), false);

  /* živý stav salóna pre osobný odber (Europe/Bratislava): po – pi 8:30 – 21:00, sobota po dohode, nedeľa a sviatky zatvorené.
     Dni pracovného pokoja SR platné v roku 2026 (1. 9., 8. 5., 15. 9. a 17. 11. nimi nie sú); Veľký piatok a Veľkonočný pondelok sa počítajú. */
  var OPEN = 8 * 60 + 30, CLOSE = 21 * 60;
  var FIXED = ['01-01', '01-06', '05-01', '07-05', '08-29', '11-01', '12-24', '12-25', '12-26'];
  var WD = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
  var IN_DAY = ['v nedeľu', 'v pondelok', 'v utorok', 'v stredu', 'vo štvrtok', 'v piatok', 'v sobotu'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(y, month - 1, day);
  }
  function isHoliday(t) {
    var d = new Date(t), y = d.getUTCFullYear(), md = pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
    if (FIXED.indexOf(md) > -1) return true;
    var e = easter(y), day = 864e5;
    return t === e - 2 * day || t === e + day;
  }
  function isWorkday(t) { var w = new Date(t).getUTCDay(); return w >= 1 && w <= 5 && !isHoliday(t); }
  function now() {
    var p = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Bratislava', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { t: Date.UTC(+p.year, +p.month - 1, +p.day), wd: WD[p.weekday], min: +p.hour * 60 + +p.minute };
  }
  function nextOpening(t) {
    for (var k = 1; k <= 10; k++) {
      var d = t + k * 864e5;
      if (isWorkday(d)) return (k === 1 ? 'zajtra' : IN_DAY[new Date(d).getUTCDay()]) + ' o 8:30';
    }
    return '';
  }
  function openText() {
    var n = now();
    if (isHoliday(n.t)) return { open: false, text: 'Dnes sviatok, otvárame ' + nextOpening(n.t) };
    if (n.wd === 6) return { open: false, text: 'Dnes len po dohode' };
    if (n.wd === 0) return { open: false, text: 'Dnes zatvorené, otvárame ' + nextOpening(n.t) };
    if (n.min < OPEN) return { open: false, text: 'Dnes otvárame o 8:30' };
    if (n.min < CLOSE) {
      var left = CLOSE - n.min;
      return { open: true, text: left <= 60 ? 'Otvorené ešte ' + left + ' min, do 21:00' : 'Teraz otvorené, do 21:00' };
    }
    return { open: false, text: 'Zatvorené, otvárame ' + nextOpening(n.t) };
  }
  var openEls = $$('[data-open-status]');
  function renderOpen() {
    var s = openText();
    openEls.forEach(function (el) { el.textContent = s.text; el.classList.toggle('is-open', s.open); });
  }
  if (openEls.length && window.Intl && Intl.DateTimeFormat.prototype.formatToParts) {
    renderOpen();
    setInterval(renderOpen, 60000);
  }
})();
