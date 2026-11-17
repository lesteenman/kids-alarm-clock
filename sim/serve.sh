#!/usr/bin/env bash
# Serves build/site on http://localhost:8000 (and on your LAN, for a phone).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec python3 -m http.server 8000 --directory "$ROOT/build/site"
