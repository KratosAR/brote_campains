#!/bin/bash

# BCP PostgreSQL Backup Script
# Usage: ./scripts/backup.sh [output-dir]
# Default output: ./backups/

set -e

OUTPUT_DIR="${1:-.}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$OUTPUT_DIR/bcp_backup_$TIMESTAMP.sql.gz"

# Create backups directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Get database URL from environment or .env
if [ -z "$DATABASE_URL" ]; then
  if [ -f .env ]; then
    export $(cat .env | grep DATABASE_URL | xargs)
  else
    echo "Error: DATABASE_URL not set and .env not found"
    exit 1
  fi
fi

# Extract connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_URL_REGEX='postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)'
if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
  DB_USER="${BASH_REMATCH[1]}"
  DB_PASSWORD="${BASH_REMATCH[2]}"
  DB_HOST="${BASH_REMATCH[3]}"
  DB_PORT="${BASH_REMATCH[4]}"
  DB_NAME="${BASH_REMATCH[5]}"
else
  echo "Error: Invalid DATABASE_URL format"
  exit 1
fi

# Backup database
echo "Backing up $DB_NAME from $DB_HOST:$DB_PORT..."
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-password \
  --format=plain \
  | gzip > "$BACKUP_FILE"

echo "✓ Backup created: $BACKUP_FILE"
echo "  Size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo "  Keep backups safe — this is your only recovery point"
