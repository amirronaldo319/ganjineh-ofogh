import { defineConfig, devices } from '@playwright/test';

// Tests run against the site served under the GitHub Pages project path (/ganjineh-ofogh/) by default, because that is the
// harder case: every asset and link must be relative. Override with SITE_BASE=/ for a root-hosted check.
const base = process.env.SITE_BASE || '/ganjineh-ofogh/';
const port = Number(process.env.PORT || 4173);
const launchOptions = {
  executablePath: process.env.CHROME_PATH || undefined,        // set CHROME_PATH to a system Chrome if Playwright's browsers are not installed
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
};

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${port}${base}`, launchOptions, ...(process.env.CHROME_PATH ? {} : { channel: 'chrome' }) },
  webServer: {
    command: `SITE_BASE=${base} PORT=${port} node tools/serve.mjs`,
    url: `http://127.0.0.1:${port}${base}index.html`,
    reuseExistingServer: false,
    timeout: 20_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
