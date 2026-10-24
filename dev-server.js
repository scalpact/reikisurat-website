// Local preview with working /api routes:  npm run dev  → http://localhost:3000
// Put Razorpay TEST keys in a .env file next to this script (see .env.example).
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, 'site'), PORT = process.env.PORT || 3000;
try { fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n').forEach(l => { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }); } catch (e) { }
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.ics': 'text/calendar' };
const REDIRECTS = { '/seminar': '/bangalore/seminar', '/bengaluru': '/bangalore', '/services': '/healing' };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^a-z-]/g, '');
    const file = path.join(__dirname, 'api', name + '.js');
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end('{}'); }
    let raw = ''; req.on('data', d => raw += d); req.on('end', async () => {
      req.rawBody = raw;
      try { req.body = raw ? JSON.parse(raw) : {}; } catch (e) { req.body = {}; }
      res.status = c => { res.statusCode = c; return res; };
      res.json = o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
      delete require.cache[require.resolve(file)];
      try { await require(file)(req, res); } catch (e) { console.error(e); res.statusCode = 500; res.end('{}'); }
    });
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (REDIRECTS[p]) { res.writeHead(302, { Location: REDIRECTS[p] }); return res.end(); }
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  let f = path.join(ROOT, p);
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f + '.html') && (!fs.existsSync(f) || fs.statSync(f).isDirectory())) f += '.html';
  else if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(path.join(ROOT, '404.html'))); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log(`Site running at http://localhost:${PORT}  (payments ${process.env.RAZORPAY_KEY_ID ? 'ON' : 'OFF: add test keys to .env'})`));
