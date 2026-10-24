const fs = require('fs'), path = require('path');
const { getIconData, iconToSVG, iconToHTML, replaceIDs } = require('@iconify/utils');
const { SITE, CITIES } = require('./data');
const ROOT = path.join(__dirname, '..');
const sets = { solar: require('@iconify-json/solar/icons.json'), ph: require('@iconify-json/ph/icons.json'), logos: require('@iconify-json/logos/icons.json') };
const missing = new Set();
const OFFERS = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/offers.json'), 'utf8'));
const EVENT = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/event.json'), 'utf8'));

let idc = 0;
// Official-style Instagram mark (gradient square + white glyph)
function igLogo(cls) {
  const g = 'ig' + (idc++).toString(36);
  return `<svg class="ico ico-logo${cls ? ' ' + cls : ''}" viewBox="0 0 256 256" aria-hidden="true" focusable="false"><defs><radialGradient id="${g}" cx="0.28" cy="1.08" r="1.25"><stop offset="0" stop-color="#FFDD55"/><stop offset=".12" stop-color="#FFDD55"/><stop offset=".45" stop-color="#FF543E"/><stop offset=".7" stop-color="#C837AB"/><stop offset="1" stop-color="#5851DB"/></radialGradient></defs><rect width="256" height="256" rx="60" fill="url(#${g})"/><rect x="52" y="52" width="152" height="152" rx="44" fill="none" stroke="#fff" stroke-width="17"/><circle cx="128" cy="128" r="36" fill="none" stroke="#fff" stroke-width="17"/><circle cx="174" cy="82" r="11" fill="#fff"/></svg>`;
}
function ic(id, cls) {
  if (id === 'logos:instagram-icon') return igLogo(cls);
  const [set, name] = id.split(':');
  const d = getIconData(sets[set], name);
  if (!d) { missing.add(id); return ''; }
  const r = iconToSVG(d, { height: '1em' });
  return iconToHTML(replaceIDs(r.body, () => 'i' + (idc++).toString(36)), { ...r.attributes, class: (set === 'logos' ? 'ico ico-logo' : 'ico') + (cls ? ' ' + cls : ''), 'aria-hidden': 'true', focusable: 'false' });
}
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inr = n => '₹' + Number(n).toLocaleString('en-IN');
const u = (C, p) => (C.prefix + (p === '/' ? (C.prefix ? '' : '/') : p)) || '/';

/* ---------- WhatsApp: professional, item-specific messages ---------- */
const greet = C => `Hello Shree Sai Reiki ${C.label} 🙏`;
const tag = (C, what) => `\n\n[${what} · ${C.label} · reikisurat.in]`;
const waUrl = (num, text) => `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
const MSG = {
  general: C => `${greet(C)}\nI have a question and would like to speak with someone from the centre.${tag(C, 'Website enquiry')}`,
  course: (C, c, fee) => `${greet(C)}\nI want to learn Reiki: *${c.name}*.\nPlease share the fee${fee ? ` (website shows ${inr(fee)})` : ''}, the next batch date and the class timings.${tag(C, 'Course enquiry')}`,
  courseHelp: C => `${greet(C)}\nI want to learn Reiki but I am not sure which course to start with. Please guide me.${tag(C, 'Course enquiry')}`,
  service: (C, s, price) => `${greet(C)}\nI would like to book a *${s.name}*${price ? ` (${inr(price)}, ${s.mins} min)` : ''}.\nPlease share the available slots.${tag(C, 'Healing booking')}`,
  product: (C, p, price) => `${greet(C)}\nI am interested in the *${p.name}* (${inr(price)}).\nPlease help me choose and place the order.${tag(C, 'Crystal enquiry')}`,
  visit: C => `${greet(C)}\nI would like to visit the centre. Please share the timings and directions.${tag(C, 'Visit')}`,
  offers: C => `${greet(C)}\nPlease add me to your offers list so I receive new offers, events and course batches on WhatsApp.${tag(C, 'Offers sign-up')}`,
  article: (C, t) => `${greet(C)}\nI read your article "${t}" and have a question.${tag(C, 'Blog')}`
};
const wa = (C, key, ...a) => waUrl(C.wa, MSG[key](C, ...a));
const waAttrs = (C, key, ...a) => `href="${esc(wa(C, key, ...a))}" target="_blank" rel="noopener" data-wa-track="${key}"`;

/* ---------- images ---------- */
function img(p, alt, o = {}) {
  const src = `/assets/img/${p}.webp`;
  let srcset = '';
  if (o.srcset) srcset = ` srcset="${o.srcset.map(([f, w]) => `/assets/img/${f}.webp ${w}w`).join(', ')}" sizes="${o.sizes || '100vw'}"`;
  return `<img src="${src}"${srcset} alt="${esc(alt)}"${o.w ? ` width="${o.w}" height="${o.h}"` : ''}${o.eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"${o.cls ? ` class="${o.cls}"` : ''}>`;
}
const img3d = (name, alt, sizes, eager) => img(name, alt, { srcset: [[name + '-720', 720], [name, 1344]], sizes: sizes || '(min-width: 900px) 33vw, 100vw', w: 1344, h: 896, eager });

