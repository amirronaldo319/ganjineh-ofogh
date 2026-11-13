// Tiny static server for local testing. Mimics GitHub Pages: unknown paths get /404.html with status 404.
//   node tools/serve.mjs                         -> http://127.0.0.1:4173/
//   SITE_BASE=/ganjineh-ofogh/ node tools/serve.mjs  -> http://127.0.0.1:4173/ganjineh-ofogh/   (the GitHub Pages project path)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 4173);
const base = '/' + (process.env.SITE_BASE || '/').replace(/^\/+|\/+$/g, '') + (process.env.SITE_BASE && process.env.SITE_BASE !== '/' ? '/' : '');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.avif': 'image/avif', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon',
};

function resolve(urlPath) {
  if (!urlPath.startsWith(base)) return null;
  let rel = decodeURIComponent(urlPath.slice(base.length));
  let file = path.join(root, rel);
  if (!file.startsWith(root + path.sep) && file !== root) return null;      // no path traversal
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/' && base !== '/') { res.writeHead(302, { Location: base }); res.end(); return; }
  const file = resolve(url.pathname);
  if (file) {
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  } else {
    const nf = path.join(root, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : 'Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`serving ${root} at http://127.0.0.1:${port}${base}`));
