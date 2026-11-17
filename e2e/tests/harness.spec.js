// Checks that the simulator harness itself works. Your journeys go in their
// own files next to this one (see journeys.example.spec.js).
const { test, expect } = require('@playwright/test');
const { openSim, phone, sim } = require('./helpers');

test('simulator loads with 12 LEDs and a powered clock', async ({ page }) => {
  await openSim(page);
  expect(await sim.leds(page)).toHaveLength(12);
  expect(await page.evaluate(() => window.simTest.isOn())).toBe(true);
});

test('time machine sets local time, DST included', async ({ page }) => {
  await openSim(page);
  await sim.setTime(page, 2027, 3, 28, 1, 50);
  await sim.advanceMinutes(page, 15);
  // 02:00 doesn't exist that night: 01:50 + 15 min = 03:05.
  expect(await page.evaluate(() => window.simTest.now())).toMatchObject({ hour: 3, minute: 5 });
});

test('phone page reaches the core', async ({ page }) => {
  await openSim(page);
  const res = await sim.request(page, 'GET', '/api/state');
  expect(res.status).toBeGreaterThan(0);
  await expect(phone(page).locator('body')).toBeVisible();
});

test('power cut turns LEDs off and keeps the clock off until power returns', async ({ page }) => {
  await openSim(page);
  await sim.powerCut(page);
  expect(await sim.leds(page)).toEqual(Array(12).fill([0, 0, 0]));
  expect((await sim.request(page, 'GET', '/api/state')).status).toBe(503);
  await sim.powerOn(page);
  expect(await page.evaluate(() => window.simTest.isOn())).toBe(true);
});
