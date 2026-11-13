// Liquid glass: the shared material, the pointer sheen, Chromium lens refraction, and every way it switches itself off.
import { test, expect } from '@playwright/test';

const cores = (n) => ({ page }) => page.addInitScript((c) => Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => c }), n);
const style = (page, sel, prop) => page.locator(sel).first().evaluate((e, p) => getComputedStyle(e)[p], prop);

test.describe('material (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.beforeEach(async ({ page }) => { await cores(8)({ page }); });

  test('round controls, the stuck header and image captions share one glass material', async ({ page }) => {
    await page.goto('index.html');
    await page.evaluate(() => scrollTo(0, 1500));
    await expect(page.locator('.header')).toHaveClass(/is-stuck/);
    for (const sel of ['.tools #theme-btn', '.tools #lang-btn', '.totop']) {
      expect(await style(page, sel, 'backdropFilter'), `${sel} backdrop`).toMatch(/blur\(.*\) saturate\(1\.8\)/);
      expect(await style(page, sel, 'backgroundImage'), `${sel} sheen`).toContain('radial-gradient');
      expect(await style(page, sel, 'boxShadow'), `${sel} rim`).toContain('inset');
    }
    expect(await style(page, '.header', 'backdropFilter')).toMatch(/blur\(20px\) saturate\(1\.8\)/);
    expect(await style(page, '.header', 'boxShadow')).toContain('inset');
    expect(await style(page, '.kind', 'backdropFilter')).toMatch(/blur\(12px\) saturate\(1\.7\)/);
  });

  test('hovering a header button lifts the glass instead of turning it solid', async ({ page }) => {
    await page.goto('index.html');
    const btn = page.locator('#theme-btn');
    const before = await style(page, '#theme-btn', 'backgroundColor');
    const inkBefore = await style(page, '#theme-btn', 'color');
    await btn.hover();
    await page.waitForTimeout(450);
    const after = await style(page, '#theme-btn', 'backgroundColor');
    expect(after).not.toBe(before);
    expect(after, 'still translucent, not the solid ink fill').toMatch(/rgba\(255, 255, 255, 0?\.\d+\)/);
    expect(await style(page, '#theme-btn', 'color'), 'text colour does not invert').toBe(inkBefore);
  });

  test('the sheen follows the pointer and is released when it leaves', async ({ page }) => {
    await page.goto('index.html');
    const btn = page.locator('#lang-btn');
    const box = await btn.boundingBox();
    await page.mouse.move(box.x + 8, box.y + 10);
    await expect.poll(() => btn.evaluate((e) => e.style.getPropertyValue('--gx'))).toBe('8px');
    expect(await btn.evaluate((e) => e.style.getPropertyValue('--gy'))).toBe('10px');
    await page.mouse.move(box.x + box.width + 120, box.y + box.height + 120);
    await expect.poll(() => btn.evaluate((e) => e.style.getPropertyValue('--gx'))).toBe('');
  });
});

