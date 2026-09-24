// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  // Each browser performs a 3000-run startup model; avoid machine-dependent
  // CPU oversubscription while retaining parallel independent test files.
  workers: 2,
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
