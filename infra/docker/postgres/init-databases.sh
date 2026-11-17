#!/usr/bin/env bash
set -Eeuo pipefail

: "${IDENTITY_DB_USER:=identity_app}"
: "${IDENTITY_DB_PASSWORD:?IDENTITY_DB_PASSWORD must be set}"

if [[ ! "$IDENTITY_DB_USER" =~ ^[a-z_][a-z0-9_]{0,62}$ ]]; then
  echo "IDENTITY_DB_USER must be a lowercase PostgreSQL role identifier" >&2
  exit 1
fi

if [[ "$IDENTITY_DB_USER" == "$POSTGRES_USER" || "$IDENTITY_DB_USER" == "identity_owner" ]]; then
  echo "IDENTITY_DB_USER must be separate from the PostgreSQL bootstrap and owner roles" >&2
  exit 1
fi

if [[ "$POSTGRES_USER" == "identity_owner" ]]; then
  echo "POSTGRES_USER must be separate from the Identity database owner role" >&2
  exit 1
fi

databases=(identity_db tenant_db project_db billing_db notification_db)
for database in "${databases[@]}"; do
  if [[ "$POSTGRES_DB" == "$database" ]]; then
    echo "POSTGRES_DB must not reuse a service-owned database name" >&2
    exit 1
  fi
done

admin_psql() {
  psql --no-psqlrc --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    --set=ON_ERROR_STOP=1 --quiet "$@"
}

# Keep schema ownership separate from the runtime login.
admin_psql <<'SQL'
SELECT 'CREATE ROLE identity_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'identity_owner'
)
\gexec
ALTER ROLE identity_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
SQL

# Quote the role name and password as SQL values; never interpolate either into SQL text.
admin_psql --set=identity_user="$IDENTITY_DB_USER" --set=identity_password="$IDENTITY_DB_PASSWORD" <<'SQL'
SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS',
  :'identity_user',
  :'identity_password'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = :'identity_user'
)
\gexec

SELECT format(
  'ALTER ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS',
  :'identity_user',
  :'identity_password'
)
\gexec
SQL

for database in "${databases[@]}"; do
  exists="$(admin_psql --tuples-only --no-align \
    --command="SELECT 1 FROM pg_catalog.pg_database WHERE datname = '$database'")"

  if [[ "$exists" != "1" ]]; then
    echo "Creating service database: $database"
    if [[ "$database" == "identity_db" ]]; then
      admin_psql --command='CREATE DATABASE identity_db OWNER identity_owner'
    else
      admin_psql --command="CREATE DATABASE \"$database\" OWNER \"$POSTGRES_USER\""
    fi
  elif [[ "$database" == "identity_db" ]]; then
    admin_psql --command='ALTER DATABASE identity_db OWNER TO identity_owner'
  fi
done

revoke_database_access() {
  local database="$1"

  admin_psql --set=database="$database" --set=identity_user="$IDENTITY_DB_USER" <<'SQL'
SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', :'database')
\gexec
SELECT format('REVOKE ALL PRIVILEGES ON DATABASE %I FROM %I', :'database', :'identity_user')
\gexec
SQL
}

# PUBLIC must not provide a route from the Identity login into another service database.
restricted_databases=("$POSTGRES_DB" postgres template1 tenant_db project_db billing_db notification_db)
for database in "${restricted_databases[@]}"; do
  if [[ "$database" != "identity_db" ]]; then
    revoke_database_access "$database"
  fi
done

admin_psql --set=identity_user="$IDENTITY_DB_USER" <<'SQL'
REVOKE ALL PRIVILEGES ON DATABASE identity_db FROM PUBLIC;
REVOKE ALL PRIVILEGES ON DATABASE identity_db FROM :"identity_user";
GRANT CONNECT ON DATABASE identity_db TO :"identity_user";
SQL

psql --no-psqlrc --username "$POSTGRES_USER" --dbname identity_db \
  --set=ON_ERROR_STOP=1 --set=identity_user="$IDENTITY_DB_USER" --quiet <<'SQL'
CREATE SCHEMA IF NOT EXISTS identity AUTHORIZATION identity_owner;
ALTER SCHEMA identity OWNER TO identity_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA identity TO :"identity_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA identity TO :"identity_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA identity TO :"identity_user";
ALTER DEFAULT PRIVILEGES FOR ROLE identity_owner IN SCHEMA identity
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"identity_user";
ALTER DEFAULT PRIVILEGES FOR ROLE identity_owner IN SCHEMA identity
  GRANT USAGE, SELECT ON SEQUENCES TO :"identity_user";
SQL
