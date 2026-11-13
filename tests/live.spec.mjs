// Statement reveal, live Tehran light, and side-dots clearance on the home pages.
import { test, expect } from '@playwright/test';

const faDigits = (s) => s.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
const minutes = (hhmm) => { const [h, m] = faDigits(hhmm).split(':').map(Number); return h * 60 + m; };

test.describe('statement reveal', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  const opacities = (page) => page.locator('.quote .sw > i').evaluateAll((els) => els.map((e) => +getComputedStyle(e).opacity));

  test('words light up in reading order as the line rises through the screen', async ({ page }) => {
    await page.goto('index.html');
    const quote = page.locator('.quote');
    await expect(quote).toHaveClass(/is-lit/);
    const top = await quote.evaluate((e) => e.getBoundingClientRect().top + scrollY);
    const at = async (frac) => {
      await page.evaluate(([t, f]) => scrollTo(0, t - innerHeight * f), [top, frac]);
      await page.waitForTimeout(250);
      return opacities(page);
    };
    const entering = await at(0.95);
    expect(entering.length).toBeGreaterThan(4);
    expect(Math.max(...entering), 'dim as it enters').toBeLessThan(0.4);
    const rising = await at(0.7);
    expect(rising[0], 'first word is lit before the last').toBeGreaterThan(0.95);
    expect(rising[rising.length - 1]).toBeLessThan(0.5);
    for (let i = 1; i < rising.length; i++) expect(rising[i], `word ${i} is never brighter than word ${i - 1}`).toBeLessThanOrEqual(rising[i - 1] + 1e-6);
    const settled = await at(0.45);
    expect(Math.min(...settled), 'every word fully lit once it is above the middle').toBeGreaterThan(0.99);
  });

  test('scrolling back up dims it again (the reveal follows the scroll, it is not a one-off)', async ({ page }) => {
    await page.goto('index.html');
    const top = await page.locator('.quote').evaluate((e) => e.getBoundingClientRect().top + scrollY);
    await page.evaluate((t) => scrollTo(0, t - innerHeight * 0.4), top);
    await page.waitForTimeout(250);
    expect(Math.min(...(await opacities(page)))).toBeGreaterThan(0.99);
    await page.evaluate((t) => scrollTo(0, t - innerHeight * 0.95), top);
    await page.waitForTimeout(250);
    expect(Math.max(...(await opacities(page)))).toBeLessThan(0.4);
  });
});

test.describe('statement reveal with reduced motion', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  test('nothing is split or dimmed', async ({ page }) => {
    await page.goto('index.html');
    const quote = page.locator('.quote');
    await expect(quote).not.toHaveClass(/is-lit/);
    await expect(quote.locator('.sw')).toHaveCount(0);
    await quote.scrollIntoViewIfNeeded();
    await expect(quote).toBeVisible();
    expect(await quote.evaluate((e) => +getComputedStyle(e).opacity)).toBe(1);
  });
});

