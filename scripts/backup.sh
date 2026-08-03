#!/usr/bin/env bash
# =============================================================
#  Manual backup script for Rikkei Document Management
#  Usage: bash scripts/backup.sh
#  Creates a Postgres dump + uploads tarball in /backups/
#  Retention: 30 days (override via RETENTION_DAYS env)
#
#  Run on the host (not inside container).
# =============================================================
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[backup]${NC} $*"; }
warn() { echo -e "${YELLOW}[backup]${NC} $*"; }
err() { echo -e "${RED}[backup]${NC} $*" >&2; }

# Load env
cd "$(dirname "$0")/.."
if [[ -f .env.production ]]; then
  set -a
  source .env.production
  set +a
elif [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-rikkei}"
POSTGRES_DB="${POSTGRES_DB:-rikkei_docs}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/rikkei-${DATE}"

mkdir -p "${BACKUP_PATH}"

# -------- Postgres dump --------
log "Dumping Postgres → ${BACKUP_PATH}/postgres.sql.gz"
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q 'rikkei-postgres'; then
  docker exec rikkei-postgres pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" | gzip > "${BACKUP_PATH}/postgres.sql.gz"
elif command -v pg_dump >/dev/null 2>&1; then
  PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -h localhost | gzip > "${BACKUP_PATH}/postgres.sql.gz"
else
  err "Neither docker nor pg_dump available. Cannot backup Postgres."
  exit 1
fi

# -------- Uploads tarball --------
log "Archiving uploads → ${BACKUP_PATH}/uploads.tar.gz"
if docker volume ls --format '{{.Name}}' | grep -q 'rikkei_uploads_data'; then
  docker run --rm \
    -v rikkei_uploads_data:/source:ro \
    -v "${BACKUP_PATH}":/backup \
    alpine tar czf /backup/uploads.tar.gz -C /source .
else
  warn "Uploads volume not found — skipping uploads backup"
fi

# -------- Manifest --------
PG_SIZE=$(stat -c%s "${BACKUP_PATH}/postgres.sql.gz" 2>/dev/null || stat -f%z "${BACKUP_PATH}/postgres.sql.gz" 2>/dev/null || echo 0)
UP_SIZE=$(stat -c%s "${BACKUP_PATH}/uploads.tar.gz" 2>/dev/null || stat -f%z "${BACKUP_PATH}/uploads.tar.gz" 2>/dev/null || echo 0)

cat > "${BACKUP_PATH}/manifest.json" <<EOF
{
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "postgres_db": "${POSTGRES_DB}",
  "postgres_size_bytes": ${PG_SIZE},
  "uploads_size_bytes": ${UP_SIZE},
  "retention_days": ${RETENTION_DAYS}
}
EOF

# -------- Compress everything into a single archive --------
log "Creating final archive: ${BACKUP_DIR}/rikkei-${DATE}.tar.gz"
cd "${BACKUP_DIR}"
tar -czf "rikkei-${DATE}.tar.gz" "rikkei-${DATE}/"
rm -rf "rikkei-${DATE}/"

# -------- Cleanup old backups --------
log "Removing backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "rikkei-*.tar.gz" -mtime +${RETENTION_DAYS} -delete

# -------- Summary --------
SIZE=$(du -h "${BACKUP_DIR}/rikkei-${DATE}.tar.gz" | cut -f1)
log "✅ Backup complete: ${BACKUP_DIR}/rikkei-${DATE}.tar.gz (${SIZE})"
ln -sf "rikkei-${DATE}.tar.gz" "${BACKUP_DIR}/rikkei-latest.tar.gz" 2>/dev/null || true

DISK_USAGE=$(df -h "${BACKUP_DIR}" | tail -1 | awk '{print $5 " used (" $4 " free)"}')
log "   Disk: ${DISK_USAGE}"