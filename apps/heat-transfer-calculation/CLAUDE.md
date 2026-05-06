# apps/heat-transfer-calculation

Next.js app for heat transfer in storage tank calculations. Runs on **port 3008**.

## Commands

```bash
bun run dev          # start dev server (port 3008)
bun run build        # production build
bun run test         # vitest
bun run check-types  # tsc
bun run lint         # eslint
```

From repo root: `bun turbo run dev --filter=heat-transfer-calculation`

## Tech Stack

- **Next.js 16 / React 19** — App Router (`src/app/`)
- **Tailwind CSS v4** — primary styling (not MUI's `sx`)
- **shadcn/ui** — component primitives (class-variance-authority)
- **MUI v7** — TopToolbar uses MUI; some legacy components present
- **React Hook Form + Zod** — form handling and validation
- **Zod** — schema validation
- **Zustand** — global state (`src/lib/store/`)
- **React PDF** — PDF report generation
- **Vitest + Testing Library** — tests in `__tests__/`

## Structure

```
src/
  app/
    api/          # Next.js API routes
    calculator/   # Main calculator page (3 modes: tank, pipe, horizontal)
  components/     # UI components
  contexts/       # React contexts (ColorModeContext)
  lib/
    calculations/ # Physics engines (index.ts, pipe.ts, horizontal-tank.ts)
    materials/    # Fluid property lookups
    store/        # Zustand stores (UoM preferences)
    hooks/        # Custom hooks
    uom.ts        # Heat-transfer-specific UoM base units
    schemas/      # Zod input schemas
  types/          # Local TypeScript types
__tests__/        # Vitest tests
```

## Physics Engines

Three separate engines in `src/lib/calculations/`:

### Vertical/Cylindrical Tank (`index.ts`)
Four surfaces with per-surface iterative convergence (20 iterations):
1. **Internal natural convection** — Churchill & Chu (vertical plate, dry/wet), horizontal lower (floor), horizontal upper (roof)
2. **Conduction** — multi-layer cylindrical wall: steel + optional insulation; roof/floor are uninsulated
3. **External natural convection** — vertical plate correlation for wall, horizontal upper for roof
4. **Wind enhancement** — external HTC multiplied by wind factor Wf (single value for both liquid and vapor sides)
5. **Radiation** — linearized Stefan-Boltzmann, emissivity 0–1
6. **Overall U** — per-surface series resistance network
7. **Heat loss** — dry wall, wet wall, roof, floor → Q_total
8. **Cooling rate** — transient to ambient, ε-NTU method

### Pipe (`pipe.ts`)
Single-phase pipe heat loss with iterative internal HTC (Dittus-Boelter / Gnielinski / laminar). ε-NTU method for outlet temperature. Surface area expressed on outer-diameter basis.

### Horizontal Tank (`horizontal-tank.ts`)
Horizontal cylindrical tank with 2:1 ellipsoidal heads. Four surfaces: dry wall, wet wall, dry head, wet head. Internal correlations: horizontal cylinder for walls, sphere for heads. Grashof uses μ×1000 convention (matches Excel workbook).

## Input Modes

| Mode | Engine | Key Inputs |
|------|---------|-----------|
| Tank (vertical) | `calculate()` | D, H, liquid level, wind factor, roof type |
| Pipe | `calculatePipe()` | NPS, schedule, length, insulation |
| Horizontal tank | `calculateHorizontalTank()` | D, L, liquid level, head type |

## Physics Notes (Known Characteristics)

| Item | Engine | Note |
|------|--------|------|
| Wind factor Wf is single value (vs Excel's separate Wf_liq/Wf_vapor) | vertical tank | Minor — all V-101 metrics pass within tolerance. Enhancement candidate. |
| Surface area expressed on outer-diameter basis | pipe | Consistent convention across all engines; Q matches Excel within 1%. |
| Grashof uses μ×1000 convention (Excel legacy) | horizontal tank | Aligned with Excel workbook. |
| Horizontal tank vapor temperature from input | horizontal tank | Correct behavior; test validates dry/wet distinction. |

## Formula Fidelity Status (2026-05-06)

All 33 tests pass. Tested against Excel golden cases in `__tests__/fidelity.test.ts` and `__tests__/excel-validation.test.ts`:

| Case | Engine | Status |
|------|--------|--------|
| V-101 vertical tank | `calculate()` | ✅ 13/13 metrics within tolerance |
| P-101 pipe | `calculatePipe()` | ✅ 7/7 metrics within tolerance |
| HT-201 horizontal tank | `calculateHorizontalTank()` | ✅ 10/10 metrics within tolerance |

## Pending Features

- [ ] Tank schematic (SchematicCard component)
- [ ] PDF export
- [ ] Save/load via shared `/calculations` API (I-DDC integration)
- [ ] Wind factor split — separate Wf_liq / Wf_vapor (low priority; defer until fidelity degrades)

## Notes

- Cloned from `apps/calculation-template`
- `basePath` is `/heat-transfer-calculation`
- Prefer Tailwind over MUI `sx` for new UI work
- API calls proxy to `services/api` (port 8000)
- Shared types from `@eng-suite/types` and `@eng-suite/engineering-units`
- Air properties use temperature-dependent linear correlations over 0–500°C
- All calculations in SI base units internally; UI handles UoM conversion