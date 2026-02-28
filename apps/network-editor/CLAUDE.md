# apps/network-editor

Next.js app for visual pipe network editing and hydraulic analysis. Runs on **port 3002**.

## Commands

```bash
bun run dev          # start dev server (port 3002)
bun run build        # production build
bun run check-types  # tsc
bun run lint         # eslint
```

From repo root: `bun turbo run dev --filter=network-editor`

## Tech Stack

- **Next.js 16 / React 19** — App Router (`src/app/`)
- **XY Flow (React Flow) v12** — node/edge graph canvas; most domain logic lives here
- **MUI v7** — panels, toolbars, dialogs; use `sx` prop
- **Framer Motion** — UI animations
- **Zustand** — graph and app state (`src/store/`)
- **xlsx / html-to-image** — export to Excel / image

## Structure

```
src/
  app/          # Next.js App Router pages
  components/   # 15+ feature component directories
    nodes/      # Custom XY Flow node types
    edges/      # Custom edge types
    panels/     # Side panels and toolbars
  hooks/        # Custom React hooks
  lib/          # Graph utilities, calculations
  store/        # Zustand stores
  utils/        # Helper functions
docs/           # Domain documentation
```

## Notes

- `basePath` is `/network-editor`
- No test framework configured — add Vitest if tests are needed
- Network calculations are sent to `services/api` at `/calculate/network` (port 8000)
- Shared types from `@eng-suite/types` and `@eng-suite/physics-engine`
