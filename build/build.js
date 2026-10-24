// Builds the static site into ../site. Run: npm run build
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'site');
const D = require('./data');
const { SITE, CITIES, INTENTS, CATS, BESTSELLERS, SERVICES, DISCOVERY, COURSES, TEAM, REVIEWS, STATS, AWARDS, MOMENTS, BLOG_IMG } = D;
const { ic, esc, inr, u, wa, waUrl, waAttrs, MSG, img, img3d, md, frontmatter, layout, missing, OFFERS, EVENT } = require('./lib');

const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const PRICES = read('content/prices.json'), BOOKING = read('content/booking.json');
const PRODUCTS = read('content/products.json');
const P = Object.fromEntries(PRODUCTS.map(p => [p.slug, p]));
const VERSION = Date.now().toString(36);
const TODAY = new Date().toISOString().slice(0, 10);
const pages = [];
const CL = Object.values(CITIES);
const other = C => CL.find(x => x.key !== C.key);

function write(rel, html, { sitemap = true, priority = '0.6' } = {}) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html.split('{{v}}').join(VERSION));
  if (sitemap) pages.push({ loc: rel === 'index.html' ? '/' : '/' + rel.replace(/(\/)?index\.html$/, '').replace(/\.html$/, ''), priority });
}
const outFile = (C, rel) => (C.prefix ? C.prefix.slice(1) + '/' : '') + rel;
const altFor = p => ({ surat: u(CITIES.surat, p), bangalore: u(CITIES.bangalore, p) });

/* ---------- prices ---------- */
const priceP = (C, slug) => PRICES.products[slug][C.key];
const mrpP = (C, slug) => PRICES.products[slug]['mrp_' + C.key];
const priceS = (C, id) => PRICES.services[id][C.key];
const feeC = (C, id) => PRICES.courses[id] && PRICES.courses[id][C.key];
const purl = (C, p) => u(C, `/shop/${p.slug}`);

/* ---------- blog ---------- */
const POSTS = fs.readdirSync(path.join(ROOT, 'content/blog')).filter(f => f.endsWith('.md')).map(f => {
  const { meta, body } = frontmatter(fs.readFileSync(path.join(ROOT, 'content/blog', f), 'utf8'));
  const slug = f.replace(/\.md$/, '');
  return { slug, ...meta, html: md(body), img: BLOG_IMG[slug] || '3d/svc-reiki-720', mins: Math.max(2, Math.round(body.split(/\s+/).length / 200)) };
}).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

/* ---------- schema ---------- */
function bizLd(C) {
  const o = {
    '@context': 'https://schema.org', '@type': 'HealthAndBeautyBusiness', '@id': SITE.url + u(C, '/') + '#business',
    name: `${SITE.name}, ${C.label}`, legalName: SITE.legal, url: SITE.url + u(C, '/'), logo: SITE.url + '/assets/img/logo.png',
    image: SITE.url + '/assets/img/og.jpg', telephone: C.phoneRaw, email: SITE.email, priceRange: '₹₹',
    address: { '@type': 'PostalAddress', addressLocality: C.locality, addressRegion: C.region, addressCountry: 'IN', ...(C.street ? { streetAddress: C.street, postalCode: C.pin } : {}) },
    areaServed: [C.locality, 'India'],
    sameAs: [C.instagram, SITE.social.facebook, SITE.social.youtube],
    founder: { '@type': 'Person', name: 'Dr. Chirag Gajjar' },
    parentOrganization: { '@type': 'Organization', name: SITE.legal, url: SITE.url }
  };
  if (C.map) o.hasMap = C.map;
  if (C.google) o.aggregateRating = { '@type': 'AggregateRating', ratingValue: C.google.rating, reviewCount: C.google.count, bestRating: 5 };
  return o;
}
const crumbLd = items => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([t, h], i) => ({ '@type': 'ListItem', position: i + 1, name: t, item: SITE.url + h })) });
const faqLd = qa => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

/* ---------- shared bits ---------- */
const crumbs = items => `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items.map(([t, h], i) => i < items.length - 1 ? `<li><a href="${h}">${esc(t)}</a></li>` : `<li aria-current="page">${esc(t)}</li>`).join('')}</ol></nav>`;
const faqHtml = qa => `<div class="faq">${qa.map(([q, a]) => `<details><summary>${esc(q)}${ic('solar:alt-arrow-down-linear')}</summary><p>${esc(a)}</p></details>`).join('')}</div>`;
const pageHead = (h1, lead, cr, extra = '') => `<section class="phead"><div class="wrap">${cr}<h1>${h1}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}${extra}</div></section>`;
const waBtn = (C, cls, label, key, ...a) => `<a class="btn ${cls}" ${waAttrs(C, key, ...a)}>${ic('logos:whatsapp-icon')} ${label}</a>`;
const stars = () => `<span class="stars" aria-hidden="true">${ic('solar:star-bold').repeat(5)}</span>`;
const sec = (h, p, extra = '') => `<div class="sec-hd" data-anim><div><h2>${h}</h2>${p ? `<p>${p}</p>` : ''}</div>${extra}</div>`;

function pcard(C, p, i = 0) {
  const pr = priceP(C, p.slug), mrp = mrpP(C, p.slug);
  const forTxt = p.intents.map(k => INTENTS[k].label).slice(0, 2).join(' · ');
  const btn = p.personal
    ? `<a class="btn btn-out btn-sm btn-block" href="${purl(C, p)}">Personalise</a>`
    : `<button class="btn btn-pri btn-sm btn-block" type="button" data-add="${p.slug}">${ic('solar:bag-4-linear')} Add to cart</button>`;
  return `<article class="pcard" data-cat="${p.cat}" data-intents="${p.intents.join(' ')}" data-price="${pr}" data-i="${i}">
  <a class="pcard-img" href="${purl(C, p)}" tabindex="-1" aria-hidden="true">${img('products/' + p.img[0] + '-480', p.name, { w: 480, h: 480 })}${mrp > pr ? `<span class="pcard-off">${Math.round((1 - pr / mrp) * 100)}% off</span>` : ''}</a>
  <div class="pcard-b">
    <p class="pcard-for">${forTxt}</p>
    <h3 class="pcard-t"><a href="${purl(C, p)}">${esc(p.name)}</a></h3>
    <p class="price"><b>${inr(pr)}</b>${mrp > pr ? ` <s aria-label="MRP">${inr(mrp)}</s>` : ''}</p>
    ${btn}
  </div>
</article>`;
}

function courseCard(C, c, i) {
  const fee = feeC(C, c.id);
  return `<article class="ccard" data-anim>
    <a class="ccard-img" href="${u(C, '/courses')}#${c.id}" tabindex="-1" aria-hidden="true">${img3d(c.img, '', '(min-width: 900px) 30vw, 80vw')}</a>
    <div class="ccard-b">
      <h3><a href="${u(C, '/courses')}#${c.id}">${c.name}</a></h3>
      <p class="ccard-meta">${c.days ? `${ic('solar:calendar-linear')} ${c.days} days` : `${ic('solar:calendar-linear')} Duration on enquiry`}<span>·</span>${c.req === 'None' || c.req.startsWith('None') ? 'Open to all' : 'After ' + c.req}</p>
      <p class="ccard-fee">${fee ? `<b>${inr(fee)}</b> course fee` : 'Fee &amp; next batch on WhatsApp'}</p>
      <div class="ccard-act"><a class="btn btn-wa btn-sm" ${waAttrs(C, 'course', c, fee)}>${ic('logos:whatsapp-icon')} Enquire</a><a class="btn btn-out btn-sm" href="${u(C, '/courses')}#${c.id}">Details</a></div>
    </div>
  </article>`;
}

function svcRow(C, s) {
  const pr = priceS(C, s.id);
  return `<article class="srow" data-anim>
    <a class="srow-img" href="${u(C, '/healing')}#${s.id}" tabindex="-1" aria-hidden="true">${img(s.img + '-720', '', { w: 720, h: 480 })}</a>
    <div class="srow-b">
      <h3><a href="${u(C, '/healing')}#${s.id}">${s.name}</a></h3>
      <p class="srow-meta">${ic('solar:clock-circle-linear')} ${s.mins} min ${s.modes.map(m => `<span class="mode mode-${m}">${m === 'online' ? 'Online' : C.key === 'bangalore' ? 'In person' : 'In centre'}</span>`).join('')}</p>
    </div>
    <div class="srow-r"><b>${inr(pr)}</b><a class="btn btn-pri btn-sm" href="${u(C, '/book')}?service=${s.id}">Book</a></div>
  </article>`;
}

function personCard(id, big) {
  const t = TEAM[id];
  return `<article class="person${big ? ' person-lg' : ''}" data-anim>
    <div class="person-img">${img('team-c/' + id, t.name, { w: 480, h: 640 })}</div>
    <div class="person-b"><h3>${t.name}${t.cred ? ` <small>(${t.cred})</small>` : ''}</h3><p class="role">${t.role}</p><p>${t.bio}</p></div>
  </article>`;
}

function reviewsBlock(C) {
  const g = CITIES.surat.google;
  const card = r => `<figure class="rv"><div class="rv-top"><span class="rv-av" aria-hidden="true">${esc(r.n.split(' ').map(x => x[0]).slice(0, 2).join(''))}</span><figcaption><b>${esc(r.n)}</b><span>${ic('logos:google-icon')} Google review</span></figcaption></div>${stars()}<blockquote>“${esc(r.t)}”</blockquote></figure>`;
  const half = Math.ceil(REVIEWS.length / 2);
  const rowA = REVIEWS.slice(0, half), rowB = REVIEWS.slice(half);
  const track = (list, rev) => `<div class="mq${rev ? ' mq-rev' : ''}"><div class="mq-track">${list.map(card).join('')}${list.map(card).join('').replace(/<figure class="rv">/g, '<figure class="rv" aria-hidden="true">')}</div></div>`;
  return `<section class="sec reviews" id="reviews">
  <div class="wrap">
    <div class="rv-head" data-anim>
      <div><h2>What our students and clients say</h2><p>${C.key === 'bangalore' ? 'Reviews from our Surat centre on Google. The same teaching and care in Bengaluru.' : 'Real reviews from Google, written by people who came to the centre.'}</p></div>
      <a class="gbadge" href="${g.reviews}" target="_blank" rel="noopener">${ic('logos:google-icon', 'gbadge-g')}<span><b>${g.rating}</b>${stars()}<small>${g.count} Google reviews</small></span></a>
    </div>
  </div>
  ${track(rowA)}${track(rowB, true)}
  <div class="wrap rv-cta" data-anim>
    <a class="btn btn-out" href="${g.reviews}" target="_blank" rel="noopener">${ic('logos:google-icon')} Read all reviews</a>
    ${C.key === 'surat' ? `<a class="btn btn-out" href="${g.write}" target="_blank" rel="noopener">${ic('solar:pen-new-square-linear')} Write a review</a>` : ''}
  </div>
</section>`;
}

function awardsBlock() {
  return `<section class="sec awards">
  <div class="wrap">
    ${sec('Awards and records', 'Recognition for Dr. Chirag Gajjar and the centre’s work in Reiki and traditional healing.')}
    <div class="aw-grid">${AWARDS.map(a => `<figure class="aw" data-anim><div class="aw-img">${img(a.img + '-640', a.t)}</div><figcaption><b>${a.t}</b><span>${a.d}</span></figcaption></figure>`).join('')}</div>
  </div>
</section>`;
}

function offersBlock(C) {
  const list = OFFERS.offers.filter(o => o.cities.includes(C.key) && (!o.until || o.until >= TODAY));
  if (!list.length) return '';
  return `<section class="sec offers" id="offers">
  <div class="wrap">
    ${sec('Current offers', `Offers for the ${C.label} centre. New offers appear here first.`)}
    <div class="of-grid">${list.map(o => `<article class="of" data-anim data-until="${o.until || ''}">${ic('solar:gift-bold-duotone', 'of-ico')}<div><h3>${esc(o.title)}</h3><p>${esc(o.text)}</p>${o.until ? `<p class="of-until">Valid till ${fmtDate(o.until)}</p>` : ''}</div><a class="btn btn-out btn-sm" href="${esc(o.link.startsWith('/') && !o.link.startsWith('/bangalore') && !o.link.startsWith('/blog') ? u(C, o.link) : o.link)}">${esc(o.cta || 'View')}</a></article>`).join('')}
      <article class="of of-join" data-anim>${ic('logos:whatsapp-icon', 'of-ico')}<div><h3>Get offers on WhatsApp</h3><p>Join our WhatsApp list for new offers, seminars and course batches. One tap, no spam.</p></div><a class="btn btn-wa btn-sm" ${waAttrs(C, 'offers')}>${ic('logos:whatsapp-icon')} Join the list</a></article>
    </div>
  </div>
</section>`;
}

