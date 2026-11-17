// Entry point of the core: the only class firmware/ and sim/ talk to.
// The simulator calls exactly these four things: the constructor, begin(),
// tick() and handle(). Everything behind them is yours to design.
#pragma once

#include <string>

#include "wake/ports.h"

namespace wake {

struct HttpResponse {
  int status;
  std::string contentType;
  std::string body;
};

class App {
 public:
  App(TimeSource& time, Leds& leds, Store& store);

  // Called once after power-on.
  void begin();

  // Called repeatedly (every frame in the sim, every few seconds on the
  // device). Must work out what to show from the time and the settings.
  void tick();

  // The phone page's JSON API, e.g. ("GET", "/api/state", "").
  HttpResponse handle(const std::string& method, const std::string& path,
                      const std::string& body);

 private:
  TimeSource& time_;
  Leds& leds_;
  Store& store_;
};

}  // namespace wake
