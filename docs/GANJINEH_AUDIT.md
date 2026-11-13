# Ganjineh Ofogh — repository audit

Audited on branch `feat/ganjineh-v30-cinematic-redesign`, from baseline commit "Publish ea10915" (the only commit in the shallow clone).
Everything below was observed by running the site (Chrome, 390×844 and 1440×900, served under the GitHub Pages path `/ganjineh-ofogh/`), not inferred from file names.

## What the repository is

- A **generated, static** site: 18 Persian pages + 18 English pages under `en/`, plus `tower-viewer/` and `residences-3d/`. No bundler, no `package.json` (until this branch added dev-only tooling).
- `sw.js` says it is "built … by `tools/build_site.py`". **That generator is not in this repository.** If you regenerate the site from it, any hand edit to the HTML/CSS/JS here is overwritten. Port the changes in this branch back to the generator's sources (or commit the generator) before the next publish.
- CSS/JS ship as `site.min.css`, `site.min.js`, `motion.min.js` (+ readable twins). `?v=<sha1[0:8]>` on every asset URL, and `sw.js` serves any `?v=` URL cache-first, so **a changed asset without a new `?v=` is served stale to returning visitors**. `node tools/sync-assets.mjs` keeps this correct.
- `robots.txt` is `Disallow: /` and the contact form runs in `data-mode="preview"` (it shows "unavailable" instead of faking a submission). Both look deliberate for a pre-launch preview; they must change when the site goes live. Left untouched.

## What already exists (and was NOT rebuilt)

| Area | Present today |
|---|---|
| Page transitions | Native cross-document View Transitions (`@view-transition { navigation: auto }`), header kept as a shared element |
| Homepage motion | Pinned scroll "journey" (`--j`), day→dusk scrubber (`--p`), word-mask headings, parallax, scroll-progress hairline, magnetic buttons, long-ease in-page link glide, one rAF loop |
| Accessibility | Skip link, `prefers-reduced-motion`, a "lite" mode for data-saver/slow devices, journey skip link, RTL/LTR per page |
| Typography | Self-hosted Vazirmatn (Persian subset), Inter, Source Serif 4 |
| Icons | Inline SVG |
| Tower viewer | Provenance system (plan / render / assumed tags), 10/11/12 floor selector that surfaces the floor-count conflict, helipad, camera presets, tour, light presets, WebGL-failure message, context-loss handling |
| Residence explorer | Four apartments, walk-through, night mode, wall cut-away, plan-image fallback |
| Contact | Honest unavailable state, Persian-digit mobile validation |
| i18n | Route-aware language switch (`#lang-btn`), hreflang, canonicals, JSON-LD |

Crawl result before any change: 40 page-views, **0 broken links, 0 console errors, 0 horizontal overflow** at 390 and 1440 px.

## Gaps found and what was done

| Gap | Action |
|---|---|
| No automated tests | `tests/` (Playwright): 40 tests — every page clean (fa+en), no overflow at 7 viewports, every link/asset resolves under the Pages path, cache hashes current, service worker offline, language switch, journey/day-dusk forward **and reverse**, reduced motion, gallery, compare, contact honesty, both 3D viewers incl. WebGL-unavailable paths, smooth scroll |
| Stale-cache risk when any asset changes | `tools/sync-assets.mjs` (+ `--check`, enforced by a test) |
| No `sitemap.xml` | `tools/make-sitemap.mjs` → 34 URLs with hreflang alternates, canonical-checked by a test |
| Blurred "glass" surfaces had no opaque alternative | Fallbacks for `prefers-reduced-transparency`, `prefers-contrast: more`, `forced-colors`, and missing `backdrop-filter` (site, tower viewer, residence explorer). Tests caught that the first tower-viewer patch landed in the wrong `<style>` block; fixed |
| Tower viewer: screen-reader description missing when WebGL fails | `fail()` now fills `#alt` |
| Wheel smoothing | Lenis, desktop pointer only, see `docs/IMPLEMENTATION_STATUS.md` |

## Open questions for the owner (not decided by Claude)

1. **Floor count.** The viewer offers 10/11/12 typical floors and flags the conflict between sources. Which is correct needs the architect's plan.
2. **Generator source.** Where does `tools/build_site.py` live? See above.
3. **Go-live switches.** `robots.txt`, `data-mode="preview"`, and the enquiry API are the three things that change at launch.
