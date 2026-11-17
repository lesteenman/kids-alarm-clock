// ESP32 entry point. Yours to write.
//
// Idea of the shape (see AGENTS.md):
//   - adapters in firmware/src/ implement wake::TimeSource (SNTP/DS3231),
//     wake::Leds (FastLED) and wake::Store (Preferences)
//   - WebServer routes forward to app.handle(), and serve the files in web/
//   - loop() calls app.tick() every few seconds
#include <Arduino.h>

void setup() {}

void loop() {}
