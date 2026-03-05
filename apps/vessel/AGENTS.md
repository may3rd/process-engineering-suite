# AGENTS.md (apps/vessel)

This file defines app-scoped rules for `apps/vessel`. Root [`/Users/maetee/Code/process-engineering-suite/.claude/worktrees/vessel-bootstrap/AGENTS.md`] remains authoritative when conflicts exist.

## Scope

- Applies to all files under `apps/vessel/**`.
- Goal: deliver a vessel and tank volume/surface calculator UI that mirrors the legacy spreadsheet workflow while using PES service boundaries.

## Rule 0 (must follow)

- Volume and surface-area equations for vessel/tank geometry are allowed in TypeScript for `apps/vessel`.
- TypeScript in this app handles UI, validation, state, rendering, and geometry calculations.
- Keep formulas deterministic, explicit, and covered by regression tests against spreadsheet benchmarks.

## Required Architecture

- `apps/vessel`:
  - Next.js app router UI.
  - Zustand store for app state.
  - MUI components and `@eng-suite/ui-kit` styles.
  - Owns geometry calculation modules for volume/surface outputs.
- `services/api`:
  - Optional persistence/integration endpoints when needed.
- `services/calc-engine/pes_calc/vessels`:
  - Reference implementation for cross-checking and parity tests.

## UX and Domain Coverage

The app must support:
- Orientation: `vertical`, `horizontal`.
- Vessel head types: `flat`, `elliptical`, `hemispherical`, `torispherical`, `conical`.
- Tank types: `flat`, `conical`, `spherical`.
- Outputs aligned with spreadsheet expectations: shell/head/total volume, partial volume at level, shell/head/total/wetted surface area, mass metrics, and inventory/surge-time helpers.

## Data and Units

- Canonical internal units for calculation state: SI (`m`, `m2`, `m3`, `kg`, `kg/m3`, `h`, `min`).
- Every unit-bearing input and output must support dynamic user-selectable UoM.
- Any unit conversion in TypeScript must use `convertUnit` from `packages/physics-engine/src/unitConversion.ts`.
- Never hardcode conversion factors in UI code.

## Implementation Rules

- Named exports only.
- `const` by default; avoid `any`.
- Use strict runtime validation for user inputs before API calls.
- Keep API client logic in `src/features/vessel/api`.
- Keep UI state logic in `src/features/vessel/store`.

## Testing and Validation

Before merge, run at minimum:

```bash
# from repo root
bun turbo run lint --filter=vessel
bun turbo run check-types --filter=vessel

# app tests
cd apps/vessel
bun run test:run
```

For API/calc changes related to this app, also run:

```bash
cd services/api
pytest -k vessel

cd ../calc-engine
pytest -k vessel
```

## Delivery Expectations

- Maintain traceable formulas in TypeScript for this app.
- Keep spreadsheet parity test cases as fixtures.
- New calculation outputs require typed contracts and tests in app layers (and API layers if integrated).
