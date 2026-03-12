# Vessel Print Export Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Export the exact live web schematic SVG by printing a browser-rendered HTML report instead of re-rendering the schematic in `@react-pdf/renderer`.

**Architecture:** Add a browser print route that renders a dedicated HTML report using the same live React components already used in the calculator UI. Persist the current calculation payload to client storage, open the print route in a new tab, hydrate the report from storage, and trigger browser print from that page.

**Tech Stack:** TypeScript, React, Next.js App Router, React Hook Form, Vitest, browser `window.print`

---

### Task 1: Add the failing export-path regression test

**Files:**
- Create: `apps/vessels-calculation/__tests__/components/ActionMenu.test.tsx`
- Create: `apps/vessels-calculation/__tests__/printReport.test.ts`

**Step 1: Write the failing test**

Assert that clicking `Export PDF…`:

- writes the current calculation payload to storage
- opens `/calculator/print?...`
- does not depend on `@react-pdf/renderer`

**Step 2: Run test to verify it fails**

Run: `bun vitest run __tests__/components/ActionMenu.test.tsx __tests__/printReport.test.ts`

Expected: fail because the print export helpers and route do not exist yet.

### Task 2: Build print payload helpers

**Files:**
- Create: `apps/vessels-calculation/src/lib/printReport.ts`

**Step 1: Write minimal implementation**

Add:

- payload typing
- storage key creation
- storage read/write helpers
- print route href creation

**Step 2: Run targeted test**

Run: `bun vitest run __tests__/printReport.test.ts`

Expected: pass.

### Task 3: Switch export action to the print route

**Files:**
- Modify: `apps/vessels-calculation/src/app/calculator/components/ActionMenu.tsx`

**Step 1: Replace `react-pdf` export**

Persist the current payload, open the print route in a new tab, and let that page print.

**Step 2: Keep loading state and filename semantics**

Keep the current export button UX coherent while removing the direct PDF blob generation path.

### Task 4: Add the printable report route

**Files:**
- Create: `apps/vessels-calculation/src/app/calculator/print/page.tsx`
- Create: `apps/vessels-calculation/src/app/calculator/print/PrintReportView.tsx`
- Modify: `apps/vessels-calculation/src/app/calculator/components/ResultsPanel.tsx`
- Modify: `apps/vessels-calculation/src/app/calculator/components/VesselSchematic.tsx`
- Modify: `apps/vessels-calculation/src/app/calculator/components/TankSchematic.tsx`

**Step 1: Render the same live schematic component**

Allow the print route to reuse the live schematic component without the interactive “View larger” action.

**Step 2: Trigger print from the report page**

Hydrate payload from storage, render the report, then call `window.print()`.

### Task 5: Verify behavior

**Files:**
- Modify if needed after verification

**Step 1: Run targeted tests**

Run: `bun vitest run __tests__/components/ActionMenu.test.tsx __tests__/printReport.test.ts __tests__/components/ResultsPanel.test.tsx`

Expected: pass.

**Step 2: Run app typecheck**

Run: `bun run check-types`

Expected: pass.

**Step 3: Render a sample PDF**

Open the print route with a sample payload and confirm the schematic is the same live DOM/SVG as the calculator view.

**Step 4: Commit**

Create a focused commit after verification.
