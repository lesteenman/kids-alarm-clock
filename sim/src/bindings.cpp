// Exposes the core to the simulator page (sim/www/sim.js) via embind.
#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <memory>

#include "sim_adapters.h"
#include "wake/app.h"

using emscripten::val;

class Sim {
 public:
  explicit Sim(int ledCount) : leds_(static_cast<size_t>(ledCount)) {}

  void setTime(double epochUtc, int year, int month, int day, int hour, int minute,
               int second, int weekday) {
    time_.set({true, static_cast<int64_t>(epochUtc),
               {year, month, day, hour, minute, second, weekday}});
  }
  void setTimeUnknown() { time_.set({false, 0, {1970, 1, 1, 0, 0, 0, 4}}); }

  // Power: on = construct App + begin(); cut = destroy it (RAM is lost, Store is kept).
  void powerOn() {
    if (app_) return;
    app_ = std::make_unique<wake::App>(time_, leds_, store_);
    app_->begin();
  }
  void powerCut() {
    app_.reset();
    leds_.clear();
  }
  bool isOn() const { return static_cast<bool>(app_); }

  void tick() {
    if (app_) app_->tick();
  }

  int ledCount() const { return static_cast<int>(leds_.count()); }
  // A view into WASM memory: copy it in JS before the next call.
  val ledBytes() const {
    const auto& b = leds_.bytes();
    return val(emscripten::typed_memory_view(b.size(), b.data()));
  }

  wake::HttpResponse request(const std::string& method, const std::string& path,
                             const std::string& body) {
    if (!app_) return {503, "application/json", "{\"error\":\"the clock has no power\"}"};
    return app_->handle(method, path, body);
  }

  bool takeStoreDirty() { return store_.takeDirty(); }
  std::vector<std::string> storeKeys() const { return store_.keys(); }
  std::string storeGet(const std::string& k) const { return store_.get(k); }
  void storePut(const std::string& k, const std::string& v) { store_.put(k, v); }
  void storeClear() { store_.clear(); }

 private:
  sim::SimTime time_;
  sim::FrameLeds leds_;
  sim::MemoryStore store_;
  std::unique_ptr<wake::App> app_;
};

EMSCRIPTEN_BINDINGS(wake_sim) {
  using namespace emscripten;
  register_vector<std::string>("StringList");
  value_object<wake::HttpResponse>("HttpResponse")
      .field("status", &wake::HttpResponse::status)
      .field("contentType", &wake::HttpResponse::contentType)
      .field("body", &wake::HttpResponse::body);
  class_<Sim>("Sim")
      .constructor<int>()
      .function("setTime", &Sim::setTime)
      .function("setTimeUnknown", &Sim::setTimeUnknown)
      .function("powerOn", &Sim::powerOn)
      .function("powerCut", &Sim::powerCut)
      .function("isOn", &Sim::isOn)
      .function("tick", &Sim::tick)
      .function("ledCount", &Sim::ledCount)
      .function("ledBytes", &Sim::ledBytes)
      .function("request", &Sim::request)
      .function("takeStoreDirty", &Sim::takeStoreDirty)
      .function("storeKeys", &Sim::storeKeys)
      .function("storeGet", &Sim::storeGet)
      .function("storePut", &Sim::storePut)
      .function("storeClear", &Sim::storeClear);
}
