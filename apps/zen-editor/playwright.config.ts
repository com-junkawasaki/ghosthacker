import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:1420',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // We assume backend is already running via Tilt or manual start for local TDD
  webServer: {
    command: 'export VITE_API_URL=http://127.0.0.1:8080 && deno task dev:web',
    url: 'http://127.0.0.1:1420',
    reuseExistingServer: true,
  },
});
