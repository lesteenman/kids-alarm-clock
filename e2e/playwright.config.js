// Runs the tests in e2e/tests against the built simulator.
// Build first: sim/build.sh. Then: cd e2e && npm test
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:8123',
    trace: 'off',
    // WebGL without a GPU (CI) needs SwiftShader.
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'python3 -m http.server 8123 --directory ../build/site',
    url: 'http://localhost:8123',
    reuseExistingServer: !process.env.CI,
    stderr: 'ignore', // http.server logs every request
  },
});
