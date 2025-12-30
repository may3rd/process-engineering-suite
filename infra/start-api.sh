#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  user="${POSTGRES_USER:-postgres}"
  db="${POSTGRES_DB:-engsuite}"
  if [ -n "${POSTGRES_PASSWORD:-}" ]; then
    export DATABASE_URL="postgresql+asyncpg://${user}:${POSTGRES_PASSWORD}@localhost:5432/${db}"
  else
    export DATABASE_URL="postgresql+asyncpg://${user}@localhost:5432/${db}"
  fi
fi

exec uvicorn apps.api.main:app --host 0.0.0.0 --port 8000
