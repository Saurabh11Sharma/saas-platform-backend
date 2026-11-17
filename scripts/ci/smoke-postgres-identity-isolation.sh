#!/usr/bin/env bash
set -Eeuo pipefail

docker compose exec -T postgres sh -s <<'CONTAINER_SCRIPT'
set -eu
export PGPASSWORD="$IDENTITY_DB_PASSWORD"

psql --no-psqlrc --no-password --host=127.0.0.1 \
  --username="$IDENTITY_DB_USER" --dbname=identity_db \
  --set=ON_ERROR_STOP=1 --set=identity_user="$IDENTITY_DB_USER" \
  --command="
    SELECT CASE
      WHEN current_database() = 'identity_db'
        AND current_user = :'identity_user'
        AND has_schema_privilege(current_user, 'identity', 'USAGE')
        AND NOT has_schema_privilege(current_user, 'identity', 'CREATE')
      THEN 1
      ELSE 1 / 0
    END
  "

for database in "$POSTGRES_DB" postgres template1 tenant_db project_db billing_db notification_db; do
  exists="$(psql --no-psqlrc --no-password --host=127.0.0.1 \
    --username="$IDENTITY_DB_USER" --dbname=identity_db \
    --set=ON_ERROR_STOP=1 --set=database="$database" \
    --tuples-only --no-align \
    --command="SELECT 1 FROM pg_catalog.pg_database WHERE datname = :'database'")"

  if [[ "$exists" != "1" ]]; then
    echo "FAIL expected database $database was not initialized" >&2
    exit 1
  fi

  if psql --no-psqlrc --no-password --host=127.0.0.1 \
    --username="$IDENTITY_DB_USER" --dbname="$database" \
    --command='SELECT 1' >/dev/null 2>&1; then
    echo "FAIL Identity role unexpectedly connected to $database" >&2
    exit 1
  fi

  echo "PASS Identity role denied connection to $database"
done

echo "PASS Identity role is limited to identity_db and cannot create schemas"
CONTAINER_SCRIPT
