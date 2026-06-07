#!/usr/bin/env sh
set -eu

REPO_URL="${TRACEME_REPO_URL:-git@github.com:KECIHH/traceme-next.git}"
APP_DIR="${TRACEME_APP_DIR:-$HOME/traceme-next}"
BRANCH="${TRACEME_BRANCH:-main}"

read_env_value() {
  env_name="$1"

  if [ ! -f ".env" ]; then
    return 0
  fi

  sed -n "s/^[[:space:]]*$env_name[[:space:]]*=[[:space:]]*//p" .env \
    | tail -n 1 \
    | sed "s/^[\"']//;s/[\"']$//"
}

if ! command -v git >/dev/null 2>&1; then
  echo "git is required." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose is required." >&2
  exit 1
fi

if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
else
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

if [ ! -f ".env" ]; then
  cat > .env <<'ENVEOF'
AI_PROVIDER=mock
AI_API_KEY=
AI_MODEL=
AI_CHAT_COMPLETIONS_URL=
AI_REQUEST_TIMEOUT_MS=
APP_PORT=3000
ENVEOF
  echo "Created .env with mock defaults. Edit it on the server for openai-compatible mode." >&2
fi

APP_PORT_VALUE="${APP_PORT:-$(read_env_value APP_PORT)}"
AI_PROVIDER_VALUE="${AI_PROVIDER:-$(read_env_value AI_PROVIDER)}"
BASE_URL="${TRACEME_BASE_URL:-http://127.0.0.1:${APP_PORT_VALUE:-3000}}"
EXPECT_PROVIDER="${TRACEME_EXPECT_PROVIDER:-${AI_PROVIDER_VALUE:-mock}}"

docker compose build
docker compose up -d

node scripts/smoke-travel-api.mjs \
  --base-url "$BASE_URL" \
  --expect-provider "$EXPECT_PROVIDER"
