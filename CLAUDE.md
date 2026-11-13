# Ganjineh Ofogh (برج گنجینه افق) — working notes

Static marketing site for a residential tower in Ozgol, Tehran. Persian is primary (RTL), English lives in `en/`. Hosted on GitHub Pages at `/ganjineh-ofogh/` (preview) and `ganjinehofogh.com` (production). **All links and assets must stay relative** so both work.

## Rules that matter here
- **Accuracy over spectacle.** Never invent building geometry, areas, floor counts or specifications. The tower viewer tags every fact (plan / render / assumed); keep that system. The floor count is an open question for the owner.
- **Do not rebuild this in a framework** and do not add a second scroll/animation system. Motion is hand-built on native scroll (`assets/js/motion.js`, `site.js`); pages move with native cross-document View Transitions.
- **After editing ANY asset or HTML file run `node tools/sync-assets.mjs`.** `sw.js` serves `?v=` URLs cache-first; a stale hash means returning visitors get old code. `npm test` fails if it is stale.
- Edit both `site.css` and `site.min.css` (and `x.js` + `x.min.js`) — there is no minifier step for them in this repo. `tools/build-vendor.mjs` builds only `smooth.min.js`.
- This repo is generated output (`sw.js` mentions `tools/build_site.py`, which is not here). Hand edits are lost if the site is regenerated from that source.
- Persian typography: never split Persian words into characters; keep half-spaces; no Latin letter-spacing on Persian text.
- Respect `prefers-reduced-motion`, `data-lite`, and `prefers-reduced-transparency`/`prefers-contrast`. Blur is decoration only.
- Launch state: the owner asked for the site to go public on 2026-11-13, so `robots.txt` now allows crawling and lists the sitemap (do not restore `Disallow: /`). `data-mode="preview"` is only a label (no script reads it); the visible preview notices and the disabled enquiry form are what tell visitors the truth until an enquiry backend answers `/api/status`, so leave them. The `CNAME` file is added only after DNS for ganjinehofogh.com points at GitHub Pages (adding it earlier redirects the github.io address to a domain that does not resolve).

## Commands
`npm install` · `node tools/serve.mjs` · `npm test` · `node tools/sync-assets.mjs [--check]` · `node tools/build-vendor.mjs` · `node tools/make-sitemap.mjs`

Headless CI renders WebGL in software, so 3D tests use a small viewport (see `tests/viewers.spec.mjs`).

Status and decisions: `docs/IMPLEMENTATION_STATUS.md`, `docs/GANJINEH_AUDIT.md`.
