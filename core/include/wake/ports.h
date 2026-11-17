// The three ways the core talks to the outside world.
// Each platform (firmware/, sim/, test/) provides its own implementation.
// These are the contract the simulator relies on: change them freely, but
// update sim/src/sim_adapters.* in the same commit.
#pragma once

#include <cstddef>
#include <cstdint>
#include <string>

namespace wake {

// Wall-clock time where the clock stands (already converted to local time,
// DST included). weekday: 0 = Sunday ... 6 = Saturday.
struct LocalTime {
  int year;
  int month;   // 1-12
  int day;     // 1-31
  int hour;    // 0-23
  int minute;  // 0-59
  int second;  // 0-59
  int weekday;
};

struct Instant {
  bool valid;        // false when the clock doesn't know the time
  int64_t epochUtc;  // seconds since 1970-01-01 UTC
  LocalTime local;
};

class TimeSource {
 public:
  virtual ~TimeSource() = default;
  virtual Instant now() = 0;
};

struct Rgb {
  uint8_t r;
  uint8_t g;
  uint8_t b;
};

class Leds {
 public:
  virtual ~Leds() = default;
  virtual size_t count() const = 0;
  // Final colours, brightness already applied. n == count().
  virtual void show(const Rgb* pixels, size_t n) = 0;
};

// Survives power cuts (Preferences/NVS on the ESP32, browser storage in the sim).
class Store {
 public:
  virtual ~Store() = default;
  virtual bool load(const std::string& key, std::string& out) = 0;
  virtual void save(const std::string& key, const std::string& value) = 0;
};

}  // namespace wake
