# UoM Design - Vessel App

## Goal

Design dynamic units for all unit-bearing fields while keeping one deterministic calculation basis.

## Core Principle

- Store and calculate in canonical SI.
- Convert only at input ingress and output egress.
- Use `convertUnit` from `packages/physics-engine/src/unitConversion.ts` for all conversions.

## Canonical Base

- Length: `m`
- Area: `m2`
- Volume: `m3`
- Mass: `kg`
- Density: `kg/m3`
- Volume flow: `m3/h`
- Time: `h` and `min`

## Field-to-Family Mapping

### Inputs

- `insideDiameter`, `outsideDiameter`, `insideRadius`, `outsideRadius`, `wallThickness`, `tanTanLength`, `headDepth`, `hll`, `lll`, `ofl`, `liquidLevel`, `overallHeight`, `submergence`, `outletDiameter`: `length`
- `vesselMaterialDensity`, `liquidDensity`: `massDensity`
- `flowOut`, `flowRate`: `volumeFlowRate`

### Outputs

- `headsSurfaceArea`, `shellSurfaceArea`, `totalSurfaceArea`, `wettedSurfaceArea`: `area`
- `headsVolume`, `shellVolume`, `totalVolume`, `effectiveVolume`, `workingVolume`, `overflowVolume`, `partialVolume`, `tangentVolume`: `volume`
- `emptyVesselMass`, `liquidMass`, `fullVesselMass`: `mass`
- `surgeTime`: `time`
- `inventoryTime`: `time`

## Unit Options (Initial)

- Length: `m`, `mm`, `cm`, `in`, `ft`
- Area: `m2`, `ft2`
- Volume: `m3`, `L`, `ft3`, `bbl`
- Mass: `kg`, `lb`
- Density: `kg/m3`, `lb/ft3`, `g/cm3`
- Volume flow: `m3/h`, `m3/s`, `ft3/h`
- Time: `h`, `min`

## State Shape (Suggested)

```ts
export type UnitFamily = 'length' | 'area' | 'volume' | 'mass' | 'massDensity' | 'volumeFlowRate' | 'time';

export type FieldUnitConfig = {
  family: UnitFamily;
  canonicalUnit: string;
  selectedUnit: string;
};

export type NumericFieldState = {
  valueDisplay: number | null;
  valueCanonical: number | null;
};
```

## Conversion Rules

1. On display-value edit:
- `valueCanonical = convertUnit(valueDisplay, selectedUnit, canonicalUnit)`

2. On unit change:
- preserve physical quantity
- recompute display from canonical:
- `valueDisplay = convertUnit(valueCanonical, canonicalUnit, nextUnit)`

3. On output render:
- `display = convertUnit(outputCanonical, canonicalUnit, outputSelectedUnit)`

## Validation Rules

- Validation runs against canonical SI values.
- Unit switching must not introduce validation drift.
- If conversion fails, keep old value and surface a field-level warning.

## Precision Policy

- Canonical values: full precision.
- Display defaults:
  - length: 3 decimals
  - area: 2 decimals
  - volume: 2 decimals
  - mass: 2 decimals
  - density: 3 decimals
  - flow/time: 2 decimals

## Test Cases

- Unit-switch round trip per family (A -> B -> A) within tolerance.
- Known conversion spot checks (m/ft, m3/bbl, kg/lb, kg/m3/lb/ft3).
- Mixed-unit input scenario must produce same canonical results as pure-SI input.
