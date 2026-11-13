// Bundles the small first-party modules in tools/src/ (which import npm packages) into local, minified files under assets/js/.
// The published site never references node_modules and loads nothing from a CDN.
//   node tools/build-vendor.mjs && node tools/sync-assets.mjs
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = (n) => JSON.parse(fs.readFileSync(path.join(root, 'node_modules', n, 'package.json'), 'utf8'));
const jobs = [
  { entry: 'tools/src/smooth.js', out: 'assets/js/smooth.min.js', banner: `/* Smooth wheel scrolling. Includes lenis ${pkg('lenis').version} (MIT, darkroom.engineering). Source: tools/src/smooth.js */` },
];
for (const j of jobs) {
  await build({ entryPoints: [path.join(root, j.entry)], outfile: path.join(root, j.out), bundle: true, minify: true, format: 'iife', target: ['es2019'], legalComments: 'none', banner: { js: j.banner } });
  const buf = fs.readFileSync(path.join(root, j.out));
  console.log(`${j.out}: ${buf.length} bytes, ${zlib.gzipSync(buf).length} gzip`);
}
