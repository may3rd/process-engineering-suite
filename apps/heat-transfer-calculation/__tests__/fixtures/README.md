# Heat Transfer Calculation — Test Fixtures

## Overview

This directory contains input/output test fixtures for the three heat transfer calculation modes in the `heat-transfer-calculation` app:

| Mode | Engine function | Fixture file |
|------|----------------|--------------|
| Storage Tank (vertical) | `calculate()` | `storage-tank-cases.json` |
| Pipe | `calculatePipe()` | `pipe-cases.json` |
| Horizontal Tank | `calculateHorizontalTank()` | `horizontal-tank-cases.json` |

## Fixture Format

Each fixture file is a JSON array of test cases:

```json
[
  {
    "caseId": "ST-001",
    "tag": "V-101",
    "description": "PES V-101 golden case — ...",
    "mode": "storage-tank",
    "input": { ... },
    "expected": { ... },
    "tolerance": 10,
    "notes": "PES TypeScript engine result..."
  }
]
```

### `tolerance` — allowed deviation from `expected` value

| Value | Meaning |
|-------|---------|
| `10%` | **Golden case** — Excel-validated or fidelity-test-corrected. Do not adjust without re-validation. |
| `20–25%` | **Engineered case** — expected values from PES engine. Accounts for sensitivity to external correlations and wind model. |

### Expected value units

| Mode | Field | Unit |
|------|-------|------|
| Storage Tank | `dryWall.uOverall`, `wetWall.uOverall`, `roof.uOverall`, `floor.uOverall` | W/(m²·K) |
| Storage Tank | `dryWall.heatLoss`, `wetWall.heatLoss`, etc. | W |
| Storage Tank | `dryWall.twInside`, `twOutside` | °C |
| Storage Tank | `totalHeatLoss` | W |
| Storage Tank | `totalArea` | m² |
| Pipe | `uOverall` | W/(m²·K) |
| Pipe | `heatLoss`, `inletTemp`, `outletTemp`, `twInside`, `twOutside` | W, °C |
| Pipe | `reynoldsInternal` | dimensionless |
| Pipe | `prandtl` | dimensionless |
| Horizontal Tank | `dryWall.uOverall`, etc. | W/(m²·K) |
| Horizontal Tank | `dryWall.heatLoss`, etc. | W |

## Case Catalogue

### Storage Tank (10 cases)

| caseId | tag | Description | Tolerance |
|--------|-----|-------------|-----------|
| ST-001 | V-101 | PES golden case — large insulated tank, 12.78°C water, 1.67°C ambient, wind 3 m/s | ±10% |
| ST-002 | V-NO-INS-01 | Uninsulated steel tank — hot water 85°C, bare steel | ±20% |
| ST-003 | V-HOT-OIL-01 | Hot thermal oil at 200°C, 80mm mineral wool insulation | ±20% |
| ST-004 | V-CHILLED-01 | Warm tank at 35°C in 15°C ambient — 20°C ΔT, refrigerated scenario | ±25% |
| ST-005 | V-LARGE-01 | Industrial-scale tank D=30m, uninsulated, 60°C water | ±20% |
| ST-006 | V-SMALL-01 | Bench-scale tank D=0.5m, insulated, 40°C water | ±20% |
| ST-007 | V-PARTIAL-01 | Partial insulation — walls insulated, roof and floor bare | ±20% |
| ST-008 | V-CONE-ROOF-01 | Cone roof tank with sloped roof geometry (roofHeight=1000mm) | ±20% |
| ST-009 | V-HIGH-WIND-01 | High wind offshore — 15 m/s wind, Wf=5, 60°C tank | ±20% |
| ST-010 | V-EMPTY-01 | Empty tank — no liquid, vapor space only | ±20% |

### Pipe (6 cases)

| caseId | tag | Description | Tolerance |
|--------|-----|-------------|-----------|
| PC-001 | P-101 | PES golden case — DN150 pipe, 20m, 100 L/h, 100°C water, 20mm insulation | ±10% |
| PC-002 | P-NO-INS-01 | Uninsulated DN100 steel pipe, 50m, 80°C water, 50 L/h | ±20% |
| PC-003 | P-HIGH-TEMP-01 | High-temperature thermal oil — DN50, 250°C, 20 L/h, insulated | ±20% |
| PC-004 | P-BURIED-01 | District heating main — 200m, DN150, 120°C, 200 L/h, pre-insulated | ±20% |
| PC-005 | P-RECT-DUCT-01 | Rectangular HVAC duct 400×300mm, 30m, 90°C air, 200 L/h | ±20% |
| PC-006 | P-TURBULENT-01 | High-flow turbulent pipe — DN200, 50m, 60°C water, 500 m³/h | ±20% |

### Horizontal Tank (6 cases)

| caseId | tag | Description | Tolerance |
|--------|-----|-------------|-----------|
| HT-001 | HT-201 | PES golden case — D=2.4m, L=4m, 80°C water, ellipsoidal heads, half full | ±10% |
| HT-002 | HT-EXCEL-001 | Same as HT-201 but liquidLevel=1000mm — Excel-validation baseline | ±10% |
| HT-003 | HT-NO-INS-01 | Large uninsulated tank — D=3m, L=6m, 90°C water | ±20% |
| HT-004 | HT-HEMI-01 | Hemispherical heads — no insulation, 60°C water | ±20% |
| HT-005 | HT-LOW-LEVEL-01 | Mostly empty — liquid level 500mm in D=2400mm tank | ±20% |
| HT-006 | HT-FULL-01 | Nearly full — liquid level 2200mm in D=2400mm tank | ±20% |

## Expected Value Source

| Case type | Source |
|-----------|--------|
| Golden cases (ST-001, PC-001, HT-001, HT-002) | PES TypeScript engine — `src/lib/calculations/`. Values validated against existing test suites (`excel-validation.test.ts`, `fidelity.test.ts`). |
| Engineered cases | PES TypeScript engine run with engineering-selected inputs. Same correlation set as golden cases. |

## Validation Test

Run the test fixture validator:

```bash
cd apps/heat-transfer-calculation
bun test __tests__/fixtures.test.ts
```

Or via vitest directly:

```bash
TMPDIR=./.tmp npx vitest run __tests__/fixtures.test.ts
```

The test loads each fixture, calls the appropriate calculation function, and asserts that every `expected` field falls within `±tolerance` of the computed value.

## Schema

See `storage-tank-cases.schema.json` for the JSON Schema (draft-07) defining the fixture structure.

## Data Conventions

- All dimensions in **mm**
- Temperatures in **°C**
- Thermal conductivity in **W/(m·K)**
- Heat loss in **W**
- U-values in **W/(m²·K)**
- All inputs use SI base units internally (m, Pa·s, W/(m·K), kg/m³)