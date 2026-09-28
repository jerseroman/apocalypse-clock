const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: 'wix-test.spec.js',
  timeout: 150000,
  use: { browserName: 'chromium' },
});
