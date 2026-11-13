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

### Round two

Same material on more surfaces. All of it lives in the second block at the end of `site.css` ("Liquid glass, round two").

| Where | What changed |
|---|---|
| Buttons (`.btn`, header CTA) | Lit rim, pointer sheen and a softer 14 px corner on every variant. Outline variants (`--ghost`, `--lineLight`) and the header CTA are true glass; the primary and light buttons keep their solid fill (contrast) |
| Filters, chips, apartment switcher | Glass at rest, solid fill when selected (`aria-pressed`) |
| Journey | Caption becomes a glass card where the text sits on the photograph (wide layouts only; a portrait phone keeps its flat panel). Journey and day/dusk progress tracks sit in a glass capsule |
| Phone menu | Page stays faintly visible behind it (88% night, 36 px blur) |
| Toast | Dark glass pill |
| Lightbox | Frosted backdrop (28 px), glass controls with a darker tint so they read on bright photos, lens refraction on Chromium, glass caption (hidden when empty) |

Fallbacks follow the same rule as before: reduced transparency, higher contrast and forced colors give opaque surfaces (the journey card becomes a solid dark panel). Reduced motion keeps the static glass on buttons and pills; the plain journey list gets no card. Pointer sheen now also covers the buttons, filters, apartment switcher, header CTA and lightbox controls. Tests: `tests/glass2.spec.mjs` (10); they fail against the previous CSS. Full suite: 72 passing.

Cost: the glass caption card is the one new surface with a measurable price. Scrolling the pinned journey in this workspace (software rendering, no GPU) takes about 10% longer per frame with the card than without; the progress capsules and everything else are in the noise. Real GPUs handle one blurred 560x300 region far more cheaply, but this was not measured on a phone, so check the journey on a mid-range Android before launch. Lite devices (`data-lite`) never get the card.

Not glassed on purpose: form fields (legibility first), the side dots (hidden labels make their box wider than the dots), and the custom cursor ring (a moving backdrop filter every frame is not worth it).

Known limits: the refraction needs Chromium, because `backdrop-filter: url()` is not implemented elsewhere; Safari and Firefox get the blur material without it, and those two were not tested here (no such browsers in this workspace). Nested backdrop filters inside the blurred header cannot sample page imagery, which is why the header buttons have no lens. On the mobile journey section the back-to-top disc can pass over the skip pill for a moment while scrolling; the glass makes that visible, it does not hide the pill.

Tests: `tests/glass.spec.mjs` (10). Lighthouse (mobile, local, two runs): accessibility 100, SEO 100, performance 74-83 against 75-82 before, CLS 0. Cost: about +1 KB gzip in `site.min.css` (25.1 KB) and +1 KB in `motion.min.js` (6.1 KB). Source for the CSS block is the "Liquid glass" section at the end of `site.css`; as before, the `.min` files were edited by hand.

## Speed pass: looping decoration pauses off screen

Finding (headless Chrome, software rendering, idle page, 1440x900, 3 runs each): with nothing happening the page used 12-17% of one CPU core at every scroll position, almost none of it script. Switching off every CSS/Web Animation took that to about 3.6%, so the cost was the endless decoration itself: 16 motes, hero light drift, marquee, star twinkle, live pulses, the wordmark gleam. Chrome keeps ticking (and, for `box-shadow` and `background-position`, repainting) those loops even when the element is thousands of pixels off screen. No single loop dominated (the motes were the biggest, about 2-3 points).

Fix: one block in `motion.js` ("endless decoration only runs while it can be seen"). Every animation on the page clock that loops forever is paused while its element is more than 200 px outside the viewport and resumed on return, with its phase kept. Scroll-driven animations (they use their own timeline) and one-shot entrances are never touched, and only animations paused by this block are resumed by it. Loops that start later are picked up when scrolling settles. Nothing here runs under reduced motion or `data-lite`, which return before it.

