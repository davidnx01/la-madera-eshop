/* La Madera – úvodná stránka e-shopu, návrh 2: len správanie UI, nič sa nikam neodosiela.
   V Next.js to nahradia hooky @darwon/storefront (katalóg a filtre, useCart) a nastavenia obchodu (otváracie hodiny). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var plural = function (n, forms) { return n === 1 ? forms[0] : n > 1 && n < 5 ? forms[1] : forms[2]; };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* prekrytia (menu, vyhľadávanie): otvorenie, zatvorenie, Esc, fokus ostáva vnútri, návrat fokusu */
  var openSheet = null;
  var opener = null;
  function focusables(el) {
    return $$('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', el).filter(function (n) { return n.offsetParent !== null; });
  }
  function setSheet(sheet, open, from) {
    if (open && openSheet && openSheet !== sheet) setSheet(openSheet, false);
    sheet.hidden = !open;
    $$('[data-open="' + sheet.id + '"]').forEach(function (b) { b.setAttribute('aria-expanded', String(open)); });
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      openSheet = sheet;
      opener = from || null;
      var first = $('input', sheet) || focusables(sheet)[0];
      if (first) first.focus();
    } else {
      openSheet = null;
      if (opener && document.contains(opener)) opener.focus();
      opener = null;
    }
  }
  $$('[data-open]').forEach(function (btn) {
    btn.addEventListener('click', function () { setSheet(document.getElementById(btn.getAttribute('data-open')), true, btn); });
  });
  $$('.sheet').forEach(function (sheet) {
    $$('[data-close]', sheet).forEach(function (el) {
      el.addEventListener('click', function () {
        if (sheet.hidden) return;
        if (el.tagName === 'A') opener = null; /* odkaz vedie inam, fokus sa na tlačidlo nevracia */
        setSheet(sheet, false);
      });
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

  /* kategórie: čipy filtrujú ten istý zoznam (UX pravidlá §1); rozcestník a navigácia nastavia čip, stav je v URL */
  var cats = ['all', 'telo', 'tvar', 'sady'];
  var chips = $$('[data-chip]');
  var cards = $$('.grid .card');
  var status = $('[data-chip-status]');
  var shop = document.getElementById('produkty');
  var shopH = document.getElementById('produkty-h');
  var titles = { all: 'Všetky produkty', telo: 'Telo', tvar: 'Tvár', sady: 'Sady' };
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
    var shown = 0;
    shopH.textContent = titles[cat];
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-chip') === cat)); });
    cards.forEach(function (card) {
      var ok = cat === 'all' || card.getAttribute('data-cat') === cat;
      card.hidden = !ok;
      if (ok) shown++;
    });
    $$('.top__nav [data-cat-link]').forEach(function (a) {
      if (a.getAttribute('data-cat-link') === cat) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    if (announce) status.textContent = plural(shown, ['Zobrazený', 'Zobrazené', 'Zobrazených']) + ' ' + shown + ' ' + plural(shown, ['produkt', 'produkty', 'produktov']) + '.';
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      var cat = c.getAttribute('data-chip');
      filter(cat, true);
      history.replaceState({ cat: cat }, '', urlFor(cat));
    });
  });
  $$('[data-cat-link]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      var cat = a.getAttribute('data-cat-link');
      if (openSheet) setSheet(openSheet, false);
      filter(cat, true);
      history.pushState({ cat: cat }, '', urlFor(cat));
      shop.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
      shopH.setAttribute('tabindex', '-1');
      shopH.focus({ preventScroll: true });
    });
  });
  window.addEventListener('popstate', function () { filter(fromUrl(), true); });
  filter(fromUrl(), false);

  /* živý stav salóna pre osobný odber (Europe/Bratislava): PO–PI 8:30–21:00, SO na objednávku, NE zatvorené */
  var OPEN = 8 * 60 + 30, CLOSE = 21 * 60;
  var days = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  function nowInBratislava() {
    var parts = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Bratislava', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    return { day: days[parts.weekday], min: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function openText() {
    var n = nowInBratislava();
    if (n.day <= 5) {
      if (n.min < OPEN) return { open: false, text: 'Dnes otvárame o 8:30' };
      if (n.min < CLOSE) {
        var left = CLOSE - n.min;
        return { open: true, text: left <= 60 ? 'Otvorené ešte ' + left + ' min, do 21:00' : 'Teraz otvorené, do 21:00' };
      }
      return { open: false, text: n.day === 5 ? 'Zatvorené, otvárame v pondelok o 8:30' : 'Zatvorené, otvárame zajtra o 8:30' };
    }
    if (n.day === 6) return { open: false, text: 'Dnes len na objednávku' };
    return { open: false, text: 'Dnes zatvorené, otvárame v pondelok o 8:30' };
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
