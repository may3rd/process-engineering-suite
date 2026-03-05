# Engineering Calculator Template
> A skeleton for building new calculation apps in the Process Engineering Suite.

This template follows the architectural patterns defined in `PSE Web DNA` (`@pse-web-dna.md`).

## 1. Quick Start

1.  **Copy this folder** to `apps/{new-app-name}`.
2.  **Update `package.json`**: Change `"name": "calculator-template"` and `"dev": "next dev -p XXXX"`.
3.  **Update UoM store**: Change the `persist` key in `src/lib/store/uomStore.ts` to `"{new-app-name}-uom-prefs"`.
4.  **Define Types**: Update `src/types/index.ts` with your specific `CalculationInput` and `CalculationResult`.
5.  **Build Schema**: Update `src/lib/validation/inputSchema.ts` to match your types.
6.  **Implement Logic**: Put your engineering formulas in a new file in `src/lib/calculations/` and wire them into `src/lib/hooks/useCalculation.ts`.

## 2. Core Patterns

-   **Unit Safety**: All form fields in `CalculationInput` are stored in **base units** (e.g., kPag, °C, mm).
-   **UoM Display**: `UomInput` handles the conversion from base units to display units for the user.
-   **Sticky Panels**: Left panel for inputs, Right panel for results.
-   **Reactive Results**: Calculations re-run automatically via the `useCalculation` hook when inputs change.
-   **Consistent UI**: Uses `SectionCard` and `FieldRow` for all form elements.

## 3. Tech Stack

-   **Framework**: Next.js 15
-   **Styling**: Tailwind CSS v4
-   **Components**: Radix UI + shadcn/ui patterns
-   **Forms**: React Hook Form + Zod
-   **State**: Zustand
-   **Physics**: `@eng-suite/physics` for unit conversion
