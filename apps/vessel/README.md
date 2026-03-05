# Vessel Application (`apps/vessel`)

Vessel is a dedicated Process Engineering Suite app for industrial vessel and tank geometry calculations.

## Purpose

Provide a spreadsheet-parity workflow for surface area and volume calculations across common equipment geometries:

- UI and geometry calculations in TypeScript (`apps/vessel`)
- Dynamic unit conversion based on `packages/physics-engine/src/unitConversion.ts`
- Optional API integration for persistence and cross-app reuse
- Formula execution is local in app code (not API-dependent)

## Supported Equipment Matrix

- Orientation: vertical, horizontal
- Vessel heads: flat, elliptical, hemispherical, torispherical, conical
- Tank bodies: flat, conical, spherical

## Key Output Groups

- Vessel geometry: inside/outside diameter, tangent length/height, head depth, total height
- Volume: head volume, shell volume, total volume, tangent volume, effective/working/overflow/partial volume
- Surface area: head area, shell area, total area, wetted area
- Mass: empty vessel mass, liquid mass, combined mass
- Operations helpers: surge time and inventory time
- Lifecycle features: save/load calculations, metadata capture, PDF export, equipment link sync

## Existing Reuse Points

- Unit conversion utility:
  - `packages/physics-engine/src/unitConversion.ts`
- Optional geometry parity reference (read-only benchmark):
  - `services/calc-engine/pes_calc/vessels/*.py`

## Dynamic UoM Design (Required)

- Every numeric input/output field with physical units must provide a unit selector.
- Internal canonical storage uses SI in state:
  - length `m`, area `m2`, volume `m3`, density `kg/m3`, mass `kg`, flow `m3/h`, time `h`/`min`
- On input:
  - user enters value in selected unit
  - app converts to canonical SI using `convertUnit`
  - calculations run on canonical SI only
- On output:
  - canonical result is converted to selected display unit using `convertUnit`
- No hardcoded conversion factors are allowed in app code.
- Detailed spec: `apps/vessel/docs/UOM-DESIGN.md`

## Proposed File Layout (Scaffold)

```text
apps/vessel/
  AGENTS.md
  AGEND.md
  README.md
  PD.md
  docs/
  src/
    app/
    components/
    features/
      vessel/
        api/
        calculations/
        components/
        store/
        types/
        utils/
        validation/
  __tests__/
```

## Complete Implementation Plan

1. Define canonical input/output schema in `PD.md` and freeze naming.
2. Implement TypeScript geometry modules for all supported vessel/tank configurations.
3. Build dynamic UoM registry per field family (length/area/volume/mass/density/flow/time).
4. Add conversion adapters that normalize every input into SI before calculation.
5. Add output transformers that render SI results into selected output units.
6. Add regression fixtures derived from the legacy spreadsheet test points.
7. Implement save/load calculation flows with metadata:
   - project number
   - project name
   - document number
   - title
   - client
   - revision records
8. Implement PDF export based on `@react-pdf/renderer`.
9. Implement equipment linking and update sync (similar to `venting-calculation`).
10. Optionally add API persistence contracts in `packages/types` for centralized storage.
11. Build `apps/vessel` shell (Next.js app router, MUI theme, Zustand store).
12. Implement input panel matching spreadsheet sections (Vessel Details, Mass, Surface, Volume, Surge/Inventory).
13. Implement output cards with unit-aware formatting and precision rules.
14. Add sketch/diagram panel for vertical and horizontal orientation with level markers (HLL, LLL, OFL).
15. Add validation states for physically invalid, suspicious, and warning-range values.
16. Add tests:
   - TS unit tests for formula modules and UoM conversion mapping
   - TS unit tests for save/load and equipment link mappers
   - Component tests for section rendering and output binding
   - PDF generation smoke test
   - Regression tests against spreadsheet benchmark cases
17. Run lane checks and quality gates before PR.

## Quality Gates

```bash
# from repo root
bun turbo run lint --filter=vessel
bun turbo run check-types --filter=vessel
bun turbo run build --filter=vessel
```

## Status

- Worktree and scaffold created.
- Planning docs created.
- App implementation pending.
