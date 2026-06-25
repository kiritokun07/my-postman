#!/usr/bin/env bash
# Build Tauri app on macOS (requires Xcode Command Line Tools + Rust)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NO_BUNDLE=false
for arg in "$@"; do
  if [[ "$arg" == "--no-bundle" ]]; then
    NO_BUNDLE=true
  fi
done

if ! xcode-select -p &>/dev/null; then
  echo "[ERROR] Xcode Command Line Tools not found."
  echo "        Run: xcode-select --install"
  exit 1
fi

if ! command -v rustc &>/dev/null; then
  echo "[ERROR] Rust not found. Install from https://rustup.rs"
  exit 1
fi

if ! command -v pnpm &>/dev/null; then
  echo "[ERROR] pnpm not found. Install Node.js and pnpm first."
  exit 1
fi

# Avoid HTTP/2 download failures on unstable networks
export CARGO_NET_RETRY="${CARGO_NET_RETRY:-10}"
export CARGO_HTTP_MULTIPLEXING="${CARGO_HTTP_MULTIPLEXING:-false}"

BUNDLE_FLAG=""
if $NO_BUNDLE; then
  BUNDLE_FLAG="--no-bundle"
fi

pnpm tauri build $BUNDLE_FLAG
