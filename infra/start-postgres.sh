#!/usr/bin/env bash
set -euo pipefail

PG_BIN_DIR="$(pg_config --bindir)"
DATA_DIR="/var/lib/postgresql/data"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-engsuite}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"

if [ ! -s "${DATA_DIR}/PG_VERSION" ]; then
  mkdir -p "${DATA_DIR}"
  chown -R postgres:postgres "${DATA_DIR}"
  su -s /bin/bash postgres -c "${PG_BIN_DIR}/initdb -D ${DATA_DIR}"

  su -s /bin/bash postgres -c "${PG_BIN_DIR}/pg_ctl -D ${DATA_DIR} -o \"-c listen_addresses='localhost'\" -w start"

  if [ -n "${POSTGRES_PASSWORD}" ]; then
    su -s /bin/bash postgres -c "${PG_BIN_DIR}/psql -v ON_ERROR_STOP=1 -v db_user='${POSTGRES_USER}' -v db_pass='${POSTGRES_PASSWORD}' --username postgres --dbname postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'db_user') THEN
    EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L', :'db_user', :'db_pass');
  ELSE
    EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'db_user', :'db_pass');
  END IF;
END
\$\$;
SQL"
  else
    su -s /bin/bash postgres -c "${PG_BIN_DIR}/psql -v ON_ERROR_STOP=1 -v db_user='${POSTGRES_USER}' --username postgres --dbname postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'db_user') THEN
    EXECUTE format('CREATE ROLE %I WITH LOGIN', :'db_user');
  END IF;
END
\$\$;
SQL"
  fi

  su -s /bin/bash postgres -c "${PG_BIN_DIR}/psql -v ON_ERROR_STOP=1 -v db_name='${POSTGRES_DB}' -v db_user='${POSTGRES_USER}' --username postgres --dbname postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = :'db_name') THEN
    EXECUTE format('CREATE DATABASE %I OWNER %I', :'db_name', :'db_user');
  END IF;
END
\$\$;
SQL"

  if [ -n "${POSTGRES_PASSWORD}" ]; then
    echo "host all all 0.0.0.0/0 md5" >> "${DATA_DIR}/pg_hba.conf"
  else
    echo "host all all 0.0.0.0/0 trust" >> "${DATA_DIR}/pg_hba.conf"
  fi
  su -s /bin/bash postgres -c "${PG_BIN_DIR}/pg_ctl -D ${DATA_DIR} -m fast -w stop"
fi

exec su -s /bin/bash postgres -c "${PG_BIN_DIR}/postgres -D ${DATA_DIR} -c listen_addresses='*'"
