/* La Madera – úvodná stránka e-shopu: len správanie UI, nič sa nikam neodosiela.
   V Next.js to nahradia hooky @darwon/storefront (useCart, katalóg a filtre). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var eur = new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' });
  var plural = function (n, forms) { return n === 1 ? forms[0] : n > 1 && n < 5 ? forms[1] : forms[2]; };

  /* prekrytia (menu, vyhľadávanie): otvorenie, zatvorenie, Esc, návrat fokusu */
  var openLayer = null;
  function layer(panel, opener, onOpen) {
    function set(open) {
      panel.hidden = !open;
      opener.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
      openLayer = open ? set : null;
      if (open) onOpen(); else opener.focus();
    }
    opener.addEventListener('click', function () { set(true); });
    return set;
  }
  var menu = $('#menu');
  var setMenu = layer(menu, $('[data-menu-open]'), function () { $('[data-menu-close]', menu).focus(); });
  $$('[data-menu-close]', menu).forEach(function (el) { el.addEventListener('click', function () { setMenu(false); }); });

  var search = $('#hladat');
  var setSearch = layer(search, $('[data-search-open]'), function () { $('input', search).focus(); });
  $('[data-search-close]', search).addEventListener('click', function () { setSearch(false); });
  search.addEventListener('click', function (e) { if (e.target === search) setSearch(false); });

  /* košík – len ukážka: počet, medzisúčet a potvrdenie, ktoré nezmizne samo */
  var cart = { count: 0, sum: 0 };
  var added = $('[data-added]');
  var status = $('[data-cart-status]');
  var badge = $('[data-cart-count]');
  var cartLink = $('[data-cart-link]');
  function closeAdded() { added.hidden = true; }
  function addToCart(btn) {
    var price = Number(btn.getAttribute('data-price'));
    var name = btn.getAttribute('data-name');
    cart.count += 1;
    cart.sum += price;
    badge.hidden = false;
    badge.textContent = cart.count;
    cartLink.setAttribute('aria-label', 'Košík, ' + cart.count + ' ' + plural(cart.count, ['produkt', 'produkty', 'produktov']));
    $('[data-added-img]', added).src = btn.getAttribute('data-img');
    $('[data-added-name]', added).textContent = name;
    $('[data-added-qty]', added).textContent = '1 ks';
    $('[data-added-price]', added).textContent = eur.format(price);
    $('[data-added-sum]', added).textContent = eur.format(cart.sum);
    added.hidden = false;
    status.textContent = name + ' – pridané do košíka. Medzisúčet ' + eur.format(cart.sum) + '.';
  }
  $$('[data-add]').forEach(function (b) { b.addEventListener('click', function () { addToCart(b); }); });
  $$('[data-added-close]', added).forEach(function (b) { b.addEventListener('click', closeAdded); });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (openLayer) openLayer(false);
    else if (!added.hidden) closeAdded();
  });

  /* úvodný slider – taby s produktmi, automatické prepínanie s pauzou (WCAG 2.2.2) */
  var hs = $('[data-hs]');
  if (hs) {
    var hsSlides = $$('[data-hs-slide]', hs);
    var hsTabs = $$('[data-hs-tab]', hs);
    var hsToggle = $('[data-hs-toggle]', hs);
    var hsLive = $('[data-hs-slides]', hs);
    var hsCur = 0;
    var hsGo = function (i, focusTab) {
      hsCur = (i + hsSlides.length) % hsSlides.length;
      hsSlides.forEach(function (s, k) { s.classList.toggle('is-active', k === hsCur); });
      hsTabs.forEach(function (t, k) {
        t.setAttribute('aria-selected', String(k === hsCur));
        t.tabIndex = k === hsCur ? 0 : -1;
      });
      if (focusTab) hsTabs[hsCur].focus();
    };
    var hsPlay = function (on) {
      hs.classList.remove('is-playing');
      if (on) { void hs.offsetWidth; hs.classList.add('is-playing'); }
      hs.classList.toggle('is-stopped', !on);
      hsLive.setAttribute('aria-live', on ? 'off' : 'polite');
      hsToggle.setAttribute('aria-label', on ? 'Pozastaviť prepínanie' : 'Spustiť prepínanie');
    };
    hsTabs.forEach(function (t, k) {
      t.addEventListener('click', function () { hsPlay(false); hsGo(k); });
      t.addEventListener('keydown', function (e) {
        var to = { ArrowRight: hsCur + 1, ArrowLeft: hsCur - 1, Home: 0, End: hsSlides.length - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault(); hsPlay(false); hsGo(to, true);
      });
      $('.p', t).addEventListener('animationend', function () {
        if (k === hsCur && hs.classList.contains('is-playing')) hsGo(hsCur + 1);
      });
    });
    hsToggle.addEventListener('click', function () { hsPlay(!hs.classList.contains('is-playing')); });
    hs.addEventListener('mouseenter', function () { hs.classList.add('is-hold'); });
    hs.addEventListener('mouseleave', function () { hs.classList.remove('is-hold'); });
    hs.addEventListener('focusin', function (e) { if (e.target !== hsToggle) hsPlay(false); });
    var hx = null, hy = null;
    hsLive.addEventListener('touchstart', function (e) { hx = e.touches[0].clientX; hy = e.touches[0].clientY; }, { passive: true });
    hsLive.addEventListener('touchend', function (e) {
      if (hx === null) return;
      var dx = e.changedTouches[0].clientX - hx, dy = e.changedTouches[0].clientY - hy; hx = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      hsPlay(false); hsGo(hsCur + (dx < 0 ? 1 : -1));
    });
    hsPlay(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* čipy – filtrujú ten istý zoznam produktov (UX pravidlá §1); odkazy v navigácii nastavia čip */
  var chips = $$('[data-chip]');
  var cards = $$('.shelf .pcard');
  var chipStatus = $('[data-chip-status]');
  function filter(cat) {
    var shown = 0;
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-chip') === cat)); });
    cards.forEach(function (card) {
      var ok = cat === 'all' || card.getAttribute('data-cat') === cat;
      card.hidden = !ok;
      if (ok) shown++;
    });
    chipStatus.textContent = plural(shown, ['Zobrazený', 'Zobrazené', 'Zobrazených']) + ' ' + shown + ' ' + plural(shown, ['produkt', 'produkty', 'produktov']) + '.';
  }
  chips.forEach(function (c) { c.addEventListener('click', function () { filter(c.getAttribute('data-chip')); }); });
  $$('[data-goto]').forEach(function (a) { a.addEventListener('click', function () { filter(a.getAttribute('data-goto')); }); });
})();
