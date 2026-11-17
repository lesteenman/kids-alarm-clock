// Smoke test so `pio test -e native` has something to run.
// Put your real tests for the core next to it (one folder per suite: test/test_*/).
#include <unity.h>

#include <map>
#include <vector>

#include "wake/app.h"

namespace {

struct FakeTime : wake::TimeSource {
  wake::Instant now() override { return {true, 0, {1970, 1, 1, 0, 0, 0, 4}}; }
};

struct FakeLeds : wake::Leds {
  std::vector<wake::Rgb> last;
  size_t count() const override { return 12; }
  void show(const wake::Rgb* px, size_t n) override { last.assign(px, px + n); }
};

struct FakeStore : wake::Store {
  std::map<std::string, std::string> data;
  bool load(const std::string& k, std::string& out) override {
    auto it = data.find(k);
    if (it == data.end()) return false;
    out = it->second;
    return true;
  }
  void save(const std::string& k, const std::string& v) override { data[k] = v; }
};

}  // namespace

void setUp() {}
void tearDown() {}

void test_tick_shows_every_led() {
  FakeTime time;
  FakeLeds leds;
  FakeStore store;
  wake::App app(time, leds, store);
  app.begin();
  app.tick();
  TEST_ASSERT_EQUAL(12, leds.last.size());
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_tick_shows_every_led);
  return UNITY_END();
}
