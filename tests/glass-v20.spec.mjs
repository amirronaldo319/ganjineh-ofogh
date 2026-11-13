// Liquid glass V20: token layer, floating capsule header, champagne active-route pill, frost panel over the garden photograph,
// the closing invitation panel over a dusk photograph, the phone menu as a glass panel, and how each one switches itself off.
import { test, expect } from '@playwright/test';

const cores = (n) => ({ page }) => page.addInitScript((c) => Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => c }), n);
const style = (page, sel, prop, pseudo) => page.locator(sel).first().evaluate((e, [p, ps]) => getComputedStyle(e, ps || null)[p], [prop, pseudo]);
const blurs = (v) => /blur\(/.test(v);
const jump = (page, y) => page.evaluate((v) => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, v); }, y);
const rect = (page, sel) => page.locator(sel).first().evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right }; });

test.describe('token layer', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test('the shared glass tokens exist and the five variants resolve', async ({ page }) => {
    await page.goto('index.html');
    const t = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return ['--glass-blur-sm', '--glass-blur-md', '--glass-blur-lg', '--glass-sat', '--glass-rim-light', '--glass-shadow-floating', '--glass-radius-panel', '--glass-clear-fill', '--glass-pearl-fill', '--glass-frost-fill', '--glass-midnight-fill', '--glass-champagne-fill', '--glass-t-fast', '--glass-t-normal']
        .filter((k) => !cs.getPropertyValue(k).trim());
    });
    expect(t, 'missing tokens').toEqual([]);
    const fills = await page.evaluate(() => ['clear', 'pearl', 'frost', 'midnight', 'champagne'].map((v) => {
      const e = document.createElement('div'); e.className = 'glass glass--' + v; document.body.appendChild(e);
      const cs = getComputedStyle(e); const o = { v, bg: cs.backgroundColor, blur: cs.backdropFilter, r: cs.borderTopLeftRadius }; e.remove(); return o;
    }));
    expect(new Set(fills.map((f) => f.bg)).size, 'five different fills').toBe(5);
    for (const f of fills) expect(/blur\(/.test(f.blur), `${f.v} blurs`).toBe(true);
    expect(fills.find((f) => f.v === 'frost').r).toBe('28px');
  });
});

test.describe('floating header (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.beforeEach(async ({ page }) => { await cores(8)({ page }); });

  test('a pearl capsule inset from the viewport; the bar behind it takes no clicks', async ({ page }) => {
    await page.goto('index.html?smooth=0');
    const cap = await rect(page, '.header__in');
    expect(cap.x, 'inset from the left edge').toBeGreaterThanOrEqual(20);
    expect(1440 - cap.r, 'inset from the right edge').toBeGreaterThanOrEqual(20);
    expect(cap.h).toBe(64);
    expect(await style(page, '.header__in', 'borderTopLeftRadius')).toBe('999px');
    expect(blurs(await style(page, '.header__in', 'backdropFilter'))).toBe(true);
    expect(await style(page, '.header__in', 'boxShadow')).toContain('inset');
    expect(await style(page, '.header', 'pointerEvents')).toBe('none');
    expect(await style(page, '.header__in', 'pointerEvents')).toBe('auto');
  });

  test('scrolling changes the density, never the geometry', async ({ page }) => {
    await page.goto('index.html?smooth=0');
    const top = await rect(page, '.header__in'); const bg0 = await style(page, '.header__in', 'backgroundColor');
    await jump(page, 700);
    await expect(page.locator('#header')).toHaveClass(/is-stuck/);
    const scrolled = await rect(page, '.header__in');
    expect({ y: scrolled.y, h: scrolled.h, x: scrolled.x, w: scrolled.w }).toEqual({ y: top.y, h: top.h, x: top.x, w: top.w });
    await expect.poll(() => style(page, '.header__in', 'backgroundColor')).not.toBe(bg0);
  });

  test('nested controls keep their rim but drop their own blur (one backdrop layer)', async ({ page }) => {
    await page.goto('index.html');
    expect(await style(page, '.header__in .tools .tool', 'backdropFilter')).toBe('none');
    expect(await style(page, '.header__in .nav a.cta', 'backdropFilter')).toBe('none');
    expect(await style(page, '.header__in .tools .tool', 'boxShadow')).toContain('inset');
  });

  test('the booking button is champagne glass, the active route is a champagne pill that sits on the current link', async ({ page }) => {
    await page.goto('residences.html');
    await expect.poll(() => style(page, '.nav a.cta', 'backgroundColor'), { message: 'champagne fill (after the colour transition)' }).toMatch(/^rgba\(214, 186, 128, 0\.\d+\)$/);
    expect(await style(page, '.nav a.cta', 'borderTopLeftRadius')).toBe('999px');
    const ind = page.locator('.nav__ind');
    await expect.poll(() => ind.evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
    expect(await ind.evaluate((e) => getComputedStyle(e).backgroundColor)).toMatch(/^rgba\(214, 186, 128, 0\.\d+\)$/);
    const cur = await rect(page, '.nav a[aria-current="page"]');
    const pill = await ind.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x, r: r.right }; });
    expect(pill.x, 'pill starts before the link text').toBeLessThan(cur.x);
    expect(pill.r, 'pill ends after the link text').toBeGreaterThan(cur.r);
    expect(Math.abs((pill.x + pill.r) / 2 - (cur.x + cur.r) / 2), 'centred on the link').toBeLessThan(3);
  });

  test('the reading-progress line lives inside the capsule', async ({ page }) => {
    await page.goto('index.html?smooth=0');
    const cap = await rect(page, '.header__in');
    const bar = await rect(page, '.progress');
    expect(bar.x).toBeGreaterThan(cap.x); expect(bar.r).toBeLessThan(cap.r);
    expect(bar.y).toBeLessThan(cap.y + cap.h); expect(bar.y).toBeGreaterThan(cap.y + cap.h - 14);
  });
});

