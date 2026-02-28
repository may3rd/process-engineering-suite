# Plan: Move `services/design-agents` → `apps/design-agents`

## Context

`services/design-agents` is a **Vite + React 19 SPA** (frontend-only). It has no backend logic — all API calls go to the Python backend at `services/api:8000`. Currently it's misplaced under `services/`, which should only hold Python backends (`api`, `calc-engine`). Moving it to `apps/` aligns with the monorepo's frontend/backend split and brings it into the `apps/*` workspace glob automatically.

## Steps

### 1. Move the directory
```bash
git mv services/design-agents apps/design-agents
```

### 2. Update root `CLAUDE.md`
- Move `design-agents` from the `services/` section to the `apps/` section
- Add: `design-agents/   # AI design workflow (localhost:3004)`
- Remove it from the `services/` listing

**File:** `/CLAUDE.md`

### 3. Update `infra/docker-compose.yml`
- Change any volume mount or build context paths from `services/design-agents` → `apps/design-agents`

**File:** `infra/docker-compose.yml`

### 4. Create `apps/design-agents/CLAUDE.md`
- Follow the same pattern as the other app CLAUDE.md files
- Note it's Vite (not Next.js), port 3004, Zustand, MUI, React Router

**File:** `apps/design-agents/CLAUDE.md`

### 5. Verify — no other references to update
These already use the correct values and won't break:
- **Root `package.json`** — workspace glob is `apps/*`, so `apps/design-agents` is automatically included (improvement over current state where `services/design-agents` was outside the workspace glob)
- **`apps/web/next.config.ts`** — rewrites point to `localhost:3004`, not filesystem paths; no change needed
- **`packages/api-client`** — calls HTTP endpoints, not filesystem imports; no change needed
- **`turbo.json`** — task definitions are workspace-agnostic; no change needed
- **Internal imports** (`@eng-suite/*`) — resolved via package names, not relative paths; no change needed

## Verification

1. `bun install` — confirm workspace resolution works
2. `bun turbo run build --filter=design-agents` — confirm build passes
3. `bun turbo run dev --filter=design-agents` — confirm dev server starts on port 3004
4. Check that `http://localhost:3004/design-agents/` loads correctly
