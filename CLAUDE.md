# Process Engineering Suite

Turborepo monorepo for process engineering tools. **Always use `bun` — never `npm`, `npx`, or `yarn`.**

## Package Manager

```bash
bun install          # install deps
bun run dev          # run all apps in parallel
bun run build        # build all
bun run lint         # lint all
bun run check-types  # typecheck all
```

Use `--filter` to scope: `bun turbo run dev --filter=venting-calculation`

## Repo Structure

```
apps/               # Frontend applications
  web/              # Main dashboard (localhost:3000)
  network-editor/   # Network editor (localhost:3002)
  psv/              # PSV sizing (localhost:3003)
  design-agents/    # AI design workflow — Vite SPA (localhost:3004)
  venting-calculation/ # Venting calc (localhost:3005)
  docs/             # Documentation site

packages/           # Shared TypeScript packages
  ui/               # Base UI components (MUI)
  ui-kit/           # App-level component library
  physics-engine/   # Core calculation logic + shared types
  api-client/       # Generated API client
  types/            # Shared TypeScript types
  unit-converter/   # Unit conversion utilities

services/           # Python backends
  api/              # FastAPI REST API (Python)
  calc-engine/      # Python calculation engine

infra/              # Docker & deployment config
```

## Key Conventions

- **TypeScript**: strict mode; no `any`; shared types in `packages/types` or `packages/physics-engine/src/types.ts`
- **Styling**: MUI components with `sx` prop
- **Python services**: use `uv` / `pyproject.toml`; run with `pytest` for tests
- **Adding a package dep**: `bun add <pkg> --filter <workspace>`
