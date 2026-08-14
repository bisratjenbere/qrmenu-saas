# Database Restore Procedure

Follow this guide to restore the PostgreSQL database from a compressed custom-format backup file.

## Prerequisites
- A valid backup file, e.g., `qrmenu_20260806_030000.sql.gz`
- Docker and Docker Compose installed and running on the host system

---

## Step-by-Step Restore

### 1. Stop write traffic to the database
Stop the application containers so no new orders are written during the restore process.

```bash
docker compose -f docker-compose.prod.yml stop api web
```

### 2. Copy the backup file (if not local)
If downloading from offsite storage (R2/S3):

```bash
# Example R2 download:
AWS_ACCESS_KEY_ID="your-r2-key" \
AWS_SECRET_ACCESS_KEY="your-r2-secret" \
aws --endpoint-url "https://<account-id>.r2.cloudflarestorage.com" \
  s3 cp "s3://<bucket-name>/backups/qrmenu_20260806_030000.sql.gz" "./qrmenu_restore.sql.gz" \
  --region auto
```

### 3. Decompress the backup
Decompress the backup file:

```bash
gunzip -c qrmenu_restore.sql.gz > qrmenu_restore.sql
```

### 4. Restore the database schema and data
Run `pg_restore` inside the Postgres container using the clean flag:

```bash
# Copy backup file into a temporary location in the db container or pipe it in:
docker exec -i qr_code-db-1 \
  pg_restore -U postgres --clean --if-exists -d qrmenu \
  < qrmenu_restore.sql
```

### 5. Restart application services
Once restore is complete, bring the API and web services back up:

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 6. Verify data integrity
Verify the restore was successful:
1. Log in to the Admin Panel and check that branches, menus, and sections exist.
2. Check the logs: `docker compose logs -f api` to ensure no database errors occur.
3. Access the customer menu slug and check that items load correctly.
