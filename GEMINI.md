# Process Engineering Suite: React Coding Rules

## 1. Architecture & Performance
- **Framework:** Prefer Vite + TypeScript for fast HMR on M4 Pro.
- **Component Design:** Use the "Container/Presenter" pattern. Keep calculation logic in custom hooks (`useFlashCalculation.ts`) and UI in pure components.
- **Memoization:** ALWAYS wrap complex engineering formulas in `useMemo`. 
- **Large Data Sets:** When displaying process data or stream tables, use `@tanstack/react-table` with virtualization (`@tanstack/react-virtual`) to ensure 60fps scrolling.

## 2. Engineering Logic & Units
- **Physical Units:** store all values in SI units (e.g., `kg`, `m`, `K`) with metadata for display units.
- **Unit Conversion:** Centralize all conversions in a `packages/physics-engine/src/unitConversion.ts` directory.
- **Immutability:** Use `Immer` for complex state updates to ensure stream properties aren't accidentally mutated across components.

## 3. Python & Excel Integration
- **API Communication:** Use `React Query` (TanStack Query) for fetching data from Python/FastAPI backends.
- **Excel Logic:** For components mimicking Excel behavior, ensure "Auto-calculate on change" is handled via debounced effects to prevent UI lag.

## 4. UI/UX Standards
- **Style:** Use Materail UI for consistent theming and components. Based UI is in `packages/ui-kit/src/theme.ts`
- **Layout:** Use `Grid` for responsive layouts.
- **Inputs:** All numeric inputs must include:
    - Use `apps/psv/UNIT_INPUT_STANDARD.md` for standardizing input fields.
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
- **`packages/ui-kit`**: Shared UI components.
  - **Key Files**: `glassStyles.ts` (Glassmorphism styles).
- **`packages/physics-engine`**: Calculation logic.
  - **Key Files**: `src/types.ts` (Shared types like `PipeProps`, `NodeProps`).

## Design System
- **Theming**: Light and Dark modes supported. Theme preference is synced from Dashboard to other apps via URL query parameters (`?theme=dark`).
- **Colors**:
  - Primary: Sky Blue (`#0284c7` / `#38bdf8`)
  - Secondary: Amber (`#f59e0b` / `#fbbf24`)
  - Background: Slate (`#f8fafc` / `#0f172a`)

## Development Notes
- **State Management**: The Network Editor uses `zustand` for complex state. Avoid prop drilling.
- **Type Safety**: Strict TypeScript is enforced. Be careful with shared types between `network-editor` and `physics-engine`.
- **Styling**: Use MUI `sx` prop with theme-aware values for consistency.
- **Hydraulics**:
  - **Bi-Directional Flow**: Supported via native checks.
  - **Backward Propagation**: Uses `InletState` of the pipe directly. No node swapping or manual drop adjustments are needed as the engine handles the physics of the segment direction.