test.describe('lens refraction (Chromium)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('is switched on with a data-URI displacement map and used by the round lenses', async ({ page }) => {
    await cores(8)({ page });
    await page.goto('index.html');
    await expect(page.locator('html')).toHaveClass(/lg-refract/);
    const f = page.locator('svg filter#of-lens');
    await expect(f).toHaveCount(1);
    expect(await f.locator('feImage').getAttribute('href')).toMatch(/^data:image\/png;base64,/);
    expect(await f.locator('feDisplacementMap').getAttribute('xChannelSelector')).toBe('R');
    for (const sel of ['.totop', '.launch__dot']) expect(await style(page, sel, 'backdropFilter'), sel).toContain('url(');
    expect(await style(page, '#theme-btn', 'backdropFilter'), 'header buttons sit inside the blurred bar and stay plain glass').not.toContain('url(');
  });

  test('it really bends the picture: the lens edge differs from the same blur without displacement', async ({ page }) => {
    await cores(8)({ page });
    await page.goto('index.html');
    await page.evaluate(() => {
      scrollTo(0, 1500);
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;inset:0;z-index:59;pointer-events:none;background:repeating-linear-gradient(90deg,#111 0 6px,#f4c542 6px 12px)';
      document.body.appendChild(d);
    });
    await page.waitForTimeout(900);
    const box = await page.locator('.totop').boundingBox();
    const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
    const bent = await page.screenshot({ clip });
    await page.locator('.totop').evaluate((e) => e.style.setProperty('backdrop-filter', 'blur(1.5px) saturate(1.8) brightness(1.06)', 'important'));
    await page.waitForTimeout(300);
    const flat = await page.screenshot({ clip });
    const ratio = await page.evaluate(async ([a, b]) => {
      const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + s; });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const px = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
      const da = px(ia), db = px(ib); let diff = 0, n = da.length / 4;
      for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 90) diff++;
      return diff / n;
    }, [bent.toString('base64'), flat.toString('base64')]);
    expect(ratio, 'share of pixels that moved').toBeGreaterThan(0.04);
  });

  test('stays off on low-power devices and in browsers that are not Chromium', async ({ browser }) => {
    const lowCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const low = await lowCtx.newPage();
    await cores(2)({ page: low });
    await low.goto('index.html');
    await expect(low.locator('.totop')).toBeAttached();
    expect(await low.evaluate(() => document.documentElement.classList.contains('lg-refract'))).toBe(false);
    await lowCtx.close();
    const otherCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const other = await otherCtx.newPage();
    await cores(8)({ page: other });
    await other.addInitScript(() => Object.defineProperty(navigator, 'userAgentData', { get: () => ({ brands: [{ brand: 'Other', version: '1' }] }) }));
    await other.goto('index.html');
    await expect(other.locator('.totop')).toBeAttached();
    expect(await other.evaluate(() => document.documentElement.classList.contains('lg-refract'))).toBe(false);
    expect(await other.locator('svg filter#of-lens').count()).toBe(0);
    expect(await style(other, '.totop', 'backdropFilter')).not.toContain('url(');
    await otherCtx.close();
  });
});

test.describe('higher contrast turns every glass surface opaque', () => {
  test.use({ viewport: { width: 1440, height: 900 }, contrast: 'more' });
  test('site', async ({ page }) => {
    await cores(8)({ page });
    await page.goto('index.html');
    await page.evaluate(() => scrollTo(0, 1500));
    await expect(page.locator('.header')).toHaveClass(/is-stuck/);
    expect(await page.evaluate(() => document.documentElement.classList.contains('lg-refract'))).toBe(false);
    for (const sel of ['.header', '.totop', '#theme-btn', '.kind']) {
      expect(await style(page, sel, 'backdropFilter'), `${sel} blur`).toBe('none');
      expect(await style(page, sel, 'backgroundImage'), `${sel} sheen`).toBe('none');
    }
    expect(await style(page, '#theme-btn', 'boxShadow')).toBe('none');
  });
});
test.describe('higher contrast, tower viewer', () => {
  test.use({ viewport: { width: 640, height: 420 }, contrast: 'more' });
  test('controls are opaque', async ({ page }) => {
    await page.goto('tower-viewer/index.html');
    for (const sel of ['.iconbtn', '.pill', '.card']) {
      expect(await style(page, sel, 'backdropFilter'), `${sel} blur`).toBe('none');
      expect(await style(page, sel, 'backgroundImage'), `${sel} sheen`).toBe('none');
    }
  });
});

test.describe('reduced motion keeps the material but not the extras', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  test('glass stays, no lens filter, no pointer sheen script', async ({ page }) => {
    await cores(8)({ page });
    await page.goto('index.html');
    expect(await style(page, '#theme-btn', 'backdropFilter')).toMatch(/blur\(14px\)/);
    expect(await page.locator('.totop').count(), 'the back-to-top button is part of the motion layer').toBe(0);
    expect(await page.evaluate(() => document.documentElement.classList.contains('lg-refract'))).toBe(false);
    expect(await page.locator('svg filter#of-lens').count()).toBe(0);
  });
});

test.describe('tower viewer controls', () => {
  test.use({ viewport: { width: 640, height: 420 } });
  test('use the same material', async ({ page }) => {
    await page.goto('tower-viewer/index.html');
    for (const sel of ['.iconbtn', '.pill', '.card']) {
      expect(await style(page, sel, 'backdropFilter'), `${sel} blur`).toMatch(/blur\(20px\) saturate\(1\.8\)/);
      expect(await style(page, sel, 'backgroundImage'), `${sel} sheen`).toContain('linear-gradient');
    }
  });
});
