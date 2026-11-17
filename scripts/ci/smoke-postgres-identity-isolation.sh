#!/usr/bin/env bash
set -Eeuo pipefail

docker compose exec -T postgres sh -s <<'CONTAINER_SCRIPT'
set -eu
export PGPASSWORD="$IDENTITY_DB_PASSWORD"

access="$(
  psql --no-psqlrc --no-password --host=127.0.0.1 \
    --username="$IDENTITY_DB_USER" --dbname=identity_db \
    --set=ON_ERROR_STOP=1 --tuples-only --no-align --field-separator='|' <<'SQL'
SELECT
  current_database(),
  current_user,
  has_database_privilege(current_user, current_database(), 'CONNECT'),
  has_schema_privilege(current_user, 'identity', 'USAGE'),
  has_schema_privilege(current_user, 'identity', 'CREATE'),
  role.rolsuper,
  role.rolcreatedb,
  role.rolcreaterole,
  role.rolreplication,
  role.rolbypassrls
FROM pg_catalog.pg_roles AS role
WHERE role.rolname = current_user;
SQL
)"

IFS='|' read -r database_name role_name can_connect schema_usage schema_create is_superuser can_create_db can_create_role can_replicate can_bypass_rls <<EOF
$access
EOF

if [[ "$database_name" != "identity_db" || "$role_name" != "$IDENTITY_DB_USER" ||
  "$can_connect" != "t" || "$schema_usage" != "t" || "$schema_create" != "f" ||
  "$is_superuser" != "f" || "$can_create_db" != "f" || "$can_create_role" != "f" ||
  "$can_replicate" != "f" || "$can_bypass_rls" != "f" ]]; then
  echo "FAIL Identity role permissions are not least-privilege (database=$database_name, role=$role_name, connect=$can_connect, schema_usage=$schema_usage, schema_create=$schema_create, superuser=$is_superuser, createdb=$can_create_db, createrole=$can_create_role, replication=$can_replicate, bypassrls=$can_bypass_rls)" >&2
  exit 1
fi

echo "PASS Identity role has database connect and schema usage without elevated privileges"

for database in "$POSTGRES_DB" postgres template1 tenant_db project_db billing_db notification_db; do
  exists="$(
    psql --no-psqlrc --no-password --host=127.0.0.1 \
      --username="$IDENTITY_DB_USER" --dbname=identity_db \
      --set=ON_ERROR_STOP=1 --set=database="$database" \
      --tuples-only --no-align <<'SQL'
SELECT 1 FROM pg_catalog.pg_database WHERE datname = :'database';
SQL
  )"

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

echo "PASS Identity role is limited to identity_db"
CONTAINER_SCRIPT
