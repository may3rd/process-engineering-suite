# Claude Code Project Guide: process-engineering-suite

## Unit Conversion

All unit conversion in this project defaults to **`packages/physics-engine/src/unitConversion.ts`**.

### Primary Utilities

- **`convertUnit(value: number, fromUnit: string, toUnit: string): number`**
  - Converts a numeric value between two units (with error handling)
  - Returns the original value if conversion fails
  - Supports both linear and non-linear conversions (e.g., temperature)
  - Unit keys use ASCII strings: `m3/h`, `Nm3/h`, `C` (not unicode superscripts)

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

### Apps Using Unit Conversion

#### apps/venting-calculation (API 2000 Vent Sizing)

**Base Units (always stored in form):**
- Length: `mm`
- Gauge Pressure: `kPag`
- Absolute Pressure: `kPa`
- Temperature: `C`
- Volume Flow: `m3/h`
- Vent Rate: `Nm3/h`

**UoM Store:**
- Location: `apps/venting-calculation/src/lib/store/uomStore.ts`
- Persists user's display unit preferences to localStorage (`vent-uom-prefs`)
- Categories: `length`, `gaugePressure`, `absolutePressure`, `temperature`, `volumeFlow`, `ventRate`

**Input Component:**
- `UomInput` — controlled input with inline unit selector
- Always converts to/from base units
- Form state always stores base units for consistent validation and API submission

**Display Labels:**
- Defined in `apps/venting-calculation/src/lib/uom.ts`
- Maps ASCII unit keys to pretty unicode labels (`m3/h` → `m³/h`, `C` → `°C`, etc.)

---

## Project Structure

```
process-engineering-suite/
├── packages/
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
    │       │   ├── uom.ts      # UoM constants, options, display labels
    │       │   ├── store/
    │       │   │   └── uomStore.ts  # Zustand + persist for user unit prefs
    │       │   └── ...
    │       └── ...
    └── ...
```

---

## Tips

- When adding new unit-convertible fields, use the existing `UomInput` component in venting-calculation
- Always validate in base units to keep Zod schemas simple
- Test unit conversion with the physics-engine directly before integrating into UI components