function seminarBand(C, compact) {
  if (!EVENT.active) return '';
  const when = EVENT.date ? fmtDate(EVENT.date) + (EVENT.time ? ' · ' + EVENT.time : '') : 'Date &amp; venue shared on registration';
  return `<section class="sec-tight"><div class="wrap">
  <a class="semi${compact ? ' semi-sm' : ''}" href="/bangalore/seminar" data-anim>
    <div class="semi-img">${img('events/bengaluru-seminar-poster-640', 'Bengaluru Reiki seminar poster', { w: 640, h: 853 })}</div>
    <div class="semi-b">
      <p class="eyebrow">${ic('solar:ticket-bold-duotone')} ${esc(EVENT.kicker)}</p>
      <h2>${esc(EVENT.title)}</h2>
      <p>With Reiki Grand Master Dr. Chirag Gajjar (PhD) and Reiki Grand Master Dr. Varun Patel (PhD). ${EVENT.fee ? `Registration ${inr(EVENT.fee)}.` : 'Free registration.'}</p>
      <p class="semi-when">${ic('solar:calendar-linear')} ${when}</p>
      <span class="btn btn-pri">Reserve your seat ${ic('solar:arrow-right-linear', 'ico-go')}</span>
    </div>
  </a>
</div></section>`;
}

function visitBand(C) {
  return `<section class="sec">
  <div class="wrap">
    <div class="visit" data-anim>
      <div><p class="eyebrow">${ic('solar:map-point-bold')} ${C.label} centre</p><h2>${C.key === 'surat' ? 'Visit us in Adajan' : 'Meet us in Bengaluru'}</h2>
        ${C.addressLines.length ? `<address>${C.addressLines.join('<br>')}</address>` : `<p>In-person sessions are by appointment only. We share the location privately on WhatsApp after you book.</p>`}</div>
      <table class="hours"><tbody>${C.hours.map(h => `<tr><th scope="row">${h[0]}</th><td>${h[1]}</td></tr>`).join('')}</tbody></table>
      <div class="btn-col">
        ${C.map ? `<a class="btn btn-dark" href="${C.map}" target="_blank" rel="noopener">${ic('solar:map-arrow-right-bold')} Get directions</a>` : `<a class="btn btn-dark" href="${u(C, '/book')}">${ic('solar:calendar-mark-bold')} Book a visit</a>`}
        <a class="btn btn-wa" ${waAttrs(C, 'visit')}>${ic('logos:whatsapp-icon')} WhatsApp ${C.phone}</a>
        <a class="btn btn-out" href="${C.instagram}" target="_blank" rel="noopener">${ic('logos:instagram-icon')} ${C.igHandle}</a>
      </div>
    </div>
  </div>
</section>`;
}

function blogCard(p) {
  return `<article class="bcard" data-c="${esc(p.category)}"><a href="/blog/${p.slug}" class="bcard-img" tabindex="-1" aria-hidden="true">${img(p.img, p.title, { w: 720, h: 480 })}</a>
  <div class="bcard-b"><p class="meta">${esc(p.category)} · ${p.mins} min read</p><h3><a href="/blog/${p.slug}">${esc(p.title)}</a></h3><p>${esc(p.excerpt)}</p></div></article>`;
}

function howBook(C) {
  const steps = [
    ['solar:map-point-bold-duotone', 'Centre & mode', 'Surat or Bengaluru, in person or online'],
    ['solar:hand-heart-bold-duotone', 'Choose healing', 'Reiki, crystal healing, nazar removal and more'],
    ['solar:calendar-bold-duotone', 'Date & time', 'Online slots every day; centre slots are limited'],
    ['solar:user-id-bold-duotone', 'Your details', 'Name, phone, email, date of birth'],
    ['solar:card-2-bold-duotone', 'Pay securely', 'UPI, card or wallet through Razorpay'],
    ['solar:check-circle-bold-duotone', 'Confirmed', 'Receipt by SMS, Zoom link for online, add to calendar']
  ];
  return `<section class="sec how">
  <div class="wrap">
    ${sec('How booking works', 'Book a healing session in about two minutes. Not sure yet? Start with the free 15-minute call.')}
    <ol class="how-steps">${steps.map((s, i) => `<li data-anim><span class="how-n">${i + 1}</span>${ic(s[0], 'how-ico')}<h3>${s[1]}</h3><p>${s[2]}</p></li>`).join('')}</ol>
    <div class="btn-row center" data-anim><a class="btn btn-pri btn-lg" href="${u(C, '/book')}">Book a session ${ic('solar:arrow-right-linear', 'ico-go')}</a><a class="btn btn-out btn-lg" href="${u(C, '/book')}?path=free">Free 15-min call</a></div>
  </div>
</section>`;
}

/* ================= HOME ================= */
function home(C) {
  const minProd = Math.min(...PRODUCTS.map(p => priceP(C, p.slug)));
  const minSvc = Math.min(...SERVICES.map(s => priceS(C, s.id)));
  const g = CITIES.surat.google;
  const isB = C.key === 'bangalore';
  const master = isB ? 'varun-patel' : 'chirag-gajjar';
  const chips = Object.entries(INTENTS).map(([k, v]) => `<a class="chip" href="${u(C, '/shop')}?need=${k}">${ic(v.icon)}${v.label}</a>`).join('');
  const latest = POSTS.filter(p => isB ? /bangalore|bengaluru|online|seminar/i.test(p.slug) : /surat/i.test(p.slug)).slice(0, 3);
  const body = `
<section class="hero">
  <div class="hero-bg" aria-hidden="true"></div>
  <div class="wrap hero-in">
    <div class="hero-copy">
      <p class="eyebrow" data-hero>${ic('solar:map-point-bold')} ${isB ? 'Bengaluru, Karnataka' : 'Surat · Adajan · Since 2014'}</p>
      <h1 data-hero>${isB ? 'Reiki healing, courses and crystals in <em>Bengaluru</em>' : 'Reiki healing, courses and crystals in <em>Surat</em>'}</h1>
      <p class="hero-sub" data-hero>${isB ? 'Heal and learn with Reiki Grand Master <b>Dr. Varun Patel</b> and founder <b>Dr. Chirag Gajjar</b>. Sessions in Bengaluru or online, and Reiki-charged crystals delivered to your door.' : 'Heal and learn with Reiki Grand Master <b>Dr. Chirag Gajjar</b> and his team. Sessions at our Adajan centre or online, and Reiki-charged crystals delivered across India.'}</p>
      <div class="hero-cta" data-hero>
        <a class="btn btn-pri btn-lg" href="${u(C, '/book')}">${ic('solar:calendar-mark-bold')} Book a session</a>
        <a class="btn btn-out btn-lg" href="${u(C, '/book')}?path=free">Free 15-min call</a>
      </div>
      <ul class="hero-trust" data-hero>
        <li><a href="${g.reviews}" target="_blank" rel="noopener">${ic('logos:google-icon')}<span><b>${g.rating} ${ic('solar:star-bold', 'star1')}</b><small>${g.count} reviews</small></span></a></li>
        ${STATS.slice(0, 2).map(s => `<li><span><b>${s[0]}</b><small>${s[1]}</small></span></li>`).join('')}
      </ul>
    </div>
    <div class="hero-art" data-art>
      <div class="hero-main">${img3d('3d/course-reiki-123', 'Reiki healing hands holding a glowing light', '(min-width: 1000px) 46vw, 100vw', true)}</div>
      <div class="hero-gm">
        <div class="hero-face">${img('team-c/' + master, TEAM[master].name, { w: 480, h: 640 })}</div>
        <p><b>${TEAM[master].name} (PhD)</b><span>Reiki Grand Master${isB ? ' · Bengaluru' : ' · 25+ years'}</span></p>
      </div>
    </div>
  </div>
</section>

${isB ? seminarBand(C) : ''}

<section class="sec paths-sec">
  <div class="wrap">
    ${sec('What can we help you with?', '')}
    <div class="paths">
      <a class="path" href="${u(C, '/healing')}" data-anim><span class="path-img">${img('3d/svc-reiki-720', '', { w: 720, h: 480 })}</span><span class="path-b"><b>Healing sessions</b><small>In person or online</small><em>From ${inr(minSvc)}</em></span>${ic('solar:arrow-right-linear', 'path-go')}</a>
      <a class="path" href="${u(C, '/courses')}" data-anim><span class="path-img">${img('3d/course-master-720', '', { w: 720, h: 480 })}</span><span class="path-b"><b>Learn Reiki</b><small>Level 1 to Grand Master</small><em>${COURSES.length} courses</em></span>${ic('solar:arrow-right-linear', 'path-go')}</a>
      <a class="path" href="${u(C, '/shop')}" data-anim><span class="path-img">${img('products/seven-chakra-bracelet-480', '', { w: 480, h: 480 })}</span><span class="path-b"><b>Crystal shop</b><small>Reiki-charged, shipped across India</small><em>From ${inr(minProd)}</em></span>${ic('solar:arrow-right-linear', 'path-go')}</a>
      <a class="path" href="${u(C, '/bracelets')}" data-anim><span class="path-img">${img('3d/course-numerology-720', '', { w: 720, h: 480 })}</span><span class="path-b"><b>DOB &amp; numerology bracelet</b><small>Made only for you</small><em>${inr(priceP(C, 'numerology-bracelet'))}</em></span>${ic('solar:arrow-right-linear', 'path-go')}</a>
    </div>
  </div>
</section>

<section class="sec sec-cream" id="courses">
  <div class="wrap">
    ${sec('Learn Reiki from a Reiki Grand Master', `Usui Reiki from Level 1 to Grand Master, with attunement and a certificate at every level. ${C.courseMode}.`, `<a class="link-more" href="${u(C, '/courses')}">All courses ${ic('solar:arrow-right-linear')}</a>`)}
    <div class="rail" data-rail>${COURSES.map((c, i) => courseCard(C, c, i)).join('')}</div>
    <div class="rail-dots" data-rail-dots aria-hidden="true"></div>
  </div>
</section>

<section class="sec" id="healing">
  <div class="wrap">
    ${sec(`Healing sessions in ${C.label}`, 'Fixed prices, no packages you do not need. Most sessions are also available online.', `<a class="link-more" href="${u(C, '/healing')}">All sessions ${ic('solar:arrow-right-linear')}</a>`)}
    <div class="slist">${SERVICES.map(s => svcRow(C, s)).join('')}</div>
    <a class="free-call" href="${u(C, '/book')}?path=free" data-anim>${img('3d/svc-consultation-720', '', { w: 720, h: 480 })}<span><b>Free 15-minute discovery call</b><small>Talk to a healer before you decide. No charge.</small></span><span class="btn btn-dark btn-sm">Book free call</span></a>
  </div>
</section>

${howBook(C)}

<section class="sec sec-cream" id="crystals">
  <div class="wrap">
    ${sec('Crystals for what you need', 'Natural crystals, cleansed and Reiki-charged before we pack them.', `<a class="link-more" href="${u(C, '/shop')}">Shop all ${ic('solar:arrow-right-linear')}</a>`)}
    <div class="chips" data-anim>${chips}</div>
    <div class="rail rail-p" data-rail>${BESTSELLERS.map((s, i) => pcard(C, P[s], i)).join('')}</div>
    <div class="rail-dots" data-rail-dots aria-hidden="true"></div>
    <a class="pbanner" href="${u(C, '/bracelets')}" data-anim>
      <div class="pbanner-img">${img('bracelets/customized-bracelet-800', '', { w: 800, h: 800 })}</div>
      <div><h3>A bracelet made from your date of birth</h3><p>Numerology, birth chart and customized bracelets. Stones chosen by Binal Gajjar, Reiki-charged by Dr. Chirag Gajjar.</p></div>
      <span class="btn btn-pri">Make mine ${ic('solar:arrow-right-linear', 'ico-go')}</span>
    </a>
  </div>
</section>

<section class="sec" id="team">
  <div class="wrap">
    ${sec(isB ? 'Your healers in Bengaluru' : 'Meet your healers', isB ? 'The Bengaluru branch is led by Dr. Varun Patel, with the founders Dr. Chirag Gajjar and Binal Gajjar.' : 'One family of healers, the same care for every person who walks in.', `<a class="link-more" href="${u(C, '/about')}">About us ${ic('solar:arrow-right-linear')}</a>`)}
    <div class="team team-3">${C.team.slice(0, 3).map(id => personCard(id)).join('')}</div>
  </div>
</section>

${reviewsBlock(C)}
${isB ? '' : seminarBand(C, true)}
${awardsBlock()}
${offersBlock(C)}

<section class="sec sec-cream">
  <div class="wrap">
    ${sec(isB ? 'Reiki guides for Bengaluru' : 'Reiki guides for Surat', 'Short, practical reading on Reiki, chakras and everyday healing.', `<a class="link-more" href="/blog">All articles ${ic('solar:arrow-right-linear')}</a>`)}
    <div class="bgrid">${latest.map(blogCard).join('')}</div>
  </div>
</section>

${visitBand(C)}`;
  const title = isB ? 'Reiki in Bangalore | Reiki Healing, Reiki Courses & Crystals | Shree Sai Reiki Bengaluru'
    : 'Reiki in Surat | Reiki Healing, Courses & Crystal Bracelets | Shree Sai Yog & Reiki Healing Centre';
  const desc = isB ? 'Reiki healing sessions, Reiki courses (Level 1 to Grand Master) and Reiki-charged crystal bracelets in Bangalore with Reiki Grand Master Dr. Varun Patel and founder Dr. Chirag Gajjar. Book online or WhatsApp +91 79751 31189.'
    : 'Reiki healing, Reiki courses (Level 1 to Grand Master) and Reiki-charged crystal bracelets in Adajan, Surat with Reiki Grand Master Dr. Chirag Gajjar. 4.9★ on Google. Book online or WhatsApp +91 97265 81787.';
  write(outFile(C, 'index.html'), layout({ C, key: 'home', path: u(C, '/'), body, title, desc, alt: altFor('/'),
    schema: [bizLd(C), { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: SITE.url + '/' }] }), { priority: '1.0' });
}

