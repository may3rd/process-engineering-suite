# AGENTS.md (apps/vessels-calculation)

This file defines app-scoped rules for `apps/vessels-calculation`.

## Scope

- Applies to all files under `apps/vessels-calculation/**`.
- Goal: deliver a vessel/tank volume and surface calculator using the same web DNA as `apps/venting-calculation`.

## Rule 0 (must follow)

- Volume and surface-area equations for vessel/tank geometry are allowed in TypeScript for `apps/vessels-calculation`.
- Keep formulas deterministic, explicit, and covered by regression tests.
- No hardcoded conversion constants; all unit conversion must call `convertUnit` from `@eng-suite/physics`.

## Required Stack (PSE Web DNA)

- Next.js App Router.
- shadcn/ui components (Radix primitives) + Tailwind CSS utility classes.
- React Hook Form + Zod resolver for forms and validation.
- Zustand with `persist` middleware for UI/UoM preferences.
- `lucide-react` icons.

## Required Page Architecture

- Sticky top bar with app title/subtitle and right-side action menu.
- Two-panel calculator layout:
    - left: input sections
    - right: empty/validation/results sections
- Mobile: single-column.
- `xl` and above: two-column grid.

## Required Component Pattern

- Use `SectionCard` as base wrapper for every major input/output group.
- Use `FieldRow` for every labeled input row.
- Use `UomInput` for every unit-bearing numeric field.
- Form stores base-unit values only; unit switching is display-layer only.

## Data and Units

- Every physical input/output must support dynamic unit selection.
- Implement `lib/uom.ts` with:
    - `BASE_UNITS`
    - `UOM_OPTIONS`
    - `UOM_LABEL`
- Implement `lib/store/uomStore.ts` with `persist` and `migrate` merge pattern.

## Implementation Rules

- Named exports only.
- `const` by default; avoid `any`.
- TypeScript strict mode; prefer inferred types from Zod schemas.
- Keep app code split by template pattern:
    - `src/app/calculator/page.tsx`
    - `src/app/calculator/components/ActionMenu.tsx`
    - `src/app/calculator/components/InputPanel.tsx`
    - `src/app/calculator/components/ResultsPanel.tsx`

## Testing and Validation

Before merge, run at minimum:

```bash
# from repo root
bun turbo run lint --filter=vessel
bun turbo run check-types --filter=vessel
bun turbo run build --filter=vessel
```

## Delivery Expectations

- Match `pes-web-dna.md` layout and component behavior.
- Deliver production-grade calculations to replace spreadsheet workflows.
- Add tests for formulas, UoM conversions, and component rendering states.