test.describe('live Tehran light', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const cases = [
    { name: 'daytime: next event is today’s sunset', at: '2026-11-13T10:00:00Z', now: '۱۳:۳۰', fa: 'غروب امروز', en: 'sunset today', target: 17 * 60 },
    { name: 'after dark: next event is tomorrow’s sunrise', at: '2026-11-13T20:00:00Z', now: '۲۳:۳۰', fa: 'طلوع فردا', en: 'sunrise tomorrow', target: 6 * 60 + 40 },
    { name: 'before dawn: next event is today’s sunrise', at: '2026-11-13T01:00:00Z', now: '۰۴:۳۰', fa: 'طلوع امروز', en: 'sunrise today', target: 6 * 60 + 39 },
  ];
  for (const c of cases) {
    test(`Persian page, ${c.name}`, async ({ page }) => {
      await page.clock.install({ time: new Date(c.at) });          // 10:00 UTC is 13:30 in Tehran (UTC+03:30, no daylight saving)
      await page.goto('index.html');
      const chip = page.locator('[data-live-light]');
      await expect(chip).toBeVisible();
      await expect(chip).toContainText('اکنون در تهران');
      await expect(chip.locator('.t').first()).toHaveText(c.now);
      await expect(chip).toContainText(c.fa);
      const next = minutes(await chip.locator('.t').nth(1).textContent());
      expect(Math.abs(next - c.target), 'next sun event within two minutes of the published time').toBeLessThanOrEqual(2);
    });
  }

  test('English page uses Latin digits and English labels', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-13T10:00:00Z') });
    await page.goto('en/index.html');
    const chip = page.locator('[data-live-light]');
    await expect(chip).toBeVisible();
    await expect(chip).toContainText('Tehran now');
    await expect(chip.locator('.t').first()).toHaveText('13:30');
    await expect(chip).toContainText('sunset today');
  });

  test('time stays left-to-right inside the right-to-left sentence', async ({ page }) => {
    await page.goto('index.html');
    await expect(page.locator('[data-live-light]')).toBeVisible();
    const dirs = await page.locator('[data-live-light] .t').evaluateAll((els) => els.map((e) => e.dir));
    expect(dirs).toEqual(['ltr', 'ltr']);
  });

  // Reference times (Tehran, UTC+03:30): sunrise-sunset.net/iran/tehran/2026/11 and alpenglowapp.com/times/tehran-26-ir.
  // The page uses the standard low-precision solar series, which is a minute or two off such tables; two minutes is the bar.
  test('computed sun times agree with published Tehran tables to within two minutes', async ({ page }) => {
    await page.goto('index.html');
    const rows = [
      ['2026-11-01', '06:26', '17:09'], ['2026-11-13', '06:38', '16:59'], ['2026-11-15', '06:40', '16:58'], ['2026-11-30', '06:54', '16:51'],
      ['2026-06-07', '04:49', null], ['2026-06-24', null, '19:25'],
    ];
    for (const [date, rise, set] of rows) {
      const ev = await page.evaluate((iso) => window.ofogh.sunEvents(Date.parse(iso)), `${date}T12:00:00+03:30`);
      const local = (ms) => { const d = new Date(ms + 3.5 * 36e5); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
      const m = (s) => { const [h, mm] = s.split(':').map(Number); return h * 60 + mm; };
      if (rise) expect(Math.abs(local(ev.rise) - m(rise)), `${date} sunrise`).toBeLessThanOrEqual(2);
      if (set) expect(Math.abs(local(ev.set) - m(set)), `${date} sunset`).toBeLessThanOrEqual(2);
    }
  });

  test('chip sits under the day-to-dusk heading', async ({ page }) => {
    await page.goto('index.html');
    const head = page.locator('.scrub__head h2');
    await expect(page.locator('[data-live-light]')).toBeVisible();
    const hb = await head.boundingBox(), cb = await page.locator('[data-live-light]').boundingBox();
    expect(cb.y, 'chip sits under the heading').toBeGreaterThan(hb.y + hb.height - 1);
  });
});

test.describe('section dots clearance', () => {
  const openDot = async (page) => {
    await page.goto('index.html');
    const id = await page.locator('.dots a[data-dot]').nth(2).getAttribute('data-dot');
    await page.evaluate((i) => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById(i).scrollIntoView(); }, id);
    await page.waitForFunction(() => { const y = scrollY; window.__y0 = window.__y1; window.__y1 = y; return window.__y0 === y; }, null, { polling: 120 });   // scroll has settled
    const on = page.locator('.dots a.is-on');
    await expect(on).toHaveCount(1);
    return on;
  };

  test.describe('where the margin is narrow (1440px)', () => {
    test.use({ viewport: { width: 1440, height: 900 } });
    test('the active label stays out of the content until the dot is hovered or focused', async ({ page }) => {
      const on = await openDot(page);
      const label = on.locator('span');
      expect(await label.evaluate((e) => getComputedStyle(e).opacity)).toBe('0');
      await on.hover();
      await expect.poll(() => label.evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
    });
  });

  test.describe('where the margin is wide (1920px)', () => {
    test.use({ viewport: { width: 1920, height: 1000 } });
    test('the active label is shown beside its dot', async ({ page }) => {
      const on = await openDot(page);
      await expect.poll(() => on.locator('span').evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
    });
  });
});
