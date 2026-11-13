# Implementation status — Apple-style upgrade (V30 / V35 / V1.0 prompts)

Branch: `feat/ganjineh-v30-cinematic-redesign`. Nothing is pushed to production. Statuses use the wording the prompts asked for.

## The eight projects

| # | Project | npm package / version | Status | Why |
|---|---|---|---|---|
| 1 | adrianhajdin/iphone (reference) | — (not installed, by design) | **Reference studied, techniques already present** | The site already has pinned scroll storytelling (`--j` journey), a scroll-scrubbed day→dusk scene, masked word reveals and a WebGL tower viewer, all hand-built on native scroll. Nothing from the iPhone clone's React/GSAP architecture was missing or worth the weight. No Apple assets used. |
| 2 | GSAP + ScrollTrigger | `gsap` 3.15.1 (license: GSAP "no charge" standard license, **not MIT**) | **Installed but not integrated** | Measured: core 27.9 KB gzip, +ScrollTrigger 45.6 KB gzip, against 12.2 KB gzip for all existing site JS. The existing rAF scroll code already drives every scroll effect, with reverse scrolling tested. Adding GSAP would create a second animation system (the prompts forbid that) for no visible gain. |
| 3 | Lenis | `lenis` 1.3.27 (MIT) | **Installed and integrated** | `tools/src/smooth.js` → `assets/js/smooth.min.js` (6.1 KB gzip, local, deferred). Desktop fine pointers only; off for reduced motion, lite mode, touch, `?smooth=0`, open dialogs, horizontal rails and the 3D viewer pages. Existing scroll-driven sections keep working because Lenis moves the native scroll position. In-page link glide stays with `motion.js`. 7 tests. |
| 4 | Liquid Glass | `@dpawlikowski/liquid-glass` 0.3.0 (MIT); `@tomagranate/liquid-glass` 0.0.2 exists but was not installed | **Installed but not integrated; CSS glass kept** | Per its README it refracts a *duplicated static scene layer* (`--lg-scene-background`) with an always-animating `feTurbulence` filter. It cannot refract live photography scrolling under a sticky header or a WebGL canvas, and animated SVG turbulence repaints continuously. The site's header and viewer controls already use `backdrop-filter` blur + saturate (verified visually over photography). What was added: opaque fallbacks for reduced transparency, high contrast, forced colors and no-`backdrop-filter` browsers. |
| 5 | Swup | `swup` 4.10.0 (MIT) | **Installed but not integrated** | The site already transitions between pages with native cross-document View Transitions (header persists). Swup (7.5 KB gzip core) would need every page script re-initialised after each swap and would interact with the service worker, the language switch and both WebGL viewers. Native transitions have no such risk and degrade to plain navigation. |
| 6 | SplitType | `split-type` 0.3.4 (ISC; last published Oct 2023) | **Installed but not integrated** | `motion.js` already splits headlines into word masks (Persian-safe: whole words, no character splitting). SplitType's character mode breaks Persian joining. |
| 7 | Lucide | `lucide` 1.72.0 (ISC) | **Installed but not integrated** | Icons are inline SVG already; six Lucide icons would cost 1.9 KB gzip but replacing consistent existing marks would not improve anything the audit could measure. Available if wanted. |
| 8 | Fontsource | not installed | **Not installed** | Fonts are already self-hosted (Vazirmatn Persian subset, Inter, Source Serif 4). Fontsource would only re-ship the same files. |

Dev-only additions: `esbuild` (bundling `tools/src/*`), `@playwright/test` (tests). None of them is referenced by any published page; the site still needs no build step.

## Measured sizes (esbuild, minified, gzip)

gsap core 27.9 KB · gsap+ScrollTrigger 45.6 KB · lenis 5.7 KB · swup 7.5 KB · split-type 4.5 KB · lucide ×6 icons 1.9 KB · liquid-glass JS 1.2 KB + CSS 4.3 KB · existing: site.min.js 7.1 KB, motion.min.js 5.1 KB, site.min.css 24.1 KB.

## Commands

```
npm install                 # dev tooling only
node tools/serve.mjs        # http://127.0.0.1:4173/   (SITE_BASE=/ganjineh-ofogh/ to mimic GitHub Pages)
npm test                    # Playwright against the Pages path (set CHROME_PATH if Playwright's browsers aren't installed)
node tools/build-vendor.mjs # rebuild assets/js/smooth.min.js from tools/src/smooth.js
node tools/sync-assets.mjs  # REQUIRED after editing any asset or page: refreshes ?v= hashes and the service-worker VERSION
node tools/make-sitemap.mjs # regenerate sitemap.xml
```

## Next, if you want more

1. Port these changes into the missing `tools/build_site.py` source (see audit).
2. Decide the floor count with the architect's plan, then pin the viewer to it.
3. Real-device checks: iPhone Safari (cross-document view transitions need Safari 18.2+; older versions fall back to normal navigation) and a real GPU for the tower viewer.
