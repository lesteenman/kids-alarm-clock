#include "sim_adapters.h"

#include <algorithm>

namespace sim {

void FrameLeds::show(const wake::Rgb* pixels, size_t n) {
  n = std::min(n, count());
  for (size_t i = 0; i < n; ++i) {
    bytes_[i * 3 + 0] = pixels[i].r;
    bytes_[i * 3 + 1] = pixels[i].g;
    bytes_[i * 3 + 2] = pixels[i].b;
  }
}

void FrameLeds::clear() { std::fill(bytes_.begin(), bytes_.end(), 0); }

bool MemoryStore::load(const std::string& key, std::string& out) {
  auto it = data_.find(key);
  if (it == data_.end()) return false;
  out = it->second;
  return true;
}

void MemoryStore::save(const std::string& key, const std::string& value) {
  data_[key] = value;
  dirty_ = true;
}

std::vector<std::string> MemoryStore::keys() const {
  std::vector<std::string> k;
  for (const auto& kv : data_) k.push_back(kv.first);
  return k;
}

std::string MemoryStore::get(const std::string& key) const {
  auto it = data_.find(key);
  return it == data_.end() ? std::string() : it->second;
}

}  // namespace sim
