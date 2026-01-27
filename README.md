# Process Engineering Suite (PES)

PES is a monorepo for process engineering workflows: hydraulic network editing, PSV workflows, and a shared backend API.

Core rule: engineering calculations live in Python (see `AGENTS.md`).

## What’s In This Repo

Apps (TypeScript / Next.js):
- `apps/web` dashboard (port 3000)
- `apps/docs` docs site (port 3001, when enabled)
- `apps/network-editor` (port 3002)
- `apps/psv` PSV workflow (port 3003)
- `apps/design-agents` (port 3004, when enabled)

Backend (Python / FastAPI):
- `apps/api` API (port 8000, OpenAPI at `/docs`)

## Quick Start (Docker, Recommended)

This starts Postgres + API + all web apps via `infra/docker-compose.yml`.

1) Set Postgres password (compose expects it):
```bash
cd infra
cat > .env <<'EOF'
POSTGRES_PASSWORD=change-me
EOF
```

2) Start the stack:
```bash
cd infra
docker compose up -d --build
```

3) Open:
- Dashboard: http://localhost:3000
- Network Editor: http://localhost:3002
- PSV: http://localhost:3003
- API docs: http://localhost:8000/docs

Notes:
- The API runs Alembic migrations (`alembic upgrade head`) automatically on startup.
- The dev compose file seeds the database from `apps/api/mock_data.json` on first boot (only if the DB is empty).

## Local Dev (Bun)

Prereqs:
- Node.js 18+ (for Bun)
- Bun

Install + run all apps:
```bash
bun install
bun run dev
```

Common commands:
```bash
bun run build
bun run lint
bun run check-types
bun run format
```

## Hybrid Dev (Backend In Docker)

Run API + Postgres in Docker, run the frontends locally.

1) Backend:
```bash
cd infra
docker compose up -d --build postgres api
docker compose logs -f api
```

2) Frontend:
```bash
bun install
bun run dev
```

## API + Database

### Data Source (DB vs Mock)

The API can run in two modes:
- Database (Postgres): normal mode
- Mock (JSON file): fallback when DB is unavailable, or forced via env

Environment variables:
- `DATABASE_URL`: async SQLAlchemy URL (example: `postgresql+asyncpg://postgres:password@localhost:5432/engsuite`)
- `USE_MOCK_DATA=true`: force mock mode even if DB is available
- `SEED_FROM_MOCK=true`: seed the DB from `apps/api/mock_data.json` on startup (only if DB is empty)

Check what the API is using:
```bash
curl http://localhost:8000/admin/data-source
```

### Migrations (Alembic)

In Docker, migrations run on API startup. To run them manually:
```bash
cd infra
docker compose exec -w /app/apps/api api alembic upgrade head
```

Create a new migration:
```bash
cd infra
docker compose exec -w /app/apps/api api alembic revision --autogenerate -m "your_message"
```

### Seed / Export Mock Data

Seed the database from `apps/api/mock_data.json`:
```bash
curl -X POST http://localhost:8000/admin/seed-from-mock
```

Export the current database contents back to `apps/api/mock_data.json`:
```bash
curl "http://localhost:8000/admin/export-mock-data?write_to_file=true"
```

Or from inside Docker:
```bash
docker compose -f infra/docker-compose.yml exec api python /app/apps/api/scripts/export_db_to_mock.py
```

### Backup / Restore (Admin)

- UI: PSV Dashboard -> `System` tab (admin-only)
- API:
  - `GET /admin/backup` returns a `.sql` dump in DB mode (or a JSON export in mock mode)
  - `POST /admin/restore` restores from an uploaded `.sql` (DB mode) or `.json` (mock mode)

## Production / Single Image Deployment

The root `Dockerfile` builds a single image that runs apps, API, and PostgreSQL via supervisord.

Build:
```bash
docker build -t process-engineering-suite .
```

Run (Postgres included in the container):
```bash
docker run \
  -p 3000:3000 \
  -p 3001:3001 \
  -p 3002:3002 \
  -p 3003:3003 \
  -p 3004:3004 \
  -p 8000:8000 \
  -e POSTGRES_PASSWORD="change-me" \
  -e POSTGRES_USER="postgres" \
  -e POSTGRES_DB="engsuite" \
  -v postgres_data:/var/lib/postgresql/data \
  process-engineering-suite
```

If `DATABASE_URL` is not provided, the API derives it from `POSTGRES_PASSWORD`, `POSTGRES_USER`, and `POSTGRES_DB`.

## Troubleshooting

### `export-mock-data` Returns Empty Arrays

- Check mode: `curl http://localhost:8000/admin/data-source`
- If DB mode and empty, seed: `curl -X POST http://localhost:8000/admin/seed-from-mock`
- If mock mode, verify `apps/api/mock_data.json` contains data (the API reads it on startup)

### Alembic Error: `Path doesn't exist: alembic`

This happens when Alembic runs from the wrong working directory. In Docker, the API should run with `working_dir=/app/apps/api`.

## Repo Structure

```text
apps/        # Next.js apps + FastAPI API
packages/    # Shared TypeScript packages
services/    # Python calculation engine(s)
infra/       # Docker compose + deployment helpers
docs/        # Architecture / standards documentation
```
