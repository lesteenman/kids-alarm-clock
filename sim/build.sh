#!/usr/bin/env bash
# Builds the simulator into build/site/ (what GitHub Pages serves).
# Needs emscripten on PATH (source emsdk_env.sh first).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/build/site"

(cd "$ROOT/sim" && npm ci --no-audit --no-fund >/dev/null)

emcmake cmake -S "$ROOT/sim" -B "$ROOT/build/sim" -DCMAKE_BUILD_TYPE=Release
cmake --build "$ROOT/build/sim"

rm -rf "$OUT"
mkdir -p "$OUT/phone" "$OUT/models"
cp -r "$ROOT/sim/www/." "$OUT/"
# three.js is served from the site itself (no CDN at runtime).
THREE="$ROOT/sim/node_modules/three"
mkdir -p "$OUT/vendor/three/build" "$OUT/vendor/three/examples"
cp "$THREE/build/three.module.js" "$OUT/vendor/three/build/"
cp -r "$THREE/examples/jsm" "$OUT/vendor/three/examples/"
cp "$ROOT/build/sim/clock.js" "$ROOT/build/sim/clock.wasm" "$OUT/"
cp -r "$ROOT/web/." "$OUT/phone/"
cp "$ROOT/cad/sim-scene.json" "$OUT/models/"
cp -r "$ROOT/cad/exports" "$OUT/models/"
touch "$OUT/.nojekyll"
echo "Built $OUT. Serve it with: sim/serve.sh"
