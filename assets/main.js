/* La Madera – úvodná stránka e-shopu, návrh 3: len správanie UI, nič sa nikam neodosiela.
   V Next.js to nahradia hooky @darwon/storefront (useCart, vyhľadávanie, katalóg) a nastavenia obchodu (otváracie hodiny). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var eur = new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' });
  var plural = function (n, forms) { return n === 1 ? forms[0] : n > 1 && n < 5 ? forms[1] : forms[2]; };
  var page = $$('[data-page]');

  /* ---------- prekrytia (menu, vyhľadávanie na mobile) ---------- */
  var openSheet = null, opener = null;
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
      openSheet = sheet; opener = from || null;
      var first = $('input', sheet) || focusables(sheet)[0];
      if (first) first.focus();
    } else {
      openSheet = null;
      if (returnFocus !== false && opener && document.contains(opener)) opener.focus();
      opener = null;
    }
  }
  $$('[data-open]').forEach(function (b) {
    b.addEventListener('click', function () { setSheet(document.getElementById(b.getAttribute('data-open')), true, b); });
  });
  $$('.sheet').forEach(function (sheet) {
    $$('[data-close]', sheet).forEach(function (el) {
      el.addEventListener('click', function () { if (!sheet.hidden) setSheet(sheet, false, null, el.tagName !== 'A'); });
    });
  });

  /* ---------- menu produktov (desktop) ---------- */
  var megaBtn = $('[data-mega]'), mega = $('#mega');
  function setMega(open) {
    mega.hidden = !open;
    megaBtn.setAttribute('aria-expanded', String(open));
  }
  megaBtn.addEventListener('click', function () { setMega(mega.hidden); });
  document.addEventListener('click', function (e) {
    if (!mega.hidden && !mega.contains(e.target) && !megaBtn.contains(e.target)) setMega(false);
  });
  mega.addEventListener('focusout', function (e) {
    if (e.relatedTarget && !mega.contains(e.relatedTarget) && e.relatedTarget !== megaBtn) setMega(false);
  });

  /* ---------- vyhľadávanie s návrhmi (UX pravidlá §3): bez diakritiky, max 6 návrhov, doplnená časť zvýraznená ---------- */
  var norm = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var products = $$('.carousel .card').map(function (c) {
    return { name: c.getAttribute('data-name'), href: c.getAttribute('data-href'), img: c.getAttribute('data-img'), price: Number(c.getAttribute('data-price')), meta: c.getAttribute('data-meta') };
  });
  function esc(s) { return s.replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
  function highlight(name, q) {
    var i = norm(name).indexOf(norm(q));
    if (i < 0) return esc(name);
    return esc(name.slice(0, i)) + esc(name.slice(i, i + q.length)) + '<mark>' + esc(name.slice(i + q.length)) + '</mark>';
  }
  $$('[data-search]').forEach(function (form) {
    var input = $('input[role="combobox"]', form), list = $('[role="listbox"]', form), status = $('[data-suggest-status]', form);
    var active = -1, items = [];
    function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; }
    function render() {
      var q = input.value.trim();
      if (q.length < 2) { close(); list.innerHTML = ''; status.textContent = ''; return; }
      var nq = norm(q);
      items = products.filter(function (p) { return norm(p.name + ' ' + p.meta).indexOf(nq) > -1; }).slice(0, 6);
      list.innerHTML = items.length ? items.map(function (p, i) {
        return '<li id="' + list.id + '-' + i + '" role="option" aria-selected="false" data-href="' + p.href + '"><img src="' + p.img + '" alt=""><span class="suggest__name">' + highlight(p.name, q) + '</span><span class="suggest__price">' + eur.format(p.price) + '</span></li>';
      }).join('') : '<li class="suggest__empty" role="option" aria-disabled="true">Nič sme nenašli. Skús „krém“ alebo „olej“, prípadne nám zavolaj.</li>';
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      active = -1;
      status.textContent = items.length ? items.length + ' ' + plural(items.length, ['návrh', 'návrhy', 'návrhov']) + '.' : 'Žiadne návrhy.';
    }
    function move(d) {
      if (!items.length) return;
      active = (active + d + items.length) % items.length;
      $$('[role="option"]', list).forEach(function (li, i) { li.setAttribute('aria-selected', String(i === active)); });
      input.setAttribute('aria-activedescendant', list.id + '-' + active);
    }
    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) render(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter' && active > -1) { e.preventDefault(); location.href = items[active].href; }
      else if (e.key === 'Escape' && !list.hidden) { e.stopPropagation(); close(); }
    });
    list.addEventListener('mousedown', function (e) {
      var li = e.target.closest('[data-href]');
      if (li) { e.preventDefault(); location.href = li.getAttribute('data-href'); }
    });
    input.addEventListener('blur', function () { setTimeout(close, 120); });
  });

  /* ---------- karusel odporúčaných produktov ---------- */
  var track = $('[data-track]'), prev = $('[data-prev]'), next = $('[data-next]');
  function step() { var c = $('.card', track); return c ? c.getBoundingClientRect().width + 16 : 300; }
  function updateBtns() {
    prev.disabled = track.scrollLeft < 8;
    next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
  }
  prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
  next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
  track.addEventListener('scroll', updateBtns, { passive: true });
  window.addEventListener('resize', updateBtns);
  updateBtns();

  /* ---------- košík (len ukážka): suma a počet v hlavičke, potvrdenie, ktoré nezmizne samo (UX pravidlá §4) ---------- */
  var cart = { count: 0, sum: 0 };
  var added = $('[data-added]'), cartStatus = $('[data-cart-status]');
  function closeAdded() { added.hidden = true; }
  $$('[data-add]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('[data-product]');
      var price = Number(card.getAttribute('data-price')), name = card.getAttribute('data-name');
      cart.count += 1; cart.sum += price;
      var count = $('[data-cart-count]');
      count.hidden = false; count.textContent = cart.count;
      $('[data-cart-sum]').textContent = eur.format(cart.sum);
      $('[data-cart-link]').setAttribute('aria-label', 'Košík ' + eur.format(cart.sum) + ', ' + cart.count + ' ' + plural(cart.count, ['produkt', 'produkty', 'produktov']));
      $('[data-added-img]', added).src = card.getAttribute('data-img');
      $('[data-added-name]', added).textContent = name;
      $('[data-added-meta]', added).textContent = card.getAttribute('data-meta') + ' · 1 ks';
      $('[data-added-price]', added).textContent = eur.format(price);
      $('[data-added-sum]', added).textContent = eur.format(cart.sum);
      added.hidden = false;
      cartStatus.textContent = name + ' – pridané do košíka. Medzisúčet ' + eur.format(cart.sum) + '.';
    });
  });
  $$('[data-added-close]', added).forEach(function (b) { b.addEventListener('click', closeAdded); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (openSheet) { setSheet(openSheet, false); return; }
      if (!mega.hidden) { setMega(false); megaBtn.focus(); return; }
      if (!added.hidden) { closeAdded(); return; }
    }
    if (e.key === 'Tab' && openSheet) {
      var f = focusables(openSheet);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* ---------- newsletter: v návrhu sa nič neodosiela ---------- */
  var news = $('[data-news]');
  news.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('input', news), msg = $('[data-news-msg]', news);
    msg.textContent = input.checkValidity() && input.value
      ? 'Ďakujeme. V tomto návrhu sa prihlásenie zatiaľ neodosiela.'
      : 'Zadaj, prosím, platný e-mail, napríklad meno@email.sk.';
  });

  /* ---------- živý stav salóna (Europe/Bratislava): po–pi 8:30–21:00, sobota po dohode, nedeľa a sviatky zatvorené.
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
    return Date.UTC(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
  }
  function isHoliday(t) {
    var d = new Date(t), md = pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
    if (FIXED.indexOf(md) > -1) return true;
    var e = easter(d.getUTCFullYear());
    return t === e - 2 * 864e5 || t === e + 864e5;
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
    if (isHoliday(n.t)) return { open: false, text: 'Salón: dnes sviatok, otvárame ' + nextOpening(n.t) };
    if (n.wd === 6) return { open: false, text: 'Salón: dnes len po dohode' };
    if (n.wd === 0) return { open: false, text: 'Salón: dnes zatvorené, otvárame ' + nextOpening(n.t) };
    if (n.min < OPEN) return { open: false, text: 'Salón: dnes otvárame o 8:30' };
    if (n.min < CLOSE) {
      var left = CLOSE - n.min;
      return { open: true, text: left <= 60 ? 'Salón: otvorené ešte ' + left + ' min' : 'Salón: teraz otvorené do 21:00' };
    }
    return { open: false, text: 'Salón: zatvorené, otvárame ' + nextOpening(n.t) };
  }
  var openEls = $$('[data-open-status]');
  function renderOpen() {
    var s = openText();
    openEls.forEach(function (el) {
      el.textContent = el.classList.contains('topbar__open') ? s.text : s.text.replace(/^Salón: /, '').replace(/^./, function (c) { return c.toUpperCase(); });
      el.classList.toggle('is-open', s.open);
    });
  }
  if (openEls.length && window.Intl && Intl.DateTimeFormat.prototype.formatToParts) {
    renderOpen();
    setInterval(renderOpen, 60000);
  }
})();
