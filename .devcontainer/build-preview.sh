#!/usr/bin/env bash
# Runs inside a GitHub Codespace, never on the owner's Windows PC.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

echo "Building Piik browser preview on GitHub Codespaces..."
node --version
npm --version
go version

npm ci --no-audit --no-fund
npm run build:web
mkdir -p build
CGO_ENABLED=0 go build -p 1 -trimpath -o build/piik-server ./cmd/piik-server
test -s build/piik-server
test -s internal/server/webassets/dist/index.html
echo "Piik web UI and server build complete."
