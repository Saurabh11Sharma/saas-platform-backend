#!/usr/bin/env bash
set -Eeuo pipefail

# One local PostgreSQL server hosts isolated service databases for developer convenience.
databases=(identity_db tenant_db project_db billing_db notification_db)
for database in "${databases[@]}"; do
  exists="$(psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --tuples-only --no-align \
    --command "SELECT 1 FROM pg_database WHERE datname = '$database'")"
  if [[ "$exists" != "1" ]]; then
    echo "Creating service database: $database"
    psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
      --command "CREATE DATABASE \"$database\" OWNER \"$POSTGRES_USER\""
  fi
done
