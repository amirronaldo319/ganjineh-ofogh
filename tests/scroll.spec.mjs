// Smooth wheel scrolling (Lenis, assets/js/smooth.min.js) and how it coexists with the existing scroll-driven sections.
import { test, expect } from '@playwright/test';

test.describe('smooth scrolling on a desktop pointer', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('is active, eases the wheel over several frames, and the cinematic sections still follow', async ({ page }) => {
    await page.goto('index.html');
    await expect(page.locator('html')).toHaveClass(/lenis/);
    await page.mouse.move(700, 450);
    const jTop = await page.locator('#journey').evaluate((e) => e.getBoundingClientRect().top + scrollY);
    await page.evaluate((y) => scrollTo(0, y), jTop);
    await page.waitForTimeout(400);
    const y0 = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(60);
    const early = await page.evaluate(() => scrollY);
    await page.waitForTimeout(1500);
    const late = await page.evaluate(() => scrollY);
    expect(early - y0, 'still easing after 60 ms').toBeLessThan(late - y0);
    expect(late - y0, 'wheel travelled roughly its distance').toBeGreaterThan(500);
    const j = await page.locator('#journey').evaluate((e) => parseFloat(e.style.getPropertyValue('--j') || '0'));
    expect(j).toBeGreaterThan(0.3);                                       // journey progress followed the smoothed scroll
  });

  test('in-page links still glide to their target', async ({ page }) => {
    await page.goto('index.html');
    await page.locator('#journey').scrollIntoViewIfNeeded();
    await page.locator('.journey__skip').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#daydusk$/);
    await expect.poll(() => page.locator('#daydusk').evaluate((e) => Math.abs(e.getBoundingClientRect().top)), { timeout: 5000 }).toBeLessThan(200);
  });

  test('wheel is not captured while the lightbox is open', async ({ page }) => {
    await page.goto('gallery.html');
    await page.locator('.gal figure:not([hidden])').first().click();
    await expect(page.locator('#lb')).toHaveAttribute('open', '');
    const y = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => scrollY)).toBe(y);
    await page.keyboard.press('Escape');
    await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(y + 200);
  });

  test('?smooth=0 is a working kill switch', async ({ page }) => {
    await page.goto('index.html?smooth=0');
    await expect(page.locator('html')).not.toHaveClass(/lenis/);
  });
});

test.describe('smooth scrolling stays out of the way', () => {
  test('reduced motion keeps native scrolling', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('index.html');
    await expect(page.locator('html')).not.toHaveClass(/lenis/);
    await ctx.close();
  });

  test('touch devices keep native momentum scrolling', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto('index.html');
    await expect(page.locator('html')).not.toHaveClass(/lenis/);
    await ctx.close();
  });

  test('3D viewers do not load it', async ({ page }) => {
    await page.goto('tower-viewer/');
    await expect(page.locator('html')).not.toHaveClass(/lenis/);
  });
});