/* ================= HEALING ================= */
function healing(C) {
  const faq = [
    ['Do I need to book in advance?', `Yes. Book online or on WhatsApp so we can keep a slot for you. ${C.key === 'bangalore' ? 'In-person sessions in Bengaluru are by appointment on limited days.' : 'Walk-ins are seen only if a healer is free.'}`],
    ['How does an online (distance) session work?', 'You book a time, we send a Zoom link before the session, and you relax at home while the healer sends Reiki. Many people find distance healing just as calming as an in-person session.'],
    ['What should I wear?', 'Loose, comfortable clothes. You stay fully clothed in every session.'],
    ['How many sessions will I need?', 'Many people feel lighter after the first session. For long-standing problems we usually suggest a few sessions, and we tell you honestly after the first one.'],
    ['Can I take Reiki while on medicine?', 'Yes. Reiki works alongside medical treatment. Never stop medicine your doctor has prescribed.']
  ];
  const body = `
${pageHead(`Reiki healing sessions in ${C.label}`, 'Clear, fixed prices. Book online in two minutes, or start with a free 15-minute call.', crumbs([['Home', u(C, '/')], ['Healing', u(C, '/healing')]]), `<div class="btn-row phead-cta"><a class="btn btn-pri" href="${u(C, '/book')}">Book a session</a><a class="btn btn-out" href="${u(C, '/book')}?path=free">Free 15-min call</a></div>`)}
<section class="sec">
  <div class="wrap">
    <div class="svc-grid">${SERVICES.map(s => { const pr = priceS(C, s.id); return `<article class="svc" id="${s.id}" data-anim>
      <div class="svc-img">${img3d(s.img, s.name, '(min-width: 1100px) 33vw, (min-width: 760px) 50vw, 100vw')}</div>
      <div class="svc-b">
        <div class="svc-top"><h2>${s.name}</h2><p class="svc-price">${inr(pr)}</p></div>
        <p class="srow-meta">${ic('solar:clock-circle-linear')} ${s.mins} min ${s.modes.map(m => `<span class="mode mode-${m}">${m === 'online' ? 'Online' : C.key === 'bangalore' ? 'In person' : 'In centre'}</span>`).join('')}</p>
        <p>${s.text}</p>
        <p class="svc-good"><b>Helpful for:</b> ${s.good.join(', ')}</p>
        <div class="svc-act"><a class="btn btn-pri" href="${u(C, '/book')}?service=${s.id}">Book now</a><a class="btn btn-wa-out" ${waAttrs(C, 'service', s, pr)}>${ic('logos:whatsapp-icon')} Ask</a></div>
      </div>
    </article>`; }).join('')}</div>
  </div>
</section>
<section class="sec sec-cream">
  <div class="wrap split">
    <div class="split-img" data-anim>${img3d('3d/svc-distance', 'Distance Reiki healing sent across the world', '(min-width: 900px) 45vw, 100vw')}</div>
    <div data-anim>
      <p class="eyebrow">${ic('solar:global-bold-duotone')} Online healing</p>
      <h2>Distance healing, wherever you are</h2>
      <p>Reiki is not limited by distance. Book an online session and receive healing at home on a Zoom call. It is ideal for busy schedules, elderly parents and family members in another city.</p>
      <ul class="ticks"><li>${ic('solar:check-circle-bold')} Zoom link sent before your session</li><li>${ic('solar:check-circle-bold')} Slots every day, 8 AM to 9 PM</li><li>${ic('solar:check-circle-bold')} Same price as the centre</li></ul>
      <div class="btn-row"><a class="btn btn-pri" href="${u(C, '/book')}?mode=online">Book online healing</a></div>
    </div>
  </div>
</section>
<section class="sec">
  <div class="wrap">
    ${sec('Your first session', '')}
    <ol class="steps">
      <li data-anim><span class="step-n">1</span><h3>A short talk</h3><p>You tell the healer what is troubling you: body, mind, home or work.</p></li>
      <li data-anim><span class="step-n">2</span><h3>The session</h3><p>You lie down or sit, fully clothed, in a quiet room, or relax at home for an online session.</p></li>
      <li data-anim><span class="step-n">3</span><h3>What to do next</h3><p>Simple advice to follow at home and, only if needed, a crystal suggestion.</p></li>
    </ol>
  </div>
</section>
<section class="sec sec-cream"><div class="wrap narrow"><h2>Common questions</h2>${faqHtml(faq)}</div></section>
${visitBand(C)}`;
  const isB = C.key === 'bangalore';
  write(outFile(C, 'healing.html'), layout({ C, key: 'healing', path: u(C, '/healing'), body, alt: altFor('/healing'),
    title: isB ? `Reiki Healing in Bangalore | Sessions from ${inr(priceS(C, 'student-exams'))} | Online & In-Centre` : `Reiki Healing in Surat (Adajan) | Sessions from ${inr(priceS(C, 'student-exams'))} | Shree Sai Reiki`,
    desc: `Reiki healing ${inr(priceS(C, 'reiki-healing'))}, crystal healing ${inr(priceS(C, 'crystal-healing'))}, evil eye removal, meditation and student exam Reiki in ${C.seo}. Online distance healing available. Free 15-minute call. Book online.`,
    schema: [bizLd(C), crumbLd([['Home', u(C, '/')], ['Healing', u(C, '/healing')]]), faqLd(faq),
      ...SERVICES.map(s => ({ '@context': 'https://schema.org', '@type': 'Service', name: `${s.name} in ${C.seo}`, serviceType: s.name, description: s.text, areaServed: C.locality, provider: { '@id': SITE.url + u(C, '/') + '#business' }, offers: { '@type': 'Offer', price: String(priceS(C, s.id)), priceCurrency: 'INR' } }))] }), { priority: '0.9' });
}

/* ================= COURSES ================= */
function courses(C) {
  const isB = C.key === 'bangalore';
  const faq = [
    ['I have never learnt Reiki. Where do I start?', 'Start with the Reiki Level 1, 2 & 3 Certification. It needs no experience.'],
    ['Do I get a certificate?', 'Yes. Every level ends with an attunement and a certificate from the centre.'],
    ['What is the fee and when is the next batch?', 'Fees and batch dates are shared on WhatsApp so you always get the current ones. Tap Enquire on any course.'],
    ['Can I learn online?', isB ? 'Yes. Bengaluru students can join in person or online. Attunements can be given at a distance.' : 'Crystal Reiki and Vedic Numerology can be done online. Ask us about online options for other levels.']
  ];
  const body = `
${pageHead(`Reiki courses in ${C.label}`, `Learn Usui Reiki from Level 1 to Grand Master. Every level includes attunement and a certificate. ${C.courseMode}.`, crumbs([['Home', u(C, '/')], ['Courses', u(C, '/courses')]]))}
<section class="sec">
  <div class="wrap">
    <nav class="cnav" aria-label="Courses on this page">${COURSES.map(c => `<a href="#${c.id}">${c.short}</a>`).join('')}</nav>
    <div class="courses">${COURSES.map(c => { const fee = feeC(C, c.id); return `<article class="course" id="${c.id}" data-anim>
      <div class="course-img">${img3d(c.img, c.name, '(min-width: 900px) 42vw, 100vw')}</div>
      <div class="course-b">
        <h2>${c.name}</h2>
        <ul class="facts">
          <li>${ic('solar:calendar-bold-duotone')}<span><small>Duration</small>${c.days ? c.days + ' days' : 'On enquiry'}</span></li>
          <li>${ic('solar:diploma-bold-duotone')}<span><small>Before joining</small>${c.req}</span></li>
          <li>${ic('solar:map-point-bold-duotone')}<span><small>Where</small>${C.courseMode}</span></li>
          <li>${ic('solar:wallet-money-bold-duotone')}<span><small>Fee</small>${fee ? inr(fee) : 'Ask on WhatsApp'}</span></li>
        </ul>
        <p>${c.text}</p>
        <ul class="ticks">${c.learn.map(l => `<li>${ic('solar:check-circle-bold')} ${l}</li>`).join('')}</ul>
        ${c.levels ? `<div class="levels">${c.levels.map((l, i) => `<details class="lvl"${i === 0 ? ' open' : ''}><summary><span class="lvl-n">${i + 1}</span><span><b>${l.t}</b><small>${l.d}</small></span>${ic('solar:alt-arrow-down-linear')}</summary><ul>${l.points.map(x => `<li>${x}</li>`).join('')}</ul></details>`).join('')}</div>` : ''}
        <div class="btn-row">${waBtn(C, 'btn-wa', 'Enquire on WhatsApp', 'course', c, fee)}</div>
      </div>
    </article>`; }).join('')}</div>
  </div>
</section>
<section class="sec sec-cream"><div class="wrap narrow"><h2>Common questions</h2>${faqHtml(faq)}</div></section>
<section class="sec"><div class="wrap"><div class="cta-band" data-anim><div><h2>Not sure which course is right?</h2><p>Tell us a little about yourself and we will suggest where to begin.</p></div>${waBtn(C, 'btn-wa btn-lg', 'Ask on WhatsApp', 'courseHelp')}</div></div></section>`;
  write(outFile(C, 'courses.html'), layout({ C, key: 'courses', path: u(C, '/courses'), body, alt: altFor('/courses'),
    title: isB ? 'Reiki Course in Bangalore | Level 1–3, Advance, Master & Grand Master | Certified' : 'Reiki Course in Surat | Level 1–3, Advance, Master, Grand Master, Crystal Reiki',
    desc: `Certified Usui Reiki courses in ${C.seo}: Reiki Level 1, 2 & 3, Advance Healer, Reiki Master, Grand Master, Crystal Reiki and Vedic Numerology with ${isB ? 'Dr. Varun Patel and ' : ''}Dr. Chirag Gajjar. Ask fees and batch dates on WhatsApp.`,
    schema: [bizLd(C), crumbLd([['Home', u(C, '/')], ['Courses', u(C, '/courses')]]), faqLd(faq),
      ...COURSES.map(c => ({ '@context': 'https://schema.org', '@type': 'Course', name: `${c.name} (${C.seo})`, description: c.text, provider: { '@type': 'Organization', name: SITE.name, sameAs: SITE.url },
        hasCourseInstance: { '@type': 'CourseInstance', courseMode: isB ? 'Blended' : 'Onsite', location: C.full } }))] }), { priority: '0.9' });
}

