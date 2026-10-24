/* Shree Sai Reiki: centre switch, cart, shop, booking wizard, seminar, checkout, motion */
(function () {
  'use strict';
  var S = window.SSR || {}, DOC = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var inr = function (n) { return '₹' + Number(n).toLocaleString('en-IN'); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var fmtDob = function (d) { if (!d) return ''; var p = d.split('-'); return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : d; };
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
  var CITY = DOC.getAttribute('data-city') || 'surat';
  var C = (S.cities || {})[CITY] || { label: 'Surat', wa: '919726581787', prefix: '' };
  var cityUrl = function (city, p) { var pre = (S.cities[city] || {}).prefix || ''; return (pre + (p === '/' ? (pre ? '' : '/') : p)) || '/'; };
  var waLink = function (num, text) { return 'https://wa.me/' + num + '?text=' + encodeURIComponent(text); };
  var greet = function (city) { return 'Hello Shree Sai Reiki ' + S.cities[city].label + ' 🙏'; };
  var tag = function (city, what) { return '\n\n[' + what + ' · ' + S.cities[city].label + ' · reikisurat.in]'; };
  var openWA = function (url) { var w = window.open(url, '_blank', 'noopener'); if (!w) location.href = url; };

  /* ---------- shared pages (blog, policies): follow the chosen centre ---------- */
  if (DOC.hasAttribute('data-shared') && CITY === 'bangalore') {
    var B = S.cities.bangalore, SU = S.cities.surat;
    var scoped = /^\/(healing|courses|shop|bracelets|book|about|contact|checkout)(\/|\?|#|$)|^\/(\?|#|$)/;
    $$('a[href^="/"]').forEach(function (a) { var h = a.getAttribute('href'); if (scoped.test(h)) a.setAttribute('href', '/bangalore' + (h === '/' ? '' : h)); });
    $$('a[href^="https://wa.me/' + SU.wa + '"]').forEach(function (a) {
      var t = decodeURIComponent((a.getAttribute('href').split('?text=')[1] || '')).split('Reiki Surat').join('Reiki ' + B.label).split('· Surat ·').join('· ' + B.label + ' ·');
      a.setAttribute('href', waLink(B.wa, t));
    });
    $$('[data-pp]').forEach(function (el) { var p = S.products[el.dataset.pp]; if (p) el.textContent = inr(p.p.bangalore); });
    $$('.city-btn span').forEach(function (s) { s.innerHTML = '<small>Centre</small>' + B.label; });
    $$('.city-menu a').forEach(function (a) { var on = a.dataset.setCity === 'bangalore'; a.toggleAttribute('aria-current', on); });
    $$('.drawer-city').forEach(function (p) { p.lastChild.textContent = ' ' + B.label + ' prices'; });
    C = B;
  }

  /* ---------- centre switch + first-visit picker ---------- */
  var cbtn = $('[data-city-btn]'), cmenu = $('#citymenu');
  function setCM(open) { if (!cbtn) return; cbtn.setAttribute('aria-expanded', open); cmenu.hidden = !open; }
  if (cbtn) cbtn.addEventListener('click', function (e) { e.stopPropagation(); setCM(cmenu.hidden); });
  document.addEventListener('click', function (e) { if (cmenu && !cmenu.hidden && !e.target.closest('.city')) setCM(false); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-set-city]'); if (!a) return;
    store.set('ssr-city', a.dataset.setCity); store.set('ssr-city-pick', a.dataset.setCity);
    if (DOC.hasAttribute('data-shared') && a.getAttribute('href') === location.pathname) { e.preventDefault(); location.reload(); }
  });
  var picker = $('[data-picker]');
  function showPicker() { if (!picker) return; picker.hidden = false; document.body.style.overflow = 'hidden'; setTimeout(function () { var b = $('[data-pick]', picker); b && b.focus(); }, 60); }
  function hidePicker() { picker.hidden = true; document.body.style.overflow = ''; }
  if (picker) {
    $$('[data-pick]', picker).forEach(function (b) {
      b.addEventListener('click', function () {
        var c = b.dataset.pick; store.set('ssr-city', c); store.set('ssr-city-pick', c);
        if (c === CITY) { hidePicker(); return; }
        location.href = DOC.hasAttribute('data-shared') ? location.href : cityUrl(c, '/');
      });
    });
    picker.addEventListener('click', function (e) { if (e.target === picker) { store.set('ssr-city-pick', CITY); hidePicker(); } });
    if (DOC.hasAttribute('data-root') && !store.get('ssr-city-pick') && !/[?&]city=/.test(location.search)) setTimeout(showPicker, 700);
  }
  $$('[data-city-open]').forEach(function (b) { b.addEventListener('click', function () { setMenu(false); showPicker(); }); });

  /* ---------- mobile menu ---------- */
  var menuBtn = $('.menu-btn'), mnav = $('#mnav');
  function setMenu(open) {
    if (!menuBtn) return;
    menuBtn.setAttribute('aria-expanded', open); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mnav.hidden = !open;
    if (open) { var h = $('.hdr'); mnav.style.paddingTop = (h.getBoundingClientRect().bottom + 12) + 'px'; }
    document.body.classList.toggle('menu-open', open);
  }
  if (menuBtn) menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });

  /* ---------- toast ---------- */
  var toastEl = $('.toast'), toastT;
  function toast(msg, cart) {
    if (!toastEl) return;
    toastEl.innerHTML = '<span>' + esc(msg) + '</span>' + (cart ? '<button type="button" data-cart-open>View cart</button>' : '');
    toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { toastEl.hidden = true; }, 3500);
  }

  /* ---------- cart (separate per centre, because prices differ) ---------- */
  var KEY = 'ssr-cart-' + CITY;
  var price = function (slug) { return S.products[slug].p[CITY]; };
  function load() { try { var c = JSON.parse(store.get(KEY) || '[]'); return Array.isArray(c) ? c.filter(function (i) { return S.products[i.slug] && i.qty > 0; }) : []; } catch (e) { return []; } }
  var cart = load();
  function save() { store.set(KEY, JSON.stringify(cart)); render(); }
  function keyOf(slug, o) { return slug + (o ? '|' + o.name + '|' + o.dob : ''); }
  function add(slug, qty, o) {
    var k = keyOf(slug, o), f = cart.filter(function (i) { return i.k === k; })[0];
    if (f) f.qty = Math.min(10, f.qty + qty); else cart.push({ k: k, slug: slug, qty: qty, opts: o || null });
    save();
  }
  var count = function () { return cart.reduce(function (a, i) { return a + i.qty; }, 0); };
  var subtotal = function () { return cart.reduce(function (a, i) { return a + price(i.slug) * i.qty; }, 0); };
  var optsText = function (o) { return o ? 'For: ' + o.name + ', DOB ' + fmtDob(o.dob) : ''; };
  function itemHTML(i) {
    var p = S.products[i.slug];
    return '<div class="citem"><img src="/assets/img/products/' + p.i + '-480.webp" alt="" loading="lazy"><div>' +
      '<a class="citem-t" href="' + cityUrl(CITY, '/shop/' + i.slug) + '">' + esc(p.n) + '</a>' + (i.opts ? '<p class="citem-o">' + esc(optsText(i.opts)) + '</p>' : '') +
      '<div class="citem-r"><div class="qty" role="group" aria-label="Quantity"><button type="button" data-cq="-1" data-k="' + esc(i.k) + '" aria-label="Decrease">−</button><span>' + i.qty + '</span><button type="button" data-cq="1" data-k="' + esc(i.k) + '" aria-label="Increase">+</button></div>' +
      '<b>' + inr(price(i.slug) * i.qty) + '</b></div><button type="button" class="crm" data-crm="' + esc(i.k) + '">Remove</button></div></div>';
  }
  var drawer = $('#cart'), bg = $('.drawer-bg'), lastFocus = null, lastCount = Infinity;
  function render() {
    var n = count();
    $$('[data-cart-count]').forEach(function (el) { el.textContent = n; el.hidden = n === 0; });
    if (n > lastCount) $$('[data-cart-count]').forEach(function (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); });
    lastCount = n;
    var box = $('[data-cart-items]');
    if (box) {
      box.innerHTML = cart.length ? cart.map(itemHTML).join('') : '<div class="cempty"><p>Your cart is empty.</p><a class="btn btn-pri" href="' + cityUrl(CITY, '/shop') + '">Browse crystals</a></div>';
      $('[data-cart-foot]').hidden = !cart.length;
      $('[data-cart-subtotal]').textContent = inr(subtotal());
    }
    renderCheckout();
  }
  function openCart() {
    lastFocus = document.activeElement; setMenu(false);
    drawer.classList.add('open'); drawer.removeAttribute('inert'); drawer.setAttribute('aria-hidden', 'false'); bg.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(function () { var b = $('.drawer-hd button', drawer); b && b.focus(); }, 50);
  }
  function closeCart() {
    drawer.classList.remove('open'); drawer.setAttribute('inert', ''); drawer.setAttribute('aria-hidden', 'true'); bg.hidden = true;
    document.body.style.overflow = ''; if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (drawer && drawer.classList.contains('open')) closeCart(); setMenu(false); setCM(false); } });
  function pulse(btn) { var old = btn.innerHTML; btn.disabled = true; btn.textContent = 'Added ✓'; setTimeout(function () { btn.innerHTML = old; btn.disabled = false; }, 1200); }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('button, a'); if (!t) return;
    if (t.hasAttribute('data-cart-open')) { e.preventDefault(); toastEl && (toastEl.hidden = true); openCart(); return; }
    if (t.hasAttribute('data-cart-close')) { closeCart(); return; }
    if (t.dataset.add) { add(t.dataset.add, 1); toast(S.products[t.dataset.add].n + ' added to cart', true); pulse(t); return; }
    if (t.dataset.addQty || t.dataset.buyNow) {
      var slug = t.dataset.addQty || t.dataset.buyNow, q = $('[data-qty]'), qty = Math.max(1, Math.min(10, parseInt(q && q.value, 10) || 1));
      add(slug, qty);
      if (t.dataset.buyNow) { location.href = cityUrl(CITY, '/checkout'); return; }
      toast(S.products[slug].n + ' added to cart', true); pulse(t); return;
    }
    if (t.dataset.q) { var inp = $('[data-qty]'); inp.value = Math.max(1, Math.min(10, (parseInt(inp.value, 10) || 1) + parseInt(t.dataset.q, 10))); return; }
    if (t.dataset.cq) {
      var it = cart.filter(function (i) { return i.k === t.dataset.k; })[0];
      if (it) { it.qty += parseInt(t.dataset.cq, 10); if (it.qty < 1) cart.splice(cart.indexOf(it), 1); else if (it.qty > 10) it.qty = 10; save(); }
      return;
    }
    if (t.dataset.crm) { cart = cart.filter(function (i) { return i.k !== t.dataset.crm; }); save(); return; }
    if (t.hasAttribute('data-scroll-form')) { e.preventDefault(); var f = $('.pinfo .pform'); if (f) { f.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(function () { f.querySelector('input').focus(); }, 400); } }
  });

  $$('[data-personal-form]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = f.name.value.trim(), dob = f.dob.value;
      if (!name || !dob) { f.reportValidity(); return; }
      add(f.dataset.personalForm, 1, { name: name, dob: dob });
      if (((e.submitter && e.submitter.value) || 'cart') === 'buy') { location.href = cityUrl(CITY, '/checkout'); return; }
      toast(S.products[f.dataset.personalForm].n + ' added to cart', true);
    });
  });
  $$('.pg-thumbs button').forEach(function (b) {
    b.addEventListener('click', function () {
      $('.pg-main img').src = b.dataset.src;
      $$('.pg-thumbs button').forEach(function (x) { x.removeAttribute('aria-current'); }); b.setAttribute('aria-current', 'true');
    });
  });
  var sbuy = $('[data-sbuy]'), buyArea = $('.buy, .pinfo .pform');
  if (sbuy && buyArea && 'IntersectionObserver' in window) new IntersectionObserver(function (en) { sbuy.classList.toggle('show', !en[0].isIntersecting && en[0].boundingClientRect.top < 0); }).observe(buyArea);

  /* ---------- shop filters ---------- */
  var grid = $('[data-grid]');
  if (grid) {
    var st = { need: 'all', cat: 'all', sort: 'pop' }, params = new URLSearchParams(location.search);
    if (params.get('need') && $('[data-need="' + params.get('need') + '"]')) st.need = params.get('need');
    if (params.get('cat') && $('.tab[data-cat="' + params.get('cat') + '"]')) st.cat = params.get('cat');
    var cards = $$('.pcard', grid);
    var apply = function () {
      var shown = 0;
      cards.forEach(function (c) { var ok = (st.need === 'all' || c.dataset.intents.split(' ').indexOf(st.need) > -1) && (st.cat === 'all' || c.dataset.cat === st.cat); c.hidden = !ok; if (ok) shown++; });
      cards.slice().sort(function (a, b) { return st.sort === 'low' ? a.dataset.price - b.dataset.price : st.sort === 'high' ? b.dataset.price - a.dataset.price : a.dataset.i - b.dataset.i; }).forEach(function (c) { grid.appendChild(c); });
      $('[data-shop-count]').textContent = shown; $('[data-empty]').hidden = shown > 0;
      $$('[data-need]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.need === st.need); });
      $$('.tab[data-cat]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.cat === st.cat); });
      var q = new URLSearchParams(); if (st.need !== 'all') q.set('need', st.need); if (st.cat !== 'all') q.set('cat', st.cat);
      history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : ''));
    };
    $$('[data-need]').forEach(function (b) { b.addEventListener('click', function () { st.need = b.dataset.need; apply(); }); });
    $$('.tab[data-cat]').forEach(function (b) { b.addEventListener('click', function () { st.cat = b.dataset.cat; apply(); }); });
    $('[data-sort]').addEventListener('change', function (e) { st.sort = e.target.value; apply(); });
    $('[data-reset]').addEventListener('click', function () { st.need = 'all'; st.cat = 'all'; apply(); });
    apply();
    if (st.need !== 'all') { var nb = $('[data-need="' + st.need + '"]'); nb && nb.scrollIntoView({ block: 'nearest', inline: 'center' }); }
  }
  var btabs = $$('[data-bcat]');
  btabs.forEach(function (b) { b.addEventListener('click', function () { var v = b.dataset.bcat; btabs.forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); $$('[data-bgrid] .bcard').forEach(function (it) { it.hidden = v !== 'all' && it.dataset.c !== v; }); }); });

  /* ---------- bracelet quiz ---------- */
  var quiz = $('[data-quiz]');
  if (quiz) quiz.addEventListener('change', function () {
    var q1 = (quiz.querySelector('[name=q1]:checked') || {}).value, q2 = (quiz.querySelector('[name=q2]:checked') || {}).value;
    if (!q1 || !q2) return;
    var pick = q2 === 'goal' ? ['customized', 'Customized Bracelet', 'We choose stones for the problems you want help with. Birth time is not needed.']
      : q1 === 'yes' ? ['birth-chart', 'Birth Chart Bracelet', 'You know your birth time, so we can read your kundli and choose stones for your planets.']
        : ['numerology', 'Numerology Bracelet', 'Without a birth time, your name and date of birth are the best guide. Fixed price, order online.'];
    var out = $('[data-quiz-out]');
    out.innerHTML = '<p>We suggest the <b>' + pick[1] + '</b></p><p>' + pick[2] + '</p><a class="btn btn-pri" href="#' + pick[0] + '">Go to ' + pick[1] + '</a>';
    out.hidden = false;
  });

  /* ---------- WhatsApp forms ---------- */
  function toastPlain(m) { toast(m, false); }
  $$('[data-wa-form]').forEach(function (f) {
    var type = f.dataset.waForm;
    if (type === 'custom') f.addEventListener('change', function (e) { if (e.target.name === 'goal' && $$('[name=goal]:checked', f).length > 3) { e.target.checked = false; toastPlain('Please pick up to 3'); } });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!f.checkValidity()) { f.reportValidity(); return; }
      var v = function (n) { return f[n] ? f[n].value.trim() : ''; }, m;
      if (type === 'birth') m = greet(CITY) + '\nI would like a *Birth Chart Bracelet* made for me.\n\n*Name:* ' + v('name') + '\n*Date of birth:* ' + fmtDob(v('dob')) + '\n*Time of birth:* ' + v('time') + '\n*Place of birth:* ' + v('place') + '\n\nPlease tell me the stones and the price.' + tag(CITY, 'Birth chart bracelet');
      else if (type === 'custom') {
        var goals = $$('[name=goal]:checked', f).map(function (x) { return x.value; });
        if (!goals.length) { toastPlain('Please pick at least one'); return; }
        m = greet(CITY) + '\nI would like a *Customized Crystal Bracelet*.\n\n*Name:* ' + v('name') + '\n*Help with:* ' + goals.join(', ') + (v('dob') ? '\n*Date of birth:* ' + fmtDob(v('dob')) : '') + (v('time') ? '\n*Time of birth:* ' + v('time') : '') + (v('note') ? '\n*Note:* ' + v('note') : '') + '\n\nPlease tell me the stones and the price.' + tag(CITY, 'Customized bracelet');
      } else m = greet(CITY) + '\nMy name is ' + v('name') + '.\n*Topic:* ' + v('topic') + '\n\n' + v('note') + tag(CITY, 'Contact form');
      openWA(waLink(C.wa, m));
    });
  });

  /* ---------- payments (shared by shop, booking and seminar) ---------- */
  function loadRzp() {
    return new Promise(function (res, rej) { if (window.Razorpay) return res(); var s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  // create the order on our server (it decides the amount), open Razorpay, then verify the signature on our server
  async function pay(payload, opts) {
    var res, data = {};
    try {
      res = await fetch('/api/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      data = await res.json().catch(function () { return {}; });
    } catch (err) { res = null; }
    if (!res || !res.ok || !data.orderId) {
      var off = !res || res.status === 404 || res.status === 501 || data.error === 'not_configured';
      throw { offline: off, message: off ? 'Online payment is not available right now.' : (data.message || 'We could not start the payment. Please try again.') };
    }
    try { await loadRzp(); } catch (err) { throw { offline: true, message: 'The payment window could not load. Check your internet connection and try again.' }; }
    return new Promise(function (resolve, reject) {
      var rzp = new window.Razorpay({
        key: data.keyId, amount: data.amount, currency: 'INR', order_id: data.orderId,
        name: 'Shree Sai Reiki ' + S.cities[payload.city].label, description: opts.description,
        image: location.origin + '/assets/img/logo-badge.png',
        prefill: opts.prefill, notes: { ref: data.ref || '' }, theme: { color: '#C2570F' },
        handler: async function (r) {
          try {
            var v = await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) });
            var vd = await v.json();
            if (v.ok && vd.ok) resolve({ paymentId: r.razorpay_payment_id, orderId: r.razorpay_order_id, amount: (vd.amount || data.amount) / 100 });
            else reject({ message: 'We could not confirm this payment. If money was deducted, WhatsApp us with this reference: ' + r.razorpay_payment_id });
          } catch (err) { reject({ message: 'Payment done but confirmation failed. Please WhatsApp us with this reference: ' + r.razorpay_payment_id }); }
        },
        modal: { ondismiss: function () { reject({ dismissed: true }); } }
      });
      rzp.on('payment.failed', function (r) { reject({ message: 'Payment did not go through' + (r && r.error && r.error.description ? ': ' + r.error.description : '') + '. If any money was deducted, your bank returns it automatically.' }); });
      rzp.open();
    });
  }

  /* ---------- checkout ---------- */
  var co = $('[data-checkout]'), coForm = $('[data-co-form]'), paying = false, done = false;
  var total = function () { return subtotal() + (cart.length ? (S.shipping || 0) : 0); };
  function renderCheckout() {
    if (!co || done) return;
    $('[data-co-main]').hidden = !cart.length; $('[data-co-empty]').hidden = !!cart.length;
    $('[data-co-items]').innerHTML = cart.map(itemHTML).join('');
    $('[data-co-sub]').textContent = inr(subtotal()); $('[data-co-total]').textContent = inr(total()); $('[data-co-total2]').textContent = inr(total());
  }
  function orderText(c, ref) {
    var lines = cart.map(function (i) { var p = S.products[i.slug]; return '• ' + p.n + (i.opts ? ' (' + optsText(i.opts) + ')' : '') + ' × ' + i.qty + ' = ' + inr(price(i.slug) * i.qty); });
    return greet(CITY) + '\n' + (ref ? 'I have placed and paid for an order on your website.\n*Payment ref:* ' + ref : 'I would like to place this order. Please send me a payment link.') +
      '\n\n*Items:*\n' + lines.join('\n') + '\n*Total:* ' + inr(total()) +
      (c ? '\n\n*Name:* ' + c.name + '\n*Phone:* ' + c.phone + (c.email ? '\n*Email:* ' + c.email : '') + '\n*Address:* ' + c.address + ', ' + c.city + ', ' + c.state + ' - ' + c.pincode + (c.note ? '\n*Note:* ' + c.note : '') : '') + tag(CITY, 'Shop order');
  }
  function fieldErr(f, checks, msgs, errEl) {
    var bad = null;
    $$('input,select,textarea', f).forEach(function (el) { el.removeAttribute('aria-invalid'); });
    checks.forEach(function (ch) { if (!ch[1]) { var el = f.querySelector('[name="' + ch[0] + '"]'); el && el.setAttribute('aria-invalid', 'true'); if (!bad) bad = ch[0]; } });
    errEl.hidden = !bad; if (bad) { errEl.textContent = msgs[bad]; var el = f.querySelector('[name="' + bad + '"]'); el && el.focus(); }
    return !bad;
  }
  var phoneOk = function (p) { return /^[6-9]\d{9}$/.test(p); }, emailOk = function (m) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m); };
  var cleanPhone = function (p) { return String(p || '').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, ''); };
  function readCustomer(strict) {
    var f = coForm, c = {};
    ['name', 'phone', 'email', 'address', 'city', 'state', 'pincode', 'note'].forEach(function (n) { c[n] = f[n].value.trim(); });
    c.phone = cleanPhone(c.phone);
    if (!strict) return c;
    var ok = fieldErr(f, [['name', c.name.length >= 2], ['phone', phoneOk(c.phone)], ['email', emailOk(c.email)], ['address', c.address.length >= 5], ['city', c.city.length >= 2], ['pincode', /^[1-9]\d{5}$/.test(c.pincode)]],
      { name: 'Please enter your full name.', phone: 'Please enter a valid 10-digit mobile number.', email: 'Please enter a valid email address.', address: 'Please enter your delivery address.', city: 'Please enter your city.', pincode: 'Please enter a valid 6-digit PIN code.' }, $('[data-co-err]'));
    return ok ? c : null;
  }
  function coErr(html) { var el = $('[data-co-err]'); el.innerHTML = html; el.hidden = !html; if (html) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  if (co) {
    var payBtn = $('[data-pay]'), payLabel = payBtn.innerHTML;
    var setPaying = function (on) { paying = on; payBtn.disabled = on; payBtn.innerHTML = on ? 'Opening secure payment…' : payLabel; if (!on) renderCheckout(); };
    co.addEventListener('click', function (e) { if (e.target.closest('[data-wa-order]')) { var c = readCustomer(false); openWA(waLink(C.wa, orderText(c.name ? c : null))); } });
    coForm.addEventListener('submit', async function (e) {
      e.preventDefault(); if (paying || !cart.length) return;
      var c = readCustomer(true); if (!c) return;
      setPaying(true);
      try {
        var r = await pay({ type: 'shop', city: CITY, items: cart.map(function (i) { return { slug: i.slug, qty: i.qty, opts: i.opts }; }), customer: c },
          { description: count() + ' item(s) from the crystal shop', prefill: { name: c.name, email: c.email, contact: '+91' + c.phone } });
        done = true;
        $('[data-co-wa]').href = waLink(C.wa, orderText(c, r.paymentId));
        $('[data-co-main]').hidden = true; $('[data-co-done]').hidden = false; $('[data-co-ref]').textContent = r.paymentId;
        cart = []; save(); scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        setPaying(false);
        if (err && err.dismissed) return;
        coErr(esc(err.message || 'Something went wrong.') + (err.offline ? ' <button type="button" class="linkbtn" data-wa-order>Send this order on WhatsApp</button> and we will share a payment link.' : ''));
      }
    });
  }

  /* ---------- booking wizard (follows the roadmap) ---------- */
  var bk = $('[data-book]');
  if (bk) (function () {
    var state = { city: bk.dataset.home, mode: null, service: null, date: null, time: null, you: null };
    var hist = [], cur = 'start', booted = false;
    var ORDER = ['loc', 'mode', 'svc', 'slot', 'you', 'pay'];
    var prog = $('[data-bk-prog]', bk);
    var q = new URLSearchParams(location.search);
    function show(step, push) {
      if (push !== false && cur !== step) hist.push(cur);
      cur = step;
      $$('.bk-step', bk).forEach(function (s) { s.hidden = s.dataset.step !== step; });
      var idx = ORDER.indexOf(step);
      prog.hidden = idx < 0;
      $$('li', prog).forEach(function (li, i) { li.classList.toggle('on', i === idx); li.classList.toggle('done', i < idx); });
      if (step === 'mode') prepMode(); if (step === 'svc') prepSvc(); if (step === 'slot') prepSlot(); if (step === 'pay') prepPay();
      if (!booted) return;
      var top = bk.getBoundingClientRect().top + scrollY - 90;
      if (Math.abs(scrollY - top) > 40) scrollTo({ top: top, behavior: 'smooth' });
      var h = $('[data-step="' + step + '"] h2', bk); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
    function svc() { return S.services[state.service]; }
    function cityL() { return S.cities[state.city].label; }
    function next(from) {
      if (from === 'loc') return 'mode';
      if (from === 'mode') return state.service && svc().modes.indexOf(state.mode) > -1 ? 'slot' : 'svc';
      if (from === 'svc') return 'slot';
    }
    $$('[data-back]', bk).forEach(function (b) { b.addEventListener('click', function () { show(hist.pop() || 'start', false); }); });
    $$('[data-go]', bk).forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.go); }); });
    $$('[data-set]', bk).forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.disabled) return;
        var k = b.dataset.set; state[k] = b.dataset.val;
        if (k !== 'service' && k !== 'mode') { state.date = state.time = null; }
        if (k === 'mode' || k === 'city') { state.date = state.time = null; }
        $$('[data-set="' + k + '"]', bk).forEach(function (x) { x.classList.toggle('sel', x === b); });
        show(next(k === 'city' ? 'loc' : k === 'mode' ? 'mode' : 'svc'));
      });
    });
    function prepMode() {
      $$('[data-set="mode"]', bk).forEach(function (b) {
        var ok = !state.service || svc().modes.indexOf(b.dataset.val) > -1;
        b.disabled = !ok; b.classList.toggle('off', !ok);
        var sm = $('small', b); if (!ok) sm.textContent = 'Not available for ' + svc().n;
      });
    }
    function prepSvc() {
      $$('.opt-svc', bk).forEach(function (b) {
        var s = S.services[b.dataset.val], ok = s.modes.indexOf(state.mode) > -1;
        b.hidden = !ok; $('[data-price-of]', b).textContent = inr(s.p[state.city]);
      });
    }
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var ymd = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    var t12 = function (t) { var h = +t.slice(0, 2), m = t.slice(3); return (h % 12 || 12) + ':' + m + ' ' + (h < 12 ? 'AM' : 'PM'); };
    var dLabel = function (s) { var d = new Date(s + 'T00:00:00'); return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); };
    function slotsFor(dateStr) {
      var cfg = S.booking[state.city][state.mode], now = new Date(), min = new Date(now.getTime() + (S.booking.minHoursNotice || 0) * 3600e3);
      return cfg.times.filter(function (t) { return new Date(dateStr + 'T' + t + ':00') > min; });
    }
    function prepSlot() {
      var cfg = S.booking[state.city][state.mode], closed = S.booking[state.city].closed || [], out = [], d = new Date();
      for (var i = 0; i <= (S.booking.daysAhead || 21); i++) {
        var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i), s = ymd(x);
        var open = cfg.dates && cfg.dates.length ? cfg.dates.indexOf(s) > -1 : cfg.days.indexOf(x.getDay()) > -1;
        if (open && closed.indexOf(s) < 0 && slotsFor(s).length) out.push(s);
      }
      $('[data-slot-note]', bk).textContent = state.mode === 'online' ? 'Online slots are open every day. Times are in IST.' : 'In-person dates at ' + cityL() + ' are limited. We confirm your slot' + (S.cities[state.city].address ? '' : ' and share the location') + ' on WhatsApp.';
      var box = $('[data-dates]', bk);
      box.innerHTML = out.length ? out.map(function (s) { var x = new Date(s + 'T00:00:00'); return '<button type="button" role="radio" aria-checked="' + (s === state.date) + '" data-date="' + s + '"><small>' + x.toLocaleDateString('en-IN', { weekday: 'short' }) + '</small><b>' + x.getDate() + '</b><small>' + x.toLocaleDateString('en-IN', { month: 'short' }) + '</small></button>'; }).join('')
        : '<p class="small">No dates are open right now. Please WhatsApp us and we will find a time.</p>';
      if (!state.date && out.length) state.date = out[0];
      drawTimes();
    }
    function drawTimes() {
      $$('[data-date]', bk).forEach(function (b) { b.setAttribute('aria-checked', b.dataset.date === state.date); });
      var box = $('[data-times]', bk);
      box.innerHTML = state.date ? slotsFor(state.date).map(function (t) { return '<button type="button" role="radio" aria-checked="' + (t === state.time) + '" data-time="' + t + '">' + t12(t) + '</button>'; }).join('') : '';
      $('[data-slot-next]', bk).disabled = !(state.date && state.time && slotsFor(state.date).indexOf(state.time) > -1);
    }
    bk.addEventListener('click', function (e) {
      var d = e.target.closest('[data-date]'), t = e.target.closest('[data-time]');
      if (d) { state.date = d.dataset.date; state.time = null; drawTimes(); var dt = $('[data-times]', bk); dt.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      if (t) { state.time = t.dataset.time; drawTimes(); }
    });
    $('[data-slot-next]', bk).addEventListener('click', function () { show('you'); });
    var yf = $('[data-you-form]', bk);
    yf.addEventListener('submit', function (e) {
      e.preventDefault();
      var g = (yf.querySelector('[name=gender]:checked') || {}).value || '';
      var y = { name: yf.name.value.trim(), phone: cleanPhone(yf.phone.value), email: yf.email.value.trim(), dob: yf.dob.value, gender: g, note: yf.note.value.trim() };
      var ok = fieldErr(yf, [['name', y.name.length >= 2], ['phone', phoneOk(y.phone)], ['email', emailOk(y.email)], ['dob', /^\d{4}-\d{2}-\d{2}$/.test(y.dob) && y.dob < ymd(new Date())], ['gender', !!g]],
        { name: 'Please enter your full name.', phone: 'Please enter a valid 10-digit mobile number.', email: 'Please enter a valid email address.', dob: 'Please enter your date of birth.', gender: 'Please select your gender.' }, $('[data-you-err]', bk));
      if (!ok) return;
      state.you = y; show('pay');
    });
    function sumRows() {
      var s = svc();
      return [['Centre', cityL()], ['Mode', state.mode === 'online' ? 'Online (Zoom)' : 'In person'], ['Healing', s.n + ' · ' + s.mins + ' min'], ['Date & time', dLabel(state.date) + ', ' + t12(state.time)],
        ['Name', state.you.name], ['Mobile', '+91 ' + state.you.phone], ['Email', state.you.email], ['Amount', inr(s.p[state.city])]];
    }
    var dl = function (rows) { return rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join(''); };
    function prepPay() { $('[data-bk-sum]', bk).innerHTML = dl(sumRows()); $('[data-bk-amt]', bk).textContent = inr(svc().p[state.city]); $('[data-pay-err]', bk).hidden = true; }
    function bookingText(ref, amount) {
      var s = svc(), y = state.you;
      return greet(state.city) + '\n' + (ref ? 'I have booked and paid for a session on your website.' : 'I would like to book this session. Please confirm the slot and share a payment link.') +
        '\n\n*Healing:* ' + s.n + ' (' + s.mins + ' min)\n*Mode:* ' + (state.mode === 'online' ? 'Online (Zoom)' : 'In person') + '\n*Date:* ' + dLabel(state.date) + ', ' + t12(state.time) +
        '\n*Amount:* ' + inr(amount || s.p[state.city]) + (ref ? ' (paid)\n*Payment ref:* ' + ref : '') +
        '\n\n*Name:* ' + y.name + '\n*Mobile:* ' + y.phone + '\n*Email:* ' + y.email + '\n*DOB:* ' + fmtDob(y.dob) + ' · *Gender:* ' + y.gender + (y.note ? '\n*Note:* ' + y.note : '') + tag(state.city, 'Session booking');
    }
    var payB = $('[data-bk-pay]', bk), payL = payB.innerHTML, busy = false;
    payB.addEventListener('click', async function () {
      if (busy) return; busy = true; payB.disabled = true; payB.textContent = 'Opening secure payment…';
      var err = $('[data-pay-err]', bk); err.hidden = true;
      try {
        var r = await pay({ type: 'booking', city: state.city, service: state.service, mode: state.mode, date: state.date, time: state.time, customer: state.you },
          { description: svc().n + ' · ' + dLabel(state.date) + ' ' + t12(state.time), prefill: { name: state.you.name, email: state.you.email, contact: '+91' + state.you.phone } });
        finishBooking(r);
      } catch (x) {
        if (!(x && x.dismissed)) {
          err.innerHTML = esc(x.message || 'Something went wrong.') + (x.offline ? ' <a class="linkbtn" target="_blank" rel="noopener" href="' + esc(waLink(S.cities[state.city].wa, bookingText())) + '">Send this booking on WhatsApp</a> and we will confirm it with a payment link.' : '');
          err.hidden = false;
        }
      }
      busy = false; payB.disabled = false; payB.innerHTML = payL;
    });
    function calTimes() {
      var st = new Date(state.date + 'T' + state.time + ':00+05:30'), en = new Date(st.getTime() + svc().mins * 60e3);
      var f = function (d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
      return [f(st), f(en)];
    }
    function finishBooking(r) {
      var s = svc(), online = state.mode === 'online', cc = S.cities[state.city];
      $('[data-done-t]', bk).textContent = 'Booking confirmed';
      $('[data-done-p]', bk).innerHTML = 'Payment received. Booking reference <b>' + esc(r.paymentId) + '</b>.';
      $('[data-done-sum]', bk).innerHTML = dl(sumRows().slice(0, 4).concat([['Paid', inr(r.amount)]]));
      $('[data-done-next]', bk).innerHTML = '<ul class="ticks"><li>Your payment receipt arrives by SMS and email from Razorpay.</li>' +
        (online ? '<li>Your Zoom link is sent on WhatsApp and SMS before the session.</li>' : '<li>' + (cc.address ? 'Address: ' + esc(cc.address) + '.' : 'We share the location privately on WhatsApp before your session.') + '</li>') +
        '<li>Tap the green button so the centre gets your details instantly.</li></ul>';
      $('[data-done-wa]', bk).href = waLink(cc.wa, bookingText(r.paymentId, r.amount));
      var ct = calTimes(), title = s.n + ' · Shree Sai Reiki ' + cc.label, loc = online ? 'Online (Zoom link on WhatsApp)' : (cc.address || 'Shree Sai Reiki ' + cc.label), det = 'Booking ref ' + r.paymentId + '. Questions: WhatsApp ' + cc.phone;
      $('[data-gcal]', bk).href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&dates=' + ct[0] + '/' + ct[1] + '&details=' + encodeURIComponent(det) + '&location=' + encodeURIComponent(loc);
      $('[data-ical]', bk).onclick = function () {
        var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Shree Sai Reiki//Booking//EN', 'BEGIN:VEVENT', 'UID:' + r.paymentId + '@reikisurat.in', 'DTSTAMP:' + calTimes()[0], 'DTSTART:' + ct[0], 'DTEND:' + ct[1], 'SUMMARY:' + title, 'DESCRIPTION:' + det, 'LOCATION:' + loc.replace(/,/g, '\\,'), 'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Reiki session in 1 hour', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'reiki-session.ics'; document.body.appendChild(a); a.click(); a.remove();
      };
      $('[data-cal]', bk).hidden = false;
      hist = []; show('done', false);
    }
    // free discovery call
    var ff = $('[data-free-form]', bk);
    ff.addEventListener('submit', function (e) {
      e.preventDefault();
      var city = (ff.querySelector('[name=city]:checked') || {}).value || state.city, y = { name: ff.name.value.trim(), phone: cleanPhone(ff.phone.value) };
      if (y.name.length < 2 || !phoneOk(y.phone)) { (y.name.length < 2 ? ff.name : ff.phone).setAttribute('aria-invalid', 'true'); ff.reportValidity(); if (!ff.checkValidity()) return; toastPlain('Please check your name and 10-digit mobile number'); return; }
      var m = greet(city) + '\nI would like the *free 15-minute discovery call*.\n\n*Name:* ' + y.name + '\n*Mobile:* ' + y.phone + '\n*Best time:* ' + ff.when.value + (ff.note.value.trim() ? '\n*Looking for help with:* ' + ff.note.value.trim() : '') + tag(city, 'Free discovery call');
      var url = waLink(S.cities[city].wa, m); openWA(url);
      $('[data-done-t]', bk).textContent = 'Your request is ready';
      $('[data-done-p]', bk).innerHTML = 'WhatsApp has opened with your details. Tap <b>Send</b> and a healer from ' + esc(S.cities[city].label) + ' will call you at your chosen time.';
      $('[data-done-sum]', bk).innerHTML = dl([['Centre', S.cities[city].label], ['Call', 'Free · 15 minutes'], ['Best time', ff.when.value]]);
      $('[data-done-next]', bk).innerHTML = ''; $('[data-done-wa]', bk).href = url; $('[data-done-wa]', bk).lastChild.textContent = ' Open WhatsApp again';
      $('[data-cal]', bk).hidden = true; hist = []; show('done', false);
    });
    // deep links: ?path=free, ?service=..., ?mode=online
    if (q.get('path') === 'free') show('free', false);
    else if (q.get('service') && S.services[q.get('service')]) { state.service = q.get('service'); hist = ['start']; show('loc', false); }
    else if (q.get('mode') === 'online' || q.get('mode') === 'offline') { state.mode = q.get('mode'); hist = ['start']; show('loc', false); }
    booted = true;
    // with a mode preset, the centre choice goes straight to healing
    if (state.mode && !state.service) next = (function (orig) { return function (f) { return f === 'loc' ? 'svc' : orig(f); }; })(next);
  })();

  /* ---------- seminar seat form ---------- */
  var sf = $('[data-seat-form]');
  if (sf) {
    var E = S.event;
    var seatText = function (v, ref) {
      return 'Hello Shree Sai Reiki Bengaluru 🙏\nPlease reserve my seat for the *' + E.title + '* seminar.' + (ref ? '\nRegistration fee paid. *Payment ref:* ' + ref : '') +
        '\n\n*Name:* ' + v.name + '\n*Mobile:* ' + v.phone + '\n*Seats:* ' + v.seats + (v.email ? '\n*Email:* ' + v.email : '') + (v.area ? '\n*Area:* ' + v.area : '') + '\n*Heard via:* ' + v.src + '\n\n[Seminar registration · Bengaluru · reikisurat.in]';
    };
    sf.addEventListener('submit', async function (e) {
      e.preventDefault();
      var v = { name: sf.name.value.trim(), phone: cleanPhone(sf.phone.value), email: sf.email.value.trim(), seats: sf.seats.value, area: sf.area.value.trim(), src: sf.src.value };
      if (!fieldErr(sf, [['name', v.name.length >= 2], ['phone', phoneOk(v.phone)], ['email', !v.email || emailOk(v.email)]], { name: 'Please enter your full name.', phone: 'Please enter a valid 10-digit mobile number.', email: 'Please check your email address.' }, $('[data-seat-err]'))) return;
      var ref = '';
      if (E.fee > 0) {
        var btn = sf.querySelector('button[type=submit]'), lab = btn.innerHTML; btn.disabled = true; btn.textContent = 'Opening secure payment…';
        try { ref = (await pay({ type: 'event', city: 'bangalore', seats: +v.seats, customer: v }, { description: E.title + ' · ' + v.seats + ' seat(s)', prefill: { name: v.name, email: v.email, contact: '+91' + v.phone } })).paymentId; }
        catch (x) { btn.disabled = false; btn.innerHTML = lab; if (!(x && x.dismissed)) { var er = $('[data-seat-err]'); er.textContent = x.message; er.hidden = false; } return; }
      }
      var url = waLink(E.wa, seatText(v, ref));
      $('[data-seat-wa]').href = url; sf.hidden = true; $('[data-seat-done]').hidden = false;
      openWA(url);
    });
  }

  /* ---------- offers expire by themselves ---------- */
  var today = new Date().toISOString().slice(0, 10);
  $$('[data-until]').forEach(function (o) { if (o.dataset.until && o.dataset.until < today) o.remove(); });

  /* ---------- header shadow ---------- */
  var hdr = $('.hdr');
  var onScroll = function () { hdr && hdr.classList.toggle('scrolled', scrollY > 8); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- rails with dots ---------- */
  $$('[data-rail]').forEach(function (rail) {
    var dots = rail.nextElementSibling && rail.nextElementSibling.hasAttribute('data-rail-dots') ? rail.nextElementSibling : null;
    var items = rail.children;
    var step = function () { var c = items[0]; return c ? c.getBoundingClientRect().width + (parseFloat(getComputedStyle(rail).columnGap) || 12) : 300; };
    var draw = function () {
      if (!dots) return;
      var n = Math.max(1, Math.min(8, Math.round((rail.scrollWidth - rail.clientWidth) / step()) + 1)), cur = Math.round(rail.scrollLeft / step());
      dots.hidden = n < 2;
      if (dots.children.length !== n) dots.innerHTML = new Array(n + 1).join('<span></span>');
      $$('span', dots).forEach(function (d, i) { d.classList.toggle('on', i === Math.min(cur, n - 1)); });
    };
    rail.addEventListener('scroll', function () { requestAnimationFrame(draw); }, { passive: true });
    addEventListener('resize', draw); draw();
  });

  /* ---------- motion ---------- */
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function initMotion() {
    window.__anim = true;
    if (reduce || !window.gsap || !window.ScrollTrigger) { DOC.classList.add('anim-off'); return; }
    gsap.registerPlugin(ScrollTrigger);
    var hero = $$('[data-hero]');
    if (hero.length) {
      var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from(hero, { y: 22, opacity: 0, duration: .8, stagger: .08 });
      if ($('[data-art]')) tl.from('[data-art]', { y: 26, opacity: 0, duration: 1 }, .15);
      if ($('.hero-gm')) tl.from('.hero-gm', { y: 16, opacity: 0, duration: .7 }, '-=.5');
    }
    var items = $$('[data-anim]');
    if (items.length) {
      gsap.set(items, { opacity: 0, y: 24 });
      ScrollTrigger.batch(items, { start: 'top 90%', once: true, onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: .7, ease: 'power3.out', stagger: .06, overwrite: true }); } });
    }
    DOC.classList.add('anim-ready');
  }
  initMotion();
  addEventListener('load', function () { window.ScrollTrigger && ScrollTrigger.refresh(); });
  render();
})();
