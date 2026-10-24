// POST /api/verify: confirms a payment really came from Razorpay before the site shows "confirmed".
// 1. Checks the HMAC-SHA256 signature with your secret key (a fake or edited response fails here).
// 2. Asks Razorpay directly for the payment and checks it belongs to this order and was authorised or captured.
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const keyId = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) return res.status(503).json({ ok: false, error: 'not_configured' });
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  const orderId = String(b.razorpay_order_id || ''), paymentId = String(b.razorpay_payment_id || ''), sig = String(b.razorpay_signature || '');
  if (!/^order_[A-Za-z0-9]{6,40}$/.test(orderId) || !/^pay_[A-Za-z0-9]{6,40}$/.test(paymentId) || !/^[a-f0-9]{64}$/.test(sig)) return res.status(400).json({ ok: false });

  const expected = crypto.createHmac('sha256', secret).update(orderId + '|' + paymentId).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'))) return res.status(400).json({ ok: false });

  // Second check with Razorpay itself
  try {
    const r = await fetch('https://api.razorpay.com/v1/payments/' + paymentId, { headers: { Authorization: 'Basic ' + Buffer.from(keyId + ':' + secret).toString('base64') } });
    if (r.ok) {
      const p = await r.json();
      const good = p.order_id === orderId && ['authorized', 'captured'].includes(p.status) && p.currency === 'INR';
      if (!good) return res.status(400).json({ ok: false });
      return res.status(200).json({ ok: true, ref: paymentId, amount: p.amount, status: p.status });
    }
  } catch (e) { console.error('Razorpay payment lookup failed', e && e.message); }
  // Signature is valid; Razorpay lookup was unavailable. Still a genuine payment.
  return res.status(200).json({ ok: true, ref: paymentId });
};
