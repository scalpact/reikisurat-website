# reikisurat.in: Shree Sai Yog & Reiki Healing Centre Pvt. Ltd.

A two-centre website (Surat + Bengaluru) with healing bookings, Reiki courses, a crystal shop with secure Razorpay payments, the Bengaluru seminar page, Google reviews and an SEO blog.

- **Surat** pages live at the root: `/`, `/healing`, `/courses`, `/shop`, `/bracelets`, `/book`, `/about`, `/contact`
- **Bengaluru** pages live under `/bangalore/...` with their own prices, WhatsApp (+91 79751 31189), Instagram and team (Dr. Varun Patel first)
- **Seminar:** `/bangalore/seminar` (short link `reikisurat.in/seminar`)
- **Blog:** `/blog` (shared; links and WhatsApp switch to the visitor's chosen centre)

First-time visitors on the home page see a "Which centre?" card (with a seminar shortcut for people who scanned the poster). The choice is remembered, and the header button switches centre at any time.

---

## 1. Deploy on Vercel

1. Push this folder to GitHub (the `site/` folder and `vercel.json` must be included).
2. In Vercel: **Add New → Project →** import the repo. Framework: **Other**. Leave build and install commands empty. Output directory is already set to `site` in `vercel.json`.
3. Add environment variables under **Settings → Environment Variables**:

| Name | Value |
|---|---|
| `RAZORPAY_KEY_ID` | from Razorpay Dashboard → Account & Settings → API Keys (use `rzp_test_…` first, then `rzp_live_…`) |
| `RAZORPAY_KEY_SECRET` | the secret shown with that key |
| `RAZORPAY_WEBHOOK_SECRET` | any long random text (same text goes in the Razorpay webhook) |
| `ALLOWED_HOSTS` | `reikisurat.in,www.reikisurat.in` |

4. Redeploy. Connect the domain under **Settings → Domains**.
5. In Razorpay: **Settings → Webhooks → Add**. URL `https://reikisurat.in/api/razorpay-webhook`, secret = `RAZORPAY_WEBHOOK_SECRET`, events `payment.captured`, `payment.failed`, `order.paid`.
6. Turn on **auto-capture** in Razorpay (Settings → Payment capture) so payments settle automatically.

Without keys the site still works: payment buttons offer "Send on WhatsApp" instead.

## 2. Payment security (what protects you)

- **Prices are decided on the server.** `api/create-order.js` reads prices from `api/_catalog.json` (built from `content/prices.json`). Anything the browser sends as a price is ignored, so nobody can pay ₹1 for a ₹2,249 bracelet.
- **Every payment is verified twice** in `api/verify.js`: the HMAC-SHA256 signature is checked with your secret key, then Razorpay is asked directly that the payment belongs to that order and is authorised or captured. A fake "success" from the browser fails.
- **Webhook** events are signature-checked; fake calls are rejected. Verified payments appear in Vercel → Logs, and always in your Razorpay dashboard with customer name, phone, items, booking slot and centre in the order notes.
- **Bookings are validated** on the server: real service, allowed mode, allowed date and time for that centre.
- **Only your domain** can create orders, with a rate limit against abuse.
- **Card and UPI details never touch this website**; Razorpay handles them.
- **Security headers** (Content-Security-Policy, HSTS, no framing, no sniffing) are in `vercel.json`.
- Keep `RAZORPAY_KEY_SECRET` only in Vercel. Never put it in a file or share it on WhatsApp.

## 3. Editing (then run `npm install` once, `npm run build`, and push)

| What | File |
|---|---|
| **All prices for both cities** (products, sessions, course fees) | `content/prices.json`. Bengaluru is set to 1.5× Surat; change any number. Course fee `null` shows "Ask on WhatsApp". |
| **Offers** (top bar + Offers section, auto-expire after `until`) | `content/offers.json` |
| **Seminar** date, time, venue, fee (0 = free), on/off | `content/event.json` |
| **Booking days and time slots** per centre, offline/online, holidays | `content/booking.json` |
| Phone, WhatsApp, Instagram, address, hours, team per city | `build/data.js` → `CITIES` |
| Bengaluru street address and Google review link (when ready) | `build/data.js` → `CITIES.bangalore.addressLines`, `map`, `google` |
| Courses, sessions, team bios, reviews, awards | `build/data.js` |
| Products | `content/products.json` |
| Blog posts | `content/blog/*.md` (title, date, category, excerpt at the top) |

Local preview: `npm run dev` → http://localhost:3000 (put Razorpay **test** keys in `.env`, see `.env.example`).

Note: the "Reiki in Bangalore" article mentions session prices in its text. If you change Bengaluru prices, update that sentence too.

## 4. WhatsApp: what you receive and how to reply

Every button sends a ready, item-specific message ending with a tag such as `[Course enquiry · Bengaluru · reikisurat.in]`, so staff instantly know **what** the person wants and **which centre**. Tags you will see: Course enquiry, Healing booking, Session booking (paid, with payment ref), Free discovery call, Crystal enquiry, Shop order, Birth chart bracelet, Customized bracelet, Seminar registration, Offers sign-up, Contact form.

The visitor still has to tap **Send** in WhatsApp (WhatsApp does not allow websites to send messages by themselves).

**Set these up in WhatsApp Business (both numbers): Settings → Business tools → Quick replies.**

`/course`
> Namaste 🙏 Thank you for your interest in learning Reiki with Shree Sai Yog & Reiki Healing Centre. The next batch for this course starts on ___. Fee: ₹___ (includes attunement and certificate). Timings: ___. Shall I reserve your seat?

`/session`
> Namaste 🙏 Thank you for booking with us. Your session is confirmed for ___ at ___. [Online: your Zoom link will be shared 30 minutes before.] [Centre: address & location pin below.] Please drink water and wear loose clothes. See you soon!

`/crystal`
> Namaste 🙏 Thank you for your interest in our Reiki-charged crystals. This bracelet is natural, AAA grade, and personally charged by Dr. Chirag Gajjar before dispatch. Price ₹___ with free delivery across India. Shall I send the payment link?

`/seat`
> Namaste 🙏 Your seat for "Heal Stress and Anxiety with Reiki" is confirmed. Date: ___ · Time: ___ · Venue: ___ (location pin below). Please arrive 15 minutes early. Looking forward to seeing you!

`/offers`
> Namaste 🙏 You are now on our offers list. You will receive new offers, seminars and course batches here. Reply STOP any time to leave.

**Greeting message** (Business tools → Greeting message):
> Namaste 🙏 Welcome to Shree Sai Yog & Reiki Healing Centre. Thank you for reaching out. A healer will reply shortly. Meanwhile, you can book a session at reikisurat.in/book

## 5. Sending offers to all clients

- **Website:** add an offer to `content/offers.json`; every visitor sees it, and it disappears after its `until` date.
- **WhatsApp:** people who tap "Join the list" send you an "Offers sign-up" message. Save them to a **Broadcast list** in WhatsApp Business (up to 256 contacts per list; they must have your number saved to receive broadcasts).
- **Fully automatic sending** to every client needs the WhatsApp Business API through a provider such as Interakt, WATI or AiSensy (paid per message). The site's tags make it easy to connect later.

## 6. SEO checklist after going live

1. Google Search Console: add `reikisurat.in`, submit `https://reikisurat.in/sitemap.xml`.
2. Create a **Google Business Profile for Bengaluru** (needs the address). Then add its review link in `build/data.js` → `CITIES.bangalore.google`. This is the single biggest step for ranking in "reiki Bangalore" map results.
3. Put `reikisurat.in/bangalore` in the Bengaluru Instagram bio and `reikisurat.in` in the Surat bio.
4. Ask happy clients for Google reviews (Surat page has a "Write a review" button).
5. Publish a new blog post every 2–4 weeks; Bengaluru topics help Bengaluru ranking.

Each page has its own title, description, canonical URL and structured data (LocalBusiness per city with rating, Services, Courses, Products, FAQ, Breadcrumbs, Blog posts, Event once a date is set).

## 7. Pending items (update when ready)

- **Bengaluru address:** not shown anywhere on purpose (sessions currently run from a private location). In-person bookings say "location shared privately on WhatsApp". When a centre opens, add it in `build/data.js` → `CITIES.bangalore.addressLines`, `map`, `mapEmbed`.
- **Bengaluru in-person days:** `content/booking.json` → `bangalore.offline.days` (now Fri, Sat, Sun).
- **Seminar date, time, venue:** shared by Varun bhai on WhatsApp; fill `content/event.json` later if you want them on the page.
- **Course fees:** leave `null` in `content/prices.json` until decided ("Ask on WhatsApp" shows).
- **Bengaluru Google profile:** when created, add the review link in `build/data.js` → `CITIES.bangalore.google`.
- **Surat hours:** taken from Google (Mon–Sat 10–6, Sunday closed).
- **Session refund rule** in the Refund policy: `build/build.js` → `policies()`.
