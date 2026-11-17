// Shared helpers for simulator tests. See window.simTest in sim/www/sim.js
// for everything you can call.
const { expect } = require('@playwright/test');

// Opens the simulator with an empty store and time paused.
async function openSim(page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); } catch { /* ignore */ }
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-sim-ready', 'true');
  await page.evaluate(() => window.simTest.pause());
}

// The phone page inside the simulator, as a Playwright frame locator.
function phone(page) {
  return page.frameLocator('#phoneframe');
}

const sim = {
  setTime: (page, y, mo, d, h, mi) => page.evaluate(([a, b, c, e, f]) => window.simTest.setTime(a, b, c, e, f), [y, mo, d, h, mi]),
  advanceMinutes: (page, m) => page.evaluate((x) => window.simTest.advanceMinutes(x), m),
  leds: (page) => page.evaluate(() => window.simTest.leds()),
  powerCut: (page) => page.evaluate(() => window.simTest.powerCut()),
  powerOn: (page) => page.evaluate(() => window.simTest.powerOn()),
  setTimeUnknown: (page, unknown) => page.evaluate((u) => window.simTest.setTimeUnknown(u), unknown),
  request: (page, method, path, body) => page.evaluate(([m, p, b]) => window.simTest.request(m, p, b), [method, path, body || '']),
};

module.exports = { openSim, phone, sim };