for (const [lang, base] of [['Persian', ''], ['English', 'en/']]) {
  test.describe(`header fits at every width (${lang})`, () => {
    for (const w of [320, 390, 768, 1024, 1200, 1280, 1440]) {
      test(`${w}px`, async ({ page }) => {
        await page.setViewportSize({ width: w, height: 800 });
        await page.goto(`${base}index.html?smooth=0`);
        const { cap, inner, over } = await page.evaluate(() => {
          const c = document.querySelector('.header__in').getBoundingClientRect();
          const kids = [...document.querySelectorAll('.header__in .brand, .header__in .nav a, .header__in .tools .tool')].filter((e) => e.getBoundingClientRect().width > 0);
          return { cap: { l: c.left, r: c.right }, inner: { l: Math.min(...kids.map((e) => e.getBoundingClientRect().left)), r: Math.max(...kids.map((e) => e.getBoundingClientRect().right)) }, over: document.documentElement.scrollWidth > innerWidth };
        });
        expect(inner.l, 'content inside the capsule (left)').toBeGreaterThanOrEqual(cap.l + 6);
        expect(inner.r, 'content inside the capsule (right)').toBeLessThanOrEqual(cap.r - 6);
        expect(over, 'no horizontal overflow').toBe(false);
        const tool = await page.locator('.tools .tool').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getBoundingClientRect().width));
        const min = w <= 380 ? 40 : w < 1200 ? 44 : 42;
        for (const tw of tool) expect(tw, 'touch target').toBeGreaterThanOrEqual(min);
      });
    }
  });
}