/* ================= SHOP ================= */
function shop(C) {
  const faq = [
    ['Are your crystals natural?', 'Yes. We sell only natural crystals. Each piece is checked by hand before it is charged and packed.'],
    ['What does "Reiki-charged" mean?', 'Before dispatch, Reiki Grand Master Dr. Chirag Gajjar cleanses each crystal and charges it with Reiki for the purpose it is meant for.'],
    ['How long does delivery take?', 'Orders are dispatched in 3–5 working days and delivered anywhere in India. Personal bracelets take a little longer because they are made to order.'],
    ['How do I pay?', 'UPI, debit or credit card, net banking or wallet, processed securely by Razorpay. You can also order on WhatsApp.'],
    ['Why are prices different in Bengaluru?', 'Each centre sets its own prices. You always pay the price shown for the centre you have selected.']
  ];
  const needBtns = [['all', 'All']].concat(Object.entries(INTENTS).map(([k, v]) => [k, v.label]))
    .map(([k, t]) => `<button type="button" class="fbtn" data-need="${k}" aria-pressed="${k === 'all'}">${k === 'all' ? '' : ic(INTENTS[k].icon)}${t}</button>`).join('');
  const body = `
${pageHead('Crystal shop', `Natural crystals and bracelets, Reiki-charged before dispatch.`, crumbs([['Home', u(C, '/')], ['Crystal shop', u(C, '/shop')]]))}
<section class="sec shop">
  <div class="wrap">
    <div class="filters" role="group" aria-label="Filter by need"><p class="filters-l">I need help with</p><div class="fbtns">${needBtns}</div></div>
    <div class="shop-bar">
      <div class="tabs" role="group" aria-label="Product type">${[['all', 'All'], ...Object.entries(CATS)].map(([k, t]) => `<button type="button" class="tab" data-cat="${k}" aria-pressed="${k === 'all'}">${t}</button>`).join('')}</div>
      <p class="shop-count" aria-live="polite"><span data-shop-count>${PRODUCTS.length}</span> items</p>
      <label class="sort"><span>Sort</span><select data-sort><option value="pop">Popular</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label>
    </div>
    <div class="pgrid" data-grid>${PRODUCTS.map((p, i) => pcard(C, p, BESTSELLERS.includes(p.slug) ? BESTSELLERS.indexOf(p.slug) : 10 + i)).join('')}</div>
    <p class="empty" data-empty hidden>No crystals match this filter. <button type="button" class="linkbtn" data-reset>Show all</button></p>
    <a class="pbanner" href="${u(C, '/bracelets')}" data-anim>
      <div class="pbanner-img">${img('bracelets/customized-bracelet-800', '', { w: 800, h: 800 })}</div>
      <div><h3>Want a bracelet made only for you?</h3><p>Numerology (date of birth), birth chart and customized bracelets.</p></div>
      <span class="btn btn-pri">Compare the three ${ic('solar:arrow-right-linear', 'ico-go')}</span>
    </a>
  </div>
</section>
<section class="sec sec-cream"><div class="wrap narrow"><h2>Buying crystals from ${SITE.short}</h2><p>Our bracelets, palm stones, pendulums, amethyst clusters and Vastu items are chosen and charged by our own healers, so you get the right stone for your need, not just a decoration.</p>${faqHtml(faq)}</div></section>`;
  write(outFile(C, 'shop.html'), layout({ C, key: 'shop', path: u(C, '/shop'), body, alt: altFor('/shop'),
    title: `Buy Natural Crystal Bracelets Online${C.key === 'bangalore' ? ' in Bangalore' : ' | Surat'} | Money Magnet, 7 Chakra, Citrine`,
    desc: `Shop ${PRODUCTS.length} Reiki-charged natural crystals: money magnet, citrine, black tourmaline, rose quartz and 7 chakra bracelets, amethyst clusters and more. Secure UPI and card payment. Ships across India.`,
    schema: [bizLd(C), crumbLd([['Home', u(C, '/')], ['Crystal shop', u(C, '/shop')]]), faqLd(faq)] }), { priority: '0.9' });
}

/* ================= PRODUCT ================= */
function product(C, p) {
  const pr = priceP(C, p.slug), mrp = mrpP(C, p.slug);
  const related = PRODUCTS.filter(x => x.slug !== p.slug && x.intents.some(i => p.intents.includes(i))).slice(0, 4);
  const fill = related.length < 4 ? PRODUCTS.filter(x => x.slug !== p.slug && !related.includes(x)).slice(0, 4 - related.length) : [];
  const forTxt = p.intents.map(k => `<a href="${u(C, '/shop')}?need=${k}">${INTENTS[k].label}</a>`).join(', ');
  const thumbs = p.img.length > 1 ? `<div class="pg-thumbs">${p.img.map((f, i) => `<button type="button" data-src="/assets/img/products/${f}.webp" aria-label="Show photo ${i + 1}"${i === 0 ? ' aria-current="true"' : ''}>${img('products/' + f + '-480', '')}</button>`).join('')}</div>` : '';
  const personal = p.personal === 'numerology';
  const buy = personal ? `
    <form class="pform" data-personal-form="${p.slug}">
      <p class="pform-t">Details for your reading</p>
      <label>Full name <span class="req">(as you use it)</span><input name="name" required autocomplete="name" maxlength="80"></label>
      <label>Date of birth<input name="dob" type="date" required max="${TODAY}"></label>
      <div class="buy-btns"><button class="btn btn-pri btn-lg" type="submit" name="act" value="cart">${ic('solar:bag-4-linear')} Add to cart</button><button class="btn btn-dark btn-lg" type="submit" name="act" value="buy">Buy now</button></div>
    </form>` : `
    <div class="buy" data-buy="${p.slug}">
      <div class="qty" role="group" aria-label="Quantity"><button type="button" data-q="-1" aria-label="Decrease quantity">${ic('solar:minus-circle-linear')}</button><input type="number" value="1" min="1" max="10" inputmode="numeric" aria-label="Quantity" data-qty><button type="button" data-q="1" aria-label="Increase quantity">${ic('solar:add-circle-linear')}</button></div>
      <div class="buy-btns"><button class="btn btn-pri btn-lg" type="button" data-add-qty="${p.slug}">${ic('solar:bag-4-linear')} Add to cart</button><button class="btn btn-dark btn-lg" type="button" data-buy-now="${p.slug}">Buy now</button></div>
    </div>`;
  const cr = [['Home', u(C, '/')], ['Crystal shop', u(C, '/shop')], [p.name, purl(C, p)]];
  const body = `
<section class="pdp">
  <div class="wrap">
    ${crumbs(cr)}
    <div class="pdp-in">
      <div class="pg"><div class="pg-main">${img('products/' + p.img[0], p.name, { eager: true })}</div>${thumbs}</div>
      <div class="pinfo">
        <p class="pinfo-cat">${CATS[p.cat]}</p>
        <h1>${esc(p.name)}</h1>
        <p class="pinfo-short">${esc(p.short)}</p>
        <div class="pprice"><b>${inr(pr)}</b>${mrp > pr ? `<s>MRP ${inr(mrp)}</s><span class="save">Save ${inr(mrp - pr)}</span>` : ''}</div>
        <p class="pinfo-for">Good for: ${forTxt}</p>
        ${buy}
        <ul class="pperks">
          <li>${ic('solar:hand-stars-bold-duotone')} Reiki-charged by Dr. Chirag Gajjar before dispatch</li>
          <li>${ic('solar:delivery-bold-duotone')} ${personal ? 'Made to order, dispatched within 7 working days' : 'Dispatched in 3–5 working days, anywhere in India'}</li>
          <li>${ic('solar:shield-check-bold-duotone')} Secure payment: UPI, cards, wallets</li>
        </ul>
        <a class="pask" ${waAttrs(C, 'product', p, pr)}>${ic('logos:whatsapp-icon')}<span>Not sure this is the right crystal? <b>Ask us on WhatsApp</b></span></a>
      </div>
    </div>
  </div>
</section>
<section class="sec sec-cream pdetails">
  <div class="wrap pd-in">
    <div><h2>Why people choose it</h2><ul class="ticks">${p.benefits.map(b => `<li>${ic('solar:check-circle-bold')} ${esc(b)}</li>`).join('')}</ul>${p.note ? `<p class="pnote">${esc(p.note)}</p>` : ''}</div>
    <div><h2>Details</h2><table class="spec"><tbody>
      <tr><th scope="row">Crystal</th><td>${esc(p.stone)}</td></tr>
      <tr><th scope="row">Chakra</th><td>${esc(p.chakra)}</td></tr>
      ${p.bead ? `<tr><th scope="row">${p.cat === 'bracelet' ? 'Bead size' : 'Size / type'}</th><td>${esc(p.bead)}</td></tr>` : ''}
      <tr><th scope="row">Best for</th><td>${esc(p.best)}</td></tr>
      <tr><th scope="row">Care</th><td>Keep away from perfume, soap and chemicals. Ask us how to recharge it at home.</td></tr>
    </tbody></table></div>
  </div>
</section>
<section class="sec"><div class="wrap">${sec('You may also like', '')}<div class="pgrid">${related.concat(fill).map(x => pcard(C, x)).join('')}</div></div></section>
<div class="sbuy" data-sbuy><div class="sbuy-in"><p><b>${inr(pr)}</b><span>${esc(p.name)}</span></p>${personal ? `<a class="btn btn-pri" href="#top" data-scroll-form>Personalise</a>` : `<button class="btn btn-pri" type="button" data-add="${p.slug}">${ic('solar:bag-4-linear')} Add to cart</button>`}</div></div>`;
  const ld = { '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.slug, description: p.short,
    image: p.img.map(f => `${SITE.url}/assets/img/products/${f}.webp`), brand: { '@type': 'Brand', name: SITE.name }, category: CATS[p.cat],
    offers: { '@type': 'Offer', priceCurrency: 'INR', price: String(pr), availability: 'https://schema.org/InStock', url: SITE.url + purl(C, p), itemCondition: 'https://schema.org/NewCondition' } };
  write(outFile(C, `shop/${p.slug}.html`), layout({ C, key: 'shop', path: purl(C, p), body, bodyClass: 'has-sbuy', og: `/assets/img/products/${p.img[0]}.webp`, alt: altFor(`/shop/${p.slug}`),
    title: `${p.name} – Reiki-Charged | ${inr(pr)} | Shree Sai Reiki ${C.label}`,
    desc: `${p.name} for ${p.intents.map(k => INTENTS[k].label.toLowerCase()).join(' and ')}. ${p.short} Reiki-charged by Grand Master Dr. Chirag Gajjar. ${inr(pr)}, ships across India.`.slice(0, 300),
    schema: [ld, crumbLd(cr)] }), { priority: '0.7' });
}

