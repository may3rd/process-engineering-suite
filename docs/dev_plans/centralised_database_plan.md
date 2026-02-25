# Centralised Database — Implementation Plan & Record

**Status:** ✅ Implemented (2026-02-25)
**Migration:** `202602250001`

---

## Problem Statement

Before this work, three frontend apps had no persistence:

| App | Port | Problem |
|-----|------|---------|
| `venting-calculation` | 3005 | Calculations lost on every page reload |
| `network-editor` | 3002 | Network designs were session-only (local file save only) |
| `design-agents` | 3004 | Workflow outputs ephemeral (local file save only) |

Additionally:
- **No shared TypeScript API client** — each app had its own duplicated `api.ts` with manually-written `fetch` wrappers
- **No shared TypeScript types** — interfaces manually re-declared in each app, drifting from the Python source of truth
- **CORS missing port 3005** — FastAPI didn't allow requests from the venting-calculation app

---

## Architecture Decision

**Extend the existing Python FastAPI** (`apps/api`, port 8000) rather than create a separate TypeScript API or serverless layer.

Rationale:
- A working PostgreSQL + SQLAlchemy + Alembic stack already exists with 27+ models
- Python Pydantic schemas remain the **single source of truth** for all data shapes
- TypeScript types are auto-generated from the FastAPI OpenAPI schema using `openapi-typescript` — no manual type duplication
- Zero new infrastructure required

### Single Source of Truth Flow

```
Python model change
      ↓
FastAPI /openapi.json updates automatically
      ↓
bun gen-types → packages/types/dist/index.ts regenerated
      ↓
bun turbo run check-types → TypeScript errors surface immediately
```

---

## Part 1 — New Python Models

Three new SQLAlchemy models added following the existing `ProtectiveSystem` pattern (UUID PK, TimestampMixin, JSONB for nested data).

### `VentingCalculation` (`venting_calculations`)
- `area_id`, `equipment_id` — optional FK links to hierarchy
- `owner_id` — optional FK to users (nullable; venting app has no auth yet)
- `name`, `description`, `status` (draft/in_review/approved)
- `inputs` (JSONB) — full `CalculationInput` from the frontend form
- `results` (JSONB) — full `CalculationResult` from the calculation engine
- `api_edition` — `5TH`, `6TH`, or `7TH`
- **Soft-delete**: `is_active` + `deleted_at` (mirrors `ProtectiveSystem`)

### `NetworkDesign` (`network_designs`)
- `area_id`, `owner_id` — optional FK links
- `network_data` (JSONB) — full `NetworkState` (nodes, pipes, fluid, project details)
- `node_count`, `pipe_count` — cached integers for list display
- **Hard delete** only

### `DesignAgentSession` (`design_agent_sessions`)
- `owner_id` — optional FK to users
- `state_data` (JSONB) — full `DesignState` from the Zustand store
- `active_step_id`, `completed_steps` — workflow progress tracking
- `status` — `active`, `completed`, or `archived`
- **Hard delete** only

### Why JSONB for inputs/results?

The `CalculationInput` and `CalculationResult` types are deeply nested with arrays, optional fields, and enums. Storing them as JSONB:
- Avoids 40+ scalar columns and a migration every time an input field is added
- Allows the frontend to evolve independently of the DB schema
- Makes the entire calculation round-trip atomic (save inputs + results together)

---

## Part 2 — DAL and Routers

### DAL (`dal.py` + `db_service.py`)
14 new abstract methods + concrete implementations using the existing `_get_all / _get_by_id / _create / _update / _delete` generic helpers. Soft-delete for `VentingCalculation` mirrors `delete_protective_system`.

### Routers

| Router | Prefix | New endpoints |
|--------|--------|---------------|
| `routers/venting.py` | `/venting` | GET list, GET by ID, POST, PUT, DELETE (soft), POST restore |
| `routers/network.py` | `/network-designs` | GET list, GET by ID, POST, PUT, DELETE (hard) |
| `routers/design_agents.py` | `/design-agents/sessions` | GET list, GET by ID, POST, PUT, DELETE (appended to existing router) |

