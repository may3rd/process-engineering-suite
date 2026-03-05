# Product Description (PD) - Vessel Calculator

## 1) Product Goal

Create `apps/vessel`, a dedicated calculator app for industrial vessel/tank geometry that reproduces and extends the existing spreadsheet workflow for:

- volume calculations
- surface area calculations
- level-dependent partial volumes and wetted areas
- related operational metrics (mass, surge time, inventory time)

## 2) Architecture Constraint (Mandatory)

- Volume and surface-area geometry calculations run in TypeScript inside `apps/vessel`.
- TypeScript also handles form orchestration, validation, state, and unit conversion.
- `packages/physics-engine/src/unitConversion.ts` is the only allowed conversion base.
- FastAPI integration is optional for persistence/cross-app orchestration.
- The app must calculate without requiring a backend round-trip.

## 3) In Scope

- Vertical and horizontal vessel handling.
- Head types: flat, elliptical, hemispherical, torispherical, conical.
- Tank support: flat, conical, spherical.
- Spreadsheet-style grouped UI sections and outputs.
- Fully dynamic unit model: all unit-bearing inputs/outputs selectable by users.
- Spreadsheet parity tests for benchmark cases.

## 4) Out of Scope (Initial Release)

- Mechanical design code checks (ASME/API wall-thickness compliance).
- Nozzle reinforcement calculations.
- Detailed costing and fabrication estimation.

## 5) Users

- Process engineers (quick sizing and inventory checks).
- Mechanical/static engineers (geometry and shell/head area inputs).
- Operations/process safety (surge and hold-up estimates).

## 6) Functional Requirements

### 6.1 Input Sections (Spreadsheet Parity)

1. Vessel details
- Vessel category: vessel or tank
- Orientation: vertical or horizontal
- Head/tank type
- Inside diameter
- Wall thickness
- Tangent-to-tangent shell length/height
- Head depth (manual for conical)
- High liquid level (HLL)
- Low liquid level (LLL)
- Overfill level (OFL)
- Current liquid level from bottom

2. Vessel mass
- Vessel material preset
- Vessel material density (preset/manual)
- Liquid density

3. Operations helpers
- Flow out / flow rate
- Service type (for surge criteria hint)
- Outlet fitting diameter (for vortex checks)

### 6.2 Output Sections

1. Surface area
- Both heads surface area
- Shell surface area
- Total surface area
- Wetted surface area at specified level

2. Volume
- Both heads volume
- Shell volume
- Total volume
- Tangent volume
- Effective volume (to HLL)
- Efficiency volume (%)
- Working volume (HLL - LLL)
- Overflow volume (to OFL)
- Partial volume at user level

3. Mass
- Empty vessel mass
- Liquid mass at level
- Liquid full vessel mass

4. Time helpers
- Surge time from selected effective volume and flow-out
- Inventory time from selected volume and flow-rate

5. Vortex helper (tank mode)
- Required minimum submergence/LLL warning output

### 6.3 Calculation Lifecycle and Reporting

1. Save calculation
- Save current inputs, calculated outputs, metadata, and link to equipment (if selected).
- Support creating new record and overwriting existing record by name.

2. Load calculation
- Browse and search saved calculations.
- Restore inputs, metadata, revision history, and equipment link.

3. Metadata
- Required metadata fields:
  - project number
  - project name
  - document number
  - title
  - client
- Revision history fields:
  - revision
  - prepared by / date
  - checked by / date
  - approved by / date

4. PDF export
- Export a formatted PDF containing:
  - metadata block
  - input summary
  - calculation results summary
  - generated timestamp

5. Equipment link
- Link a vessel calculation to an equipment item (tank/vessel) from equipment register.
- Persist equipment link in saved calculations.
- Provide update action to push relevant calculated outputs to linked equipment details.

## 7) Canonical Input/Output Contract (Draft)

### 7.1 Input DTO

- `equipmentType`: `vessel | tank`
- `orientation`: `vertical | horizontal`
- `shape`: enumerated shape key
- `insideDiameterM`
- `wallThicknessM`
- `tanTanLengthM`
- `headDepthM?`
- `hllM?`
- `lllM?`
- `oflM?`
- `liquidLevelM`
- `vesselMaterialDensityKgM3?`
- `liquidDensityKgM3?`
- `flowOutM3H?`
- `flowRateM3H?`
- `outletDiameterM?`
- `equipmentId?`
- `metadata?`
- `revisionHistory?`

### 7.2 Output DTO

- `geometry`: radii, OD, total height, tangent height
- `surfaceArea`: `headsM2`, `shellM2`, `totalM2`, `wettedM2`
- `volume`: `headsM3`, `shellM3`, `totalM3`, `tangentM3`, `effectiveM3`, `workingM3`, `overflowM3`, `partialM3`, `efficiencyPct`
- `mass`: `emptyKg`, `liquidKg`, `fullKg`
- `timing`: `surgeMin`, `inventoryHr`
- `warnings`: validation and operating warnings
- `calculatedAt`: ISO datetime
- `calculationId?`

### 7.3 Dynamic UoM System Design (Mandatory)

1. Canonical calculation units (internal only)
- Length: `m`, `mm`, `ft`, `in`
- Area: `m2`, `mm`, `ft2`, `in`
- Volume: `m3`, `mm3`, `ft3`, `in3`
- Mass: `kg`, `lb`
- Density: `kg/m3`, `lb/ft3`
- Volume flow: `m3/h`, `lb/ft3`, `L/min`
- Time: `h` (inventory), `min` (surge output), `sec`

2. Per-field unit binding
- Every numeric field carries:
  - `valueDisplay`: number in user-selected unit
  - `unit`: selected unit string
  - `valueCanonical`: normalized SI value used by formulas