/* ================= PERSONAL BRACELETS ================= */
function bracelets(C) {
  const n = P['numerology-bracelet'], np = priceP(C, n.slug), nm = mrpP(C, n.slug);
  const purposes = ['Anxiety & stress relief', 'Health & healing', 'Love & relationships', 'Prosperity & abundance', 'Protection & grounding', 'Clarity & focus', 'Sleep & peace', 'Confidence & courage', 'Career & success', 'Spiritual growth'];
  const faq = [
    ['What is the difference between the three bracelets?', 'All three are made only for you. The numerology bracelet uses the numbers from your name and date of birth. The birth chart bracelet uses your kundli, so it needs your exact time and place of birth. The customized bracelet is built around the problems you want help with.'],
    ['I do not know my exact time of birth. Which should I take?', 'Take the numerology bracelet or the customized bracelet. Neither needs your birth time.'],
    ['Why is there no fixed price for the birth chart and customized bracelets?', 'The price depends on which crystals suit you. We tell you the exact price on WhatsApp before we make anything, and you decide.'],
    ['Who chooses the stones?', 'Binal Gajjar, our crystal and numerology expert. Dr. Chirag Gajjar then charges the finished bracelet with Reiki.']
  ];
  const opt = (id, im, t, s, pr) => `<a href="#${id}" data-anim>${img(im, '', { w: 480, h: 480 })}<span><b>${t}</b><small>${s}</small></span><em>${pr}</em></a>`;
  const body = `
${pageHead('DOB, numerology &amp; customized bracelets', 'Three kinds of personal bracelet. They differ only in <b>how we choose your stones</b>.', crumbs([['Home', u(C, '/')], ['Personal bracelets', u(C, '/bracelets')]]))}
<section class="sec">
  <div class="wrap">
    <div class="pick3">
      ${opt('numerology', 'products/numerology-bracelet-480', 'Numerology (DOB)', 'From your name and date of birth', inr(np))}
      ${opt('birth-chart', 'bracelets/birth-chart-bracelet-800', 'Birth Chart', 'From your kundli (needs birth time)', 'Ask')}
      ${opt('customized', 'bracelets/customized-bracelet-800', 'Customized', 'From the problems you want help with', 'Ask')}
    </div>
    <div class="quiz" data-quiz>
      <h2>Not sure? Answer two questions</h2>
      <fieldset><legend>1. Do you know your exact time of birth?</legend><label><input type="radio" name="q1" value="yes"> Yes</label><label><input type="radio" name="q1" value="no"> No</label></fieldset>
      <fieldset><legend>2. What do you want from the bracelet?</legend><label><input type="radio" name="q2" value="me"> Stones that match me</label><label><input type="radio" name="q2" value="goal"> Help with a specific problem</label></fieldset>
      <div class="quiz-out" data-quiz-out aria-live="polite" hidden></div>
    </div>
  </div>
</section>
<section class="sec sec-cream pb" id="numerology">
  <div class="wrap pb-in">
    <div class="pb-media">${img('products/numerology-bracelet', 'Numerology bracelet on the wrist')}</div>
    <div class="pb-copy">
      <span class="pb-n">1</span><h2>Numerology Bracelet</h2>
      <p class="pprice"><b>${inr(np)}</b><s>MRP ${inr(nm)}</s></p>
      <p>Our numerologist works out your birth number and life path number from your date of birth and name, and picks stones that strengthen the good and balance the weak. Pay online now; no call needed.</p>
      <form class="pform" data-personal-form="${n.slug}">
        <label>Full name<input name="name" required autocomplete="name" maxlength="80" placeholder="e.g. Priya Shah"></label>
        <label>Date of birth<input name="dob" type="date" required max="${TODAY}"></label>
        <div class="buy-btns"><button class="btn btn-pri btn-lg" type="submit" name="act" value="cart">${ic('solar:bag-4-linear')} Add to cart</button><button class="btn btn-dark btn-lg" type="submit" name="act" value="buy">Buy now</button></div>
        <p class="small">Dispatched within 7 working days. <a href="${purl(C, n)}">Product details</a></p>
      </form>
    </div>
  </div>
</section>
<section class="sec pb pb-rev" id="birth-chart">
  <div class="wrap pb-in">
    <div class="pb-media">${img('bracelets/birth-chart-bracelet', 'Crystal bracelet placed on a birth chart')}</div>
    <div class="pb-copy">
      <span class="pb-n">2</span><h2>Birth Chart Bracelet</h2>
      <p class="pprice"><span class="ptold">Price shared on WhatsApp</span></p>
      <p>We read your kundli and choose stones for the planets that need support. Send your details; we reply on WhatsApp with the stones and the price. You pay only if you want to go ahead.</p>
      <form class="pform" data-wa-form="birth">
        <label>Full name<input name="name" required autocomplete="name" maxlength="80"></label>
        <div class="f2"><label>Date of birth<input name="dob" type="date" required max="${TODAY}"></label><label>Time of birth<input name="time" type="time" required></label></div>
        <label>Place of birth<input name="place" required maxlength="80" placeholder="City, state"></label>
        <button class="btn btn-wa btn-lg" type="submit">${ic('logos:whatsapp-icon')} Send on WhatsApp</button>
      </form>
    </div>
  </div>
</section>
<section class="sec sec-cream pb" id="customized">
  <div class="wrap pb-in">
    <div class="pb-media">${img('bracelets/customized-bracelet', 'Customized bracelet made from loose crystal beads')}</div>
    <div class="pb-copy">
      <span class="pb-n">3</span><h2>Customized Bracelet</h2>
      <p class="pprice"><span class="ptold">Price shared on WhatsApp</span></p>
      <p>Tell us what you want help with. Binal Gajjar picks crystals that work together for those goals. Birth time is optional.</p>
      <form class="pform" data-wa-form="custom">
        <label>Full name<input name="name" required autocomplete="name" maxlength="80"></label>
        <fieldset class="checks"><legend>What do you want help with? <span class="req">(up to 3)</span></legend>${purposes.map(x => `<label><input type="checkbox" name="goal" value="${esc(x)}"> ${esc(x)}</label>`).join('')}</fieldset>
        <div class="f2"><label>Date of birth <span class="req">(optional)</span><input name="dob" type="date" max="${TODAY}"></label><label>Time of birth <span class="req">(optional)</span><input name="time" type="time"></label></div>
        <label>Anything else? <span class="req">(optional)</span><textarea name="note" maxlength="300" rows="3"></textarea></label>
        <button class="btn btn-wa btn-lg" type="submit">${ic('logos:whatsapp-icon')} Send on WhatsApp</button>
      </form>
    </div>
  </div>
</section>
<section class="sec"><div class="wrap narrow"><h2>Questions about personal bracelets</h2>${faqHtml(faq)}</div></section>`;
  write(outFile(C, 'bracelets.html'), layout({ C, key: 'bracelets', path: u(C, '/bracelets'), body, alt: altFor('/bracelets'),
    title: `Numerology (DOB), Birth Chart & Customized Crystal Bracelets | ${inr(np)} | Shree Sai Reiki ${C.label}`,
    desc: `Personal crystal bracelets made for you: numerology bracelet by date of birth (${inr(np)}), birth chart (kundli) bracelet and customized bracelet for your goals. Order online or on WhatsApp.`,
    schema: [crumbLd([['Home', u(C, '/')], ['Personal bracelets', u(C, '/bracelets')]]), faqLd(faq)] }), { priority: '0.8' });
}

/* ================= BOOK (roadmap wizard) ================= */
function book(C) {
  const card = (attrs, icon, t, s, extra = '') => `<button type="button" class="opt" ${attrs}>${ic(icon, 'opt-ico')}<span><b>${t}</b><small>${s}</small></span>${extra}${ic('solar:alt-arrow-right-linear', 'opt-go')}</button>`;
  const steps = ['Centre', 'Mode', 'Healing', 'Date & time', 'Details', 'Payment'];
  const body = `
<section class="phead slim"><div class="wrap">${crumbs([['Home', u(C, '/')], ['Book', u(C, '/book')]])}<h1>Book a session</h1></div></section>
<section class="sec bk-sec">
  <div class="wrap bk-wrap">
    <div class="bk" data-book data-home="${C.key}">
      <ol class="bk-prog" data-bk-prog hidden>${steps.map((s, i) => `<li data-i="${i}"><span>${i + 1}</span><em>${s}</em></li>`).join('')}</ol>

      <div class="bk-step" data-step="start">
        <h2>How would you like to start?</h2>
        <div class="opts">
          ${card('data-go="free"', 'solar:phone-calling-rounded-bold-duotone', 'Free consultation', '15-minute discovery call with a healer. No payment.')}
          ${card('data-go="loc"', 'solar:calendar-mark-bold-duotone', 'Book a healing session', 'Choose centre, healing, date and time, then pay securely.')}
        </div>
      </div>

      <div class="bk-step" data-step="free" hidden>
        <button type="button" class="bk-back" data-back>${ic('solar:alt-arrow-left-linear')} Back</button>
        <h2>Free 15-minute discovery call</h2>
        <p class="small">A healer from your chosen centre will call or WhatsApp you to fix a time.</p>
        <form class="pform" data-free-form>
          <fieldset class="seg"><legend>Centre</legend>${CL.map(x => `<label><input type="radio" name="city" value="${x.key}"${x.key === C.key ? ' checked' : ''}> ${x.label}</label>`).join('')}</fieldset>
          <div class="f2"><label>Full name<input name="name" required autocomplete="name" maxlength="80"></label>
          <label>Mobile number<input name="phone" type="tel" required inputmode="numeric" autocomplete="tel-national" pattern="[6-9][0-9]{9}" maxlength="10" placeholder="10-digit number"></label></div>
          <label>Best time to call<select name="when"><option>Morning (9 AM – 12 PM)</option><option>Afternoon (12 – 4 PM)</option><option>Evening (4 – 8 PM)</option></select></label>
          <label>What would you like help with? <span class="req">(optional)</span><textarea name="note" rows="3" maxlength="300"></textarea></label>
          <button class="btn btn-wa btn-lg btn-block" type="submit">${ic('logos:whatsapp-icon')} Request my free call</button>
        </form>
      </div>

      <div class="bk-step" data-step="loc" hidden>
        <button type="button" class="bk-back" data-back>${ic('solar:alt-arrow-left-linear')} Back</button>
        <h2>Which centre?</h2>
        <div class="opts">${CL.map(x => card(`data-set="city" data-val="${x.key}"`, 'solar:map-point-bold-duotone', x.label, x.key === 'surat' ? 'Adajan centre · since 2014' : 'Dr. Varun Patel · Reiki Grand Master')).join('')}</div>
      </div>

      <div class="bk-step" data-step="mode" hidden>
        <button type="button" class="bk-back" data-back>${ic('solar:alt-arrow-left-linear')} Back</button>
        <h2>In person or online?</h2>
        <div class="opts">
          ${card('data-set="mode" data-val="offline"', 'solar:home-smile-bold-duotone', 'In person (offline)', 'Meet the healer in person. Limited dates.')}
          ${card('data-set="mode" data-val="online"', 'solar:videocamera-record-bold-duotone', 'Online (distance healing)', 'From home on Zoom. Slots every day.')}
        </div>
      </div>

      <div class="bk-step" data-step="svc" hidden>
        <button type="button" class="bk-back" data-back>${ic('solar:alt-arrow-left-linear')} Back</button>
        <h2>Choose your healing</h2>
        <div class="opts opts-svc">${SERVICES.map(s => `<button type="button" class="opt opt-svc" data-set="service" data-val="${s.id}" data-modes="${s.modes.join(' ')}">${img(s.img + '-720', '', { w: 720, h: 480 })}<span><b>${s.name}</b><small>${s.mins} min</small></span><em data-price-of="${s.id}"></em>${ic('solar:alt-arrow-right-linear', 'opt-go')}</button>`).join('')}</div>
      </div>

      <div class="bk-step" data-step="slot" hidden>
        <button type="button" class="bk-back" data-back>${ic('solar:alt-arrow-left-linear')} Back</button>
        <h2>Pick a date and time</h2>
        <p class="small" data-slot-note></p>
        <div class="dates" data-dates role="radiogroup" aria-label="Date"></div>
        <div class="times" data-times role="radiogroup" aria-label="Time"></div>
        <button type="button" class="btn btn-pri btn-lg btn-block" data-slot-next disabled>Continue</button>
      </div>

      <div class="bk-step" data-step="you" hidden>
        <button type="button" class="bk-back" data-back>${ic('solar:alt-arrow-left-linear')} Back</button>
        <h2>Your details</h2>
        <p class="small">All fields are needed so the healer can prepare for you.</p>
        <form class="pform" data-you-form novalidate>
          <label>Full name<input name="name" required autocomplete="name" maxlength="80"></label>
          <div class="f2"><label>Mobile number<input name="phone" type="tel" required inputmode="numeric" autocomplete="tel-national" pattern="[6-9][0-9]{9}" maxlength="10" placeholder="10-digit number"></label>
          <label>Email<input name="email" type="email" required autocomplete="email" maxlength="100"></label></div>
          <div class="f2"><label>Date of birth<input name="dob" type="date" required max="${TODAY}"></label>
          <fieldset class="seg"><legend>Gender</legend><label><input type="radio" name="gender" value="Female" required> Female</label><label><input type="radio" name="gender" value="Male"> Male</label><label><input type="radio" name="gender" value="Other"> Other</label></fieldset></div>
          <label>Anything the healer should know? <span class="req">(optional)</span><textarea name="note" rows="2" maxlength="300"></textarea></label>
          <p class="co-err" data-you-err role="alert" hidden></p>
          <button class="btn btn-pri btn-lg btn-block" type="submit">Review &amp; pay</button>
        </form>
      </div>

      <div class="bk-step" data-step="pay" hidden>
        <button type="button" class="bk-back" data-back>${ic('solar:alt-arrow-left-linear')} Back</button>
        <h2>Review and pay</h2>
        <dl class="bk-sum" data-bk-sum></dl>
        <p class="co-err" data-pay-err role="alert" hidden></p>
        <button type="button" class="btn btn-pri btn-lg btn-block" data-bk-pay>${ic('solar:lock-keyhole-minimalistic-bold')} Pay <span data-bk-amt></span> securely</button>
        <p class="pay-note">UPI · Cards · Wallets · Net banking — processed by Razorpay</p>
      </div>

      <div class="bk-step bk-done" data-step="done" hidden>
        ${ic('solar:check-circle-bold', 'done-ico')}
        <h2 data-done-t>Booking confirmed</h2>
        <p data-done-p></p>
        <dl class="bk-sum" data-done-sum></dl>
        <div class="done-next" data-done-next></div>
        <div class="btn-col">
          <a class="btn btn-wa btn-lg" data-done-wa href="#" target="_blank" rel="noopener">${ic('logos:whatsapp-icon')} Send details to the centre</a>
          <div class="btn-row cal-row" data-cal hidden><a class="btn btn-out" data-gcal href="#" target="_blank" rel="noopener">${ic('logos:google-calendar')} Google Calendar</a><button type="button" class="btn btn-out" data-ical>${ic('solar:calendar-add-linear')} Apple / Outlook (.ics)</button></div>
          <a class="btn btn-out" href="${u(C, '/')}">Back to home</a>
        </div>
      </div>
    </div>
    <aside class="bk-side">
      <div class="side-box"><h2>Good to know</h2>
        <ul class="ticks"><li>${ic('solar:check-circle-bold')} Payment is processed by Razorpay. We never see your card or UPI PIN.</li><li>${ic('solar:check-circle-bold')} You get a payment receipt by SMS and email.</li><li>${ic('solar:check-circle-bold')} Online sessions: Zoom link sent on WhatsApp before your time.</li><li>${ic('solar:check-circle-bold')} Need to reschedule? WhatsApp us at least 12 hours before.</li></ul>
      </div>
      <a class="side-wa" ${waAttrs(C, 'general')}>${ic('logos:whatsapp-icon')}<span>Prefer to chat?<b>WhatsApp ${C.phone}</b></span></a>
    </aside>
  </div>
</section>`;
  write(outFile(C, 'book.html'), layout({ C, key: 'book', path: u(C, '/book'), body, alt: altFor('/book'),
    title: `Book a Reiki Session ${C.key === 'bangalore' ? 'in Bangalore' : 'in Surat'} or Online | Shree Sai Reiki`,
    desc: `Book a Reiki healing session at our ${C.label} centre or online in two minutes, or request a free 15-minute discovery call. Secure payment by UPI, card or wallet.`,
    schema: [crumbLd([['Home', u(C, '/')], ['Book', u(C, '/book')]])] }), { priority: '0.8' });
}

