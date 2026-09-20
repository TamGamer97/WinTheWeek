const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const mime = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.ttf':'font/ttf', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.json':'application/json' };
http.createServer((req,res) => {
  let url;
  try { url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400); return res.end('Bad request'); }
  if (url === '/app') { res.writeHead(302,{Location:'/app/'}); return res.end(); }
  if (url.startsWith('/_expo/') || url.startsWith('/assets/')) url = '/app' + url;
  const file = path.resolve(root, '.' + url, url.endsWith('/') ? 'index.html' : '');
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file,(err,data) => { if(err) { res.writeHead(404); return res.end('Not found'); } res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream'}); res.end(data); });
}).listen(4173,'127.0.0.1',()=>console.log('WinTheWeek v2: http://localhost:4173'));
