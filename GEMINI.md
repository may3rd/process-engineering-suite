# Process Engineering Suite: React Coding Rules

**Always use `bun` instead of `npm` or `yarn`**

## 1. Architecture & Performance
- **Framework:** Prefer Vite + TypeScript for fast HMR on M4 Pro.
- **Component Design:** Use the "Container/Presenter" pattern. Keep calculation logic in custom hooks (`useFlashCalculation.ts`) and UI in pure components.
- **Memoization:** ALWAYS wrap complex engineering formulas in `useMemo`. 
- **Large Data Sets:** When displaying process data or stream tables, use `@tanstack/react-table` with virtualization (`@tanstack/react-virtual`) to ensure 60fps scrolling.

## 2. Engineering Logic & Units
- **Physical Units:** Store all form values in base/SI units (e.g., `mm`, `kPag`, `C`, `m3/h`). Never store display units in form state or API payloads.
- **Unit Conversion (math):** Never hardcode conversions. Always use `convertUnit` from `packages/physics-engine/src/unitConversion.ts`.
- **Unit Conversion (display/UI):** Use `@eng-suite/engineering-units` for user-selectable display units in forms. See the **UoM System** section below.
- **Immutability:** Use `Immer` for complex state updates to ensure stream properties aren't accidentally mutated across components.

## 3. Python & Excel Integration
- **API Communication:** Use `React Query` (TanStack Query) for fetching data from Python/FastAPI backends.
- **Excel Logic:** For components mimicking Excel behavior, ensure "Auto-calculate on change" is handled via debounced effects to prevent UI lag.

## 4. UI/UX Standards
- **Style:** Use Materail UI for consistent theming and components. Based UI is in `packages/ui-kit/src/theme.ts`
- **Layout:** Use `Grid` for responsive layouts.
- **Inputs:** All numeric inputs must include:
    - Use `apps/psv/docs/UNIT_INPUT_STANDARD.md` for standardizing input fields.
    - Unit suffixes (e.g., "kg/h", "bar").
    - Range validation (Min/Max) based on physical limits (e.g., T > 0 Kelvin, P > 0 Pa).
- **Charts:** Use `Recharts` or `Plotly.js` for P&ID-style graphs and Phase Envelopes.
- **Typography:** Use `Typography` for consistent text styling.
- **Error checking:** Always check for hydration errors and ensure that all components are properly wrapped.

## 5. Development Workflow (Mac mini M4 Pro)
- **Terminal:** Optimize shell tasks for `zsh`.
- **Linting:** Strict ESLint rules for hooks dependencies (`react-hooks/exhaustive-deps`).
- **Testing:** Every engineering hook must have a Vitest unit test verifying calculations against known Excel/NIST benchmarks.

## Overview
This is a monorepo containing a suite of tools for process engineering, built with Next.js, Turborepo, and Material UI.

### Packages
- **`packages/engineering-units`** (`@eng-suite/engineering-units`): UoM constants + store factory.
  - **Key Files**: `src/types.ts` (`UOM_OPTIONS`, `BASE_UNITS`, `UOM_LABEL`, `UomCategory`), `src/store.ts` (`createUomStore`).
- **`packages/ui-kit`**: Shared UI components.
  - **Key Files**: `glassStyles.ts` (Glassmorphism styles).
- **`packages/physics-engine`** (`@eng-suite/physics`): Unit conversion math + shared types.
  - **Key Files**: `src/unitConversion.ts` (`convertUnit`, `normalizeUnit`), `src/types.ts` (`PipeProps`, `NodeProps`).

## Design System
- **Theming**: Light and Dark modes supported. Theme preference is synced from Dashboard to other apps via URL query parameters (`?theme=dark`).
- **Colors**:
  - Primary: Sky Blue (`#0284c7` / `#38bdf8`)
  - Secondary: Amber (`#f59e0b` / `#fbbf24`)
  - Background: Slate (`#f8fafc` / `#0f172a`)

## Development Notes
- **Package Management**: Use `bun` instead of `npm` or `yarn`.
- **State Management**: The Network Editor uses `zustand` for complex state. Avoid prop drilling.
- **Type Safety**: Strict TypeScript is enforced. Be careful with shared types between `network-editor` and `physics-engine`.
- **Styling**: Use MUI `sx` prop with theme-aware values for consistency.
- **Hydraulics**:
  - **Bi-Directional Flow**: Supported via native checks.
  - **Backward Propagation**: Uses `InletState` of the pipe directly. No node swapping or manual drop adjustments are needed as the engine handles the physics of the segment direction.

## UoM System

User-selectable unit-of-measure logic for all frontend apps lives in `packages/engineering-units` (`@eng-suite/engineering-units`).

### How it works

- **Form state** always holds **base units** (`mm`, `kPag`, `C`, `m3/h`, …). This keeps Zod validation and API payloads consistent.
- **`UomInput`** is an RHF-controlled input component with an inline unit selector. It converts base→display on render and display→base on change.
- **`useUomStore`** (per app) persists the user's selected display unit per category to localStorage.
- **`createUomStore(storeName, defaultUnits)`** is a Zustand factory that automatically migrates stale localStorage state when new categories are added.

### Quick reference

```ts
import { UOM_OPTIONS, BASE_UNITS, UOM_LABEL, type UomCategory, createUomStore }
  from '@eng-suite/engineering-units'

// Create a store for a new app:
export const useUomStore = createUomStore('my-app-uom-prefs', BASE_UNITS)
```

### Unit key rules

- Always ASCII: `m3/h`, `Nm3/h`, `C`, `kg/cm2g` — never `m³/h`, `°C`, etc.
- Display labels are mapped in `UOM_LABEL` (e.g., `'C' → '°C'`, `'m3/h' → 'm³/h'`)
- Conversion math uses `convertUnit(value, fromUnit, toUnit)` from `@eng-suite/physics`

### Reference implementation

See `apps/venting-calculation` for the canonical full implementation including `UomInput.tsx`, `src/lib/uom.ts`, and `src/lib/store/uomStore.ts`.

---

## Deployment Options (Vercel + AWS)
- Use lane-based configuration to prevent cross-platform regressions:
  - `DEPLOY_TARGET=vercel` on Vercel
  - `DEPLOY_TARGET=aws` on AWS
  - `DEPLOY_TARGET=local` for local dev
- Keep deployment differences env-driven:
  - `NEXT_PUBLIC_API_URL`: browser API base URL
  - `API_PROXY_TARGET`: PSV server-side `/api/*` rewrite target
  - `DOCS_URL`, `NETWORK_EDITOR_URL`, `PSV_URL`, `DESIGN_AGENTS_URL`: dashboard rewrite targets
- Before merging deployment changes, run:
  - `bun run check:deploy:vercel`
  - `bun run check:deploy:aws`
  - or `bun run check:deploy:matrix`
