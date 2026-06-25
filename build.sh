#!/usr/bin/env bash
# One-click Tauri desktop build for macOS
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "========================================"
echo "  My Postman - Rebuild Desktop App"
echo "========================================"
echo

echo "[1/3] Stopping running app..."
pkill -x app 2>/dev/null || true
pkill -f "My Postman" 2>/dev/null || true

echo "[2/3] Checking build environment..."
if ! xcode-select -p &>/dev/null; then
  echo "[ERROR] Xcode Command Line Tools not found."
  echo "        Run: xcode-select --install"
  exit 1
fi

if ! command -v pnpm &>/dev/null; then
  echo "[ERROR] pnpm not found. Install Node.js and pnpm first."
  exit 1
fi

if ! command -v rustc &>/dev/null; then
  echo "[ERROR] Rust not found. Install from https://rustup.rs"
  exit 1
fi

echo "[3/3] Building..."
echo
bash "$ROOT/scripts/tauri-build.sh"
BUILD_EXIT=$?

echo
if [[ $BUILD_EXIT -eq 0 ]]; then
  echo "========================================"
  echo "  Build succeeded!"
  echo "  Output: src-tauri/target/release/bundle/macos/My Postman.app"
  echo "  (Quick binary only: pnpm tauri:build:mac -- --no-bundle)"
  echo "========================================"
else
  echo "========================================"
  echo "  Build failed. Exit code: $BUILD_EXIT"
  echo "========================================"
fi

exit $BUILD_EXIT
