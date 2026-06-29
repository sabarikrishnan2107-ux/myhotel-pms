// Tiny static web server so the receipt opens by IP from any machine on the LAN.
// No install, no admin. Run:  node pos80-serve.js
// Then open the printed URL in a browser and press Print.

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const PORT = 8080;
const ROOT = __dirname;                     // serves this folder
const HOME = 'pos80-token-sample.html';   // what "/" shows

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'text/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/' + HOME;
  const file = path.join(ROOT, rel);

  // block path traversal (../)
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found: ' + rel); return; }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, '0.0.0.0', () => {
  const ips = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  console.log('');
  console.log('  POS80 receipt server is running.  (Ctrl+C to stop)');
  console.log('  --------------------------------------------------');
  console.log('  On THIS computer :  http://localhost:' + PORT + '/');
  ips.forEach(ip => console.log('  On OTHER machine :  http://' + ip + ':' + PORT + '/'));
  console.log('  --------------------------------------------------');
  console.log('  Open that link in a browser, then press the Print button.');
  console.log('');
});
