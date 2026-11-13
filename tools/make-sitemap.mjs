// Writes sitemap.xml from each page's own <link rel="canonical"> and hreflang alternates (no dates or priorities are invented).
// Skips 404 and thank-you pages. Run: node tools/make-sitemap.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = [...fs.readdirSync(root).filter((f) => f.endsWith('.html')), ...fs.readdirSync(path.join(root, 'en')).filter((f) => f.endsWith('.html')).map((f) => 'en/' + f)]
  .filter((f) => !/(^|\/)(404|thank-you)\.html$/.test(f)).sort();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const entries = [];
for (const page of pages) {
  const src = fs.readFileSync(path.join(root, page), 'utf8');
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(src)?.[1];
  if (!canonical) { console.warn('no canonical, skipped:', page); continue; }
  const alts = [...src.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => ({ lang: m[1], href: m[2] }));
  entries.push(`  <url>\n    <loc>${esc(canonical)}</loc>\n` + alts.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.lang}" href="${esc(a.href)}"/>`).join('\n') + '\n  </url>');
}
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(root, 'sitemap.xml'), xml);
console.log(`sitemap.xml: ${entries.length} URLs`);
