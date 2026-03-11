# Pump Schematic Monochrome Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redraw the live pump schematic as a simple monochrome engineering figure suitable for a professional calculation report.

**Architecture:** Keep the existing live SVG component and data bindings, but replace the current visual composition with a fixed report-style drawing layout. Use a single formal drawing frame, elevated vessels, compact callouts, and one bottom engineering table for values.

**Tech Stack:** Next.js App Router, React 19, TypeScript, SVG, Vitest, Testing Library

---

### Task 1: Update schematic tests for the new drawing structure

**Files:**
- Modify: `apps/pump-calculation/__tests__/PumpSystemSchematic.test.tsx`
- Modify: `apps/pump-calculation/src/app/calculator/components/PumpSystemSchematic.tsx`

**Step 1: Write the failing test**

Add assertions for the new report-style structure:

- bottom table labels such as `Suction`, `Operating`, `Discharge`
- the footer/title-block labels
- vessel-above-pump geometry remaining stable

**Step 2: Run test to verify it fails**

Run: `bun run test:run -- PumpSystemSchematic`
Expected: FAIL because the current drawing still uses the previous structure.

**Step 3: Write minimal implementation**

Redraw the SVG structure so the new labels and table layout exist.

**Step 4: Run test to verify it passes**

Run: `bun run test:run -- PumpSystemSchematic`
Expected: PASS

### Task 2: Replace the schematic composition

**Files:**
- Modify: `apps/pump-calculation/src/app/calculator/components/PumpSystemSchematic.tsx`

**Step 1: Implement the new figure layout**

- create one clean outer drawing frame
- place source and destination vessels above the pump
- simplify annotation treatment
- replace floating summary cards with one bottom table

**Step 2: Verify visually through structure-oriented tests**

Run: `bun run test:run -- PumpSystemSchematic`
Expected: PASS

### Task 3: Verify integrity

**Files:**
- Verify only

**Step 1: Run focused schematic tests**

Run: `bun run test:run -- PumpSystemSchematic`
Expected: PASS

**Step 2: Run lint**

Run: `bun run lint`
Expected: PASS
