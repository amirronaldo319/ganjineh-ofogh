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

## "More alive, more Apple-like" pass

The site already had the cinematic layer (scroll-exit hero, count-ups, tilt, cursor ring, journey and day-to-dusk scrubbers), so this pass added only what was missing and fixed one defect. No new library; everything runs on the existing `motion.js` rAF loop and `site.js`.

| Change | Where | Notes |
|---|---|---|
| Statement reveal | `motion.js` (`lit` + `frame()`), `.quote.is-lit .sw > i` in `site.css` | The home page's key sentence lights up word by word, in reading order, as it crosses the screen (Persian split by word only). `--qp` / `--qn` drive it. Floor opacity .3, fully lit once the line is above the middle. Not applied with reduced motion, lite mode or no JS. |
| Live Tehran light | `data-live-light` chip in the day-to-dusk heading (both home pages), IIFE in `site.js` | Shows Tehran time and the next sunrise or sunset, from the standard low-precision solar series for 35.6944 N, 51.4215 E at a fixed UTC+03:30. Astronomy only; says nothing about the building. Matches published Tehran tables to within 2 minutes (tested). Persian digits on the Persian page, Latin on `/en/`. Updates every 15 s while the tab is visible. |
| Side-dots clearance | `@media (min-width:1180px) and (max-width:1719px)` rule in `site.css` | Below 1720 px the active section label overlapped the page content (measured: label reached x = 114 px, content starts at 48-60 px). It now shows on hover or focus there and stays visible beside the dot on wider screens. |

Tests: `tests/live.spec.mjs` (12). Full suite: 52 passing. `site.css` / `site.min.css`, `site.js` / `site.min.js` and `motion.js` / `motion.min.js` were edited in pairs; the minified JS was spliced by hand (no minifier step in this repo), so regenerate both from the source when `build_site.py` is recovered.

Not done: auto day/dusk theme by time of day (the page already follows `prefers-color-scheme`), pointer spotlight on more cards (the apartment cards and the visit band already have one).

## Liquid glass pass

One shared material instead of a different blur on every control. It is plain CSS `backdrop-filter` (tint + blur + saturate + brightness) with a lit rim made of inset shadows, a soft sheen that follows the pointer, and an opaque fallback. The `@dpawlikowski/liquid-glass` package was **not** used: it duplicates the page behind each surface as a static layer and runs an always-animating turbulence filter, which is the wrong trade on a long scrolling page with photographs.

| Where | What it looks like |
|---|---|
| Header buttons (theme, language, menu) | Round glass discs; hover lifts the glass instead of turning it solid; sheen follows the pointer (fine pointers only) |
| Sticky header | Glass once the page has scrolled (`.is-stuck`), light and dark variants, dusk theme included |
| Back-to-top, "Launch" dot | Round lenses. On Chromium with more than 4 cores they also **refract**: `backdrop-filter: url(#of-lens)` with an `feDisplacementMap` fed by a canvas-generated 96x96 map (data URI, no extra request). Checked with a striped backdrop: the stripes bend at the rim, so it is real refraction and not a blur with a highlight |
| Photo captions (`.kind`, `.crown .frame .tag`), journey skip, `.scrub__live` chip, visit card, mobile sticky CTA | Same material, blur 12-22 px |
| Tower viewer (`.iconbtn`, `.pill`, `.card`) | Same material, `@supports`-guarded |

Rules kept: everything sits inside `@supports (backdrop-filter...)`. `prefers-reduced-transparency`, `prefers-contrast: more` and `forced-colors` restore opaque surfaces with no blur, no sheen and no lens. Reduced motion keeps the static glass but drops the lens filter and the pointer script (the back-to-top button is part of the motion layer, so it does not exist there). Lite devices (`data-lite`) are handled by the same early return.

Known limits: the refraction needs Chromium, because `backdrop-filter: url()` is not implemented elsewhere; Safari and Firefox get the blur material without it, and those two were not tested here (no such browsers in this workspace). Nested backdrop filters inside the blurred header cannot sample page imagery, which is why the header buttons have no lens. On the mobile journey section the back-to-top disc can pass over the skip pill for a moment while scrolling; the glass makes that visible, it does not hide the pill.

Tests: `tests/glass.spec.mjs` (10). Full suite: 62 passing. Lighthouse (mobile, local, two runs): accessibility 100, SEO 100, performance 74-83 against 75-82 before, CLS 0. Cost: about +1 KB gzip in `site.min.css` (25.1 KB) and +1 KB in `motion.min.js` (6.1 KB). Source for the CSS block is the "Liquid glass" section at the end of `site.css`; as before, the `.min` files were edited by hand.

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
