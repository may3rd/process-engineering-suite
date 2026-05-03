# apps/vessels-calculation

Next.js app for vessel and tank volume/surface area calculations. Runs on **port 3006**.

## Commands

```bash
bun run dev          # start dev server (port 3006)
bun run build        # production build
bun run test         # vitest
bun run check-types  # tsc
bun run lint         # eslint
```

From repo root: `bun turbo run dev --filter=vessels-calculation`

## Tech Stack

- **Next.js 16 / React 19** — App Router (`src/app/`)
- **Tailwind CSS v4** — primary styling
- **shadcn/ui** — component primitives (class-variance-authority)
- **React Hook Form + Zod** — form handling and validation
- **Zustand** — global state (`src/lib/store/`)
- **Vitest + Testing Library** — tests in `__tests__/`

## Structure

```
src/
  app/
    calculator/
      page.tsx           # Main calculator page
      components/        # UI components (ActionMenu, InputPanel, ResultsPanel, etc.)
      sections/          # Input sections (Geometry, Fluid, Levels, etc.)
      pdf/               # PDF report generation
      print/             # Print layout
  components/             # Shared UI primitives
  lib/
    calculations/        # Physics engine (index.ts + 3 sub-modules)
    materials.ts         # Material density lookups
    constants.ts         # Shared constants (WETTED_AREA_HEIGHT_CAP_MM)
    hooks/               # Custom hooks
    store/               # Zustand stores
    uom.ts               # UoM base units and options
    validation/          # Zod schemas
    schematics/          # SVG vessel schematics
  types/                 # Local TypeScript types
__tests__/              # Vitest tests
```

## Calculation Scope

| Category | What It Computes |
|----------|-----------------|
| **Geometry** | Shell volume & area, head volume & area (6 head types), total volume |
| **Levels** | Partial volume at given liquid level, effective volume, working/overflow volume |
| **Surface** | Shell surface, head surface, total wetted surface |
| **Mass** | Vessel mass from material density |
| **Fire** | API-521 wetted area for fire case (integrates with PSV app) |

## Supported Geometry

- **Orientations:** Vertical, Horizontal
- **Head types:** Flat, Hemispherical, Semi-ellipsoidal (2:1), Torispherical (F&D), Conical, Toriconical
- **Tank types:** Vertical tank (with cone/dome/flat roof), Horizontal tank (with heads)
- **Volume units:** m³, L, US gal, bbl
- **Area units:** m², ft²

## Physics Engine

Four calculation modules in `src/lib/calculations/`:

| Module | Responsibility |
|--------|----------------|
| `index.ts` (531 lines) | Main dispatcher — computes volume/area for any vessel/tank config. Orchestrates shell + head + roof + levels. |
| `vesselGeometry.ts` | Geometric primitives: shell cylinder, spherical cap, single head vol/area, auto-head depth tables |
| `torispherical.ts` | Torispherical head partial volume/area via elliptical integration (used for partial fill below full) |
| `partialVolume.ts` | Partial fill calculations: circular segment area, head partial volume at given liquid level |

All formulas are deterministic TypeScript (no external solver). Unit conversion via `convertUnit` from `@eng-suite/physics`.

## Key Formulas

**Vertical cylinder shell volume:** `V = π·r²·h`
**Horizontal cylinder shell volume:** `V = L·π·r² − 2·r³·(θ − sinθ)` where `θ = arccos((r−d)/r)`
**Torispherical head volume:** Per ASME F&D geometry, integrated via `torispherical.ts`
**Partial volume:** Uses circular segment area for horizontal tanks; torispherical integration for head partial fill

## Formula Fidelity Status

- **Geometry formulas:** ✅ 12/12 cases pass. Deterministic ASME-derivable formulas verified (shell volume, shell surface area, head volume/area, cone roof, circular segment). Tolerance 0.1%.
- **Torispherical parity:** ✅ Verified against hand calculations.
- **Partial volume:** ✅ Verified (horizontal tank V=60.07 m³ for D=3000, L=10000, HEMI heads, level=2000).

## Input Schema

Key inputs (via `InputPanel` → `calculationInputSchema`):
- Vessel orientation (vertical/horizontal)
- Shell diameter (mm), length (mm)
- Head type + knuckle radius variant
- Liquid level (mm)
- Material (for mass calculation)
- Tank roof type + roof height (vertical tanks)

## Pending

- [x] Formula fidelity testing — 12 tests pass (ASME geometry, tolerance 0.1%)
- [ ] Save/load via shared `/calculations` API
- [ ] Equipment linking (link vessel calc to PSV app)
- [ ] PDF export

## Notes

- Cloned from `apps/calculation-template`
- `basePath` is `/vessels-calculation`
- Prefer Tailwind over MUI `sx` for new UI work
- API calls proxy to `services/api` (port 8000)
- Shared types from `@eng-suite/types` and `@eng-suite/engineering-units`
- `WETTED_AREA_HEIGHT_CAP_MM = 7620` (7.62m per API-521) enforced in calculations