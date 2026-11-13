// Functional checks for the static Ganjineh Ofogh site. Run: npm test   (served under /ganjineh-ofogh/ like GitHub Pages)
// These test behaviour that exists today; they do not assume features that are not in the repository.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const FA = fs.readdirSync(root).filter((f) => f.endsWith('.html') && f !== '404.html');
const EN = fs.readdirSync(path.join(root, 'en')).filter((f) => f.endsWith('.html') && f !== '404.html').map((f) => 'en/' + f);
const PAGES = [...FA, ...EN];

/** Collects console errors, page errors and failed/4xx requests. /api/status is expected to 404 on a static host. */
function watch(page) {
  const bad = [], errs = [];
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('/api/status')) bad.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', (r) => { if (!/ERR_ABORTED/.test(r.failure()?.errorText || '')) bad.push(`FAIL ${r.url()}`); }); // aborted = navigated away mid-request
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errs.push(m.text()); });
  return { bad, errs };
}

test.describe('pages', () => {
  test('every page (fa + en) loads clean with correct language and direction', async ({ page }) => {
    test.setTimeout(240_000);
    const seen = watch(page);
    for (const p of PAGES) {
      await page.goto(p, { waitUntil: 'load' });
      const info = await page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir, h1: document.querySelectorAll('h1').length, main: !!document.querySelector('main'), title: document.title }));
      const en = p.startsWith('en/');
      expect(info.lang, p).toBe(en ? 'en' : 'fa');
      expect(info.dir, p).toBe(en ? 'ltr' : 'rtl');
      expect(info.h1, p).toBeGreaterThanOrEqual(1);
      expect(info.main, p).toBe(true);
      expect(info.title.length, p).toBeGreaterThan(5);
    }
    expect(seen.bad).toEqual([]);
    expect(seen.errs).toEqual([]);
  });

  for (const [w, h] of [[375, 812], [390, 844], [430, 932], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]) {
    test(`no horizontal overflow at ${w}x${h}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: w, height: h });
      for (const p of ['index.html', 'residences.html', 'residence-1.html', 'compare.html', 'gallery.html', 'contact.html', 'en/index.html', 'en/residence-3.html']) {
        await page.goto(p, { waitUntil: 'load' });
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(over, `${p} @${w}`).toBeLessThanOrEqual(0);
      }
    });
  }

  test('every internal link and asset reference resolves under the GitHub Pages project path', async ({ page, request, baseURL }) => {
    test.setTimeout(240_000);
    const targets = new Map();
    for (const p of PAGES) {
      await page.goto(p, { waitUntil: 'domcontentloaded' });
      const urls = await page.evaluate(() => [...document.querySelectorAll('a[href], link[href], script[src], img[src], source[srcset]')]
        .flatMap((e) => e.tagName === 'SOURCE' ? e.srcset.split(',').map((s) => s.trim().split(/\s+/)[0]) : [e.href || e.src])
        .filter(Boolean));
      for (const u of urls) {
        const url = new URL(u, page.url()); url.hash = '';
        if (url.origin === new URL(baseURL).origin) targets.set(url.href, p);
      }
    }
    const broken = [];
    for (const [u, from] of targets) {
      if (u.includes('/api/')) continue;
      const r = await request.get(u);
      if (r.status() >= 400) broken.push(`${r.status()} ${u} (from ${from})`);
    }
    expect(broken).toEqual([]);
  });

  test('sitemap lists only pages that exist, with matching canonicals', async () => {
    const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThanOrEqual(30);
    for (const loc of locs) {
      let rel = new URL(loc).pathname.replace(/^\//, '');
      if (rel === '' || rel.endsWith('/')) rel += 'index.html';
      expect(fs.existsSync(path.join(root, rel)), loc).toBe(true);
      expect(fs.readFileSync(path.join(root, rel), 'utf8'), loc).toContain(`<link rel="canonical" href="${loc}"`);
    }
  });
});

test.describe('cache safety', () => {
  test('?v= hashes and the service-worker VERSION match the files', () => {
    execFileSync('node', ['tools/sync-assets.mjs', '--check'], { cwd: root, stdio: 'pipe' }); // throws (non-zero exit) if anything is stale
  });

  test('service worker installs, caches under its VERSION and serves a visited page offline', async ({ page, context }) => {
    test.setTimeout(90_000);
    const version = /const VERSION = '([0-9a-f]+)'/.exec(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'))[1];
    await page.goto('index.html?sw=1', { waitUntil: 'load' });                 // the page registers the worker only on https or with ?sw=1
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => page.evaluate(() => caches.keys()), { timeout: 20_000 }).toContain('ofogh-' + version);
    await page.reload({ waitUntil: 'load' });
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible();
    await context.setOffline(false);
  });
});

test.describe('navigation and language', () => {
  test('Persian navigation reaches the residences page and browser history returns', async ({ page }) => {
    await page.goto('index.html');
    await page.locator('nav.nav a[href$="residences.html"]').first().click();
    await expect(page).toHaveURL(/residences\.html$/);
    await page.goBack();
    await expect(page).toHaveURL(/index\.html$|\/$/);
  });

  for (const p of ['residence-2.html', 'compare.html', 'contact.html']) {
    test(`language switch keeps the equivalent page: ${p}`, async ({ page }) => {
      await page.goto(p);
      await page.locator('#lang-btn').click();
      await expect(page).toHaveURL(new RegExp(`en/${p.replace('.', '\\.')}`));
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await page.locator('#lang-btn').click();
      await expect(page).toHaveURL(new RegExp(`/${p.replace('.', '\\.')}(\\?.*)?$`));   // compare keeps its choice in the query
      await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    });
  }
});

test.describe('homepage cinematic sections', () => {
  test('hero renders the architecture image', async ({ page }) => {
    await page.goto('index.html');
    const ok = await page.locator('.hero img').first().evaluate((i) => i.complete && i.naturalWidth > 0);
    expect(ok).toBe(true);
  });

  test('journey skip link jumps past the pinned section', async ({ page }) => {
    await page.goto('index.html');
    await page.locator('#journey').scrollIntoViewIfNeeded();
    await page.locator('.journey__skip').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#daydusk$/);
    const top = await page.locator('#daydusk').evaluate((e) => e.getBoundingClientRect().top);
    expect(Math.abs(top)).toBeLessThan(200);
  });

  test('journey and day-to-dusk progress advance on scroll and reverse on scroll back', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('index.html');
    const readJ = () => page.locator('#journey').evaluate((e) => parseFloat(e.style.getPropertyValue('--j') || '0'));
    const readP = () => page.locator('#daydusk').evaluate((e) => parseFloat(e.style.getPropertyValue('--p') || '0'));
    const jTop = await page.locator('#journey').evaluate((e) => e.getBoundingClientRect().top + scrollY);
    const dTop = await page.locator('#daydusk').evaluate((e) => e.getBoundingClientRect().top + scrollY);
    await page.evaluate((y) => scrollTo(0, y), jTop);
    await page.waitForTimeout(250);
    const j0 = await readJ();
    await page.evaluate((y) => scrollTo(0, y), jTop + 1400);
    await expect.poll(readJ).toBeGreaterThan(j0 + 0.5);
    await page.evaluate((y) => scrollTo(0, y), jTop);
    await expect.poll(readJ).toBeLessThan(0.3);
    await page.evaluate((y) => scrollTo(0, y), dTop);
    await page.waitForTimeout(250);
    const p0 = await readP();
    await page.evaluate((y) => scrollTo(0, y), dTop + 900);
    await expect.poll(readP).toBeGreaterThan(p0 + 0.1);
    const pMid = await readP();
    await page.evaluate((y) => scrollTo(0, y), dTop + 300);
    await expect.poll(readP).toBeLessThan(pMid);
  });
});

test.describe('motion preferences', () => {
  test.use({ reducedMotion: 'reduce' });
  test('with reduced motion no scroll-progress bar or word-split animation is added, and content stays visible', async ({ page }) => {
    await page.goto('index.html');
    await expect(page.locator('#header .progress')).toHaveCount(0);
    await expect(page.locator('h1').first()).toBeVisible();
    const hidden = await page.locator('main section').evaluateAll((els) => els.filter((e) => getComputedStyle(e).visibility === 'hidden' || getComputedStyle(e).opacity === '0').length);
    expect(hidden).toBe(0);
  });
});

test.describe('motion on', () => {
  test('without a reduced-motion preference the progress hairline is present', async ({ page }) => {
    await page.goto('index.html');
    await expect(page.locator('#header .progress')).toHaveCount(1);
  });
});

test.describe('gallery, comparison, contact', () => {
  test('gallery lightbox opens, steps to the next image and closes with Escape', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('gallery.html');
    const fig = page.locator('.gal figure:not([hidden])').first();
    await fig.scrollIntoViewIfNeeded();
    await fig.click();
    await expect(page.locator('#lb')).toHaveAttribute('open', '');
    const first = await page.locator('#lb-cap').textContent();
    await page.locator('#lb-next').click();
    await expect(page.locator('#lb-cap')).not.toHaveText(first || '');
    await page.keyboard.press('Escape');
    await expect(page.locator('#lb')).not.toHaveAttribute('open', '');
  });

  test('comparison shows exactly the two chosen apartments and states the difference', async ({ page }) => {
    await page.goto('compare.html');
    await page.selectOption('#cmp-a', '1');
    await page.selectOption('#cmp-b', '3');
    const visible = await page.locator('#cmp-table [data-apt]:not([hidden])').evaluateAll((els) => [...new Set(els.map((e) => e.dataset.apt))].sort());
    expect(visible).toEqual(['1', '3']);
    expect((await page.locator('#cmp-diff').textContent()).trim().length).toBeGreaterThan(10);
  });

  test('contact form is honest on a host with no enquiry backend: no fake success, submit disabled', async ({ page }) => {
    await page.goto('contact.html');
    await expect(page.locator('#form-status')).toHaveAttribute('data-kind', 'unavailable');
    await expect(page.locator('[data-submit-label]')).toBeDisabled();
    await expect(page).toHaveURL(/contact\.html/);
  });

  test('mobile number validation accepts Persian digits and rejects junk', async ({ page }) => {
    await page.goto('contact.html');
    await page.fill('#mobile', '۰۹۱۲۳۴۵۶۷۸۹');
    await expect(page.locator('#mobile-error')).toHaveText('');
    await page.fill('#mobile', '12345');
    await expect(page.locator('#mobile-error')).not.toHaveText('');
  });
});
