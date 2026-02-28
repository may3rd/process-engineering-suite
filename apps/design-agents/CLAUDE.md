# apps/design-agents

Vite + React SPA for AI-assisted process design workflow. Runs on **port 3004**.

## Commands

```bash
bun run dev          # start Vite dev server (port 3004)
bun run build        # tsc + vite build (outputs to dist/)
bun run lint         # eslint
bun run preview      # preview production build
```

From repo root: `bun turbo run dev --filter=design-agents`

## Tech Stack

- **Vite + React 19** — SPA (not Next.js); entry at `src/main.tsx`
- **React Router v7** — client-side routing
- **MUI v7** — all UI; use `sx` prop for styling
- **Zustand** — global state (`src/store/`)
- **TanStack Query** — server state / data fetching
- **TanStack Table** — data tables
- **Framer Motion** — animations
- **react-markdown + KaTeX** — markdown and equation rendering

## Structure

```
src/
  App.tsx           # Root component — renders views by activeStepId
  main.tsx          # Vite entry point
  ThemeContext.tsx   # MUI theme provider
  components/
    common/         # Shared components (ActivityMonitor, StatusIndicator)
    layout/         # AppShell, Sidebar, workflowMeta
    views/          # 13 workflow step views
  hooks/            # Custom hooks (useSavedSessions)
  lib/              # API client, engSuiteClient, turbo helpers
  store/            # Zustand stores (useDesignStore, useLogStore)
  types.ts          # Local types
index.html          # Vite HTML entry
```

## Workflow Steps

Requirements → Research → Synthesis → PFD → Catalog → Simulation → Sizing → Costing → Safety → Review → Final Report

Each step calls a corresponding agent on the backend (`services/api` at port 8000).

## Notes

- `base` path is `/design-agents/` — all assets are prefixed
- API URL configured via `VITE_API_URL` env var (see `.env.example`)
- Backend agent endpoints live in `services/api` under `/design-agents/*`
- Shared packages: `@eng-suite/api-client`, `@eng-suite/types`, `@eng-suite/ui-kit`