All schemas use `Field(serialization_alias="camelCase")` + `ConfigDict(populate_by_name=True)` for camelCase JSON responses.

### `main.py` Changes
- Added `"http://localhost:3005"` and `"http://127.0.0.1:3005"` to CORS `allow_origins`
- Registered `venting_router` and `network_router` with `app.include_router()`

---

## Part 3 — Alembic Migration

**File:** `alembic/versions/202602250001_add_venting_network_design_agent_tables.py`

```
down_revision = "202602030002"   # Equipment subtypes migration
revision      = "202602250001"
```

Creates:
- Table `venting_calculations` with enum `vent_calc_status`
- Table `network_designs`
- Table `design_agent_sessions` with enum `design_session_status`
- Indexes on `area_id` and `owner_id` for each table

**Bugfix also applied:** `202602030002` had a JSONB serialisation bug — `_pick_extra()` was returning a Python `dict` to an `asyncpg` text-parameterised query. Fixed to return `json.dumps(extra)` string.

---

## Part 4 — `packages/types` (`@eng-suite/types`)

**New package** that auto-generates TypeScript types from FastAPI's `/openapi.json`.

```
packages/types/
  package.json        # @eng-suite/types, openapi-typescript devDep
  dist/
    index.ts          # ← generated, never hand-written
```

### Setup

```json
// packages/types/package.json
{
  "name": "@eng-suite/types",
  "scripts": {
    "generate": "openapi-typescript http://localhost:8000/openapi.json -o ./dist/index.ts"
  }
}
```

```json
// root package.json
{
  "scripts": {
    "gen-types": "bun --filter @eng-suite/types generate"
  }
}
```

### Usage in any app

```typescript
import type { components } from "@eng-suite/types"
type VentingCalculation = components["schemas"]["VentingCalculationResponse"]
type NetworkDesign      = components["schemas"]["NetworkDesignResponse"]
type PSV                = components["schemas"]["ProtectiveSystemResponse"]
```

### Regeneration workflow

1. Modify Python model or Pydantic schema
2. Restart FastAPI (hot-reload does this automatically)
3. `bun gen-types` from monorepo root
4. `bun turbo run check-types` — TypeScript errors surface immediately

---

## Part 5 — `packages/api-client` (`@eng-suite/api-client`)

**New package** — a framework-agnostic HTTP client (plain `fetch`, no React/Node deps) that wraps every backend resource.

```
packages/api-client/src/
  index.ts          # re-exports createApiClient + EngSuiteApiClient type
  client.ts         # createApiClient(baseUrl, token?) factory
  modules/
    venting.ts      # list/get/create/update/delete/restore
    network.ts      # list/get/create/update/delete
    designAgents.ts # sessions CRUD + existing process endpoint
    psv.ts
    hierarchy.ts
    auth.ts
    hydraulics.ts
```

### Factory pattern

```typescript
import { createApiClient } from "@eng-suite/api-client"

const api = createApiClient("http://localhost:8000", accessToken)
// → { auth, hierarchy, psv, venting, network, designAgents, hydraulics }

const calcs = await api.venting.list()
const saved = await api.venting.create({ name: "T-101 Rev 0", inputs: form.getValues() })
```

All module methods are fully typed via `@eng-suite/types` imports — no hand-written interfaces for anything the API exposes.

### TypeScript path aliases (`packages/tsconfig/base.json`)

```json
"@eng-suite/types":      ["packages/types/dist/index.ts"],
"@eng-suite/api-client": ["packages/api-client/src/index.ts"],
"@eng-suite/api-client/*": ["packages/api-client/src/*"]
```

---

## Part 6 — Frontend Integration

Each app gets:
- An `engSuiteClient.ts` (or `apiClient.ts`) singleton that calls `createApiClient()`
- A custom hook that wraps the resource methods with `useState` loading/error state
- Save + Load UI components/buttons

### `apps/venting-calculation` (Next.js, port 3005)

