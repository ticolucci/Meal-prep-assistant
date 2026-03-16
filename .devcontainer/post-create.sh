#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing npm dependencies"
npm ci

echo "==> Installing Claude Code"
npm install -g @anthropic-ai/claude-code

echo "==> Installing Playwright browsers + OS deps"
npx playwright install --with-deps chromium

echo "==> Running DB migrations (local SQLite)"
# TURSO_DATABASE_URL defaults to file:local.db via devcontainer.json remoteEnv
npx drizzle-kit migrate || true   # non-fatal if migrations already applied

echo ""
echo "==> Dev container ready!"
echo "    Run the Ralph loop with:"
echo "      claude --dangerously-skip-permissions -p prompt.md"
echo ""
