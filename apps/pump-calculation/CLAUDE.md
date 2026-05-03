# apps/pump-calculation

Next.js app for pump sizing calculations per API 610. Runs on **port 3007**.

## Commands

```bash
bun run dev          # start dev server (port 3007)
bun run build        # production build
bun run test         # vitest
bun run check-types  # tsc
bun run lint         # eslint
```

From repo root: `bun turbo run dev --filter=pump-calculation`

## Tech Stack

- **Next.js 16 / React 19** — App Router (`src/app/`)
- **Tailwind CSS v4** — primary styling
- **shadcn/ui** — component primitives
- **MUI v7** — TopToolbar uses MUI; some legacy components present
- **React Hook Form + Zod** — form handling and validation
- **Zustand** — global state (`src/store/`)
- **React PDF** — PDF report generation
- **Vitest + Testing Library** — tests in `__tests__/`

## Calculation Scope

| Section | What It Computes |
|---------|-----------------|
| Fluid Properties | Flow, temperature, SG, vapor pressure, viscosity |
| Suction | Source pressure, elevation, line/strainer/other losses → suction pressure |
| Discharge | Destination pressure, elevation, equipment/line/flow element/CV losses, margin → discharge pressure |
| Pump | Differential head, static head, friction head |
| NPSHa | Net Positive Suction Head available (with optional acceleration head for PD pumps) |
| Power | Hydraulic power, shaft power, API minimum motor kW, recommended motor kW |
| Orifice (optional) | Orifice plate ∆P |
| Control Valve (optional) | Recommended CV ∆P |
| Min Flow (optional) | Minimum flow by allowable temperature rise |
| Shutoff (optional) | Shut-off pressure, head, and power |

## Structure

```
src/
  app/
    calculator/       # Main calculator page
      sections/       # Form input sections (per pump domain)
      results/        # Result display components
      components/     # Shared calculator components
      pdf/            # PDF report generation
  components/         # TopToolbar and UI primitives
  lib/                # Utilities, UoM, store
  types/              # CalculationInput, CalculationResult, enums
__tests__/            # Vitest tests (6 test files)
```

## Pending

- [ ] Python calc-engine module at `services/calc-engine/pes_calc/rotating/`
- [ ] Save/load via shared `/calculations` API (uses `@eng-suite/api-client`)

## Formula Fidelity Status

15/15 test cases pass. All pump physics validated against API 610 standards:
- dpToHead: ΔP → m conversion (sg) ✅
- calcNpsha: NPSHa with acceleration head correction ✅
- calcHydraulicPower: P_hyd = Q×H×ρ×g / 3600 ✅
- calcShaftPower: including efficiency and margin factors ✅
- nextStandardMotor: standard kW sizes confirmed ✅
- calcShutoffHead: curve_factor / head_ratio / known methods ✅
- calcMinFlow: based on shutoff power + C_p + ΔT ✅
- Tolerance 5% for calculations, 10% for min flow.

## Notes

- `basePath` is `/pump-calculation`
- Pump types: Centrifugal, Positive Displacement (6 subtypes)
- Shut-off methods: curve factor, head ratio, known head
- API calls proxy to `services/api` (port 8000)