/* ================= SEMINAR ================= */
function seminar() {
  if (!EVENT.active) return;
  const C = CITIES.bangalore;
  const when = EVENT.date ? fmtDate(EVENT.date) + (EVENT.time ? ', ' + EVENT.time : '') : 'Shared on WhatsApp after registration';
  const faq = [
    ['Is registration free?', EVENT.fee ? `Registration is ${inr(EVENT.fee)}, paid online. Your seat is confirmed on WhatsApp.` : 'Yes. Registration is free. Your seat is confirmed on WhatsApp.'],
    ['Do I need any Reiki experience?', 'No. The seminar is open to everyone, including complete beginners.'],
    ['Can I bring family members?', 'Yes. Choose the number of seats in the form, up to 5.'],
    ['Where is the venue?', EVENT.venue ? EVENT.venue : 'The venue in Bengaluru is shared with registered guests on WhatsApp.']
  ];
  const body = `
<section class="ev-hero">
  <div class="wrap ev-in">
    <div class="ev-copy">
      ${crumbs([['Bengaluru', '/bangalore'], ['Seminar', '/bangalore/seminar']])}
      <p class="eyebrow">${ic('solar:ticket-bold-duotone')} ${esc(EVENT.kicker)}</p>
      <h1>${esc(EVENT.title)}</h1>
      <p class="lead">A live Reiki seminar in Bengaluru with Reiki Grand Master <b>Dr. Chirag Gajjar (PhD)</b> and Reiki Grand Master <b>Dr. Varun Patel (PhD)</b>. Learn simple ways to calm stress and anxiety, and receive Reiki attunement in person.</p>
      <ul class="ev-facts">
        <li>${ic('solar:calendar-bold-duotone')}<span><small>Date &amp; time</small>${when}</span></li>
        <li>${ic('solar:map-point-bold-duotone')}<span><small>Venue</small>${EVENT.venue ? esc(EVENT.venue) : 'Bengaluru (shared on WhatsApp)'}</span></li>
        <li>${ic('solar:ticket-bold-duotone')}<span><small>Registration</small>${EVENT.fee ? inr(EVENT.fee) : 'Free'}</span></li>
      </ul>
      <div class="btn-row"><a class="btn btn-pri btn-lg" href="#register">Reserve my seat ${ic('solar:arrow-down-linear')}</a><a class="btn btn-out btn-lg" href="tel:+${EVENT.whatsapp}">${ic('solar:phone-bold')} ${esc(EVENT.phone)}</a></div>
    </div>
    <div class="ev-poster">${img('events/bengaluru-seminar-poster', 'Heal Stress and Anxiety with Reiki: Bengaluru seminar poster', { w: 960, h: 1280, eager: true })}</div>
  </div>
</section>
<section class="sec-tight"><div class="wrap"><ul class="ev-stats">${STATS.map(s => `<li><b>${s[0]}</b><span>${s[1]}</span></li>`).join('')}</ul></div></section>
<section class="sec">
  <div class="wrap">
    ${sec('What you will learn', 'Six themes, in one session.')}
    <div class="topics">${EVENT.topics.map((t, i) => `<div class="topic" data-anim><span class="topic-n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(t.t)}</h3><p>${esc(t.d)}</p></div>`).join('')}</div>
    <p class="ev-ben" data-anim>${EVENT.benefits.map(b => `<span>${ic('solar:check-circle-bold')} ${esc(b)}</span>`).join('')}</p>
  </div>
</section>
<section class="sec sec-cream">
  <div class="wrap">
    ${sec('Your facilitators', '')}
    <div class="team team-2">${personCard('chirag-gajjar')}${personCard('varun-patel')}</div>
  </div>
</section>
<section class="sec" id="register">
  <div class="wrap reg-in">
    <div class="reg-copy" data-anim>
      <h2>Reserve your seat</h2>
      <p>${EVENT.fee ? `Pay ${inr(EVENT.fee)} online, then your details go to our Bengaluru team on WhatsApp.` : 'Fill in the form. Your details open in WhatsApp, ready to send to our Bengaluru team. Tap Send and we confirm your seat.'}</p>
      <p class="small">${esc(EVENT.seatsNote)}</p>
      <a class="side-wa" href="${esc(waUrl(EVENT.whatsapp, `Hello Shree Sai Reiki Bengaluru 🙏\nI want to know more about the "${EVENT.title}" seminar.\n\n[Seminar enquiry · Bengaluru · reikisurat.in]`))}" target="_blank" rel="noopener">${ic('logos:whatsapp-icon')}<span>Questions first?<b>WhatsApp ${esc(EVENT.phone)}</b></span></a>
    </div>
    <div class="reg-box">
      <form class="pform" data-seat-form novalidate>
        <div class="f2"><label>Full name<input name="name" required autocomplete="name" maxlength="80"></label>
        <label>Mobile number<input name="phone" type="tel" required inputmode="numeric" autocomplete="tel-national" pattern="[6-9][0-9]{9}" maxlength="10" placeholder="10-digit number"></label></div>
        <div class="f2"><label>Email <span class="req">(optional)</span><input name="email" type="email" autocomplete="email" maxlength="100"></label>
        <label>Seats<select name="seats">${[1, 2, 3, 4, 5].map(n => `<option>${n}</option>`).join('')}</select></label></div>
        <div class="f2"><label>Your area in Bengaluru <span class="req">(optional)</span><input name="area" maxlength="60" placeholder="e.g. Whitefield"></label>
        <label>How did you hear about us?<select name="src"><option>Poster / QR code</option><option>Instagram</option><option>Friend or family</option><option>Google</option><option>Other</option></select></label></div>
        <p class="co-err" data-seat-err role="alert" hidden></p>
        <button class="btn btn-pri btn-lg btn-block" type="submit">${EVENT.fee ? `${ic('solar:lock-keyhole-minimalistic-bold')} Pay ${inr(EVENT.fee)} &amp; reserve` : `${ic('logos:whatsapp-icon')} Confirm my seat on WhatsApp`}</button>
      </form>
      <div class="reg-done" data-seat-done hidden>
        ${ic('solar:check-circle-bold', 'done-ico')}
        <h3>Almost done</h3>
        <p>WhatsApp has opened with your details. Tap <b>Send</b> and our Bengaluru team will confirm your seat.</p>
        <a class="btn btn-wa btn-block" data-seat-wa href="#" target="_blank" rel="noopener">${ic('logos:whatsapp-icon')} Open WhatsApp again</a>
      </div>
    </div>
  </div>
</section>
<section class="sec sec-cream"><div class="wrap narrow"><h2>Questions</h2>${faqHtml(faq)}</div></section>`;
  const schema = [crumbLd([['Bengaluru', '/bangalore'], ['Seminar', '/bangalore/seminar']]), faqLd(faq)];
  if (EVENT.date) schema.push({ '@context': 'https://schema.org', '@type': 'Event', name: `${EVENT.title} – ${EVENT.kicker}`, startDate: EVENT.date, eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: EVENT.venue || 'Bengaluru', address: { '@type': 'PostalAddress', addressLocality: 'Bengaluru', addressRegion: 'Karnataka', addressCountry: 'IN' } },
    image: SITE.url + '/assets/img/events/bengaluru-seminar-poster.webp', organizer: { '@type': 'Organization', name: SITE.legal, url: SITE.url },
    performer: [{ '@type': 'Person', name: 'Dr. Chirag Gajjar' }, { '@type': 'Person', name: 'Dr. Varun Patel' }],
    offers: { '@type': 'Offer', price: String(EVENT.fee || 0), priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: SITE.url + '/bangalore/seminar' } });
  write('bangalore/seminar.html', layout({ C, key: 'seminar', path: '/bangalore/seminar', body, og: '/assets/img/events/bengaluru-seminar-poster.webp',
    alt: { surat: '/bangalore/seminar', bangalore: '/bangalore/seminar' },
    title: 'Reiki Seminar in Bangalore | Heal Stress & Anxiety with Reiki | Free Registration',
    desc: 'Bengaluru Reiki seminar with Reiki Grand Master Dr. Chirag Gajjar (PhD) and Dr. Varun Patel (PhD): attunement, distance healing, stress relief. Reserve your seat on WhatsApp +91 79751 31189.', schema }), { priority: '0.9' });
}

/* ================= ABOUT ================= */
function about(C) {
  const body = `
${pageHead('About us', `${SITE.legal}: a Reiki healing and training centre started in Surat in ${SITE.since} by Dr. Chirag Gajjar and Binal Gajjar, now also in Bengaluru.`, crumbs([['Home', u(C, '/')], ['About', u(C, '/about')]]))}
<section class="sec">
  <div class="wrap about-in">
    <div class="about-photo" data-anim>${img('people/chirag-suit', 'Dr. Chirag Gajjar, Reiki Grand Master', { w: 900, h: 1200 })}</div>
    <div data-anim>
      <p class="eyebrow">Founder</p>
      <h2>Dr. Chirag Gajjar (PhD)</h2>
      <p class="role-l">Reiki Grand Master · 11th generation, Usui lineage</p>
      <p>Dr. Chirag Gajjar has practised and taught Reiki for more than 25 years. He became a Reiki Grand Master in 2005 and started the centre in Adajan, Surat in ${SITE.since} together with Binal Gajjar, a crystal and numerology expert.</p>
      <p>Since then the centre has grown into one family of healers and students: more than 30,000 people helped and over 25,000 healing sessions given. In 2025 the centre set a world record for mass healing at the Aayush Conclave in Surat, and opened its Bengaluru branch under Dr. Varun Patel.</p>
      <ul class="about-stats">${STATS.map(s => `<li><b>${s[0]}</b><span>${s[1]}</span></li>`).join('')}<li><b>2</b><span>centres: Surat &amp; Bengaluru</span></li></ul>
    </div>
  </div>
</section>
<section class="sec sec-cream">
  <div class="wrap">
    ${sec('Our healers', '')}
    <div class="team">${[...new Set(C.team.concat(['chirag-gajjar', 'binal-gajjar', 'varun-patel', 'ajay-sonavaria', 'rohit-singh']))].map(id => personCard(id)).join('')}</div>
  </div>
</section>
${awardsBlock()}
<section class="sec sec-cream">
  <div class="wrap">
    ${sec('Moments from the centre', '')}
    <div class="moments">${MOMENTS.map(m => `<figure data-anim>${img(m.img + (m.img.includes('portrait') ? '' : '-640'), m.t)}<figcaption>${m.t}</figcaption></figure>`).join('')}</div>
  </div>
</section>
${reviewsBlock(C)}
${visitBand(C)}`;
  write(outFile(C, 'about.html'), layout({ C, key: 'about', path: u(C, '/about'), body, alt: altFor('/about'),
    title: `About Us | Dr. Chirag Gajjar, Reiki Grand Master | ${SITE.name}`,
    desc: `${SITE.legal}. Founded in Surat in ${SITE.since} by Reiki Grand Master Dr. Chirag Gajjar and Binal Gajjar; Bengaluru branch led by Dr. Varun Patel. 30,000+ lives healed, world record holders.`,
    schema: [bizLd(C), crumbLd([['Home', u(C, '/')], ['About', u(C, '/about')]]),
      ...['chirag-gajjar', 'binal-gajjar', 'varun-patel'].map(id => ({ '@context': 'https://schema.org', '@type': 'Person', name: TEAM[id].name, jobTitle: TEAM[id].role, worksFor: { '@type': 'Organization', name: SITE.legal } }))] }), { priority: '0.6' });
}

/* ================= CONTACT ================= */
function contact(C) {
  const o = other(C);
  const body = `
${pageHead(`Contact the ${C.label} centre`, 'WhatsApp is the fastest way to reach us. We usually reply within a few hours during working time.', crumbs([['Home', u(C, '/')], ['Contact', u(C, '/contact')]]))}
<section class="sec">
  <div class="wrap">
    <div class="ccards">
      <a class="cc" ${waAttrs(C, 'general')}>${ic('logos:whatsapp-icon')}<b>WhatsApp</b><span>${C.phone}</span></a>
      <a class="cc" href="tel:${C.phoneRaw}">${ic('solar:phone-calling-bold-duotone', 'cc-call')}<b>Call</b><span>${C.phone}</span></a>
      <a class="cc" href="${C.instagram}" target="_blank" rel="noopener">${ic('logos:instagram-icon')}<b>Instagram</b><span>${C.igHandle}</span></a>
      <a class="cc" href="mailto:${SITE.email}">${ic('logos:google-gmail')}<b>Email</b><span>${SITE.email}</span></a>
    </div>
    <div class="contact-in">
      <form class="pform cform" data-wa-form="contact">
        <h2>Send us a message</h2>
        <p class="small">This opens WhatsApp with your message ready to send to the ${C.label} centre.</p>
        <label>Your name<input name="name" required autocomplete="name" maxlength="80"></label>
        <label>I want to ask about<select name="topic"><option>Healing session</option><option>Reiki course</option><option>Crystals and bracelets</option><option>An order I placed</option><option>Bengaluru seminar</option><option>Something else</option></select></label>
        <label>Message<textarea name="note" rows="4" maxlength="500" required></textarea></label>
        <button class="btn btn-wa btn-lg" type="submit">${ic('logos:whatsapp-icon')} Send on WhatsApp</button>
      </form>
      <div class="contact-info">
        <h2>${C.label} centre</h2>
        ${C.addressLines.length ? `<address>${SITE.legal}<br>${C.addressLines.join('<br>')}</address>` : `<p>${C.full}. In-person sessions are by appointment only; we share the location privately on WhatsApp after you book.</p>`}
        <h3>Opening hours</h3>
        <table class="hours"><tbody>${C.hours.map(h => `<tr><th scope="row">${h[0]}</th><td>${h[1]}</td></tr>`).join('')}</tbody></table>
        <div class="other-centre"><p><b>Looking for ${o.label}?</b> ${o.phone}</p><a class="link-more" href="${u(o, '/contact')}" data-set-city="${o.key}">${o.label} contact ${ic('solar:arrow-right-linear')}</a></div>
      </div>
    </div>
  </div>
</section>
${C.mapEmbed ? `<section class="map-full"><iframe title="Map to the ${C.label} centre" src="${C.mapEmbed}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></section>` : ''}`;
  write(outFile(C, 'contact.html'), layout({ C, key: 'contact', path: u(C, '/contact'), body, alt: altFor('/contact'),
    title: `Contact | Shree Sai Reiki ${C.label} | ${C.phone}`,
    desc: `WhatsApp or call ${C.phone}. ${C.addressLines.length ? C.addressLines.join(', ') + '.' : 'Reiki centre in ' + C.full + '.'} Instagram ${C.igHandle}.`,
    schema: [bizLd(C), crumbLd([['Home', u(C, '/')], ['Contact', u(C, '/contact')]])] }), { priority: '0.7' });
}

/* ================= CHECKOUT ================= */
function checkout(C) {
  const states = ['Gujarat', 'Karnataka', 'Maharashtra', 'Rajasthan', 'Madhya Pradesh', 'Delhi', 'Tamil Nadu', 'Telangana', 'Andhra Pradesh', 'Kerala', 'West Bengal', 'Uttar Pradesh', 'Bihar', 'Punjab', 'Haryana', 'Odisha', 'Jharkhand', 'Chhattisgarh', 'Assam', 'Goa', 'Himachal Pradesh', 'Uttarakhand', 'Jammu and Kashmir', 'Chandigarh', 'Puducherry', 'Dadra and Nagar Haveli and Daman and Diu', 'Tripura', 'Meghalaya', 'Manipur', 'Mizoram', 'Nagaland', 'Arunachal Pradesh', 'Sikkim', 'Ladakh', 'Andaman and Nicobar Islands', 'Lakshadweep'];
  const body = `
<section class="phead slim"><div class="wrap"><h1>Checkout</h1><p class="small">${ic('solar:map-point-bold')} ${C.label}</p></div></section>
<section class="sec co" data-checkout>
  <div class="wrap co-in" data-co-main>
    <form class="pform co-form" data-co-form novalidate>
      <h2>1. Contact details</h2>
      <div class="f2"><label>Full name<input name="name" required autocomplete="name" maxlength="80"></label>
      <label>Mobile number<input name="phone" type="tel" required inputmode="numeric" autocomplete="tel-national" pattern="[6-9][0-9]{9}" maxlength="10" placeholder="10-digit number"></label></div>
      <label>Email <span class="req">(for the receipt)</span><input name="email" type="email" required autocomplete="email" maxlength="100"></label>
      <h2>2. Delivery address</h2>
      <label>House / flat, building, street<input name="address" required autocomplete="street-address" maxlength="200"></label>
      <div class="f3"><label>City<input name="city" required autocomplete="address-level2" maxlength="60"></label>
      <label>State<select name="state" required autocomplete="address-level1">${states.map(s => `<option${s === C.region ? ' selected' : ''}>${s}</option>`).join('')}</select></label>
      <label>PIN code<input name="pincode" required inputmode="numeric" pattern="[1-9][0-9]{5}" maxlength="6" autocomplete="postal-code"></label></div>
      <label>Note <span class="req">(optional)</span><textarea name="note" rows="2" maxlength="200"></textarea></label>
      <p class="co-err" data-co-err role="alert" hidden></p>
      <button class="btn btn-pri btn-lg btn-block" type="submit" data-pay>${ic('solar:lock-keyhole-minimalistic-bold')} Pay <span data-co-total>₹0</span> securely</button>
      <p class="pay-note">UPI, cards, net banking and wallets via Razorpay. Your card details never touch our website.</p>
      <p class="co-alt">Prefer to order by chat? <button type="button" class="linkbtn" data-wa-order>Send this order on WhatsApp</button></p>
    </form>
    <aside class="co-sum">
      <h2>Your order</h2>
      <div data-co-items></div>
      <div class="sum-row"><span>Subtotal</span><span data-co-sub>₹0</span></div>
      <div class="sum-row"><span>Shipping</span><span>${SITE.shipping ? inr(SITE.shipping) : 'Free'}</span></div>
      <div class="sum-row total"><span>Total</span><b data-co-total2>₹0</b></div>
    </aside>
  </div>
  <div class="wrap co-empty" data-co-empty hidden><h2>Your cart is empty</h2><p>Add a crystal to your cart to check out.</p><a class="btn btn-pri" href="${u(C, '/shop')}">Go to the crystal shop</a></div>
  <div class="wrap co-done" data-co-done hidden>
    ${ic('solar:check-circle-bold', 'done-ico')}
    <h2>Thank you, your order is placed</h2>
    <p>Payment received. Order reference: <b data-co-ref></b></p>
    <p>We will Reiki-charge and pack your crystals and send tracking details to your mobile number.</p>
    <div class="btn-row"><a class="btn btn-wa" data-co-wa href="#" target="_blank" rel="noopener">${ic('logos:whatsapp-icon')} Send order details on WhatsApp</a><a class="btn btn-out" href="${u(C, '/shop')}">Continue shopping</a></div>
  </div>
</section>`;
  write(outFile(C, 'checkout.html'), layout({ C, key: 'checkout', path: u(C, '/checkout'), body, noindex: true, alt: altFor('/checkout'), title: 'Checkout | Shree Sai Reiki', desc: 'Secure checkout.' }), { sitemap: false });
}

/* ================= BLOG (shared) ================= */
function blog() {
  const C = CITIES.surat;
  const cats = [...new Set(POSTS.map(p => p.category))];
  const body = `
${pageHead('Reiki &amp; healing blog', 'Practical articles on Reiki, chakras, crystals and everyday healing, from our Surat and Bengaluru centres.', crumbs([['Home', '/'], ['Blog', '/blog']]))}
<section class="sec">
  <div class="wrap">
    <div class="tabs tabs-wrap" role="group" aria-label="Filter articles">${[['all', 'All']].concat(cats.map(c => [c, c])).map(([k, t]) => `<button type="button" class="tab" data-bcat="${esc(k)}" aria-pressed="${k === 'all'}">${esc(t)}</button>`).join('')}</div>
    <div class="bgrid" data-bgrid>${POSTS.map(blogCard).join('')}</div>
  </div>
</section>`;
  write('blog.html', layout({ C, key: 'blog', path: '/blog', body, shared: true, alt: { surat: '/blog', bangalore: '/blog' },
    title: 'Reiki Blog | Reiki in Surat & Bangalore, Chakras, Healing Guides',
    desc: `${POSTS.length} articles on Reiki for beginners, Reiki courses in Bangalore and Surat, the 7 chakras, distance healing, stress, sleep and crystals.`,
    schema: [crumbLd([['Home', '/'], ['Blog', '/blog']])] }), { priority: '0.7' });

  POSTS.forEach(p => {
    const more = POSTS.filter(x => x.slug !== p.slug && x.category === p.category).slice(0, 3);
    const fill = POSTS.filter(x => x.slug !== p.slug && !more.includes(x)).slice(0, 3 - more.length);
    const picks = ['natural-7-chakra-crystal-bracelet', 'natural-black-tourmaline-crystal-bracelet', 'reiki-charged-amethyst-cluster'];
    const body = `
<article class="post">
  <header class="post-hd"><div class="wrap narrow">
    ${crumbs([['Home', '/'], ['Blog', '/blog'], [p.title, `/blog/${p.slug}`]])}
    <p class="meta">${esc(p.category)} · ${p.mins} min read · <time datetime="${p.date}">${fmtDate(p.date)}</time></p>
    <h1>${esc(p.title)}</h1>
    <p class="lead">${esc(p.excerpt)}</p>
  </div></header>
  <div class="wrap post-in">
    <div class="post-body">
      <figure class="post-img">${img(p.img.replace(/-720$/, ''), p.title, { eager: true, w: 1344, h: 896 })}</figure>
      ${p.html}
      <p class="post-by">Written by the team at ${SITE.name} (Surat &amp; Bengaluru). Reiki supports healing; it does not replace medical care.</p>
    </div>
    <aside class="post-side">
      <div class="side-box"><h2>Talk to a healer</h2><p>Questions about this topic? The first 15-minute call is free.</p><a class="btn btn-pri btn-block" href="/book?path=free">Book a free call</a><a class="btn btn-wa-out btn-block" ${waAttrs(C, 'article', p.title)}>${ic('logos:whatsapp-icon')} Ask on WhatsApp</a></div>
      <div class="side-box"><h2>Crystals that may help</h2>${picks.map(s => { const x = P[s]; return `<a class="mini" href="${purl(C, x)}">${img('products/' + x.img[0] + '-480', x.name)}<span><b>${esc(x.name)}</b><i data-pp="${x.slug}">${inr(priceP(C, x.slug))}</i></span></a>`; }).join('')}<a class="link-more" href="/shop">Visit the crystal shop ${ic('solar:arrow-right-linear')}</a></div>
    </aside>
  </div>
</article>
<section class="sec sec-cream"><div class="wrap">${sec('Read next', '')}<div class="bgrid">${more.concat(fill).map(blogCard).join('')}</div></div></section>`;
    write(`blog/${p.slug}.html`, layout({ C, key: 'blog', path: `/blog/${p.slug}`, body, shared: true, og: `/assets/img/${p.img.replace(/-720$/, '')}.webp`, alt: { surat: `/blog/${p.slug}`, bangalore: `/blog/${p.slug}` },
      title: `${p.title} | Shree Sai Reiki`, desc: p.excerpt,
      schema: [{ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.excerpt, datePublished: p.date, dateModified: p.date, image: `${SITE.url}/assets/img/${p.img.replace(/-720$/, '')}.webp`, author: { '@type': 'Organization', name: SITE.name }, publisher: { '@type': 'Organization', name: SITE.legal, logo: { '@type': 'ImageObject', url: SITE.url + '/assets/img/logo.png' } }, mainEntityOfPage: `${SITE.url}/blog/${p.slug}` },
        crumbLd([['Home', '/'], ['Blog', '/blog'], [p.title, `/blog/${p.slug}`]])] }), { priority: '0.6' });
  });
}

/* ================= POLICIES (shared) ================= */
function policies() {
  const C = CITIES.surat;
  const pol = {
    'shipping-policy': ['Shipping policy', [
      ['Where we ship', 'We ship to all PIN codes in India served by our courier partners.'],
      ['When your order is dispatched', 'Ready crystals are Reiki-charged, packed and dispatched within 3–5 working days of payment. The numerology bracelet is made to order and dispatched within 7 working days. For birth chart and customized bracelets we confirm the time on WhatsApp.'],
      ['Delivery time', 'Most orders arrive within 2–7 days after dispatch, depending on your location.'],
      ['Shipping charges', SITE.shipping ? `A shipping charge of ${inr(SITE.shipping)} is added to each order and shown before you pay.` : 'Shipping is free on all orders within India.'],
      ['Tracking', 'Once your order is dispatched we send the tracking details to the mobile number you gave at checkout.']]],
    'refund-policy': ['Returns, cancellations and refunds', [
      ['Damaged or wrong item', 'If your item arrives broken or is not what you ordered, WhatsApp us within 48 hours of delivery with photos and, if possible, an unboxing video. We will send a replacement or give a full refund.'],
      ['Order cancellations', 'You can cancel a ready-crystal order before dispatch for a full refund. Personal bracelets cannot be cancelled once we have started making them.'],
      ['Session bookings', 'You can reschedule a paid session once, free, if you tell us at least 12 hours before. For cancellations made 24 hours or more before the session, we refund the full amount.'],
      ['How refunds are paid', 'Approved refunds go back to your original payment method within 5–7 working days.'],
      ['Contact', `WhatsApp Surat ${CITIES.surat.phone} or Bengaluru ${CITIES.bangalore.phone}, or email ${SITE.email}.`]]],
    'privacy-policy': ['Privacy policy', [
      ['What we collect', 'When you order or book, we collect your name, mobile number, email, and delivery address or session details. For personal bracelets and bookings we also collect the birth details you choose to share.'],
      ['How we use it', 'Only to deliver your order or session, contact you about it and answer your questions. We do not sell or share your details with anyone except our courier partner and payment provider.'],
      ['Payments', 'Online payments are processed by Razorpay. Your card, UPI and bank details go directly to Razorpay and are never stored on our website.'],
      ['Your cart and centre choice', 'Your cart and your chosen centre are saved only in your own browser.'],
      ['Contact', `For any privacy question, email ${SITE.email}.`]]],
    'terms': ['Terms and conditions', [
      ['About us', `This website is run by ${SITE.legal}, ${CITIES.surat.street}, Surat ${CITIES.surat.pin}, Gujarat, India, with a branch in Bengaluru, Karnataka.`],
      ['Products', 'Crystals are natural, so colour, size and pattern can vary slightly from the photos.'],
      ['Health', 'Reiki, crystal therapy and our other services support your well-being. They are not medical treatment and do not replace a doctor. Do not stop any prescribed medicine.'],
      ['Prices and payment', 'All prices are in Indian rupees. Prices differ between the Surat and Bengaluru centres; you pay the price shown for the centre you selected. Payments are processed by Razorpay.'],
      ['Governing law', 'These terms are governed by the laws of India, and courts in Surat, Gujarat have jurisdiction.']]]
  };
  for (const [slug, [h1, sections]] of Object.entries(pol)) {
    const body = `${pageHead(h1, '', crumbs([['Home', '/'], [h1, `/${slug}`]]))}
<section class="sec"><div class="wrap narrow prose">${sections.map(([h, p]) => `<h2>${h}</h2><p>${esc(p)}</p>`).join('')}<p class="small">Last updated: ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p></div></section>`;
    write(`${slug}.html`, layout({ C, path: `/${slug}`, body, shared: true, alt: { surat: `/${slug}`, bangalore: `/${slug}` }, title: `${h1} | Shree Sai Reiki`, desc: `${h1} for ${SITE.legal}.` }), { priority: '0.2' });
  }
  const body = `<section class="sec nf"><div class="wrap narrow"><h1>Page not found</h1><p class="lead">The page you are looking for has moved or does not exist.</p><div class="btn-row center"><a class="btn btn-pri" href="/">Home page</a><a class="btn btn-out" href="/shop">Crystal shop</a></div></div></section>`;
  write('404.html', layout({ C, path: '/404', body, noindex: true, shared: true, title: 'Page not found | Shree Sai Reiki', desc: 'Page not found.' }), { sitemap: false });
}

/* ================= RUN ================= */
fs.rmSync(path.join(OUT, 'bangalore'), { recursive: true, force: true });
for (const C of CL) {
  home(C); healing(C); courses(C); shop(C); PRODUCTS.forEach(p => product(C, p)); bracelets(C); book(C); about(C); contact(C); checkout(C);
}
seminar(); blog(); policies();

// assets
for (const d of ['css', 'js', 'fonts']) fs.mkdirSync(path.join(OUT, 'assets', d), { recursive: true });
fs.copyFileSync(path.join(__dirname, 'style.css'), path.join(OUT, 'assets/css/style.css'));
fs.copyFileSync(path.join(__dirname, 'main.js'), path.join(OUT, 'assets/js/main.js'));
fs.copyFileSync(path.join(__dirname, 'boot.js'), path.join(OUT, 'assets/js/boot.js'));
const fontSrc = { 'manrope-latin-wght-normal.woff2': '@fontsource-variable/manrope', 'lora-latin-wght-normal.woff2': '@fontsource-variable/lora', 'lora-latin-wght-italic.woff2': '@fontsource-variable/lora' };
for (const [f, pkg] of Object.entries(fontSrc)) fs.copyFileSync(path.join(ROOT, 'node_modules', pkg, 'files', f), path.join(OUT, 'assets/fonts', f));

// client data (display only; the server never trusts these prices)
const client = {
  products: Object.fromEntries(PRODUCTS.map(p => [p.slug, { n: p.name, i: p.img[0], x: p.personal || '', p: { surat: priceP(CITIES.surat, p.slug), bangalore: priceP(CITIES.bangalore, p.slug) } }])),
  services: Object.fromEntries(SERVICES.map(s => [s.id, { n: s.name, mins: s.mins, modes: s.modes, p: { surat: priceS(CITIES.surat, s.id), bangalore: priceS(CITIES.bangalore, s.id) } }])),
  cities: Object.fromEntries(CL.map(c => [c.key, { label: c.label, wa: c.wa, phone: c.phone, prefix: c.prefix, address: c.addressLines.join(', ') }])),
  booking: BOOKING, shipping: SITE.shipping, name: SITE.name,
  event: { active: EVENT.active, fee: EVENT.fee, wa: EVENT.whatsapp, title: EVENT.title, date: EVENT.date, time: EVENT.time, venue: EVENT.venue }
};
fs.writeFileSync(path.join(OUT, 'assets/js/data.js'), `window.SSR=${JSON.stringify(client)};\n`);

// server-side price list for the payment API. Prices sent by a browser are ignored.
fs.writeFileSync(path.join(ROOT, 'api/_catalog.json'), JSON.stringify({
  shipping: SITE.shipping,
  products: Object.fromEntries(PRODUCTS.map(p => [p.slug, { name: p.name, personal: p.personal || '', price: { surat: priceP(CITIES.surat, p.slug), bangalore: priceP(CITIES.bangalore, p.slug) } }])),
  services: Object.fromEntries(SERVICES.map(s => [s.id, { name: s.name, mins: s.mins, modes: s.modes, price: { surat: priceS(CITIES.surat, s.id), bangalore: priceS(CITIES.bangalore, s.id) } }])),
  event: { active: EVENT.active, title: EVENT.title, fee: EVENT.fee || 0 },
  booking: BOOKING
}, null, 1));

// sitemap + robots
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p => `  <url><loc>${SITE.url}${p.loc}</loc><lastmod>${TODAY}</lastmod><priority>${p.priority}</priority></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /checkout\nDisallow: /bangalore/checkout\nDisallow: /api/\n\nSitemap: ${SITE.url}/sitemap.xml\n`);

// vercel.json with security headers (Content-Security-Policy allows only this site, Razorpay and Google Maps)
const csp = [
  "default-src 'self'",
  "script-src 'self' https://checkout.razorpay.com https://*.razorpay.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.razorpay.com",
  "frame-src https://*.razorpay.com https://www.google.com https://maps.google.com",
  "form-action 'self' https://*.razorpay.com",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests'
].join('; ');
const vercel = {
  $schema: 'https://openapi.vercel.sh/vercel.json', framework: null, buildCommand: '', installCommand: '', outputDirectory: 'site',
  cleanUrls: true, trailingSlash: false,
  redirects: [
    { source: '/seminar', destination: '/bangalore/seminar', permanent: false },
    { source: '/bengaluru', destination: '/bangalore', permanent: true },
    { source: '/bengaluru/:path*', destination: '/bangalore/:path*', permanent: true },
    { source: '/services', destination: '/healing', permanent: true },
    { source: '/bangalore/services', destination: '/bangalore/healing', permanent: true }
  ],
  headers: [
    { source: '/assets/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/api/(.*)', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    { source: '/(.*)', headers: [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com")' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }
    ] }
  ]
};
fs.writeFileSync(path.join(ROOT, 'vercel.json'), JSON.stringify(vercel, null, 2) + '\n');

if (missing.size) console.warn('Missing icons:', [...missing]);
console.log(`Built ${pages.length} indexed pages into site/ (v ${VERSION})`);
