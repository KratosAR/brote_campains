#!/bin/bash

# BCP PostgreSQL Restore Script
# Usage: ./scripts/restore.sh <backup-file>
# Example: ./scripts/restore.sh ./backups/bcp_backup_20260713_150000.sql.gz

set -e

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file>"
  echo "Example: $0 ./backups/bcp_backup_20260713_150000.sql.gz"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

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

# Confirm before destroying data
echo "⚠️  WARNING: This will restore $DB_NAME from $BACKUP_FILE"
echo "   All existing data will be replaced."
read -p "Are you sure? (type 'yes' to confirm): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "Restore cancelled"
  exit 1
fi

# Drop and recreate database
echo "Dropping database $DB_NAME..."
PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  --no-password \
  -d postgres \
  -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"

echo "Creating database $DB_NAME..."
PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  --no-password \
  -d postgres \
  -c "CREATE DATABASE \"$DB_NAME\";"

# Restore backup
echo "Restoring from $BACKUP_FILE..."
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-password

echo "✓ Restore complete"
echo "  Database: $DB_NAME"
echo "  Source: $BACKUP_FILE"
