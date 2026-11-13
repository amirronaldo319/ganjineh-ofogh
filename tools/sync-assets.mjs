// Keeps cache-busting in step with file contents. Run after ANY change to a .min.css / .min.js file or to the HTML:
//   node tools/sync-assets.mjs          rewrite ?v=<hash> in every page and bump the service-worker VERSION
//   node tools/sync-assets.mjs --check  change nothing; exit 1 if anything is stale (used by the tests)
//
// Why it matters: sw.js serves any URL carrying ?v=<hex> cache-first. If a script changes but its ?v= does not, returning
// visitors keep the old script with the new HTML. ?v= is the first 8 hex digits of the file's SHA-1 (matches the original build).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const sha1 = (buf) => crypto.createHash('sha1').update(buf).digest('hex');

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'tools', 'tests', 'docs', 'test-results', 'playwright-report'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
};
const files = walk(root);
const rel = (p) => path.relative(root, p).split(path.sep).join('/');
const html = files.filter((f) => f.endsWith('.html'));
const stale = [];
let changed = 0;

// 1) ?v= on every versioned asset reference
const refRe = /(assets\/(?:css|js)\/([\w.-]+))\?v=([0-9a-f]{6,})/g;
for (const page of html) {
  const src = fs.readFileSync(page, 'utf8');
  const out = src.replace(refRe, (m, assetPath, name, old) => {
    const file = path.join(root, assetPath);
    if (!fs.existsSync(file)) { stale.push(`${rel(page)}: ${assetPath} does not exist`); return m; }
    const want = sha1(fs.readFileSync(file)).slice(0, 8);
    if (want !== old) stale.push(`${rel(page)}: ${assetPath}?v=${old} should be ${want}`);
    return `${assetPath}?v=${want}`;
  });
  if (out !== src && !check) { fs.writeFileSync(page, out); changed++; }
}

// 2) service-worker VERSION = hash of everything the browser can fetch (sw.js itself excluded)
// Only files a browser can fetch from the published site count (dev files such as package.json or the test config do not).
const published = (r) => r !== 'sw.js' && (/^(assets|tower-viewer|residences-3d|en)\//.test(r) || /^[^/]+\.(html|svg|xml|txt|ico|webmanifest)$/.test(r));
const runtime = files.filter((f) => published(rel(f))).sort();
const h = crypto.createHash('sha1');
for (const f of runtime) { h.update(rel(f)); h.update(fs.readFileSync(f)); }
const siteHash = h.digest('hex').slice(0, 12);
const swPath = path.join(root, 'sw.js');
const sw = fs.readFileSync(swPath, 'utf8');
const current = /const VERSION = '([0-9a-f]+)'/.exec(sw)?.[1];
if (current !== siteHash) stale.push(`sw.js VERSION ${current} should be ${siteHash}`);
if (!check && current !== siteHash) { fs.writeFileSync(swPath, sw.split(current).join(siteHash)); changed++; }

if (check) {
  if (stale.length) { console.error('STALE:\n  ' + stale.join('\n  ')); process.exit(1); }
  console.log('asset versions and service-worker VERSION are current');
} else {
  console.log(`updated ${changed} file(s); sw VERSION = ${siteHash}`);
}
