// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  // Every test page runs the full 3000-run startup model, and the diagnostics tests run the optional
  // layer as well; slower CI machines need the long limit.
  timeout: 300000,
  // One worker on CI and two locally, to avoid CPU oversubscription from parallel model runs.
  workers: process.env.CI ? 1 : 2,
  use: {
    baseURL: 'http://127.0.0.1:8766',
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'node scripts/serve.js',
    url: 'http://127.0.0.1:8766/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
