// Liquid glass, round two: buttons, pills and tabs, journey card and tracks, menu, toast, lightbox, and how each one switches itself off.
import { test, expect } from '@playwright/test';

const cores = (n) => ({ page }) => page.addInitScript((c) => Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => c }), n);
const style = (page, sel, prop, pseudo) => page.locator(sel).first().evaluate((e, [p, ps]) => getComputedStyle(e, ps || null)[p], [prop, pseudo]);
const blurs = (v) => /blur\(/.test(v);

test.describe('material (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.beforeEach(async ({ page }) => { await cores(8)({ page }); });

  test('buttons: outline variants are glass, every variant has the lit rim and a sheen', async ({ page }) => {
    await page.goto('index.html');
    for (const sel of ['.hero .btn--ghost', '.nav a.cta']) {
      expect(blurs(await style(page, sel, 'backdropFilter')), `${sel} blur`).toBe(true);
      expect(await style(page, sel, 'boxShadow'), `${sel} rim`).toContain('inset');
    }
    const primary = '.hero .btn:not(.btn--ghost)';
    expect(await style(page, primary, 'backgroundImage'), 'primary sheen').toContain('gradient');
    expect(await style(page, primary, 'boxShadow'), 'primary rim').toContain('inset');
    expect(await style(page, primary, 'borderTopLeftRadius')).toBe('14px');
    // the primary button keeps its solid brand fill: glass is the finish, not the colour
    expect(await style(page, primary, 'backgroundColor')).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('the sheen on a button follows the pointer', async ({ page }) => {
    await page.goto('index.html');
    const btn = page.locator('.hero .btn--ghost').first();
    const box = await btn.boundingBox();
    await page.mouse.move(box.x + 20, box.y + 10);
    await page.mouse.move(box.x + 30, box.y + 12);
    await expect.poll(() => btn.evaluate((e) => e.style.getPropertyValue('--gx'))).toMatch(/^\d+px$/);
    await page.mouse.move(5, 400);
    await expect.poll(() => btn.evaluate((e) => e.style.getPropertyValue('--gx'))).toBe('');
  });

  test('pills and tabs are glass at rest and a solid fill when selected', async ({ page }) => {
    await page.goto('gallery.html');
    const rest = page.locator('.filter:not([aria-pressed="true"])').first();
    const on = page.locator('.filter[aria-pressed="true"]').first();
    expect(blurs(await rest.evaluate((e) => getComputedStyle(e).backdropFilter))).toBe(true);
    expect(await rest.evaluate((e) => getComputedStyle(e).boxShadow)).toContain('inset');
    expect(await on.evaluate((e) => getComputedStyle(e).backdropFilter), 'selected stays solid').toBe('none');
    expect(await on.evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
    await page.goto('residences.html');
    expect(blurs(await style(page, '.aptbtn:not([aria-pressed="true"])', 'backdropFilter'))).toBe(true);
    expect(await style(page, '.aptbtn[aria-pressed="true"]', 'backdropFilter')).toBe('none');
  });

  test('journey: caption card and both progress tracks sit on glass', async ({ page }) => {
    await page.goto('index.html');
    const card = await style(page, '.scene__text', 'backdropFilter');
    expect(card).toMatch(/blur\(22px\)/);
    expect(await style(page, '.scene__text', 'borderTopLeftRadius')).toBe('22px');
    for (const sel of ['.journey__bar', '#daydusk .scrub__bar']) {
      expect(blurs(await style(page, sel, 'backdropFilter')), `${sel} blur`).toBe(true);
      expect(await style(page, sel, 'borderTopLeftRadius'), `${sel} capsule`).toBe('99px');
    }
  });

  test('menu and toast are glass', async ({ page }) => {
    await page.goto('index.html');
    expect(await style(page, '.menu', 'backdropFilter')).toMatch(/blur\(36px\)/);
    expect(blurs(await style(page, '.toast', 'backdropFilter'))).toBe(true);
  });

  test('lightbox: frosted room, glass controls that refract, glass caption', async ({ page }) => {
    await page.goto('gallery.html');
    await page.locator('.gal figure img').nth(1).click();
    await expect(page.locator('#lb')).toHaveAttribute('open', '');
    expect(await style(page, '#lb', 'backdropFilter', '::backdrop')).toMatch(/blur\(28px\)/);
    expect(await page.evaluate(() => document.documentElement.classList.contains('lg-refract'))).toBe(true);
    expect(await style(page, '.lb__close', 'backdropFilter')).toContain('url(');
    expect(await style(page, '.lb__close', 'boxShadow')).toContain('inset');
    const cap = page.locator('.lb__cap');
    if (await cap.evaluate((e) => e.textContent.trim() !== '')) expect(blurs(await cap.evaluate((e) => getComputedStyle(e).backdropFilter))).toBe(true);
  });
});

test.describe('journey card only where the text sits on the photograph', () => {
  test('a portrait phone keeps the caption on its flat panel', async ({ page }) => {
    await cores(8)({ page });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('index.html');
    expect(await style(page, '.scene__text', 'backdropFilter')).toBe('none');
    expect(await style(page, '.scene__text', 'borderTopLeftRadius')).toBe('0px');
  });
});

test.describe('higher contrast turns the new surfaces opaque', () => {
  test.use({ viewport: { width: 1440, height: 900 }, contrast: 'more' });
  test('site', async ({ page }) => {
    await cores(8)({ page });
    await page.goto('index.html');
    for (const sel of ['.hero .btn--ghost', '.hero .btn:not(.btn--ghost)', '.nav a.cta', '.scene__text', '.journey__bar', '.menu', '.toast']) {
      expect(await style(page, sel, 'backdropFilter'), `${sel} blur`).toBe('none');
      expect(await style(page, sel, 'backgroundImage'), `${sel} sheen`).toBe('none');
    }
    expect(await style(page, '.scene__text', 'backgroundColor'), 'caption card is a solid dark panel').toBe('rgb(15, 26, 22)');
    expect(await style(page, '.menu', 'backgroundColor')).not.toMatch(/rgba\(.*, 0\.\d+\)$/);
    expect(await style(page, '.hero .btn--ghost', 'boxShadow')).toBe('none');
  });
  test('pills and lightbox', async ({ page }) => {
    await cores(8)({ page });
    await page.goto('gallery.html');
    for (const sel of ['.filter', '.filter[aria-pressed="true"]']) {
      expect(await style(page, sel, 'backdropFilter'), sel).toBe('none');
      expect(await style(page, sel, 'backgroundImage'), `${sel} sheen`).toBe('none');
    }
    await page.locator('.gal figure img').nth(1).click();
    await expect(page.locator('#lb')).toHaveAttribute('open', '');
    expect(await style(page, '#lb', 'backdropFilter', '::backdrop')).toBe('none');
    expect(await style(page, '.lb__close', 'backdropFilter')).toBe('none');
    expect(await page.evaluate(() => document.documentElement.classList.contains('lg-refract'))).toBe(false);
  });
});

test.describe('reduced motion', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  test('static glass stays on pills and buttons; the plain journey list gets no card', async ({ page }) => {
    await cores(8)({ page });
    await page.goto('index.html');
    expect(blurs(await style(page, '.hero .btn--ghost', 'backdropFilter'))).toBe(true);
    expect(await style(page, '.scene__text', 'backdropFilter')).toBe('none');
    expect(await style(page, '.scene__text', 'backgroundColor')).toBe('rgba(0, 0, 0, 0)');
  });
});
