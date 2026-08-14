#!/bin/bash
set -euo pipefail

# Configs
DB_CONTAINER="qr_code-db-1"
DB_USER="postgres"
TEST_BACKUP_PATH="/tmp/qrmenu_qa_test.sql.gz"

echo "🏁 Starting Dry-Run QA Restoration Audit..."

# 1. Generate Backup using pg_dump
echo "📦 Backing up database..."
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "qrmenu" --format=custom | gzip -6 > "$TEST_BACKUP_PATH"

if [ ! -f "$TEST_BACKUP_PATH" ] || [ ! -s "$TEST_BACKUP_PATH" ]; then
  echo "❌ Error: Backup file is empty or missing." >&2
  exit 1
fi
echo "✅ Backup successfully generated at $TEST_BACKUP_PATH"

# 2. Create Temporary Test Database
echo "🛠️ Creating temporary test database 'qrmenu_restore_test'..."
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "postgres" -c "DROP DATABASE IF EXISTS qrmenu_restore_test;"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "postgres" -c "CREATE DATABASE qrmenu_restore_test;"

# 3. Restore the Backup
echo "📥 Restoring backup into 'qrmenu_restore_test'..."
gunzip -c "$TEST_BACKUP_PATH" | docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "qrmenu_restore_test" --clean --if-exists || true

# 4. Verify Restoration
echo "🔍 Verifying data integrity in restored database..."
TABLES_COUNT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "qrmenu_restore_test" -t -A -c "
  SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
")

if [ "$TABLES_COUNT" -lt 5 ]; then
  echo "❌ Error: Restored database has only $TABLES_COUNT tables. Restoration failed." >&2
  exit 1
fi

echo "✅ Verified: $TABLES_COUNT tables restored successfully!"

# Cleanup
echo "🧹 Cleaning up test database and temp files..."
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "postgres" -c "DROP DATABASE qrmenu_restore_test;"
rm -f "$TEST_BACKUP_PATH"

echo "🎉 Pre-live QA Backup & Restore Audit Passed Successfully!"