| File | Purpose |
|------|---------|
| `src/lib/apiClient.ts` | `createApiClient(NEXT_PUBLIC_API_URL, null)` singleton |
| `src/lib/hooks/useSavedCalculations.ts` | `save(name, inputs, results)` + `fetchList()` |
| `src/app/calculator/components/SaveCalculationButton.tsx` | shadcn Dialog — name input → `api.venting.create()` |
| `src/app/calculator/components/LoadCalculationButton.tsx` | shadcn Dialog — list + `form.reset(item.inputs)` |
| `src/app/calculator/page.tsx` | Added **Load** + **Save** buttons to secondary action bar |

### `apps/network-editor` (Next.js, port 3002)

| File | Purpose |
|------|---------|
| `src/lib/engSuiteClient.ts` | Separate from existing hydraulics `apiClient.ts` |
| `src/hooks/useSavedDesigns.ts` | `save(name, networkData, nodeCount, pipeCount)` + `fetchList()` |
| `src/components/TopToolbar.tsx` | Added **Save** + **Load** MUI ButtonGroup with Dialogs |

### `apps/design-agents` (Vite, port 3004)

| File | Purpose |
|------|---------|
| `src/lib/engSuiteClient.ts` | Uses `import.meta.env.VITE_API_URL` (Vite convention) |
| `src/hooks/useSavedSessions.ts` | `save(name, stateData, activeStepId, completedSteps)` + `fetchList()` |
| `src/components/TopToolbar.tsx` | Added ☁️ Save + Load icon buttons alongside existing local file save/load |

---

## Part 7 — API Endpoints Summary

### Venting Calculations

```
GET    /venting                       ?areaId= ?equipmentId= ?includeDeleted=
GET    /venting/{id}
POST   /venting                       → 201 VentingCalculationResponse
PUT    /venting/{id}
DELETE /venting/{id}                  soft-delete (is_active=false, deleted_at=now)
POST   /venting/{id}/restore
```

### Network Designs

```
GET    /network-designs               ?areaId=
GET    /network-designs/{id}
POST   /network-designs               → 201 NetworkDesignResponse
PUT    /network-designs/{id}
DELETE /network-designs/{id}          hard delete
```

### Design Agent Sessions

```
GET    /design-agents/sessions        ?ownerId=
GET    /design-agents/sessions/{id}
POST   /design-agents/sessions        → 201 DesignAgentSessionResponse
PUT    /design-agents/sessions/{id}
DELETE /design-agents/sessions/{id}   hard delete
```

---

## Verification Checklist

```bash
# 1. Migration applied
cd apps/api && source .venv/bin/activate && set -a && source .env && set +a
alembic current
# → 202602250001

# 2. New routes visible in API docs
open http://localhost:8000/docs
# → /venting, /network-designs, /design-agents/sessions all present

# 3. Smoke test (no auth required)
curl -X POST http://localhost:8000/venting \
  -H "Content-Type: application/json" \
  -d '{"name":"T-101 Test","inputs":{"tankNumber":"T-101"}}'
# → 201 with id, createdAt, etc.

# 4. Regenerate types after any Python model change
bun gen-types
# → packages/types/dist/index.ts updated

# 5. Type check all apps
bun turbo run check-types
# → 0 errors across venting-calculation, network-editor, psv, etc.

# 6. End-to-end: fill in venting calculator, click Save, reload page, click Load
# → inputs restore to the saved state
```

---

## Future Work

- **Authentication**: `owner_id` is nullable now. When login is added to any app, wire `api.auth.me()` → pass userId to create calls for per-user filtering
- **`GET /venting?ownerId=`**: The list endpoint currently returns all records. Once auth exists, filter by owner on the server side
- **Optimistic updates**: The hooks currently use `setState` after the API responds. Could add optimistic updates for instant UI feedback
- **Soft-delete UI for network/agents**: Currently only venting supports restore; add if needed
- **Status workflow**: Venting calculations have `draft → in_review → approved` status. Wire a status-change button when a review workflow is needed
