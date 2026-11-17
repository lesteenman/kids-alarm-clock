// EXAMPLE ONLY: the shape of a user-journey test. Skipped until the clock
// logic and phone page exist. Copy it, rename it, and make it match your
// API and page. Delete this file when you have real ones.
const { test, expect } = require('@playwright/test');
const { openSim, phone, sim } = require('./helpers');

const RED = [255, 0, 0]; // whatever your core actually sends

test.skip('bedtime set on the phone turns the clock red at that time', async ({ page }) => {
  await openSim(page);
  await sim.setTime(page, 2027, 1, 12, 18, 0);

  // Use the real phone page, like a parent would.
  const p = phone(page);
  await p.getByLabel('Bedtime').fill('18:30');
  await p.getByRole('button', { name: 'Save' }).click();

  await sim.advanceMinutes(page, 29); // 18:29
  expect((await sim.leds(page))[0]).not.toEqual(RED);
  await sim.advanceMinutes(page, 1); // 18:30
  expect((await sim.leds(page))[0]).toEqual(RED);

  // Survives a power cut: settings are in the Store, colour follows the time.
  await sim.powerCut(page);
  await sim.advanceMinutes(page, 60);
  await sim.powerOn(page);
  expect((await sim.leds(page))[0]).toEqual(RED);
});
