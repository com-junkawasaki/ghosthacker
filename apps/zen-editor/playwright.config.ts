import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  paths: ['tests/features/*.feature'],
  steps: ['tests/steps/*.ts'],
});

export default defineConfig({
  testDir,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:1420',
    trace: 'on',
    video: 'on',
    screenshot: 'on',
    viewport: { width: 2560, height: 1440 },
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-unsafe-webgpu']
        }
      },
    },
  ],
  webServer: {
    command: 'deno task dev:vite',
    port: 1420,
    reuseExistingServer: !process.env.CI,
  },
});