Result (same rig, before -> after, idle CPU of one core): scrollY 3000: 13.0-13.9% -> 0.1%; 9500: 15.4-17.3% -> 0.1-0.3%; 14815: 11.9-13.0% -> 0.1-0.4%; top of page: 11.2-14.9% -> 7.4-11.3% (the hero's own loops are on screen there and still run). Tests: `tests/offscreen-motion.spec.mjs` (4). Full suite: 76 passing.

What this does not fix: the first-load path was already light (about 790 KB, no third-party requests); what a visitor in Iran feels from GitHub Pages' US hosting, and how iPhone Safari handles the blur layers, cannot be measured from this workspace.

## Liquid glass V20: shared tokens, a floating capsule header, three signature surfaces

Branch `design/ganjineh-liquid-glass-v20`, local only: not committed, pushed or deployed. `robots.txt` and `data-mode="preview"` are untouched.

**Token layer.** One block at the end of `site.css` / `site.min.css` defines `--glass-*` (blur 12/20/26 px, saturation 1.7, fills, rims, radii 14/28 px, shadows, timings) and a recipe that every new surface uses: `--g-fill / --g-blur / --g-bright / --g-radius` in, `background + backdrop-filter + inset rim + sheen` out. Five variants exist as classes: `.glass--clear`, `--pearl`, `--frost`, `--midnight`, `--champagne`. The round-one and round-two surfaces were not refactored onto the tokens.

**Surfaces.**
- Header: the full-width bar is only a footprint (`pointer-events: none`); `.header__in` is a floating pearl capsule. Scroll changes its density, never its geometry. The theme/language buttons and the champagne "private visit" capsule sit inside it and deliberately have no `backdrop-filter` of their own (one backdrop layer per surface; a nested blur would only sample the capsule). The reading-progress hairline moved inside the capsule's lower edge. The gliding `.nav__ind` is now a champagne pill.
- Garden panel (`.bleed__in`): a frost panel on the photograph.
- Closing invitation (`.visit`): a midnight glass panel over the existing dusk tower photograph. The photo is injected by `motion.js` only when the band has no picture, is `aria-hidden`, lazy, carries the same "Concept render" label as other renders, is not injected at all in reduced-motion or lite mode (the panel then sits on the plain dark band), and is hidden by CSS under reduced transparency / higher contrast / forced colours.
- Phone menu: the scrim is the overlay; the glass is the `nav` panel (a `clip-path` on `.menu` would have made the glass sample only itself, so it was removed). A tap on the scrim closes it (`site.js`, one line).

**Fallbacks.** `prefers-reduced-transparency`, `prefers-contrast: more` and `forced-colors` make every V20 surface an opaque panel; `html[data-lite]` makes the garden panel a solid dark panel with no blur; browsers without `backdrop-filter` get the opaque tinted fill.

**Contrast (measured, not asserted by a test).** Each surface was screenshotted twice, once normally and once with all text made transparent; the text colour is compared with the real backdrop pixels under each text line (2nd/98th percentile = worst case), at 1440 px and 390 px, day and dusk themes. Header nav links, worst case: day top 8.4:1, day over the garden 4.8:1, day over the dark band 8.3:1, dusk top 10.4:1, dusk over the garden 7.9:1, dusk over the band 9.0:1. Garden panel 7.7-11.3:1; invitation panel 5.3-5.5:1. Resting nav links are now `#36423c` (day) and `#ded9cc` (dusk); hover and current keep `--ink`. An earlier version of the measurement counted anti-aliased glyph edges as background and under-reported the header by about 2:1; it was replaced by the two-screenshot method above. The scripts are scratch and not in the repo.

**Tests.** `tests/glass-v20.spec.mjs` (new, 30 cases across tokens, header fit at 12 widths in both languages, panels, reduced motion, phone menu, higher contrast, lite mode). Three older assertions that expected every header control to blur on its own were changed to the one-backdrop-per-surface rule (`glass.spec.mjs` x2, `glass2.spec.mjs` x1).

**Size.** `site.min.css` +1.9 KB gzip (25.8 -> 27.8 KB), `motion.min.js` +0.35 KB gzip, `site.min.js` +0.02 KB. No new dependencies, no new image files.

**Idle CPU** (same rig as the speed pass, 2 runs each, % of one core; previous HEAD vs V20): top of page 7.5 / 11.1 vs 7.0 / 6.6; scrollY 3000 0.1 / 0.1 vs 0.1 / 0.1; 9500 0.4 / 0.3 vs 0.2 / 0.1; 14815 0.1 / 0.1 vs 0.1 / 0.1. This is idle cost only; scrolling and paint cost on a real GPU was not measured.

**Not verified.** Safari/WebKit and Firefox (only Chromium was run); real iPhone cost of the capsule, the garden panel and the invitation panel (backdrop blur is the expensive part there; the capsule is always on). Absolute CPU figures from the software-rendered headless browser overstate GPU cost.

## Launch (2026-11-13)

`robots.txt` now allows crawling and points at `https://ganjinehofogh.com/sitemap.xml`. Canonical, `og:url` and sitemap URLs already used ganjinehofogh.com. `data-mode="preview"` was left as is: nothing reads it, and the preview notices plus the disabled enquiry form stay until `/api/status` reports `acceptingEnquiries`. No `CNAME` yet: it must be added only after DNS points ganjinehofogh.com at GitHub Pages.

Open before this is a complete launch: (1) DNS and HTTPS for ganjinehofogh.com; (2) the site shows no phone, email or messenger contact, so until the enquiry backend exists visitors have no way to reach sales; (3) the floor count.

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