/* ---------- markdown for blog ---------- */
function md(src) {
  const inline = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>').replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '<a href="$2">$1</a>');
  const out = []; let list = null, para = [];
  const flushP = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
  const flushL = () => { if (list) { out.push(`<${list.t}>` + list.items.map(i => '<li>' + inline(i) + '</li>').join('') + `</${list.t}>`); list = null; } };
  for (const raw of src.split('\n')) {
    const l = raw.trim(); let m;
    if (!l) { flushP(); flushL(); continue; }
    if ((m = l.match(/^(#{2,4})\s+(.*)/))) { flushP(); flushL(); const n = m[1].length; out.push(`<h${n}>${inline(m[2])}</h${n}>`); continue; }
    if ((m = l.match(/^[-*]\s+(.*)/))) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = l.match(/^\d+\.\s+(.*)/))) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); continue; }
    flushL(); para.push(l);
  }
  flushP(); flushL();
  return out.join('\n');
}
function frontmatter(txt) {
  const m = txt.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = {};
  m[1].split('\n').forEach(line => { const i = line.indexOf(':'); if (i > 0) { let v = line.slice(i + 1).trim(); if (/^".*"$/.test(v)) v = v.slice(1, -1); meta[line.slice(0, i).trim()] = v; } });
  return { meta, body: m[2] };
}

/* ---------- navigation ---------- */
const NAV = [
  ['healing', '/healing', 'Healing'],
  ['courses', '/courses', 'Courses'],
  ['shop', '/shop', 'Crystal Shop'],
  ['bracelets', '/bracelets', 'DOB Bracelets'],
  ['about', '/about', 'About'],
  ['blog', '/blog', 'Blog'],
  ['contact', '/contact', 'Contact']
];
const navFor = C => NAV.map(([k, h, t]) => [k, k === 'blog' ? h : u(C, h), t]);

function topbar(C) {
  const b = OFFERS.bar && OFFERS.bar[C.key];
  if (!b || (b.link.includes('seminar') && !EVENT.active)) return '';
  return `<div class="topbar"><div class="wrap topbar-in"><span class="topbar-dot" aria-hidden="true"></span><p>${esc(b.text)}</p><a href="${esc(b.link)}">${esc(b.cta || 'View')}${ic('solar:arrow-right-linear')}</a></div></div>`;
}

function cityMenu(C, alt) {
  return Object.values(CITIES).map(x => `<a href="${esc(alt[x.key])}" data-set-city="${x.key}"${x.key === C.key ? ' aria-current="true"' : ''}>
      <span class="cm-ico">${ic('solar:map-point-bold-duotone')}</span><span><b>${x.label}</b><small>${x.key === 'surat' ? 'Adajan centre · since 2014' : 'Dr. Varun Patel · Reiki Grand Master'}</small></span>${x.key === C.key ? ic('solar:check-circle-bold', 'cm-on') : ''}</a>`).join('');
}

