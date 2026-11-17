// STUB, written only so everything builds. Replace with your own code.
#include "wake/app.h"

#include <vector>

namespace wake {

App::App(TimeSource& time, Leds& leds, Store& store)
    : time_(time), leds_(leds), store_(store) {}

void App::begin() {}

void App::tick() {
  // TODO(Erik): decide the colour from time_.now() and the settings.
  std::vector<Rgb> off(leds_.count(), Rgb{0, 0, 0});
  leds_.show(off.data(), off.size());
}

HttpResponse App::handle(const std::string& method, const std::string& path,
                         const std::string& body) {
  (void)method;
  (void)path;
  (void)body;
  return {501, "application/json", "{\"error\":\"not implemented yet\"}"};
}

}  // namespace wake
