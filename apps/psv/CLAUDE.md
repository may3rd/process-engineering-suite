# apps/psv

Next.js app for PSV (Pressure Safety Valve) sizing and management. Runs on **port 3003**.

## Commands

```bash
bun run dev          # start dev server (port 3003)
bun run build        # production build
bun run test         # vitest
bun run check-types  # tsc
bun run lint         # eslint
```

From repo root: `bun turbo run dev --filter=psv`

## Tech Stack

- **Next.js 16 / React 19** — App Router (`src/app/`)
- **MUI v7** — all UI components; use `sx` prop for styling
- **Zustand** — global state (`src/store/`)
- **Vitest + Testing Library** — unit/component tests (`src/test/`)
- **jsPDF / xlsx** — document/report export
- **KaTeX** — equation rendering

## Structure

```
src/
  app/          # Next.js App Router pages & layouts
  components/   # Feature components (57 dirs)
  contexts/     # React contexts
  hooks/        # Custom hooks
  lib/          # Utilities and helpers
  store/        # Zustand stores
  templates/    # Report/document templates
  test/         # Test setup and helpers
```

## Notes

- `basePath` is `/psv` — all routes are prefixed
- API calls proxy to `services/api` (port 8000)
- Shared types come from `@eng-suite/types` and `@eng-suite/physics-engine`
