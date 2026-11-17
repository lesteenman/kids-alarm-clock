# AGENTS.md

Guide for AI agents (and humans) working in this repo. Read all of it before changing anything.

## What this is

A DIY "OK to wake" clock for two young kids: it glows red when they should stay in bed, optionally orange when they may be awake but stay in their room, and green when they may get up. It replaces a commercial clock with bad UX. Two clocks, one per kid, each with its own schedule, set up from a phone browser.

The repo holds everything: firmware (ESP32), the phone page, a browser simulator that runs the real clock code against the 3D model, and the CAD files.

## How Erik works on this project (read first)

- **Erik writes all the clock code, makes all the models and does all the hardware.** This is a learn-by-doing project: C++, CAD, 3D printing and electronics are partly new to him. There's no deadline; weeks per phase is fine.
- **So agents do not write** the clock logic (`core/src/`), the phone page (`web/`), the firmware (`firmware/`), tests of the clock logic, or models (`cad/`), unless Erik explicitly asks for that specific piece. Stubs marked `STUB` or `PLACEHOLDER` are his to replace.
- **Agents do:** explain concepts, answer questions, point to the right docs, review Erik's code and models, find bugs, suggest test cases, and explain *how* to approach something. Short snippets that illustrate an idea are fine; finished implementations are not.
- **Agents may maintain:** the simulator harness (`sim/`), build scripts, CI, the repo layout and this file. Keep those changes small and explain them.
- **Honesty over politeness.** Say when Erik is wrong. No flattery. When researching, quote sources with links, or say you don't know and only then give a best guess, marked as a guess.
- **Validate with the users early.** The users are Erik and his wife (the kids just see colours). The simulator exists so the schedule and the phone page can be tried before the hardware is ready. A render is "roughly like this": light levels, glare and the real diffuser can only be judged on hardware.
- Planning notes (requirements, hardware choices, printing, shopping list) live in Erik's private Obsidian vault: `lesteenman/obsidian-vault`, folder `Personal/Projects/Kids wake-up clock/` (Plan, Hardware, Printing, Software, Virtual prototype, Shopping list). If you have access, read them before proposing changes. Never push to that repo's `main`; use a branch and a PR.

## What the clock must do (v1)

| Phase | Behaviour | Configurable per clock |
| --- | --- | --- |
| Red | From bedtime (around 17:00) through the night | Start time, brightness |
| Orange (optional) | Before wake time; on for the older child, off for the younger | On/off, start, brightness |
| Green | From wake time, for a while | Wake time, duration, brightness |
| Off | After green until bedtime | — |
| Sleep in | Shifts the next wake time | Minutes |
| Nap mode | Red now for a while, then green | Minutes |

"Skip a day" is just switching it off. Later: one LED at a time as a progress ring; Home Assistant; both clocks managed in one place.

## Design rules (from the old clock's problems)

1. **The colour is computed from the time and the schedule on every tick and right after power-on.** No "alarm events" that can be missed. A power cut or a trip must never leave it on the wrong colour.
2. **No button that disables anything.** Overrides (sleep in, nap) come only from the phone page and expire by themselves; store expiry times, not flags.
3. **Names by meaning:** "Bedtime", "Orange", "Wake". Never "alarm 1/2".
4. **Settings live on the device** and survive power loss.
5. **Works without Wi-Fi.** Time comes from the internet (SNTP) → the RTC chip → the phone page, in that order. Unknown time shows a distinct state (not red, not green) and the page says so.
6. **Any adult can manage it,** including grandparents: join the clock's own Wi-Fi from a QR sticker and use one plain page.

## Hardware (short)

Seeed XIAO ESP32-C3, a 12-LED WS2812B ring behind a 3D-printed diffuser, a 74AHCT125 level shifter for the LED data line, a DS3231 RTC, USB-C power (internal battery later). Each clock is a **core** (electronics, light chamber, diffuser; the same for both) plus a swappable **shell** designed with the family. Must print on printers Erik doesn't own, so fits are parameters tested with a test coupon per printer. Details are in the vault notes.

## Repo layout: what belongs where

