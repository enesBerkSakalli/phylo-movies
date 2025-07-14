import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: false, // Run tests sequentially for consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for specialized tests
  reporter: [
    ['html', { outputFolder: '../../reports/playwright-report' }],
    ['json', { outputFile: '../../reports/test-results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    cwd: '../../frontend'
  },
  timeout: 60000, // Extended timeout for complex operations
  expect: {
    timeout: 10000
  }
});