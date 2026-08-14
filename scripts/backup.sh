#!/bin/bash
set -euo pipefail

# Config
BACKUP_DIR="/opt/qrmenu/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="qrmenu_${TIMESTAMP}.sql.gz"
DB_CONTAINER="qr_code-db-1"
DB_USER="postgres"
DB_NAME="qrmenu"

echo "🏁 Starting database backup..."
mkdir -p "$BACKUP_DIR"

if ! docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" >/dev/null 2>&1; then
  echo "❌ Error: Postgres container is not running or not ready." >&2
  exit 1
fi

docker exec "$DB_CONTAINER" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --format=custom \
  | gzip -6 > "${BACKUP_DIR}/${FILENAME}"

echo "✅ Local backup saved to: ${BACKUP_DIR}/${FILENAME}"

# Local retention: keep only last 14 days
find "$BACKUP_DIR" -name "qrmenu_*.sql.gz" -mtime +14 -delete
echo "🧹 Pruned local backups older than 14 days."

# Upload offsite to Cloudflare R2 if credentials are provided in env
if [ -n "${R2_BUCKET_NAME:-}" ] && [ -n "${R2_ACCESS_KEY_ID:-}" ] && [ -n "${R2_SECRET_ACCESS_KEY:-}" ]; then
  echo "📤 Uploading backup to Cloudflare R2..."
  

  AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
  AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  aws --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
    s3 cp "${BACKUP_DIR}/${FILENAME}" "s3://${R2_BUCKET_NAME}/backups/${FILENAME}" \
    --region auto
    
  echo "🚀 Offsite backup upload complete!"
else
  echo "⚠️ Offsite backup skipped: R2 credentials not fully configured."
fi

echo "🎉 Backup lifecycle complete."
