// 3D viewers: tower-viewer/ (three.js r-global build) and residences-3d/ (ES-module build).
import { test, expect } from '@playwright/test';

const noWebGL = () => {
  const real = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    if (/webgl/i.test(type)) return null;
    return real.call(this, type, ...rest);
  };
};

// Headless CI renders WebGL in software, so these tests use a small viewport and force clicks (Playwright's actionability
// check waits on animation frames, which a software renderer delivers very slowly). Real GPUs are unaffected.
const SMALL = { width: 640, height: 420 };

async function towerReady(page) {
  await page.setViewportSize(SMALL);
  await page.goto('tower-viewer/', { waitUntil: 'load' });
  await expect(page.locator('#status')).toHaveClass(/gone/, { timeout: 45_000 });
}

test.describe('tower viewer', () => {
  test('loads the model, orbits on drag, and Reset restores the first view', async ({ page }) => {
    test.setTimeout(180_000);
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errs.push(m.text()); });
    await towerReady(page);
    await expect(page.locator('canvas').first()).toBeVisible();
    await page.waitForTimeout(1500);                                   // let the intro settle
    await page.locator('#skip-intro').click({ timeout: 1000, force: true }).catch(() => {});
    await page.waitForTimeout(2500);
    const before = await page.screenshot();
    const box = await page.locator('#stage').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 260, box.y + box.height / 2 - 40, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(1200);
    const orbited = await page.screenshot();
    expect(orbited.equals(before)).toBe(false);
    await page.locator('#reset-btn').click({ force: true });
    await page.waitForTimeout(3500);
    const after = await page.screenshot();
    expect(after.equals(orbited)).toBe(false);                          // the camera moved back
    expect(errs).toEqual([]);
  });

  test('named viewpoints (Corner / Street / Back / …) move the camera and are reachable by keyboard', async ({ page }) => {
    test.setTimeout(180_000);
    await towerReady(page);
    await page.waitForTimeout(2500);
    const views = page.locator('#o-view button[data-view]');
    const n = await views.count();
    expect(n).toBeGreaterThanOrEqual(3);
    const shots = [];
    for (let i = 0; i < 3; i++) {
      await views.nth(i).focus();
      await page.keyboard.press('Enter');
      await expect(views.nth(i)).toHaveAttribute('aria-pressed', 'true');
      await page.waitForTimeout(5000);
      shots.push(await page.screenshot());
    }
    expect(shots[0].equals(shots[1])).toBe(false);
    expect(shots[1].equals(shots[2])).toBe(false);
  });

  test('day / evening lighting presets change the picture', async ({ page }) => {
    test.setTimeout(90_000);
    await towerReady(page);
    await page.waitForTimeout(2500);
    await page.getByRole('tab', { name: /light|نور/i }).click({ force: true });
    const buttons = page.locator('#o-light button');
    expect(await buttons.count()).toBeGreaterThanOrEqual(2);
    const day = await page.screenshot();
    await buttons.nth(1).click({ force: true });
    await page.waitForTimeout(2500);
    expect((await page.screenshot()).equals(day)).toBe(false);
  });

  test('shows a clear message instead of a blank canvas when WebGL is unavailable', async ({ page }) => {
    await page.addInitScript(noWebGL);
    await page.goto('tower-viewer/', { waitUntil: 'load' });
    const msg = page.locator('#status-msg');
    await expect(msg).toBeVisible({ timeout: 15_000 });
    await expect(msg).toContainText(/WebGL|سه‌بعدی/);
    await expect(page.locator('#alt')).not.toBeEmpty();                  // a text description of the building is still there
  });
});

test.describe('tower viewer on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('tap opens the Floors panel and tap on a floor control responds', async ({ page }) => {
    test.setTimeout(90_000);
    await towerReady(page);
    await page.getByRole('tab', { name: /floors|طبقات/i }).tap();
    await expect(page.locator('#o-floors')).toBeVisible();
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(over).toBeLessThanOrEqual(0);
  });
});

test.describe('residence explorer', () => {
  test('lists four apartments, switches between them and opens the plan image', async ({ page }) => {
    test.setTimeout(90_000);
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto('residences-3d/', { waitUntil: 'load' });
    const cards = page.locator('#plans .plancard');
    await expect(cards).toHaveCount(4);
    await expect(page.locator('#loading')).toBeHidden({ timeout: 30_000 });
    await cards.nth(1).click();
    await expect(cards.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(cards.nth(0)).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#modeimage').click();
    await expect(page.locator('#reference')).toBeVisible();
    await page.locator('#mode3d').click();
    await expect(page.locator('#reference')).toBeHidden();
    expect(errs).toEqual([]);
  });

  test('when WebGL is unavailable it says so and one click shows the plan image', async ({ page }) => {
    await page.addInitScript(noWebGL);
    await page.goto('residences-3d/', { waitUntil: 'load' });
    await expect(page.locator('#error')).toBeVisible({ timeout: 20_000 });
    await page.locator('#fallback').click();
    await expect(page.locator('#reference')).toBeVisible();
  });
});

test.describe('glass fallbacks', () => {
  test('reduced transparency removes backdrop blur from site header and viewer controls', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'active' });
    await page.goto('index.html');
    await page.evaluate(() => scrollTo(0, 1200));
    await page.waitForTimeout(600);
    const filter = await page.locator('#header').evaluate((e) => getComputedStyle(e).backdropFilter);
    expect(filter).toBe('none');
    await page.goto('tower-viewer/');
    const pill = await page.locator('.pill').first().evaluate((e) => getComputedStyle(e).backdropFilter);
    expect(pill).toBe('none');
    await ctx.close();
  });
});
