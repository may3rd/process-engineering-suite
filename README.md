# Process Engineering Suite

A unified platform for process design, hydraulic analysis, and equipment sizing. This monorepo contains multiple applications tailored for process engineers.

## Apps

- **Dashboard** (`apps/web`): The main entry point for the suite. Provides navigation to different tools and manages global settings like theme.
- **Network Editor** (`apps/network-editor`): A powerful tool for sketching and simulating fluid networks. Features include:
  - Drag-and-drop interface using React Flow.
  - Hydraulic calculations for incompressible flow.
  - Pipe and node property management.
  - Excel import/export capabilities.
- **PSV Sizing** (`apps/psv`): Pressure Safety Valve / protective device sizing workflow with hierarchy browsing (Customer → Plant → Unit → Area → Project → PSV), scenario management, sizing cases, equipment linking, and revision control.
- **API** (`apps/api`): FastAPI backend for hierarchy/PSV data, authentication, revisions, admin utilities, and hydraulics calculation endpoints.

## Packages

- **@eng-suite/ui-kit**: Shared UI components and styles, including the custom glassmorphism design system.
- **@eng-suite/physics**: Core physics engine for hydraulic calculations, unit conversions, and fluid properties.
- **@eng-suite/shared**: Shared utilities and types.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Monorepo Tool**: [Turborepo](https://turbo.build/)
- **UI Library**: [Material UI (MUI)](https://mui.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Diagramming**: [React Flow](https://reactflow.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd process-engineering-suite
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

To start the development server for all apps:

```bash
npm run dev
```

- **Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Network Editor**: [http://localhost:3002](http://localhost:3002)
- **PSV**: [http://localhost:3003](http://localhost:3003)

### Build

To build all apps and packages:

```bash
npm run build
```

### Docker Usage

#### Development Environment (With Hot Reload)
Run the entire suite with hot reloading enabled using Turborepo. All web apps (Dashboard, Network Editor, PSV) run in a single container managed by turbo, while the Python API runs in a separate container.

```bash
docker-compose -f infra/docker-compose.yml up --build
```

**Services:**
- **All Web Apps** (managed by turborepo in parallel):
  - Dashboard: http://localhost:3000
  - Docs: http://localhost:3001
  - Network Editor: http://localhost:3002
  - PSV: http://localhost:3003
- **Python API**: http://localhost:8000/docs
- **PostgreSQL**: exposed on `localhost:5432` (dev only)

Volume mounts ensure code changes are reflected immediately for hot reload.

#### Production / Single Image Deployment
Build a single image containing all services, including PostgreSQL (managed by supervisord). Suitable for deployment.

```bash
# Build
docker build -t process-engineering-suite .

# Run (includes PostgreSQL in the container)
docker run \
  -p 3000:3000 \
  -p 3001:3001 \
  -p 3002:3002 \
  -p 3003:3003 \
  -p 8000:8000 \
  -e POSTGRES_PASSWORD="change-me" \
  -e POSTGRES_USER="postgres" \
  -e POSTGRES_DB="engsuite" \
  -v postgres_data:/var/lib/postgresql/data \
  process-engineering-suite

The API will build `DATABASE_URL` from `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` if `DATABASE_URL` is not provided.

**Data persistence and backups:** Postgres data lives in the named volume `postgres_data`. Use the volume for upgrades and backups. To copy backups out, you can mount a host directory or attach a second volume.

**Run with explicit `DATABASE_URL` (overrides auto-build):**

```bash
docker run \
  -p 3000:3000 \
  -p 3001:3001 \
  -p 3002:3002 \
  -p 3003:3003 \
  -p 8000:8000 \
  -e DATABASE_URL="postgresql+asyncpg://postgres:change-me@localhost:5432/engsuite" \
  -e POSTGRES_PASSWORD="change-me" \
  -v postgres_data:/var/lib/postgresql/data \
  process-engineering-suite
```
```

#### Hybrid Development (Recommended)
Run the Python API in Docker (to avoid environment setup) while running the Frontend locally (for maximum performance).

1. Start the Backend Services (API & Database):

   To run both the Python API and PostgreSQL database (recommended):
   
   ```bash
   docker-compose -f infra/docker-compose.yml --env-file .env up api postgres
   ```

   *Note: If you only need the API without the database, you can run `docker-compose -f infra/docker-compose.yml up api`.*

2. In a new terminal, start the frontend:

   ```bash
   npm run dev
   ```

#### Updating Code
- **Development**: Code changes are reflected automatically due to volume mounts. If you add new dependencies, run `docker-compose -f infra/docker-compose.yml build`.
- **Production**: Re-run the `docker build` command to bake changes into a new image.

#### Restarting API After Code Changes

If you modified the Python API code or added new dependencies:

```bash
# Quick restart (if no dependency changes)
cd infra
docker-compose restart api

# Full rebuild (if dependencies changed in requirements.txt)
cd infra
docker-compose up -d --build api

# View logs
docker-compose logs -f api
```

#### Database Setup

The API supports both **PostgreSQL** (production) and **mock data** (fallback).

**Environment Variables:**
- `DATABASE_URL`: PostgreSQL connection string (e.g., `postgresql+asyncpg://postgres:password@postgres:5432/engsuite`)
- `USE_MOCK_DATA`: Set to `true` to force mock data even if database is available

**Local API (without Docker):**

Create `apps/api/.env` and run `uvicorn` with `--env-file`:

```bash
# apps/api/.env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/engsuite
USE_MOCK_DATA=false

# From apps/api
python -m uvicorn main:app --port 8000 --reload --env-file .env
```

**Running with PostgreSQL:**

1. Start PostgreSQL and API:
   ```bash
   cd infra
   docker-compose up -d postgres api
   ```

2. Database migrations:
   - In `infra/docker-compose.yml`, the API container runs `alembic upgrade head` automatically on startup.
   - To generate a new migration:

     ```bash
     cd infra

     docker-compose exec -w /app/apps/api api alembic upgrade head

     docker-compose exec -w /app/apps/api api alembic revision --autogenerate -m "your_message"
     ```

3. Seed Data (Optional):
   ```bash
   # Populate database from mock data
   curl -X POST http://localhost:8000/admin/seed-from-mock
   ```

4. Export database back to `apps/api/mock_data.json` (optional):
   - From the running API:
     ```bash
     curl "http://localhost:8000/admin/export-mock-data?write_to_file=true"
     ```
   - Or inside Docker:
     ```bash
     docker compose -f infra/docker-compose.yml exec api python /app/apps/api/scripts/export_db_to_mock.py
     ```

**Testing API Endpoints:**

```bash
# Check data source (mock or database)
curl http://localhost:8000/admin/data-source

# Get customers (hierarchy)
curl http://localhost:8000/hierarchy/customers

# Get PSVs
curl http://localhost:8000/psv

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"maetee","password":"password"}'
```

**Backup / Restore (Admin):**

- UI: PSV Dashboard → `System` tab (admin-only) provides Backup/Restore buttons.
- API:
  - `GET /admin/backup` downloads a backup (`.sql` in DB mode, JSON export in mock mode).
  - `POST /admin/restore` restores from an uploaded `.sql` (DB mode) or `.json` (mock mode).

## Key Features

- **Theme Synchronization**: Seamlessly switch between Light and Dark modes from the Dashboard, with preferences persisted across applications.
- **Glassmorphism Design**: A modern, consistent UI aesthetic across all tools.
- **Real-time Calculations**: Instant feedback on hydraulic network performance.
- **Bi-Directional Flow Simulation**: Supports both forward and backward flow calculations, ensuring correct pressure drop and elevation handling regardless of flow direction.
- **Hierarchy-first Workflow**: Customer → Plant → Unit → Area → Project → PSV navigation with global search.
- **Revision Control**: Revision history, signing (originator/checker/approver), revoke/delete, and revision-based PSV status progression.
