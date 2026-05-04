# apps/calculation-template

> ⚠️ **Before deploying: Update `basePath` in `next.config.ts`**
> This template ships with `basePath: "/[your-app-name]"` as a placeholder. Replace it with your actual app's deployed URL path (e.g., `/heat-transfer-calculation`). If you copy `next.config.ts` from another app without changing `basePath`, the deployed app will 404 on all routes. See `pes-web-dna.md` §14 for the full rule.

Next.js app template for new calculator-style web apps. Copy this directory as the basis for new calculator apps.

## Commands

```bash
bun run dev          # start dev server (port 3900)
bun run build        # production build
bun run test         # vitest
bun run check-types  # tsc
bun run lint         # eslint
```

From repo root: `bun turbo run dev --filter=calculation-template`

## Tech Stack

- **Next.js 16 / React 19** — App Router (`src/app/`)
- **Tailwind CSS v4** — primary styling (not MUI's `sx`)
- **shadcn/ui** — component primitives (class-variance-authority)
- **MUI v7** — TopToolbar uses MUI
- **React Hook Form + Zod** — form handling and validation
- **Zustand** — global state (`src/store/`)
- **React PDF** — PDF report generation
- **Vitest + Testing Library** — tests in `__tests__/`

## Structure

```
src/
  app/
    api/          # Next.js API routes
    calculator/   # Main calculator page
  components/     # UI components
  contexts/       # React contexts
  lib/            # Utilities, zod schemas
  types/          # Local TypeScript types
__tests__/        # Vitest tests + setup.ts
```

## Notes

- `basePath` is `/[your-app-name]` — **MUST be updated before deploying** (see warning at top)
- Prefer Tailwind over MUI `sx` for new UI work
- API calls proxy to `services/api` (port 8000)
- Shared types from `@eng-suite/types` and `@eng-suite/physics-engine`