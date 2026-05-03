# apps/venting-calculation

Next.js app for venting calculations. Runs on **port 3005**.

## Commands

```bash
bun run dev          # start dev server (port 3005)
bun run build        # production build
bun run test         # vitest
bun run check-types  # tsc
bun run lint         # eslint
```

From repo root: `bun turbo run dev --filter=venting-calculation`

## Tech Stack

- **Next.js 16 / React 19** — App Router (`src/app/`)
- **Tailwind CSS v4** — primary styling (not MUI's `sx`)
- **shadcn/ui** — component primitives (class-variance-authority)
- **MUI v7** — some legacy components still present
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

- `basePath` is `/venting-calculation`
- Prefer Tailwind over MUI `sx` for new UI work in this app
- API calls proxy to `services/api` (port 8000)
- Shared types from `@eng-suite/types` and `@eng-suite/physics-engine`

## Formula Fidelity Status

All 5 coefficient zones tested and confirmed against API 2000 Table 3:
- ATWS < 18.6 m² → a=63150, n=1.0 ✅
- ATWS 18.6–93 m² → a=224200, n=0.566 ✅
- ATWS 93–260 m² → a=630400, n=0.338 ✅
- ATWS ≥ 260, DP > 7 kPa → a=43200, n=0.82 ✅ (matching API-521 reference case)
- ATWS ≥ 260, DP ≤ 7 kPa → a=4129700, n=0 ✅
- Emergency venting rate 44,264 Nm³/h confirmed for reference case ✅
- Environmental factors confirmed (F=1.0 bare, F=0.3 insulated) ✅
- Tolerance 10% across all cases.
