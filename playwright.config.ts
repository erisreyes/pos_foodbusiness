import { defineConfig } from '@playwright/test';

/**
 * iPad 6 / iPad 7 in landscape.
 *
 * - iPad 6 (9.7") logical landscape: 1024x768
 * - iPad 7 (10.2") logical landscape: 1080x810
 *
 * We standardise on the iPad 7 landscape canvas (>= 1024px wide) so the POS
 * renders its two-column "products + checkout" tablet layout, with Retina
 * scaling and real touch events enabled — exactly how a cashier uses it.
 */
const iPadTablet = {
  viewport: { width: 1080, height: 810 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
} as const;

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // This is a tablet-grade app; keep parallelism modest so a single laptop is
  // not starved when running two browser engines. Override with `--workers`.
  workers: process.env.CI ? 1 : 2,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    // Block the PWA service worker so it can never serve a cached response in
    // place of our deterministic network mocks.
    serviceWorkers: 'block',
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'iPad-Chromium',
      use: { browserName: 'chromium', defaultBrowserType: 'chromium', ...iPadTablet },
    },
    {
      name: 'iPad-Safari',
      use: { browserName: 'webkit', defaultBrowserType: 'webkit', ...iPadTablet },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
