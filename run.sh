#!/bin/sh
# Build/run the full job-hunt-tracker stack (postgres + api + web) in Docker.
#
# Usage:
#   ./run.sh          Build images if needed and start the stack.
#   ./run.sh -fresh   Remove containers, volumes (DB data + uploads) and
#                     locally-built images, then rebuild from scratch and start.

set -eu
cd "$(dirname "$0")"

FRESH=0
for arg in "$@"; do
  case "$arg" in
    -fresh|--fresh) FRESH=1 ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: $0 [-fresh]" >&2
      exit 1
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed or not on PATH." >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "Error: neither 'docker compose' nor 'docker-compose' is available." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker daemon is not running. Start Docker Desktop and try again." >&2
  exit 1
fi

# --- Bootstrap root .env for docker-compose if it doesn't exist yet ---------
if [ ! -f .env ]; then
  echo "==> No .env found, creating one for Docker..."
  cp .env.docker.example .env

  # Reuse existing secrets from apps/api/.env if present, so a Dockerized run
  # doesn't invalidate sessions/tokens from a prior bare-metal run.
  if [ -f apps/api/.env ]; then
    for key in JWT_SECRET JWT_REFRESH_SECRET OPENROUTER_API_KEY OPENROUTER_MODEL; do
      value=$(grep -E "^${key}=" apps/api/.env | head -n1 | cut -d'=' -f2-)
      if [ -n "$value" ]; then
        # Escape & and | for sed replacement safety.
        escaped=$(printf '%s' "$value" | sed -e 's/[&|]/\\&/g')
        sed -i.bak "s|^${key}=.*|${key}=${escaped}|" .env
        rm -f .env.bak
      fi
    done
  fi

  # Generate any secret still left blank.
  for key in JWT_SECRET JWT_REFRESH_SECRET; do
    current=$(grep -E "^${key}=" .env | head -n1 | cut -d'=' -f2-)
    if [ -z "$current" ]; then
      generated=$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
      sed -i.bak "s|^${key}=.*|${key}=${generated}|" .env
      rm -f .env.bak
    fi
  done

  echo "==> Created .env. Edit OPENROUTER_API_KEY there if you want AI features."
fi

if [ "$FRESH" -eq 1 ]; then
  echo "==> Fresh install requested: removing containers, volumes, and local images..."
  $COMPOSE down -v --rmi local --remove-orphans
  echo "==> Rebuilding images from scratch (no cache)..."
  $COMPOSE build --no-cache
fi

echo "==> Starting stack (postgres, api, web)..."
$COMPOSE up -d --build

echo "==> Waiting for services to become healthy..."
tries=0
max_tries=60
while :; do
  api_status=$($COMPOSE ps --format '{{.Service}} {{.Health}}' 2>/dev/null | awk '$1=="api"{print $2}')
  web_state=$($COMPOSE ps --format '{{.Service}} {{.State}}' 2>/dev/null | awk '$1=="web"{print $2}')

  if [ "$api_status" = "healthy" ] && [ "$web_state" = "running" ]; then
    break
  fi

  tries=$((tries + 1))
  if [ "$tries" -ge "$max_tries" ]; then
    echo "Error: services did not become healthy in time. Check logs with:" >&2
    echo "  $COMPOSE logs" >&2
    exit 1
  fi
  sleep 2
done

echo ""
echo "==> Job Hunt Tracker is up:"
echo "    Web:      http://localhost:3000"
echo "    API:      http://localhost:3001/health"
echo "    Postgres: localhost:5432"
echo ""
echo "Logs:  $COMPOSE logs -f"
echo "Stop:  $COMPOSE down"