test.describe('photograph panels (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.beforeEach(async ({ page }) => { await cores(8)({ page }); });

  test('garden caption: frost panel that really sits over the picture', async ({ page }) => {
    await page.goto('index.html?smooth=0');
    await page.locator('#landscape').scrollIntoViewIfNeeded();
    expect(blurs(await style(page, '.bleed__in', 'backdropFilter'))).toBe(true);
    expect(await style(page, '.bleed__in', 'borderTopLeftRadius')).toBe('28px');
    expect(await style(page, '.bleed__in', 'backgroundColor')).toMatch(/^rgba\(12, 20, 17, 0\.4\d*\)$/);
    const panel = await rect(page, '.bleed__in'), pic = await rect(page, '.bleed img');
    expect(panel.x).toBeGreaterThanOrEqual(pic.x); expect(panel.r).toBeLessThanOrEqual(pic.r);
    expect(panel.y).toBeGreaterThanOrEqual(pic.y); expect(panel.y + panel.h).toBeLessThanOrEqual(pic.y + pic.h);
  });

  test('closing invitation: a dark glass panel over a dusk photograph that carries the render label', async ({ page }) => {
    await page.goto('index.html?smooth=0');
    await page.locator('#visit').scrollIntoViewIfNeeded();
    const fig = page.locator('.visit__bg');
    await expect(fig).toHaveCount(1);
    await expect(fig).toHaveAttribute('aria-hidden', 'true');
    await expect(fig.locator('img')).toHaveAttribute('alt', '');
    await expect(fig.locator('img')).toHaveClass(/is-loaded/, { timeout: 15_000 });
    await expect.poll(() => fig.locator('img').evaluate((i) => i.naturalWidth)).toBeGreaterThan(400);
    await expect(fig.locator('.kind')).toHaveText('تصویرسازی مفهومی');
    const pseudo = await page.locator('.visit__grid').evaluate((e) => { const c = getComputedStyle(e, '::before'); return { f: c.backdropFilter, r: c.borderTopLeftRadius, bg: c.backgroundColor }; });
    expect(blurs(pseudo.f)).toBe(true); expect(pseudo.r).toBe('32px'); expect(pseudo.bg).toMatch(/^rgba\(9, 15, 13, 0\.5\d*\)$/);
    // the actions stay inside the panel
    const panel = await page.locator('.visit__grid').evaluate((e) => { const c = e.getBoundingClientRect(); return { l: c.left, r: c.right }; });
    const btn = await rect(page, '.visit__acts .btn');
    expect(btn.x).toBeGreaterThan(panel.l); expect(btn.r).toBeLessThan(panel.r);
    // links still work
    await expect(page.locator('.visit__acts a').first()).toHaveAttribute('href', 'contact.html');
  });

  test('English: the label is English and the picture path resolves from /en/', async ({ page }) => {
    await page.goto('en/index.html?smooth=0');
    await page.locator('#visit').scrollIntoViewIfNeeded();
    const fig = page.locator('.visit__bg');
    await expect(fig.locator('.kind')).toHaveText('Concept render');
    await expect.poll(() => fig.locator('img').evaluate((i) => i.naturalWidth)).toBeGreaterThan(400);
  });
});

test.describe('the picture is decoration: reduced motion keeps the plain dark band', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  test('no picture is injected, the panel stays readable', async ({ page }) => {
    await page.goto('index.html?smooth=0');
    await page.locator('#visit').scrollIntoViewIfNeeded();
    await expect(page.locator('.visit__bg')).toHaveCount(0);
    expect(await page.locator('.visit__grid').evaluate((e) => getComputedStyle(e, '::before').backgroundColor)).toMatch(/^rgba\(9, 15, 13/);
  });
});