function header(C, cur, alt) {
  const links = navFor(C).map(([k, h, t]) => `<a href="${h}"${k === cur ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  const semi = EVENT.active ? `<a class="nav-semi" href="/bangalore/seminar"${cur === 'seminar' ? ' aria-current="page"' : ''}>Seminar</a>` : '';
  return `<a class="skip" href="#main">Skip to content</a>
${topbar(C)}
<header class="hdr" id="top"><div class="wrap hdr-in">
  <a class="brand" href="${u(C, '/')}" aria-label="${esc(SITE.name)}, ${C.label} home"><img src="/assets/img/logo-h128.webp" width="128" height="64" alt="${esc(SITE.name)}"></a>
  <div class="city">
    <button class="city-btn" type="button" aria-expanded="false" aria-controls="citymenu" data-city-btn>${ic('solar:map-point-bold')}<span><small>Centre</small>${C.label}</span>${ic('solar:alt-arrow-down-linear', 'city-chev')}</button>
    <div class="city-menu" id="citymenu" hidden><p>Choose your centre</p>${cityMenu(C, alt)}</div>
  </div>
  <nav class="nav" aria-label="Main">${links}${C.key === 'bangalore' ? semi : ''}</nav>
  <div class="hdr-act">
    <a class="btn btn-pri btn-sm hdr-book" href="${u(C, '/book')}">Book a session</a>
    <button class="icon-btn cart-btn" type="button" data-cart-open aria-label="Open cart">${ic('solar:bag-4-linear')}<span class="cart-count" data-cart-count hidden>0</span></button>
    <button class="icon-btn menu-btn" type="button" aria-expanded="false" aria-controls="mnav" aria-label="Open menu">${ic('solar:hamburger-menu-linear', 'i-open')}${ic('solar:close-square-linear', 'i-close')}</button>
  </div>
</div></header>
<div class="mnav" id="mnav" hidden>
  <nav aria-label="Mobile">${[['home', u(C, '/'), 'Home']].concat(navFor(C)).concat(EVENT.active ? [['seminar', '/bangalore/seminar', 'Bengaluru Seminar']] : []).map(([k, h, t]) => `<a href="${h}"${k === cur ? ' aria-current="page"' : ''}>${t}${ic('solar:alt-arrow-right-linear')}</a>`).join('')}</nav>
  <div class="mnav-ft">
    <a class="btn btn-pri btn-block" href="${u(C, '/book')}">${ic('solar:calendar-mark-bold')} Book a session</a>
    <a class="btn btn-wa btn-block" ${waAttrs(C, 'general')}>${ic('logos:whatsapp-icon')} WhatsApp ${C.label}</a>
    <p class="mnav-city">${ic('solar:map-point-bold')} You are viewing the <b>${C.label}</b> centre. <button type="button" class="linkbtn" data-city-open>Change</button></p>
  </div>
</div>`;
}

function footer(C, cur) {
  const centre = x => `<div class="ftr-centre">
      <h2>${x.label}</h2>
      ${x.addressLines.length ? `<address>${x.addressLines.join('<br>')}</address>` : `<p>${x.full}. Address shared on WhatsApp when you book.</p>`}
      <p><a href="tel:${x.phoneRaw}">${ic('solar:phone-bold')} ${x.phone}</a></p>
      <p><a href="${esc(waUrl(x.wa, MSG.general(x)))}" target="_blank" rel="noopener">${ic('logos:whatsapp-icon')} WhatsApp</a> · <a href="${x.instagram}" target="_blank" rel="noopener">${ic('logos:instagram-icon')} ${x.igHandle}</a></p>
    </div>`;
  return `<footer class="ftr">
  <div class="wrap ftr-grid">
    <div class="ftr-brand">
      <img src="/assets/img/logo.png" width="212" height="106" alt="${esc(SITE.name)}" loading="lazy">
      <p>Reiki healing, Reiki courses up to Grand Master, and Reiki-charged crystals. Centres in Surat and Bengaluru, healing online everywhere.</p>
      <div class="social">
        <a href="${C.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${ic('logos:instagram-icon')}</a>
        <a href="${SITE.social.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${ic('logos:facebook')}</a>
        <a href="${SITE.social.youtube}" target="_blank" rel="noopener" aria-label="YouTube">${ic('logos:youtube-icon')}</a>
        <a href="${esc(wa(C, 'general'))}" target="_blank" rel="noopener" aria-label="WhatsApp">${ic('logos:whatsapp-icon')}</a>
      </div>
    </div>
    ${centre(C)}
    ${centre(Object.values(CITIES).find(x => x.key !== C.key))}
    <div><h2>Explore</h2><ul>
      <li><a href="${u(C, '/healing')}">Healing sessions</a></li><li><a href="${u(C, '/courses')}">Reiki courses</a></li>
      <li><a href="${u(C, '/shop')}">Crystal shop</a></li><li><a href="${u(C, '/bracelets')}">DOB &amp; numerology bracelets</a></li>
      <li><a href="${u(C, '/book')}">Book a session</a></li>${EVENT.active ? '<li><a href="/bangalore/seminar">Bengaluru seminar</a></li>' : ''}
      <li><a href="${u(C, '/about')}">About &amp; awards</a></li><li><a href="/blog">Blog</a></li></ul></div>
    <div><h2>Help</h2><ul>
      <li><a href="${u(C, '/contact')}">Contact</a></li><li><a href="/shipping-policy">Shipping</a></li><li><a href="/refund-policy">Returns &amp; refunds</a></li>
      <li><a href="/privacy-policy">Privacy policy</a></li><li><a href="/terms">Terms</a></li></ul></div>
  </div>
  <div class="wrap ftr-bot">
    <p>© ${new Date().getFullYear()} ${esc(SITE.legal)}. All rights reserved.</p>
    <p>Reiki and crystals support well-being. They do not replace medical treatment, so please keep taking any medicine your doctor has prescribed.</p>
  </div>
</footer>
<nav class="mbar" aria-label="Quick actions">
  <a href="${u(C, '/healing')}"${cur === 'healing' ? ' aria-current="page"' : ''}>${ic('solar:hand-heart-bold-duotone')}<span>Healing</span></a>
  <a href="${u(C, '/courses')}"${cur === 'courses' ? ' aria-current="page"' : ''}>${ic('solar:square-academic-cap-bold-duotone')}<span>Courses</span></a>
  <a class="mbar-book" href="${u(C, '/book')}"${cur === 'book' ? ' aria-current="page"' : ''}><i>${ic('solar:calendar-add-bold')}</i><span>Book</span></a>
  <a href="${u(C, '/shop')}"${cur === 'shop' || cur === 'bracelets' ? ' aria-current="page"' : ''}>${ic('ph:diamond-duotone')}<span>Crystals</span></a>
  <a class="mbar-wa" ${waAttrs(C, 'general')}>${ic('logos:whatsapp-icon')}<span>WhatsApp</span></a>
</nav>
<div class="drawer-bg" data-cart-close hidden></div>
<aside class="drawer" id="cart" aria-label="Your cart" aria-hidden="true" inert>
  <div class="drawer-hd"><h2>Your cart</h2><button class="icon-btn" type="button" data-cart-close aria-label="Close cart">${ic('solar:close-square-linear')}</button></div>
  <p class="drawer-city">${ic('solar:map-point-bold')} ${C.label}</p>
  <div class="drawer-body" data-cart-items></div>
  <div class="drawer-ft" data-cart-foot hidden>
    <div class="sum-row"><span>Subtotal</span><b data-cart-subtotal>₹0</b></div>
    <div class="sum-row small"><span>Shipping</span><span>${SITE.shipping ? inr(SITE.shipping) : 'Free across India'}</span></div>
    <a class="btn btn-pri btn-block" href="${u(C, '/checkout')}">Checkout ${ic('solar:arrow-right-linear', 'ico-go')}</a>
    <p class="pay-note">${ic('solar:lock-keyhole-minimalistic-bold')} UPI, cards and wallets via Razorpay</p>
  </div>
</aside>
<div class="toast" role="status" aria-live="polite" hidden></div>
<div class="picker" data-picker hidden>
  <div class="picker-card" role="dialog" aria-modal="true" aria-labelledby="pk-t">
    <img src="/assets/img/logo-h128.webp" width="128" height="64" alt="">
    <h2 id="pk-t">Welcome. Which centre are you looking for?</h2>
    <p>Prices, timings and WhatsApp change with the centre. You can switch any time from the top of the page.</p>
    <div class="picker-opts">
      <button type="button" data-pick="surat">${ic('solar:map-point-bold-duotone')}<b>Surat</b><small>Adajan centre · since 2014</small></button>
      <button type="button" data-pick="bangalore">${ic('solar:map-point-bold-duotone')}<b>Bengaluru</b><small>Dr. Varun Patel · Reiki Grand Master</small></button>
    </div>
    ${EVENT.active ? `<a class="picker-semi" href="/bangalore/seminar" data-set-city="bangalore">${ic('solar:ticket-bold-duotone')}<span>Scanned the seminar poster? <b>Reserve your seat</b></span>${ic('solar:arrow-right-linear')}</a>` : ''}
  </div>
</div>`;
}

function layout({ C, key = '', path: p, title, desc, body, schema = [], og = '/assets/img/og.jpg', noindex = false, bodyClass = '', alt, shared = false }) {
  const canonical = SITE.url + (p === '/' ? '/' : p);
  alt = alt || { surat: u(CITIES.surat, '/'), bangalore: u(CITIES.bangalore, '/') };
  const ld = [...schema].map(s => `<script type="application/ld+json">${JSON.stringify(s).replace(/</g, '\\u003c')}</script>`).join('\n');
  return `<!doctype html>
<html lang="en-IN" data-city="${C.key}"${shared ? ' data-shared' : ''}${key === 'home' && C.key === 'surat' ? ' data-root' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${canonical}">`}
<meta name="theme-color" content="#ffffff">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE.url}${og}">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/img/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/manrope-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/lora-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/style.css?v={{v}}">
<script src="/assets/js/boot.js?v={{v}}"></script>
${ld}
</head>
<body class="${bodyClass}">
${header(C, key, alt)}
<main id="main">
${body}
</main>
${footer(C, key)}
<script src="/assets/vendor/gsap.min.js" defer></script>
<script src="/assets/vendor/ScrollTrigger.min.js" defer></script>
<script src="/assets/js/data.js?v={{v}}" defer></script>
<script src="/assets/js/main.js?v={{v}}" defer></script>
</body>
</html>`;
}

module.exports = { ic, esc, inr, u, wa, waUrl, waAttrs, MSG, img, img3d, md, frontmatter, layout, missing, NAV, OFFERS, EVENT };
