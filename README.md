# Process Engineering Suite

A monorepo for process engineering calculations and workflows.

## Apps

| App | Port | Description |
|-----|------|-------------|
| `apps/web` | 3000 | Dashboard |
| `apps/docs` | 3001 | Documentation site |
| `apps/network-editor` | 3002 | Hydraulic network editor |
| `apps/psv` | 3003 | PSV sizing workflow |
| `apps/venting-calculation` | 3004 | Tank venting calculator |

## Backend

| Service | Port | Description |
|---------|------|-------------|
| `services/api` | 8000 | FastAPI REST API |
| `services/calc-engine` | - | Python calculation engine |
| `services/design-agents` | - | AI design agents |

## Quick Start

### Docker (Recommended)

```bash
# 1. Set PostgreSQL password
cd infra
echo "POSTGRES_PASSWORD=change-me" > .env

# 2. Start all services
docker compose up -d --build

# 3. Open in browser
open http://localhost:3000      # Dashboard
open http://localhost:8000/docs # API docs
```

### Local Development (Bun)

```bash
# Install dependencies
bun install

# Run all apps
bun run dev
```

## Common Commands

```bash
bun run build        # Build all apps
bun run lint         # Lint code
bun run check-types  # Type check
bun run format       # Format code
```

## Project Structure

```
apps/           # Frontend applications (Next.js)
├── web/
├── network-editor/
├── psv/
└── venting-calculation/

services/       # Backend services (Python)
├── api/        # FastAPI REST API
├── calc-engine/
└── design-agents/

packages/       # Shared libraries
├── api-client/
├── types/
├── ui/
└── unit-converter/

infra/          # Docker & deployment config
docs/           # Architecture documentation
```

## Documentation

- [DEVELOPING.md](DEVELOPING.md) - Setup guides
- [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md) - Environment variables
- [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) - Database schema
- [AGENTS.md](AGENTS.md) - Code conventions

## Tech Stack

- **Frontend**: Next.js, TypeScript, Tailwind, Bun
- **Backend**: Python, FastAPI, SQLAlchemy, Alembic
- **Database**: PostgreSQL
- **Deployment**: Docker, Vercel