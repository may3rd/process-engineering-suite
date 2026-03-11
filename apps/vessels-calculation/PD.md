# Product Description (PD) - Vessel Calculator

## 1) Product Goal

Build `apps/vessels-calculation` as a vessel/tank calculator intended to replace spreadsheet workflows for:

- volume calculations
- surface area calculations
- level-based partial/wetted calculations
- mass and operational helper outputs

## 2) Design and Architecture Constraint (Mandatory)

- UI and frontend architecture must follow [`pes-web-dna.md`].
- Vessel geometry formulas run in TypeScript in `apps/vessels-calculation`.
- Unit conversion must use `convertUnit` from `@eng-suite/physics`.
- No hardcoded conversion factors.

## 3) Stack (Required)

- Next.js App Router
- shadcn/ui + Tailwind CSS
- React Hook Form + Zod resolver
- Zustand + `persist` for UoM preferences
- TypeScript strict

## 4) UX Layout (Required)

- Sticky top bar: app title/subtitle + action menu.
- Two-panel calculator layout:
    - left panel: InputPanel with SectionCards
    - right panel: ResultsPanel with Empty/Validation/Results states
- Grid behavior:
    - mobile: single-column
    - desktop (`xl`): two-column

## 5) Core UI Components (Required)

1. `SectionCard`

- Wrapper for all major input/output blocks.

2. `FieldRow`

- Label + input + optional unit/hint/error for every field.

3. `UomInput`

- Required for all unit-bearing numeric fields.
- Stores base values only; display conversions are reversible.

## 6) Functional Scope

### 6.1 Inputs

- Equipment type, orientation, shape
- Diameter, shell length, wall thickness, head depth
- Levels: liquid level, HLL, LLL, OFL
- Density and flow inputs
- Metadata fields (project/document/title/client)
- Revision fields and equipment link fields

### 6.2 Outputs

- Surface area: head/shell/total/wetted
- Volume: head/shell/total/tangent/effective/working/overflow/partial
- Mass: empty/liquid/full
- Timing: surge and inventory
- Validation warnings/errors

### 6.3 Lifecycle Features

- Save/load calculation cases
- Overwrite by name
- PDF export
- Equipment link/sync

## 7) UoM Architecture

1. Central unit config

- `lib/uom.ts`
    - `BASE_UNITS`
    - `UOM_OPTIONS`
    - `UOM_LABEL`

2. Unit preference store

- `lib/store/uomStore.ts` (Zustand persist)
- Must include `migrate` merge to add new categories safely.

3. Conversion behavior

- Render: base -> selected display unit
- Input edit: display -> base unit
- Validation always runs on base units

## 8) Implementation Plan

1. Scaffold calculator template components per PSE Web DNA.
2. Implement Zod schema and RHF form with base-unit storage.
3. Implement `SectionCard`, `FieldRow`, and `UomInput` primitives.
4. Implement vessel formulas and result model.
5. Implement save/load + metadata + revision history.
6. Implement PDF export and equipment sync.
7. Add tests for formulas, conversion round-trips, and panel states.

## 9) Test Strategy

- Formula tests by geometry type and edge cases.
- UoM conversion tests (round-trip tolerance).
- Component tests:
    - Empty state
    - Validation issues state
    - Results state
- Save/load and metadata tests.

## 10) Definition of Done

- Layout and component structure matches `pes-web-dna.md`.
- All required vessel/tank geometries calculate correctly.
- Unit-bearing fields use `UomInput` and base-unit storage.
- Save/load/PDF/equipment-link flows are operational.
- Lint/typecheck/build pass for `vessel`.
