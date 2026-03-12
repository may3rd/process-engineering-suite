# Vessel Print A4 Portrait Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the print export fit within a single A4 portrait page without changing the live schematic SVG renderer.

**Architecture:** Keep the browser print route and exact schematic components, but add print-specific compaction in `PrintReportContent`, global `@page` rules for A4 portrait, and print-only hiding of the app toolbar. Verification stays focused on print content structure plus full app checks.

**Tech Stack:** Next.js App Router, React Hook Form, Tailwind CSS, Vitest, Testing Library.

---

### Task 1: Add a failing portrait print layout test

**Files:**
- Modify: `apps/vessels-calculation/__tests__/printReportContent.test.tsx`

**Step 1: Write the failing test**

Add assertions for:
- a root print sheet test id
- A4 portrait width/spacing classes on the root
- tighter print stack spacing

**Step 2: Run test to verify it fails**

Run: `bun vitest run __tests__/printReportContent.test.tsx`
Expected: FAIL because the compact portrait hooks do not exist yet.

**Step 3: Write minimal implementation**

Add the required test ids and compact print classes in `PrintReportContent`.

**Step 4: Run test to verify it passes**

Run: `bun vitest run __tests__/printReportContent.test.tsx`
Expected: PASS

### Task 2: Add print-only A4 portrait compaction

**Files:**
- Modify: `apps/vessels-calculation/src/app/calculator/print/PrintReportContent.tsx`
- Modify: `apps/vessels-calculation/src/app/globals.css`
- Modify: `apps/vessels-calculation/src/components/TopToolbar.tsx`

**Step 1: Implement compact print layout**

Adjust:
- report width and spacing
- card padding and typography
- schematic print sizing
- print-only page break avoidance hooks

**Step 2: Add global print rules**

Add:
- `@page { size: A4 portrait; margin: ... }`
- print hiding for the app toolbar wrapper
- print cleanup for backgrounds/shadows if needed

**Step 3: Verify focused behavior**

Run: `bun vitest run __tests__/printReportContent.test.tsx __tests__/printReport.test.ts __tests__/components/ActionMenu.test.tsx __tests__/components/ResultsPanel.test.tsx`
Expected: PASS

### Task 3: Verify app integrity

**Files:**
- No additional file changes expected

**Step 1: Run typecheck**

Run: `bun run check-types`
Expected: PASS

**Step 2: Run lint**

Run: `bun run lint`
Expected: PASS

**Step 3: Run build**

Run: `bun run build`
Expected: PASS
