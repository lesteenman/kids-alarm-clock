// Simulator versions of the three ports. Harness code, not clock logic.
#pragma once

#include <map>
#include <string>
#include <vector>

#include "wake/ports.h"

namespace sim {

// Time set from JavaScript by the time machine.
class SimTime : public wake::TimeSource {
 public:
  void set(const wake::Instant& now) { now_ = now; }
  wake::Instant now() override { return now_; }

 private:
  wake::Instant now_{false, 0, {1970, 1, 1, 0, 0, 0, 4}};
};

// Keeps the last frame so JavaScript can draw it.
class FrameLeds : public wake::Leds {
 public:
  explicit FrameLeds(size_t count) : bytes_(count * 3, 0) {}
  size_t count() const override { return bytes_.size() / 3; }
  void show(const wake::Rgb* pixels, size_t n) override;
  void clear();
  const std::vector<uint8_t>& bytes() const { return bytes_; }

 private:
  std::vector<uint8_t> bytes_;  // r,g,b per LED
};

// In memory; JavaScript copies it to localStorage when it changes,
// so settings survive a "power cut" and a page reload.
class MemoryStore : public wake::Store {
 public:
  bool load(const std::string& key, std::string& out) override;
  void save(const std::string& key, const std::string& value) override;
  void clear() { data_.clear(); dirty_ = true; }
  bool takeDirty() { bool d = dirty_; dirty_ = false; return d; }
  std::vector<std::string> keys() const;
  std::string get(const std::string& key) const;
  void put(const std::string& key, const std::string& value) { data_[key] = value; }

 private:
  std::map<std::string, std::string> data_;
  bool dirty_ = false;
};

}  // namespace sim
