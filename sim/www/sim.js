// Simulator page: runs the real core (WASM) against a controllable clock,
// shows its LEDs on the 3D model and lets the phone page talk to it.
import createClockModule from './clock.js';
import { createViewer } from './viewer.js';
import { localParts, localToEpoch, TIME_ZONE } from './timezone.js';

const $ = (id) => document.getElementById(id);
const STORE_PREFIX = 'wake-sim:';

const viewer = await createViewer($('viewer'), 'models/sim-scene.json');
const Module = await createClockModule();
const sim = new Module.Sim(viewer.ledCount);

// ----- Store: survive page reloads -----
function restoreStore() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(STORE_PREFIX)) sim.storePut(k.slice(STORE_PREFIX.length), localStorage.getItem(k));
    }
  } catch { /* storage blocked: settings live until reload */ }
}
function persistStore() {
  if (!sim.takeStoreDirty()) return;
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(STORE_PREFIX)) localStorage.removeItem(k);
    const keys = sim.storeKeys();
    for (let i = 0; i < keys.size(); i++) {
      const k = keys.get(i);
      localStorage.setItem(STORE_PREFIX + k, sim.storeGet(k));
    }
    keys.delete();
  } catch { /* ignore */ }
}

// ----- Time -----
let simMs = Date.now();
let speed = 1;
let timeUnknown = false;

function pushTime() {
  if (timeUnknown) { sim.setTimeUnknown(); return; }
  const l = localParts(simMs);
  sim.setTime(Math.floor(simMs / 1000), l.year, l.month, l.day, l.hour, l.minute, l.second, l.weekday);
}

function jumpTo(year, month, day, hour, minute) {
  simMs = localToEpoch(year, month, day, hour, minute);
}
function jumpToToday(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const l = localParts(simMs);
  jumpTo(l.year, l.month, l.day, h, m);
}

// ----- Phone page bridge (used by web/api.js inside the iframe) -----
window.clockSim = {
  async request(method, path, body) {
    pushTime();
    const res = sim.request(method, path, body || '');
    persistStore();
    return { status: res.status, contentType: res.contentType, body: res.body };
  },
};

// ----- LEDs -----
const strip = $('ledstrip');
for (let i = 0; i < viewer.ledCount; i++) strip.appendChild(document.createElement('span'));

function testPattern(name, n) {
  const out = new Uint8Array(n * 3);
  const colours = { red: [255, 0, 0], orange: [255, 90, 0], green: [0, 255, 0] };
  for (let i = 0; i < n; i++) {
    let c = colours[name] || [0, 0, 0];
    if (name === 'chase') c = i === Math.floor(performance.now() / 250) % n ? [0, 255, 0] : [0, 0, 0];
    out.set(c, i * 3);
  }
  return out;
}

// ----- Main loop -----
let last = performance.now();
function frame(now) {
  simMs += (now - last) * speed;
  last = now;
  pushTime();
  sim.tick();
  persistStore();

  const pattern = $('pattern').value;
  const n = viewer.ledCount;
  const bytes = pattern === 'app' ? sim.ledBytes().slice() : testPattern(pattern, n);
  viewer.setLeds(bytes);
  for (let i = 0; i < n; i++) {
    strip.children[i].style.background = `rgb(${bytes[i * 3]},${bytes[i * 3 + 1]},${bytes[i * 3 + 2]})`;
  }
  showTime();
  requestAnimationFrame(frame);
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
let lastShown = '';
function showTime() {
  const l = localParts(simMs);
  const hhmm = `${String(l.hour).padStart(2, '0')}:${String(l.minute).padStart(2, '0')}`;
  if (hhmm + speed === lastShown) return;
  lastShown = hhmm + speed;
  $('simclock').textContent = timeUnknown ? '??:??' : hhmm;
  $('simdate').textContent = dateFmt.format(new Date(simMs));
  if (document.activeElement !== $('slider')) $('slider').value = l.hour * 60 + l.minute;
  if (document.activeElement !== $('date')) $('date').value = `${l.year}-${String(l.month).padStart(2, '0')}-${String(l.day).padStart(2, '0')}`;
  if (document.activeElement !== $('time')) $('time').value = hhmm;
}

// ----- Controls -----
$('jump').onclick = () => {
  const [y, mo, d] = $('date').value.split('-').map(Number);
  const [h, mi] = $('time').value.split(':').map(Number);
  if (y && mo && d && !Number.isNaN(h)) jumpTo(y, mo, d, h, mi || 0);
};
$('now').onclick = () => { simMs = Date.now(); };
$('slider').oninput = (e) => {
  const v = +e.target.value;
  jumpToToday(`${Math.floor(v / 60)}:${v % 60}`);
};
document.querySelectorAll('[data-at]').forEach((b) => { b.onclick = () => jumpToToday(b.dataset.at); });
document.querySelectorAll('[data-speed]').forEach((b) => {
  b.onclick = () => {
    speed = +b.dataset.speed;
    document.querySelectorAll('[data-speed]').forEach((x) => x.classList.toggle('on', x === b));
  };
});
// Next DST nights in the EU: last Sunday of March / October.
function lastSunday(year, month) {
  const d = new Date(Date.UTC(year, month, 0));
  return d.getUTCDate() - d.getUTCDay();
}
$('dst-spring').onclick = () => { const y = localParts(simMs).year + (localParts(simMs).month > 3 ? 1 : 0); jumpTo(y, 3, lastSunday(y, 3), 1, 50); };
$('dst-autumn').onclick = () => { const y = localParts(simMs).year + (localParts(simMs).month > 10 ? 1 : 0); jumpTo(y, 10, lastSunday(y, 10), 1, 50); };

$('power').onclick = () => {
  if (sim.isOn()) sim.powerCut(); else { pushTime(); sim.powerOn(); }
  const off = !sim.isOn();
  $('power').classList.toggle('off', off);
  $('power').textContent = off ? 'Power back on' : 'Power cut';
  updateStatus();
};
$('unknown').onchange = (e) => { timeUnknown = e.target.checked; lastShown = ''; };
$('reset').onclick = () => { sim.storeClear(); persistStore(); sim.powerCut(); pushTime(); sim.powerOn(); updateStatus(); };
$('room').onchange = (e) => viewer.setRoom(e.target.value);

function updateStatus() {
  $('status').textContent = [
    sim.isOn() ? 'Clock powered' : 'Clock has no power',
    viewer.usingPlaceholder ? 'placeholder model (add parts in cad/sim-scene.json)' : 'your model',
  ].join(' · ');
}

restoreStore();
pushTime();
sim.powerOn();
updateStatus();
requestAnimationFrame(frame);
