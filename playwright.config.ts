import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', workers: 1, timeout: 45000,
  use: { baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000', browserName: 'chromium', screenshot: 'only-on-failure' },
  reporter: [['list']],
});
