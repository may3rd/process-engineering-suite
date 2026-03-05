# Vessel Application (`apps/vessel`)

Vessel is a dedicated Process Engineering Suite calculator for industrial vessel and tank volume/surface calculations.

## Design Baseline

UI/UX and frontend architecture must follow Root `pse-web-dna.md` and `apps/calculator-template`.

## Required Stack

- Next.js App Router
- shadcn/ui + Tailwind CSS
- React Hook Form + Zod
- Zustand (`persist`) for unit preferences and local UI state
- `@eng-suite/physics` `convertUnit` for all unit conversions

## Required Layout Pattern

- Top bar with title/subtitle and action menu.
- Two-panel grid (`xl:grid-cols-2`):
    - left = InputPanel
    - right = ResultsPanel
- Mobile first single column.

## Required Calculator Structure

```text
src/app/calculator/
  page.tsx
  components/
    ActionMenu.tsx
    InputPanel.tsx
    ResultsPanel.tsx
    SectionCard.tsx
    FieldRow.tsx
    UomInput.tsx
```

## UoM Rules

- Form values are stored in base units only.
- `UomInput` converts base -> display on render and display -> base on change.
- Unit switching must never mutate physical quantity, only presentation.
- Use centralized `lib/uom.ts` and `lib/store/uomStore.ts`.

## Feature Scope

- Geometry and calculation outputs:
    - shell/head/total volume
    - shell/head/total/wetted surface area
    - partial/effective/working/overflow volumes
    - mass and timing helpers
- Lifecycle features:
    - save/load calculations
    - metadata and revision history
    - PDF export
    - equipment linking

## Quality Gates

```bash
bun turbo run lint --filter=vessel
bun turbo run check-types --filter=vessel
bun turbo run build --filter=vessel
```
