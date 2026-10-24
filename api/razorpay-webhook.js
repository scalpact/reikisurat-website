// POST /api/razorpay-webhook: Razorpay calls this after every payment, even if the customer closes the browser.
// Set it up in Razorpay Dashboard → Settings → Webhooks with the URL https://reikisurat.in/api/razorpay-webhook,
// events payment.captured, payment.failed and order.paid, and a secret you also save in Vercel as RAZORPAY_WEBHOOK_SECRET.
// Every event is checked with that secret, so fake calls are rejected. Verified events appear in Vercel → Logs.
const crypto = require('crypto');

async function rawBody(req) {
  // Read the untouched stream (do not read req.body first: Vercel would parse it and the signature would no longer match)
  if (typeof req.rawBody === 'string') return req.rawBody; // local dev-server
  const chunks = []; for await (const ch of req) chunks.push(ch);
  return Buffer.concat(chunks).toString('utf8');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ ok: false, error: 'not_configured' });
  const raw = await rawBody(req);
  const sig = String(req.headers['x-razorpay-signature'] || '');
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  if (!/^[a-f0-9]{64}$/.test(sig) || !crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'))) return res.status(400).json({ ok: false });
  let ev = {}; try { ev = JSON.parse(raw); } catch (e) { return res.status(400).json({ ok: false }); }
  const p = ev.payload && ev.payload.payment && ev.payload.payment.entity || {};
  console.log('[razorpay]', JSON.stringify({ event: ev.event, payment: p.id, order: p.order_id, amount: p.amount / 100, status: p.status, method: p.method, notes: p.notes }));
  return res.status(200).json({ ok: true });
};
// Keep the raw body for signature checking
module.exports.config = { api: { bodyParser: false } };