- Fields without physical units (for example efficiency %) do not have unit selectors.

3. Conversion workflow
- Input path:
  - user edits `valueDisplay` or `unit`
  - app converts to canonical with `convertUnit(valueDisplay, unit, canonicalUnit)`
  - canonical state is updated
- Output path:
  - formulas return canonical values only
  - app converts for rendering with `convertUnit(valueCanonical, canonicalUnit, selectedOutputUnit)`

4. Unit selector behavior
- Default unit profile: SI.
- Optional profile switchers: SI / Imperial / user custom.
- Unit changes preserve physical quantity (value is converted, not reset).

5. Allowed unit families (initial)
- Length: `m`, `mm`, `cm`, `in`, `ft`
- Area: `m2`, `ft2`
- Volume: `m3`, `L`, `ft3`, `bbl`
- Mass: `kg`, `lb`
- Density: `kg/m3`, `lb/ft3`, `g/cm3`
- Volume flow: `m3/h`, `m3/s`, `ft3/h`
- Time: `h`, `min`

6. Precision and rounding
- Keep full precision in canonical state.
- Apply rounding only in UI display and export format.
- Precision policy by family:
  - length 3 decimals
  - area/volume 2 decimals
  - mass 2 decimals
  - flow/time 2 decimals

7. Hard rule
- No hardcoded conversion constants in app formula or UI modules.
- All conversions must call `convertUnit` from `unitConversion.ts`.

## 8) Non-Functional Requirements

- Deterministic numeric output for identical inputs.
- Typical calculation response under 1 second.
- Clear validation errors for impossible geometry.
- Mobile and desktop support.
- Versioned TypeScript calculation contracts for traceability.

## 9) Implementation Plan (Complete Steps)

### Phase 0 - Alignment and Baseline

1. Confirm spreadsheet field mapping and formula ownership.
2. Freeze field-to-unit-family mapping and canonical unit map.
3. Freeze output naming and precision policy.

Acceptance:
- Approved field map and TypeScript calculation contract draft.

### Phase 1 - TypeScript Formula Engine

1. Implement geometry modules for all supported types:
  - vertical/horizontal vessel with flat, elliptical, hemispherical, torispherical, conical heads
  - vertical tanks (flat, conical)
  - spherical tank
2. Implement output assemblers for volume/surface/mass/time groups.
3. Add warning rules for invalid levels and suspicious operating ranges.
4. Add unit tests for each geometry family and edge conditions.

Acceptance:
- TypeScript engine returns full output payload for every supported geometry.
- Tests pass for baseline spreadsheet fixtures.

### Phase 2 - Dynamic UoM Layer

1. Implement unit family registry and per-field selector config.
2. Add canonicalization adapters for all inputs.
3. Add output render adapters for all output groups.
4. Add tests for unit switching and conversion reversibility/tolerance.

Acceptance:
- Any input/output unit switch preserves physical meaning and numeric parity.

### Phase 3 - Persistence, Metadata, and Reporting

1. Implement save/load repository for vessel calculations.
2. Add metadata and revision history models and validation.
3. Implement save and load UI dialogs.
4. Implement PDF report component and export action.
5. Implement equipment link selector and equipment update action.

Acceptance:
- Users can save, reload, export PDF, and maintain equipment linkage.

### Phase 4 - UI Application Build

1. Bootstrap Next.js app shell under `apps/vessel`.
2. Build spreadsheet-like panel layout:
   - Vessel Details
   - Vessel Mass
   - Surface Area
   - Volume
   - Surge Time / Inventory Time
   - Vortex Level
3. Build live sketch panel for orientation/head-type rendering and level markers.
4. Add state management via Zustand.
5. Add dynamic unit selectors for all applicable input/output fields.

Acceptance:
- User can enter data, calculate, and view all outputs matching spreadsheet sections.

### Phase 5 - Verification and Hardening

1. Add regression suite from spreadsheet examples (golden cases).
2. Add error/warning scenarios for invalid levels and impossible geometry.
3. Add performance checks for repeated recalculation.
4. Optional: integrate persistence API for save/load and audit metadata.
5. Add docs and release notes.

Acceptance:
- Golden tests pass with explicit tolerance.
- Lint, type checks, and tests pass.

## 10) Test Strategy

- TypeScript formula tests: per-geometry, boundary tests, tolerance checks.
- UoM tests: conversion correctness, selector switching, round-trip tolerance.
- Persistence tests: save/load/overwrite/delete behavior.
- Metadata tests: required fields and revision parsing.
- Equipment link tests: mapping to equipment payload and sync behavior.
- PDF tests: report render smoke test and essential field coverage.
- Component tests: validation/unit mapping and section rendering tests.
- API tests (optional if persistence integrated): payload/schema tests.
- End-to-end: one complete flow for vertical and one for horizontal geometry.

## 11) Risks and Mitigations

- Risk: Spreadsheet formulas differ from TypeScript engine behavior.
  - Mitigation: golden test fixtures signed off by engineering.
- Risk: Shape naming mismatch across UI/API.
  - Mitigation: single enum source and compatibility mapper.
- Risk: Unit inconsistency from mixed user inputs.
  - Mitigation: canonical SI payload and centralized conversion utility.

## 12) Definition of Done

- `apps/vessel` exists and is routable.
- All listed geometries are selectable and calculable.
- Every unit-bearing input/output supports user-selectable units.
- All conversions are routed via `unitConversion.ts`.
- Output sections match agreed spreadsheet parity.
- Regression tests pass in app layer (and API layer if integrated).
- Documentation (`README.md`, `PD.md`, local `AGENTS.md`) is complete and current.
