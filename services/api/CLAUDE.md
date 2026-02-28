# services/api

FastAPI backend service. Runs on **port 8000**. Provides REST endpoints for all frontend apps.

## Commands

```bash
# Dev server
python -m uvicorn main:app --port 8000 --reload --env-file .env

# Tests
pytest
pytest tests/<module>.py -v    # single module

# DB migrations (Alembic)
alembic upgrade head            # apply migrations
alembic revision --autogenerate -m "description"  # new migration
```

## Tech Stack

- **FastAPI** — async REST API, auto OpenAPI docs at `/docs` and `/redoc`
- **SQLAlchemy + PostgreSQL** — ORM (`app/models/`) + Alembic migrations (`alembic/`)
- **Pydantic** — request/response schemas (`schemas.py`)
- **JWT + bcrypt** — authentication
- **fluids / scipy / numpy / CoolProp** — physics and hydraulic calculations
- **LangChain / LangGraph / OpenAI** — AI/LLM agents (`app/services/`)
- **WeasyPrint / Jinja2** — PDF/report generation

## Structure

```
app/
  models/       # 32 SQLAlchemy models
  routers/      # 15 route modules (auth, psv, network, hierarchy, …)
  services/     # Business logic and LLM agents
  repositories/ # Data access layer
  config.py     # Settings (env-driven)
  database.py   # DB session setup
  dependencies.py  # FastAPI dependency injection
schemas.py      # Pydantic schemas
main.py         # App entry point
alembic/        # Migration scripts
tests/          # pytest test suite
```

## Key API Routes

| Router | Path | Purpose |
|--------|------|---------|
| auth | `/auth/` | Login, JWT tokens |
| psv | `/psv/` | PSV CRUD + sizing |
| network | `/calculate/network` | Hydraulic network analysis |
| psv-sizing | `/calculate/psv-sizing` | PSV sizing calculations |
| hierarchy | `/hierarchy/` | Customer/plant structure |

## Notes

- Python tooling: `uv` for venv, `requirements.txt` for prod, `requirements-dev.txt` for dev/test
- Copy `.env.example` to `.env` before first run
- Local Alembic config: `alembic.local.ini` (uses local DB URL)
- Dockerfile present for container deployment (`infra/`)
