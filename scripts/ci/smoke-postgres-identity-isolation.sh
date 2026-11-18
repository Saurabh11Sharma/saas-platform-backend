#!/usr/bin/env bash
set -Eeuo pipefail

docker compose exec -T postgres sh -s <<'CONTAINER_SCRIPT'
set -eu

admin_psql() {
  PGPASSWORD="$POSTGRES_PASSWORD" psql --no-psqlrc --no-password --host=127.0.0.1 \
    --username="$POSTGRES_USER" --dbname=identity_db \
    --set=ON_ERROR_STOP=1 --quiet "$@"
}

identity_psql() {
  PGPASSWORD="$IDENTITY_DB_PASSWORD" psql --no-psqlrc --no-password --host=127.0.0.1 \
    --username="$IDENTITY_DB_USER" --dbname=identity_db \
    --set=ON_ERROR_STOP=1 --quiet "$@"
}

access="$(
  identity_psql --tuples-only --no-align --field-separator='|' <<'SQL'
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

if [ "$database_name" != "identity_db" ] ||
  [ "$role_name" != "$IDENTITY_DB_USER" ] ||
  [ "$can_connect" != "t" ] ||
  [ "$schema_usage" != "t" ] ||
  [ "$schema_create" != "f" ] ||
  [ "$is_superuser" != "f" ] ||
  [ "$can_create_db" != "f" ] ||
  [ "$can_create_role" != "f" ] ||
  [ "$can_replicate" != "f" ] ||
  [ "$can_bypass_rls" != "f" ]; then
  echo "FAIL Identity role permissions are not least-privilege (database=$database_name, role=$role_name, connect=$can_connect, schema_usage=$schema_usage, schema_create=$schema_create, superuser=$is_superuser, createdb=$can_create_db, createrole=$can_create_role, replication=$can_replicate, bypassrls=$can_bypass_rls)" >&2
  exit 1
fi

echo "PASS Identity role has database connect and schema usage without elevated privileges"

for database in "$POSTGRES_DB" postgres template1 tenant_db project_db billing_db notification_db; do
  exists="$(
    identity_psql --tuples-only --no-align --set=database="$database" <<'SQL'
SELECT 1 FROM pg_catalog.pg_database WHERE datname = :'database';
SQL
  )"

  if [ "$exists" != "1" ]; then
    echo "FAIL expected database $database was not initialized" >&2
    exit 1
  fi

  if identity_psql --dbname="$database" --command='SELECT 1' >/dev/null 2>&1; then
    echo "FAIL Identity role unexpectedly connected to $database" >&2
    exit 1
  fi

  echo "PASS Identity role denied connection to $database"
done

table_name="__identity_role_smoke_$$"

cleanup() {
  admin_psql --set=table_name="$table_name" <<'SQL' >/dev/null
SELECT format('DROP TABLE IF EXISTS identity.%I', :'table_name')
\gexec
SQL
}
trap cleanup 0

admin_psql --set=table_name="$table_name" <<'SQL'
SET ROLE identity_owner;
SELECT format(
  'CREATE TABLE identity.%I (id BIGSERIAL PRIMARY KEY, value text NOT NULL)',
  :'table_name'
)
\gexec
RESET ROLE;
SQL

identity_psql --set=table_name="$table_name" <<'SQL'
SELECT format(
  'INSERT INTO identity.%I (value) VALUES (%L)',
  :'table_name',
  'before'
)
\gexec
SQL

identity_psql --set=table_name="$table_name" <<'SQL'
SELECT format(
  'UPDATE identity.%I SET value = %L WHERE id = 1',
  :'table_name',
  'after'
)
\gexec
SQL

selected_value="$(
  identity_psql --tuples-only --no-align --set=table_name="$table_name" <<'SQL'
SELECT format('SELECT value FROM identity.%I WHERE id = 1', :'table_name')
\gexec
SQL
)"

if [ "$selected_value" != "after" ]; then
  echo "FAIL Identity role could not read the row it updated" >&2
  exit 1
fi

identity_psql --set=table_name="$table_name" <<'SQL'
SELECT format('DELETE FROM identity.%I WHERE id = 1', :'table_name')
\gexec
SQL

remaining_rows="$(
  identity_psql --tuples-only --no-align --set=table_name="$table_name" <<'SQL'
SELECT format('SELECT count(*) FROM identity.%I', :'table_name')
\gexec
SQL
)"

if [ "$remaining_rows" != "0" ]; then
  echo "FAIL Identity role could not delete its test row" >&2
  exit 1
fi

echo "PASS Identity role can insert, update, select, and delete owner-created rows"

if identity_psql --set=table_name="${table_name}_forbidden" <<'SQL' >/dev/null 2>&1
SELECT format('CREATE TABLE identity.%I (id integer)', :'table_name')
\gexec
SQL
then
  echo "FAIL Identity role unexpectedly created a table in its schema" >&2
  exit 1
fi

echo "PASS Identity role cannot create schema objects"
echo "PASS Identity role is limited to identity_db"
CONTAINER_SCRIPT
