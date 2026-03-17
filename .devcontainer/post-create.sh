#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing npm dependencies"
npm ci

echo "==> Installing Claude Code"
npm install -g @anthropic-ai/claude-code

echo "==> Installing Playwright browsers + OS deps"
npx playwright install --with-deps chromium

echo "==> Creating .env.local with local SQLite defaults (if not already present)"
# devcontainer.json remoteEnv cannot set TURSO_DATABASE_URL because the colon
# in "file:./local.db" is treated as a syntax separator and truncates the value.
# We create .env.local here instead. Shell env vars override .env.local, so if
# a Codespaces secret provides a real Turso URL it still takes precedence at runtime.
if [ ! -f .env.local ]; then
  cat > .env.local <<'EOF'
TURSO_DATABASE_URL=file:./local.db
TURSO_AUTH_TOKEN=local
ANTHROPIC_API_KEY=placeholder-set-real-key-for-ai-features
EOF
  echo "    Created .env.local with local SQLite defaults"
else
  echo "    .env.local already exists — skipping"
fi

echo "==> Running DB migrations (local SQLite)"
TURSO_DATABASE_URL=file:./local.db TURSO_AUTH_TOKEN=local npx drizzle-kit migrate || true   # non-fatal if migrations already applied

echo ""
echo "==> Dev container ready!"
echo "    Run the Ralph loop with:"
echo "      claude --dangerously-skip-permissions -p prompt.md"
echo ""
