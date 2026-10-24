// POST /api/create-order: creates a Razorpay order for a shop cart, a session booking or a seminar seat.
// SECURITY: the amount is always calculated here from _catalog.json (built from content/prices.json).
// Any price, total or amount sent by the browser is ignored, so nobody can change what they pay.
const CATALOG = require('./_catalog.json');

const CITIES = ['surat', 'bangalore'];
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const phoneOf = v => clean(v, 15).replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
const isEmail = v => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(v);
const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v + 'T00:00:00Z'));

// Light abuse protection: max 15 order attempts per IP every 10 minutes (per server instance).
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 10 * 60e3, list = (hits.get(ip) || []).filter(t => now - t < win);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 15;
}
function sameOrigin(req) {
  const origin = req.headers.origin; if (!origin) return true; // same-origin fetches in some browsers omit it
  let host; try { host = new URL(origin).host; } catch (e) { return false; }
  const allowed = (process.env.ALLOWED_HOSTS || '').split(',').map(s => s.trim()).filter(Boolean);
  return host === req.headers.host || host === req.headers['x-forwarded-host'] || allowed.includes(host);
}

// Today in India, as YYYY-MM-DD
const istToday = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

function slotAllowed(city, mode, date, time) {
  const B = CATALOG.booking, cfg = B && B[city] && B[city][mode];
  if (!cfg || !isDate(date) || !/^\d{2}:\d{2}$/.test(time) || !cfg.times.includes(time)) return false;
  if ((B[city].closed || []).includes(date)) return false;
  const dow = new Date(date + 'T00:00:00Z').getUTCDay();
  if (cfg.dates && cfg.dates.length ? !cfg.dates.includes(date) : !cfg.days.includes(dow)) return false;
  const start = new Date(`${date}T${time}:00+05:30`).getTime(), now = Date.now();
  if (start < now + (B.minHoursNotice || 0) * 3600e3 - 15 * 60e3) return false; // small grace for slow checkouts
  const last = new Date(istToday() + 'T00:00:00+05:30').getTime() + ((B.daysAhead || 21) + 1) * 86400e3;
  return start < last;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!sameOrigin(req)) return res.status(403).json({ error: 'forbidden' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket && req.socket.remoteAddress || '').split(',')[0].trim();
  if (limited(ip)) return res.status(429).json({ error: 'too_many', message: 'Too many attempts. Please wait a few minutes and try again.' });
  const keyId = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) return res.status(503).json({ error: 'not_configured', message: 'Online payment is not set up yet.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body && typeof body === 'object' ? body : {};
  const type = String(body.type || 'shop'), city = String(body.city || '');
  if (!CITIES.includes(city)) return res.status(400).json({ error: 'bad_city', message: 'Please choose Surat or Bengaluru.' });
  const c = body.customer || {};
  const bad = m => res.status(400).json({ error: 'bad_request', message: m });

  let amount = 0; const notes = { type, centre: city };

  if (type === 'shop') {
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length || items.length > 30) return bad('Your cart is empty.');
    const lines = [];
    for (const it of items) {
      const p = CATALOG.products[it && it.slug], qty = parseInt(it && it.qty, 10);
      if (!p || !(qty >= 1 && qty <= 10)) return bad('An item in your cart is no longer available. Please refresh the page.');
      let label = p.name;
      if (p.personal) {
        const name = clean(it.opts && it.opts.name, 80), dob = clean(it.opts && it.opts.dob, 10);
        if (name.length < 2 || !isDate(dob)) return bad('Please add the name and date of birth for your personal bracelet.');
        label += ` [${name}, DOB ${dob.split('-').reverse().join('-')}]`;
      }
      amount += p.price[city] * qty;
      lines.push(`${label} x${qty}`);
    }
    amount += CATALOG.shipping || 0;
    const cu = { name: clean(c.name, 80), phone: phoneOf(c.phone), email: clean(c.email, 100), address: clean(c.address, 200), city: clean(c.city, 60), state: clean(c.state, 60), pincode: clean(c.pincode, 6), note: clean(c.note, 200) };
    if (cu.name.length < 2 || !/^[6-9]\d{9}$/.test(cu.phone) || !isEmail(cu.email) || !/^[1-9]\d{5}$/.test(cu.pincode) || cu.address.length < 5 || cu.city.length < 2) return bad('Please check your name, mobile number, email and address.');
    const t = lines.join('; ');
    Object.assign(notes, { name: cu.name, phone: cu.phone, email: cu.email, address: `${cu.address}, ${cu.city}, ${cu.state} - ${cu.pincode}`.slice(0, 255), items_1: t.slice(0, 255), items_2: t.slice(255, 510), items_3: t.slice(510, 765), note: cu.note });

  } else if (type === 'booking') {
    const s = CATALOG.services[String(body.service || '')], mode = String(body.mode || ''), date = String(body.date || ''), time = String(body.time || '');
    if (!s) return bad('Please choose a healing session.');
    if (!s.modes.includes(mode)) return bad('This session is not available in that mode.');
    if (!slotAllowed(city, mode, date, time)) return bad('That date or time is no longer available. Please pick another slot.');
    const cu = { name: clean(c.name, 80), phone: phoneOf(c.phone), email: clean(c.email, 100), dob: clean(c.dob, 10), gender: clean(c.gender, 10), note: clean(c.note, 250) };
    if (cu.name.length < 2 || !/^[6-9]\d{9}$/.test(cu.phone) || !isEmail(cu.email) || !isDate(cu.dob) || cu.dob >= istToday() || !['Female', 'Male', 'Other'].includes(cu.gender)) return bad('Please check your name, mobile number, email, date of birth and gender.');
    amount = s.price[city];
    Object.assign(notes, { service: `${s.name} (${s.mins} min)`, mode: mode === 'online' ? 'Online (Zoom)' : 'In centre', slot: `${date} ${time} IST`, name: cu.name, phone: cu.phone, email: cu.email, dob: cu.dob, gender: cu.gender, note: cu.note });

  } else if (type === 'event') {
    const ev = CATALOG.event, seats = parseInt(body.seats, 10);
    if (!ev || !ev.active || !(ev.fee > 0)) return bad('Registration for this event does not need payment.');
    if (city !== 'bangalore' || !(seats >= 1 && seats <= 5)) return bad('Please choose 1 to 5 seats.');
    const cu = { name: clean(c.name, 80), phone: phoneOf(c.phone), email: clean(c.email, 100), area: clean(c.area, 60), src: clean(c.src, 40) };
    if (cu.name.length < 2 || !/^[6-9]\d{9}$/.test(cu.phone) || (cu.email && !isEmail(cu.email))) return bad('Please check your name and mobile number.');
    amount = ev.fee * seats;
    Object.assign(notes, { event: ev.title.slice(0, 200), seats: String(seats), name: cu.name, phone: cu.phone, email: cu.email, area: cu.area, source: cu.src });

  } else return bad('Unknown order type.');

  if (!(amount >= 1 && amount <= 500000)) return bad('This order amount is not allowed.');
  Object.keys(notes).forEach(k => { if (!notes[k]) delete notes[k]; else notes[k] = String(notes[k]).slice(0, 255); });

  try {
    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(keyId + ':' + secret).toString('base64') },
      body: JSON.stringify({ amount: Math.round(amount * 100), currency: 'INR', receipt: `${type[0]}${city[0]}_${Date.now()}`, notes })
    });
    const data = await r.json();
    if (!r.ok) { console.error('Razorpay order error', r.status, data && data.error && data.error.description); return res.status(502).json({ error: 'gateway', message: 'The payment gateway did not respond. Please try again in a minute.' }); }
    return res.status(200).json({ orderId: data.id, amount: data.amount, currency: data.currency, keyId, ref: data.receipt });
  } catch (e) {
    console.error('Razorpay request failed', e && e.message);
    return res.status(502).json({ error: 'gateway', message: 'The payment gateway did not respond. Please try again in a minute.' });
  }
};
