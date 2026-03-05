# Claude Code Project Guide: process-engineering-suite

## Unit of Measure (UoM) — Shared Package

All UoM constants, display labels, and the store factory now live in the shared package:

**`packages/engineering-units`** → npm name `@eng-suite/engineering-units`

### What the package exports

```ts
import {
  UOM_OPTIONS,    // { length: ['mm','in',...], temperature: [...], ... }
  BASE_UNITS,     // { length: 'mm', temperature: 'C', ... }
  UOM_LABEL,      // { 'C': '°C', 'm3/h': 'm³/h', ... }
  type UomCategory,
  createUomStore, // Zustand store factory with persist + migrate
} from '@eng-suite/engineering-units'
```

### Creating a UoM store for a new app

```ts
// apps/my-new-app/src/lib/store/uomStore.ts
import { createUomStore } from '@eng-suite/engineering-units'
import { BASE_UNITS } from '../uom'   // app-specific subset or full set

export const useUomStore = createUomStore('my-app-uom-prefs', BASE_UNITS)
```

The factory automatically:
- Persists preferences to localStorage under the given key
- Merges `BASE_UNITS` with stale persisted state on load (schema evolution)

### Architecture rules

- **Form state always stores base units** (mm, kPag, C, m3/h, Nm3/h …)
- **Conversion is UI-only** — happens inside `UomInput` component, never at the API boundary
- **Zod schemas validate base units** — no changes needed when adding new display units
- **Unit keys are ASCII** — `m3/h`, `Nm3/h`, `C`, `kg/cm2g` (not `m³/h`, `°C`, etc.)

---

## Unit Conversion (math)

All numeric conversions use **`packages/physics-engine/src/unitConversion.ts`**.

### Primary Utilities

- **`convertUnit(value: number, fromUnit: string, toUnit: string): number`**
  - Converts a numeric value between two units (with error handling)
  - Returns the original value if conversion fails
  - Supports both linear and non-linear conversions (e.g., temperature)

- **`normalizeUnit(unit?: string | null): string | undefined`**
  - Normalizes unit aliases (e.g., `tonn/day` → `ton/day`, `kg_cm2` → `kg/cm2`)
  - Safe to call even with invalid units

### Unit Families

The physics-engine supports:
- **Length**: `mm`, `cm`, `m`, `km`, `in`, `ft`, `yd`, `mi`
- **Temperature**: `C`, `F`, `K`, `R`
- **Pressure** (absolute): `kPa`, `bar`, `psi`, `atm`, `Pa`, `MPa`
- **Pressure** (gauge): `kPag`, `barg`, `psig`, `kg/cm2g`, `kg/cm2`, `atm`
- **Mass Flow**: `kg/s`, `g/s`, `kg/h`, `kg/hr`, `ton/day`, `lb/s`, `lb/min`, `lb/h`, `lb/hr`
- **Volume Flow**: `m3/s`, `m3/h`, `Nm3/h`, `Nm3/d`, `ft3/h`, `SCFD`, `MSCFD`
- **Viscosity**: `Pa.s`, `Poise`, `cP`
- **Mass Density**: `kg/m3`, `kg/cm3`, `g/cm3`, `lb/ft3`, `lb/in3`
- **Pressure Gradient**: `Pa/m`, `kPa/100m`, `bar/100m`, `kg/cm2/100m`, `psi/100ft`
- **And more** — see `convert-units` library documentation

---

## Apps Using UoM

### apps/venting-calculation (API 2000 Vent Sizing)

**Base Units (always stored in form):**
- Length: `mm`
- Gauge Pressure: `kPag`
- Absolute Pressure: `kPa`
- Temperature: `C`
- Volume Flow: `m3/h`
- Vent Rate: `Nm3/h`
- Energy: `kJ/kg`
- Thermal Conductivity: `W/(m·K)`
- Heat Transfer Coeff: `W/(m²·K)`

**UoM Store:**
- `apps/venting-calculation/src/lib/store/uomStore.ts` — thin wrapper around `createUomStore`
- Persists to localStorage key `vent-uom-prefs`

**UoM Constants:**
- `apps/venting-calculation/src/lib/uom.ts` — re-exports from `@eng-suite/engineering-units`,
  plus app-specific `GAUGE_PRESSURE_RANGES` for form validation hints

**Input Component:**
- `UomInput` — controlled input with inline unit selector (stays in each app for RHF typing)
- Always converts to/from base units; form state always stores base units

---

## Adding UoM to a New App

1. Add `"@eng-suite/engineering-units": "*"` to the app's `package.json` dependencies
2. Add path alias to `tsconfig.json`:
   ```json
   "@eng-suite/engineering-units": ["../../packages/engineering-units/src/index.ts"]
   ```
3. Create `src/lib/uom.ts` (re-export from `@eng-suite/engineering-units`, add app-specific extras)
4. Create `src/lib/store/uomStore.ts` using `createUomStore('my-app-uom-prefs', BASE_UNITS)`
5. Build a `UomInput` component (copy from venting-calculation, adjust form type)
6. Run `bun install` at the repo root to link the package

---

## Project Structure

```
process-engineering-suite/
├── packages/
│   ├── engineering-units/      # ★ Shared UoM constants + store factory
│   │   └── src/
│   │       ├── types.ts        #   UOM_OPTIONS, BASE_UNITS, UOM_LABEL, UomCategory
│   │       ├── store.ts        #   createUomStore() factory
│   │       └── index.ts        #   re-exports
│   ├── physics-engine/         # Shared physics calculations & unit conversion
│   │   └── src/
│   │       ├── unitConversion.ts   # convertUnit, normalizeUnit
│   │       └── ...
│   └── api-std/               # Standard API types & utilities
│
└── apps/
    ├── venting-calculation/    # API 2000 tank vent sizing calculator
    │   └── src/
    │       ├── lib/
    │       │   ├── uom.ts          # re-exports @eng-suite/engineering-units + GAUGE_PRESSURE_RANGES
    │       │   ├── store/
    │       │   │   └── uomStore.ts # createUomStore('vent-uom-prefs', BASE_UNITS)
    │       │   └── ...
    │       └── app/calculator/components/
    │           └── UomInput.tsx    # RHF-controlled input + inline unit selector
    └── ...
```

---

## Tips

- When adding new unit-convertible fields, use the existing `UomInput` component pattern
- Always validate in base units to keep Zod schemas simple
- Add new unit categories to `packages/engineering-units/src/types.ts` — all apps pick them up automatically
- Test unit conversion with the physics-engine directly before integrating into UI components
