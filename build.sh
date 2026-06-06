#!/usr/bin/env bash
# 두더지 잡기 — release 빌드 스크립트
#
# TypeScript 컴파일 → dist/ → 자체 번들러로 인라인 → release/index.html (단일 파일)
#
# 사용법:
#   ./build.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "▶ Cleaning previous build…"
rm -rf dist release

echo "▶ Compiling TypeScript…"
if command -v tsc >/dev/null 2>&1; then
  tsc
elif [ -x "node_modules/.bin/tsc" ]; then
  node_modules/.bin/tsc
else
  echo "✗ tsc not found. Install with: npm install" >&2
  exit 1
fi

echo "▶ Bundling into release/index.html…"
node tools/bundle.mjs

echo ""
echo "✅ Build complete — open release/index.html in a browser."