test.describe('phone menu as a glass panel', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test.beforeEach(async ({ page }) => { await cores(8)({ page }); });

  test('opens as a rounded panel over a scrim, the page stays visible, and it closes three ways', async ({ page }) => {
    await page.goto('index.html?smooth=0');
    const btn = page.locator('#menu-btn');
    await btn.tap();
    await expect(page.locator('#menu')).toHaveClass(/open/);
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.menu nav')).toHaveCSS('opacity', '1');
    expect(await style(page, '.menu', 'clipPath'), 'no clip-path (it would hide the page from the glass)').toBe('none');
    expect(await style(page, '.menu', 'backdropFilter'), 'the scrim is not a full-screen blur').toBe('none');
    expect(blurs(await style(page, '.menu nav', 'backdropFilter'))).toBe(true);
    expect(await style(page, '.menu nav', 'borderTopLeftRadius')).toBe('30px');
    const nav = await rect(page, '.menu nav');
    expect(nav.x).toBeGreaterThanOrEqual(8); expect(390 - nav.r).toBeGreaterThanOrEqual(8);
    expect(nav.y + nav.h, 'page shows below the panel').toBeLessThan(844 - 60);
    expect((await page.locator('.menu nav a').count()), 'every route is still there').toBe(9);
    // the close button sits exactly where the menu button was
    const close = await rect(page, '#menu-close'), was = await rect(page, '#menu-btn');
    expect(Math.abs(close.x - was.x)).toBeLessThan(3); expect(Math.abs(close.y - was.y)).toBeLessThan(3);
    // 1. the close button
    await page.locator('#menu-close').tap();
    await expect(page.locator('#menu')).not.toHaveClass(/open/);
    await expect(btn).toBeFocused();
    // 2. Escape
    await btn.tap(); await expect(page.locator('#menu')).toHaveClass(/open/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#menu')).not.toHaveClass(/open/);
    // 3. a tap on the scrim around the panel
    await btn.tap(); await expect(page.locator('#menu')).toHaveClass(/open/);
    await page.touchscreen.tap(195, 830);
    await expect(page.locator('#menu')).not.toHaveClass(/open/);
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  test('a link closes the menu and still navigates', async ({ page }) => {
    await page.goto('index.html?smooth=0');
    await page.locator('#menu-btn').tap();
    await expect(page.locator('#menu')).toHaveClass(/open/);
    await page.locator('.menu nav a[href="gallery.html"]').tap();
    await expect(page).toHaveURL(/gallery\.html/);
  });

  test('on a small phone the panel scrolls instead of clipping', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('index.html?smooth=0');
    await page.locator('#menu-btn').tap();
    await expect(page.locator('#menu')).toHaveClass(/open/);
    const sc = await page.locator('#menu').evaluate((e) => ({ s: e.scrollHeight, c: e.clientHeight, oy: getComputedStyle(e).overflowY }));
    expect(sc.oy).toBe('auto');
    const last = await page.locator('.menu nav a').last().evaluate((e) => { e.scrollIntoView(); const r = e.getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; });
    expect(last, 'the last route can be reached').toBe(true);
  });
});

test.describe('higher contrast turns the V20 surfaces opaque', () => {
  test.use({ viewport: { width: 1440, height: 900 }, contrast: 'more' });
  test('header, garden panel, invitation panel', async ({ page }) => {
    await cores(8)({ page });
    await page.goto('index.html?smooth=0');
    expect(await style(page, '.header__in', 'backdropFilter')).toBe('none');
    expect(await style(page, '.header__in', 'backgroundImage')).toBe('none');
    await expect.poll(() => style(page, '.header__in', 'backgroundColor'), { message: 'solid once the colour transition ends' }).toBe('rgb(242, 239, 230)');
    expect(await style(page, '.bleed__in', 'backdropFilter')).toBe('none');
    expect(await style(page, '.bleed__in', 'backgroundColor')).toBe('rgb(15, 26, 22)');
    const p = await page.locator('.visit__grid').evaluate((e) => { const c = getComputedStyle(e, '::before'); return { f: c.backdropFilter, bg: c.backgroundColor }; });
    expect(p.f).toBe('none'); expect(p.bg).toBe('rgb(15, 26, 22)');
    await page.locator('#visit').scrollIntoViewIfNeeded();
    expect(await page.locator('.visit__bg').evaluate((e) => getComputedStyle(e).display), 'the photograph is hidden').toBe('none');
  });
  test('phone menu panel is solid', async ({ page }) => {
    await cores(8)({ page });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('index.html?smooth=0');
    await page.locator('#menu-btn').click();
    expect(await style(page, '.menu nav', 'backdropFilter')).toBe('none');
    expect(await style(page, '.menu nav', 'backgroundColor')).toBe('rgb(15, 26, 22)');
  });
});

test.describe('lite mode', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test('the garden panel is a solid dark panel without a backdrop filter', async ({ page }) => {
    await cores(8)({ page });
    await page.addInitScript(() => { Object.defineProperty(navigator, 'connection', { get: () => ({ saveData: true, effectiveType: '4g' }) }); });
    await page.goto('index.html?smooth=0');
    await expect(page.locator('html')).toHaveAttribute('data-lite', /.*/);
    expect(await style(page, '.bleed__in', 'backdropFilter')).toBe('none');
    expect(await style(page, '.bleed__in', 'backgroundColor')).toMatch(/^rgba\(12, 20, 17, 0\.78\)$/);
    await expect(page.locator('.visit__bg')).toHaveCount(0);
  });
});
