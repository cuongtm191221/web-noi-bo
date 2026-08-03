#!/usr/bin/env bash
# =============================================================
#  Production deployment script for Rikkei Document Management
#  Usage: bash scripts/deploy.sh
#  Idempotent — safe to re-run for redeploys.
#
#  Prerequisites:
#  - .env.production exists (copy from .env.production.example)
#  - DNS A record pointing to this server's public IP
#  - Nginx + Let's Encrypt already configured (see DEPLOY.md)
# =============================================================
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
err() { echo -e "${RED}[deploy]${NC} $*" >&2; }

# -------- Pre-flight checks --------
cd "$(dirname "$0")/.."

if [[ ! -f .env.production ]]; then
  err ".env.production not found."
  err "Copy .env.production.example to .env.production and fill in values:"
  err "  cp .env.production.example .env.production"
  err "  bash scripts/generate-secrets.sh  # generates random secrets"
  exit 1
fi

# Load env vars
set -a
source .env.production
set +a

if [[ "${NODE_ENV:-}" != "production" ]]; then
  warn "NODE_ENV is not 'production' (got: ${NODE_ENV:-unset})."
  warn "Proceeding anyway — set NODE_ENV=production in .env.production for full hardening."
fi

if [[ -z "${AUTH_SECRET:-}" || "${#AUTH_SECRET}" -lt 32 ]]; then
  err "AUTH_SECRET must be at least 32 chars. Run: bash scripts/generate-secrets.sh"
  exit 1
fi

if [[ -z "${POSTGRES_PASSWORD:-}" || "${#POSTGRES_PASSWORD}" -lt 12 ]]; then
  err "POSTGRES_PASSWORD must be at least 12 chars."
  exit 1
fi

if [[ -z "${NEXTAUTH_URL:-}" || "${NEXTAUTH_URL}" != https://* ]]; then
  err "NEXTAUTH_URL must start with https:// (got: ${NEXTAUX_URL:-unset})"
  exit 1
fi

log "Pre-flight checks passed ✓"

# -------- Pull latest code (if git repo) --------
if [[ -d .git ]]; then
  log "Pulling latest code from git..."
  git pull --rebase --autostash || warn "git pull failed — continuing with current code"
else
  warn "Not a git repo — skipping pull. Make sure code is up-to-date manually."
fi

# -------- Stop existing services --------
log "Stopping existing services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml down --remove-orphans || true

# -------- Build images --------
log "Building images..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache web

# -------- Start core services (postgres + web) --------
log "Starting postgres + web..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d postgres web

# -------- Wait for postgres to be healthy --------
log "Waiting for postgres to be healthy..."
for i in {1..30}; do
  if docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres pg_isready -U "${POSTGRES_USER:-rikkei}" -d "${POSTGRES_DB:-rikkei_docs}" >/dev/null 2>&1; then
    log "Postgres is healthy ✓"
    break
  fi
  if [[ $i -eq 30 ]]; then
    err "Postgres failed to become healthy in 60s. Check: docker compose logs postgres"
    exit 1
  fi
  sleep 2
done

# -------- Run migrations (web container runs migrate deploy in CMD, but verify) --------
log "Verifying migrations..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T web \
  npx prisma migrate deploy --schema=./apps/web/prisma/schema.prisma

# -------- Seed admin user (only on first deploy) --------
if [[ -n "${ADMIN_EMAIL:-}" && -n "${ADMIN_PASSWORD:-}" ]]; then
  log "Seeding admin user (idempotent — won't overwrite existing)..."
  docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T -e ADMIN_EMAIL -e ADMIN_PASSWORD -e ADMIN_NAME web \
    npx tsx apps/web/scripts/seed.ts || warn "Seed failed — check if admin already exists"
else
  warn "ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping seed. Set them in .env.production to seed initial admin."
fi

# -------- Wait for web to be healthy --------
log "Waiting for web /api/health..."
HEALTH_OK=false
for i in {1..20}; do
  if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
    log "Web is healthy ✓"
    HEALTH_OK=true
    break
  fi
  if [[ $i -eq 20 ]]; then
    err "Web failed to become healthy in 60s. Check: docker compose logs web"
  fi
  sleep 3
done

if [[ "${HEALTH_OK}" != "true" ]]; then
  warn "Health check failed. App may still be starting — check logs."
  docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=50 web
  exit 1
fi

# -------- Start optional services if profiles enabled --------
if [[ "${ENABLE_AI:-false}" == "true" ]]; then
  log "Starting AI pipeline (profile: ai)..."
  docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile ai up -d ollama ai-pipeline
  log "Pulling Ollama model (this may take 5-10 minutes for first run)..."
  docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T ollama \
    ollama pull "${OLLAMA_MODEL:-qwen2.5:7b}" || warn "Ollama model pull failed — run manually: docker exec rikkei-ollama ollama pull ${OLLAMA_MODEL:-qwen2.5:7b}"
fi

if [[ "${ENABLE_MCP:-false}" == "true" ]]; then
  log "Starting MCP server (profile: mcp)..."
  docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile mcp up -d mcp-server
fi

# -------- Verify --------
log ""
log "=========================================="
log "  ✅ Deployment complete!"
log "=========================================="
log ""
log "App URL:    ${NEXTAUTH_URL}"
log "Health:     ${NEXTAUTH_URL}/api/health"
log "Admin:      ${ADMIN_EMAIL:-<set ADMIN_EMAIL in .env.production>}"
log ""
log "Useful commands:"
log "  docker compose -f docker-compose.yml -f docker-compose.prod.yml ps"
log "  docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f web"
log "  docker compose -f docker-compose.yml -f docker-compose.prod.yml restart web"
log ""
log "Backup (manual):"
log "  bash scripts/backup.sh"
log "=========================================="