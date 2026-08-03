#!/bin/bash
# Restore backup
# Usage: ./scripts/restore.sh <backup_name>

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <backup_name>"
  echo "Example: $0 backup_20260804_120000"
  echo ""
  echo "Available backups:"
  ls -1 /backups/backup_*_meta.json 2>/dev/null | xargs -n1 basename | sed 's/_meta.json$//'
  exit 1
fi

BACKUP_NAME="$1"
BACKUP_DIR="${BACKUP_DIR:-/backups}"

META_FILE="${BACKUP_DIR}/${BACKUP_NAME}_meta.json"
if [ ! -f "${META_FILE}" ]; then
  echo "ERROR: Backup not found: ${META_FILE}"
  exit 1
fi

echo "[$(date)] Restoring: ${BACKUP_NAME}"
cat "${META_FILE}"
echo ""

read -p "Press Enter to continue, Ctrl+C to abort..."

# Restore postgres
PG_FILE="${BACKUP_DIR}/${BACKUP_NAME}_postgres.sql.gz"
if [ -f "${PG_FILE}" ]; then
  echo "[$(date)] Restoring postgres..."
  gunzip -c "${PG_FILE}" | docker exec -i rikkei-postgres psql -U rikkei -d rikkei_docs
  echo "[$(date)] Postgres restored"
fi

# Restore uploads
UPLOADS_FILE="${BACKUP_DIR}/${BACKUP_NAME}_uploads.tar.gz"
if [ -f "${UPLOADS_FILE}" ]; then
  echo "[$(date)] Restoring uploads..."
  docker run --rm \
    -v rikkei_uploads:/target \
    -v "${BACKUP_DIR}":/backup \
    alpine sh -c "rm -rf /target/* && tar -xzf /backup/$(basename ${UPLOADS_FILE}) -C /target"
  echo "[$(date)] Uploads restored"
fi

echo "[$(date)] Restore complete"