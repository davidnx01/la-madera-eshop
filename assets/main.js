/* La Madera – úvodná stránka e-shopu, návrh 4: len správanie UI, nič sa nikam neodosiela.
   V Next.js to nahradia hooky @darwon/storefront (useCart, vyhľadávanie, katalóg) a nastavenia obchodu (otváracie hodiny). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desk = window.matchMedia('(min-width: 1024px)');
  var eur = new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' });
  var plural = function (n, f) { return n === 1 ? f[0] : n > 1 && n < 5 ? f[1] : f[2]; };
  var page = $$('[data-page]');
  var live = $('[data-live]');
  function say(text) { live.textContent = ''; setTimeout(function () { live.textContent = text; }, 60); }

  /* ---------- hlavička: čiara a tieň, keď sa prilepí ---------- */
  var hdr = $('[data-hdr]'), stuck = null;
  function onScroll() {
    var s = hdr.getBoundingClientRect().top <= 0 && window.scrollY > 0;
    if (s !== stuck) { stuck = s; hdr.classList.toggle('is-stuck', s); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- banner: pomenované snímky (vzor „tabbed carousel“), bez automatického posúvania ---------- */
  var hero = $('[data-hero]');
  if (hero) {
    var tabs = $$('[role="tab"]', hero), slides = $$('.hslide', hero), media = $$('.hmedia', hero);
    var n = tabs.length, cur = 0;
    var show = function (i, focus) {
      i = (i + n) % n;
      if (i !== cur) {
        slides[cur].classList.remove('is-active'); slides[cur].inert = true; slides[cur].setAttribute('aria-hidden', 'true');
        media[cur].classList.remove('is-active');
        tabs[cur].setAttribute('aria-selected', 'false'); tabs[cur].tabIndex = -1;
        slides[i].classList.add('is-active'); slides[i].inert = false; slides[i].removeAttribute('aria-hidden');
        media[i].classList.add('is-active');
        tabs[i].setAttribute('aria-selected', 'true'); tabs[i].tabIndex = 0;
        cur = i;
      }
      if (focus) tabs[i].focus();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(i); });
      t.addEventListener('keydown', function (e) {
        var k = e.key;
        if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); show(cur + 1, true); }
        else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); show(cur - 1, true); }
        else if (k === 'Home') { e.preventDefault(); show(0, true); }
        else if (k === 'End') { e.preventDefault(); show(n - 1, true); }
      });
    });
    $('[data-hero-prev]', hero).addEventListener('click', function () { show(cur - 1); });
    $('[data-hero-next]', hero).addEventListener('click', function () { show(cur + 1); });
    var sx = null, sy = 0;
    hero.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } }, { passive: true });
    hero.addEventListener('pointercancel', function () { sx = null; }, { passive: true });
    hero.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) show(cur + (dx < 0 ? 1 : -1));
    }, { passive: true });

    var started = false;
    var start = function () {
      if (started) return;
      started = true;
      hero.classList.add('is-loading');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          hero.classList.add('is-ready');
          setTimeout(function () { hero.classList.remove('is-loading'); }, 1400);
        });
      });
    };
    var firstImg = $('img', media[0]);
    if (reduce.matches || firstImg.complete) start();
    else {
      firstImg.addEventListener('load', start);
      firstImg.addEventListener('error', start);
      setTimeout(start, 900);
    }
  }

  /* ---------- prekrytia: vyhľadávanie, bočné menu, kategórie ---------- */
  var openSheet = null, opener = null;
  function focusables(el) {
    return $$('a[href], button:not([disabled]), input:not([type="hidden"])', el).filter(function (x) { return x.getClientRects().length > 0; });
  }
  function openS(sheet, from) {
    if (openSheet) closeS(openSheet, false);
    opener = from || document.activeElement;
    sheet.hidden = false;
    page.forEach(function (el) { el.inert = true; });
    document.documentElement.classList.add('is-locked');
    $$('[aria-controls="' + sheet.id + '"]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    void sheet.offsetWidth;
    sheet.classList.add('is-open');
    openSheet = sheet;
    var f = $('[data-autofocus]', sheet) || focusables(sheet)[0];
    if (f) f.focus({ preventScroll: true });
  }
  function closeS(sheet, restore) {
    sheet.classList.remove('is-open');
    $$('[aria-controls="' + sheet.id + '"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    openSheet = null;
    page.forEach(function (el) { el.inert = false; });
    document.documentElement.classList.remove('is-locked');
    var hide = function () { if (!sheet.classList.contains('is-open')) sheet.hidden = true; };
    if (reduce.matches) hide(); else setTimeout(hide, 460);
    if (restore !== false && opener && document.contains(opener)) opener.focus({ preventScroll: true });
    opener = null;
  }
  $$('[data-open]').forEach(function (b) {
    b.addEventListener('click', function () { openS(document.getElementById(b.getAttribute('data-open')), b); });
  });
  $$('[data-close]').forEach(function (el) {
    el.addEventListener('click', function () { var s = el.closest('.sheet'); if (s && s.classList.contains('is-open')) closeS(s); });
  });
  $$('.sheet a[href]').forEach(function (a) {
    a.addEventListener('click', function () { var s = a.closest('.sheet'); if (s && s.classList.contains('is-open') && a.target !== '_blank') closeS(s, false); });
  });

  /* ---------- vyhľadávanie s návrhmi (UX pravidlá §3): bez diakritiky, max 6 návrhov, doplnená časť zvýraznená ---------- */
  var norm = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var esc = function (s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var products = $$('.pcard[data-product]').map(function (c) {
    return { name: c.dataset.name, href: c.dataset.href, img: c.dataset.img, price: Number(c.dataset.price), meta: c.dataset.meta, cat: c.dataset.cat };
  });
  function highlight(name, q) {
    var i = norm(name).indexOf(norm(q));
    if (i < 0) return '<mark>' + esc(name) + '</mark>';
    return '<mark>' + esc(name.slice(0, i)) + '</mark>' + esc(name.slice(i, i + q.length)) + '<mark>' + esc(name.slice(i + q.length)) + '</mark>';
  }
  var form = $('[data-search]');
  if (form) {
    var input = $('input[role="combobox"]', form), list = $('[role="listbox"]', form), status = $('[data-suggest-status]', form), more = $('[data-search-more]', form);
    var active = -1, items = [];
    var close = function () { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
    var render = function () {
      var q = input.value.trim();
      more.hidden = q.length >= 2;
      if (q.length < 2) { close(); list.innerHTML = ''; status.textContent = ''; return; }
      var nq = norm(q);
      items = products.filter(function (p) { return norm(p.name + ' ' + p.cat).indexOf(nq) > -1; }).slice(0, 6);
      list.innerHTML = items.length ? items.map(function (p, i) {
        return '<li id="q-opt-' + i + '" role="option" aria-selected="false" data-href="' + p.href + '"><img src="' + p.img + '" alt=""><span><span class="suggest__name">' + highlight(p.name, q) + '</span><span class="suggest__meta">' + esc(p.cat + ', ' + p.meta) + '</span></span><span class="suggest__price num">' + eur.format(p.price) + '</span></li>';
      }).join('') : '<li class="suggest__empty" role="option" aria-disabled="true" aria-selected="false">Nič sme nenašli. Skús „krém“ alebo „olej“, prípadne nám zavolaj.</li>';
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      active = -1;
      status.textContent = items.length ? items.length + ' ' + plural(items.length, ['návrh', 'návrhy', 'návrhov']) + '.' : 'Žiadne návrhy.';
    };
    var move = function (d) {
      if (!items.length) return;
      active = (active + d + items.length) % items.length;
      $$('[role="option"]', list).forEach(function (li, i) { li.setAttribute('aria-selected', String(i === active)); });
      input.setAttribute('aria-activedescendant', 'q-opt-' + active);
    };
    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) render(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter' && active > -1) { e.preventDefault(); location.href = items[active].href; }
      else if (e.key === 'Escape' && !list.hidden) { e.stopPropagation(); close(); }
    });
    list.addEventListener('click', function (e) {
      var li = e.target.closest('[data-href]');
      if (li) location.href = li.getAttribute('data-href');
    });
    $$('[data-q]', form).forEach(function (chip) {
      chip.addEventListener('click', function () { input.value = chip.getAttribute('data-q'); render(); input.focus(); });
    });
  }

  /* ---------- odporúčame: karusel, šípky a posuvník v jednom riadku ---------- */
  var track = $('[data-track]');
  if (track) {
    var prev = $('[data-prev]'), next = $('[data-next]'), thumb = $('[data-thumb]');
    var stepW = function () {
      var c = track.children[0];
      return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 24) : 320;
    };
    var upd = function () {
      var max = track.scrollWidth - track.clientWidth;
      var r = Math.min(1, track.clientWidth / track.scrollWidth);
      var p = max > 0 ? track.scrollLeft / max : 0;
      thumb.style.width = (r * 100) + '%';
      thumb.style.transform = 'translateX(' + (p * (1 / r - 1) * 100) + '%)';
      prev.disabled = track.scrollLeft < 4;
      next.disabled = track.scrollLeft > max - 4;
    };
    var ticking = false;
    track.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; upd(); });
    }, { passive: true });
    prev.addEventListener('click', function () { track.scrollBy({ left: -stepW(), behavior: reduce.matches ? 'auto' : 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left: stepW(), behavior: reduce.matches ? 'auto' : 'smooth' }); });
    window.addEventListener('resize', upd);
    upd();
  }

  /* ---------- košík (len ukážka): suma a počet, potvrdenie, ktoré nezmizne samo (UX pravidlá §4) ---------- */
  var cart = { count: 0, sum: 0 };
  var added = $('[data-added]');
  var placeAdded = function () {
    added.style.top = desk.matches ? Math.max(16, hdr.getBoundingClientRect().bottom + 14) + 'px' : '';
  };
  var closeAdded = function () { added.hidden = true; };
  $$('[data-add]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('[data-product]');
      var price = Number(item.dataset.price), name = item.dataset.name;
      cart.count += 1;
      cart.sum = Math.round((cart.sum + price) * 100) / 100;
      $$('[data-cart-count]').forEach(function (b) {
        b.hidden = false;
        b.textContent = cart.count;
        b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
      });
      $$('[data-cart-sum]').forEach(function (s) { s.textContent = eur.format(cart.sum); });
      $$('[data-cart-sr]').forEach(function (s) { s.textContent = ', ' + cart.count + ' ' + plural(cart.count, ['produkt', 'produkty', 'produktov']); });

      $('[data-added-img]', added).src = item.dataset.img;
      $('[data-added-name]', added).textContent = name;
      $('[data-added-meta]', added).textContent = item.dataset.meta + ', 1 ks';
      $('[data-added-price]', added).textContent = eur.format(price);
      $('[data-added-sum]', added).textContent = eur.format(cart.sum);
      added.hidden = false;
      placeAdded();
      added.classList.remove('is-in'); void added.offsetWidth; added.classList.add('is-in');

      var lbl = $('[data-lbl]', btn), use = $('use', btn);
      if (lbl && !btn.classList.contains('is-added')) {
        var text = lbl.textContent;
        btn.classList.add('is-added');
        lbl.textContent = 'Pridané';
        if (use) use.setAttribute('href', '#i-check');
        setTimeout(function () {
          btn.classList.remove('is-added');
          lbl.textContent = text;
          if (use) use.setAttribute('href', '#i-plus');
        }, 1800);
      }
      say(name + ' – pridané do košíka. Medzisúčet ' + eur.format(cart.sum) + '.');
    });
  });
  $$('[data-added-close]', added).forEach(function (b) { b.addEventListener('click', closeAdded); });

  /* ---------- klávesnica: Esc a uzamknutie fokusu v prekrytí ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (openSheet) { closeS(openSheet); return; }
      if (!added.hidden) closeAdded();
      return;
    }
    if (e.key === 'Tab' && openSheet) {
      var f = focusables(openSheet);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* ---------- pätička: na mobile akordeón, na desktope stĺpce ---------- */
  var fcols = $$('[data-fcol]');
  var syncF = function (initial) {
    fcols.forEach(function (d) {
      var sum = $('summary', d);
      if (desk.matches) { d.open = true; sum.tabIndex = -1; }
      else { sum.removeAttribute('tabindex'); if (initial) d.open = false; }
    });
  };
  fcols.forEach(function (d) { $('summary', d).addEventListener('click', function (e) { if (desk.matches) e.preventDefault(); }); });
  desk.addEventListener('change', function () { syncF(true); placeAdded(); });
  syncF(true);

  /* ---------- newsletter: v návrhu sa nič neodosiela ---------- */
  var news = $('[data-news]');
  news.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('input', news), msg = $('[data-news-msg]', news);
    if (input.value && input.checkValidity()) {
      msg.textContent = 'Ďakujeme. V tomto návrhu sa prihlásenie zatiaľ neodosiela.';
    } else {
      msg.textContent = 'Zadaj platný e-mail, napríklad meno@email.sk.';
      input.focus();
    }
  });

  /* ---------- živý stav salóna (Europe/Bratislava): po–pi 8:30–21:00, sobota po dohode, nedeľa a sviatky zatvorené.
     Dni pracovného pokoja SR platné v roku 2026 (1. 9., 8. 5., 15. 9. a 17. 11. nimi nie sú); Veľký piatok a Veľkonočný pondelok sa počítajú. */
  var OPEN = 8 * 60 + 30, CLOSE = 21 * 60;
  var FIXED = ['01-01', '01-06', '05-01', '07-05', '08-29', '11-01', '12-24', '12-25', '12-26'];
  var WD = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
  var IN_DAY = ['v nedeľu', 'v pondelok', 'v utorok', 'v stredu', 'vo štvrtok', 'v piatok', 'v sobotu'];
  var pad = function (x) { return (x < 10 ? '0' : '') + x; };
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
  function openState() {
    var x = now();
    if (isHoliday(x.t)) return { open: false, text: 'dnes sviatok, otvárame ' + nextOpening(x.t) };
    if (x.wd === 6) return { open: false, text: 'dnes len po dohode' };
    if (x.wd === 0) return { open: false, text: 'dnes zatvorené, otvárame ' + nextOpening(x.t) };
    if (x.min < OPEN) return { open: false, text: 'dnes otvárame o 8:30' };
    if (x.min < CLOSE) {
      var left = CLOSE - x.min;
      return { open: true, text: left <= 60 ? 'otvorené ešte ' + left + ' min' : 'teraz otvorené do 21:00' };
    }
    return { open: false, text: 'zatvorené, otvárame ' + nextOpening(x.t) };
  }
  var openEls = $$('[data-open-status]'), dots = $$('[data-open-dot]');
  function renderOpen() {
    var s = openState();
    openEls.forEach(function (el) {
      var prefix = el.getAttribute('data-prefix') || '';
      el.textContent = prefix ? prefix + s.text : s.text.charAt(0).toUpperCase() + s.text.slice(1);
    });
    dots.forEach(function (d) { d.classList.toggle('is-open', s.open); });
  }
  if (openEls.length && window.Intl && Intl.DateTimeFormat.prototype.formatToParts) {
    renderOpen();
    setInterval(renderOpen, 60000);
  }
})();
