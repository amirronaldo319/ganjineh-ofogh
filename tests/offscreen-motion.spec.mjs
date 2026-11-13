// Endless decoration (motes, hero drift, marquee, twinkle, live pulses, wordmark gleam) must only run while it can be seen.
import { test, expect } from '@playwright/test';

const cores = (n) => ({ page }) => page.addInitScript((c) => Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => c }), n);
const jump = (page, y) => page.evaluate((v) => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, v); }, y);

// Every animation on the page clock that loops forever, with whether its element is inside the viewport plus the 200px margin.
const loops = (page) => page.evaluate(() => {
  const vh = innerHeight, m = 200;
  return document.getAnimations()
    .filter((a) => a.effect && a.effect.target && a.timeline === document.timeline && a.effect.getComputedTiming().iterations === Infinity)
    .map((a) => {
      const r = a.effect.target.getBoundingClientRect();
      return { name: a.animationName || 'waapi', state: a.playState, near: r.bottom > -m && r.top < vh + m, far: r.bottom < -m * 2 || r.top > vh + m * 2 };
    });
});

test.describe('looping decoration pauses off screen (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.beforeEach(async ({ page }) => { await cores(8)({ page }); });

  test('far-away loops are paused, visible ones run, and they resume on return', async ({ page }) => {
    await page.goto('index.html?smooth=0');
    await expect.poll(async () => (await loops(page)).length, { message: 'the page has looping animations' }).toBeGreaterThan(5);
    await jump(page, 9500);
    await expect.poll(async () => (await loops(page)).filter((l) => l.far && l.state === 'running').length, { message: 'no far loop keeps running' }).toBe(0);
    let l = await loops(page);
    expect(l.filter((x) => x.far).length, 'there are far loops to check').toBeGreaterThan(5);
    expect(l.filter((x) => x.near && x.state !== 'running'), 'visible loops keep running').toEqual([]);

    await jump(page, 0);
    await expect.poll(async () => (await loops(page)).filter((x) => x.near && x.state !== 'running').length, { message: 'loops near the viewport resume' }).toBe(0);
    l = await loops(page);
    expect(l.some((x) => x.name === 'lightDrift' && x.state === 'running'), 'hero drift runs at the top').toBe(true);
  });

  test('scroll-driven and one-shot animations are never paused', async ({ page }) => {
    await page.goto('index.html?smooth=0');
    await jump(page, 9500);
    await page.waitForTimeout(800);
    const odd = await page.evaluate(() => document.getAnimations()
      .filter((a) => a.playState === 'paused' && (a.timeline !== document.timeline || a.effect.getComputedTiming().iterations !== Infinity))
      .map((a) => a.animationName || 'waapi'));
    expect(odd).toEqual([]);
  });

  test('a loop that was paused far away holds its phase and picks up again on return', async ({ page }) => {
    await page.goto('index.html?smooth=0');
    await expect.poll(async () => (await loops(page)).length).toBeGreaterThan(5);
    await jump(page, 9500);
    await expect.poll(async () => (await loops(page)).filter((l) => l.far && l.state === 'running').length).toBe(0);
    // remember one far-away loop and read its own clock twice
    await page.evaluate(() => {
      const vh = innerHeight;
      window.__far = document.getAnimations().find((a) => {
        if (!a.effect || !a.effect.target || a.timeline !== document.timeline || a.effect.getComputedTiming().iterations !== Infinity) return false;
        const r = a.effect.target.getBoundingClientRect();
        return r.bottom < -400 || r.top > vh + 400;
      });
    });
    const clock = () => page.evaluate(() => ({ t: window.__far.currentTime, s: window.__far.playState }));
    const t0 = await clock();
    expect(t0.s, 'a far loop is paused').toBe('paused');
    await page.waitForTimeout(1000);
    expect((await clock()).t, 'paused: its clock did not advance').toBe(t0.t);
    await jump(page, 0);
    await expect.poll(async () => (await clock()).s, { message: 'near again: it resumes' }).not.toBe('paused');
  });
});

test.describe('reduced motion and lite mode', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  test('nothing is touched when decoration is off', async ({ page }) => {
    await page.goto('index.html?smooth=0');
    await jump(page, 9500);
    await page.waitForTimeout(600);
    const paused = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'paused').length);
    expect(paused).toBe(0);
  });
});