| Path | What | Who writes it |
| --- | --- | --- |
| `core/include/wake/ports.h` | Interfaces the core uses to reach the world: `TimeSource`, `Leds`, `Store` | Erik (agents keep `sim/` in sync when it changes) |
| `core/include/wake/app.h` | `wake::App`: the one entry point that firmware and sim call | Erik (same) |
| `core/src/` | All clock logic: schedule, colour decision, overrides, settings, JSON API. **Plain C++17, no Arduino, no I/O, no global state** | Erik |
| `web/` | The phone page (HTML/JS/CSS). Calls the clock only through `web/api.js` | Erik |
| `firmware/` | ESP32 app: `main.cpp` + adapters (FastLED → `Leds`, Preferences → `Store`, SNTP/DS3231 → `TimeSource`, WebServer → `App::handle` and serving `web/`) | Erik |
| `test/` | Unit tests of `core/`, run on the computer (`pio test -e native`). One folder per suite: `test/test_*/` | Erik |
| `cad/src/`, `cad/exports/` | Model sources and the STL/3MF exports | Erik |
| `cad/sim-scene.json` | Which exports the simulator loads, and where the LEDs are (see `cad/README.md`) | Erik |
| `sim/` | Simulator harness: WASM build of `core/` + sim adapters (`sim/src/`), the sim page (`sim/www/`: three.js view, time machine, phone frame) | Agents |
| `platformio.ini`, `.github/`, `sim/build.sh` | Build and CI | Agents |

### How the pieces talk

```
phone page (web/) ──api.js──▶ App::handle(method, path, body) ──▶ settings in Store
                                                                     │
TimeSource ──now()──▶ App::tick() ── decides colours from time + settings ──▶ Leds::show()
```

- The phone page edits **settings and overrides**, never colours. It reads the clock's current state through the API.
- `App::tick()` is the only place that decides colours.
- On the ESP32, `api.js` uses `fetch()`. In the simulator, the page runs in an iframe and `api.js` calls `window.parent.clockSim.request()`, which goes straight into the WASM build of `App::handle`. Same page, same core, two transports.
- Adapters translate; they never decide. If logic ends up in `firmware/`, the simulator silently stops running "the real software".

## Building and running

| Task | Command |
| --- | --- |
| Core unit tests on your computer | `pio test -e native` |
| Build firmware | `pio run -e xiao_esp32c3` |
| Flash firmware | `pio run -e xiao_esp32c3 -t upload` |
| Serial monitor | `pio device monitor` |
| Build simulator | `source <emsdk>/emsdk_env.sh && sim/build.sh` |
| Run simulator locally | `sim/serve.sh`, then open http://localhost:8000 (or your computer's LAN IP on a phone) |

The simulator needs [emscripten](https://emscripten.org/docs/getting_started/downloads.html) (CI uses 4.0.10) and Node.js (to fetch three.js). On every push to `main`, CI runs the tests, builds the firmware and publishes the simulator to GitHub Pages.

### The simulator

- **Clock:** the 3D model from `cad/sim-scene.json` (placeholder until there are parts), lit by the LED colours from `App`. Room light: daylight, evening, dark bedroom. "LEDs from" can switch to test patterns to check a model without any clock code.
- **Time machine:** jump to a date/time, presets, speeds up to 3600×, the next DST nights, "Power cut" (destroys `App`, keeps `Store`; power-on runs `begin()` again), and "Clock doesn't know the time" (`Instant.valid = false`).
- **Phone:** `web/index.html` in a phone frame, talking to the same `App`.
- Settings saved through `Store` persist in the browser's localStorage. "Wipe stored settings" clears them.
- Time zone: Europe/Berlin, computed by the browser (`sim/www/timezone.js`). The firmware should use the POSIX TZ `CET-1CEST,M3.5.0,M10.5.0/3`.

## Testing expectations

- Put the most tests on the colour decision: that's where the old clock's bugs were.
- Always cover: crossing midnight, both DST nights, power cut across wake time (must be green at power-on), unknown time, overrides expiring, weekday vs weekend.
- Hardware checks (wiring, current draw, brightness at night, captive portal on iPhone and Android) are manual; keep their checklists in the vault notes.

## Conventions

- C++17. The core must compile with the host compiler, emscripten and the ESP32 toolchain: no Arduino headers, no `String`, no threads, no exceptions needed for normal flow.
- Namespace `wake`. Interfaces in `core/include/wake/`.
- The repo is **public**: never commit Wi-Fi passwords, home addresses or kids' names. Wi-Fi credentials go into the device's `Store` at setup time.
- Commit messages: short imperative subject. Work on branches; `main` deploys the simulator.
