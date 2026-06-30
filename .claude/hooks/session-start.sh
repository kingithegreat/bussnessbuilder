#!/bin/bash
# SessionStart hook for Claude Code on the web.
# Installs dependencies so lint / test / build work immediately in remote sessions.
set -euo pipefail

# Only run in remote (Claude Code on the web) environments; local devs manage their own deps.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# .npmrc already sets legacy-peer-deps=true (@angular/fire@20 vs Angular 21).
# Prefer `npm install` over `npm ci` so the cached container state is reused
# across sessions; it is idempotent and a no-op when deps are already present.
npm install --no-fund --no-audit
