# Pump Schematic Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the on-screen SVG schematic so it is clearer, more consistent, and easier to extend without changing calculation behavior.

**Architecture:** Keep the schematic as a client-side React SVG inside the results panel, but refactor layout derivation and annotation rendering into smaller pure helpers. The work stays inside the pump calculation app and does not change the calculation engine or form schema.

**Tech Stack:** Next.js App Router, React 19, TypeScript, react-hook-form, Tailwind, Vitest

---

### Task 1: Baseline schematic coverage

**Files:**
- Modify: `apps/pump-calculation/src/app/calculator/components/PumpSystemSchematic.tsx`
- Create: `apps/pump-calculation/__tests__/PumpSystemSchematic.test.tsx`
- Test: `apps/pump-calculation/__tests__/PumpSystemSchematic.test.tsx`

**Step 1: Write the failing test**

Add a rendering test that mounts the schematic inside `FormProvider`, asserts the title renders, and checks that key labels such as flow, source pressure, and destination pressure are present for a representative input state.

**Step 2: Run test to verify it fails**

Run: `bun run test:run -- PumpSystemSchematic`
Expected: fail because the new test file does not exist yet or assertions do not match the current structure.

**Step 3: Write minimal implementation**

Create the test harness and make the component expose stable visible labels that the test can assert without depending on raw SVG geometry.

**Step 4: Run test to verify it passes**

Run: `bun run test:run -- PumpSystemSchematic`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/pump-calculation/__tests__/PumpSystemSchematic.test.tsx apps/pump-calculation/src/app/calculator/components/PumpSystemSchematic.tsx
git commit -m "test(pump-calculation): cover pump system schematic"
```

### Task 2: Refactor schematic layout model

**Files:**
- Modify: `apps/pump-calculation/src/app/calculator/components/PumpSystemSchematic.tsx`
- Test: `apps/pump-calculation/__tests__/PumpSystemSchematic.test.tsx`

**Step 1: Write the failing test**

Add assertions for scenarios that previously produced fragile layout behavior, such as bottom-connected suction equipment and a header destination.

**Step 2: Run test to verify it fails**

Run: `bun run test:run -- PumpSystemSchematic`
Expected: FAIL due to missing or unstable labels or structure.

**Step 3: Write minimal implementation**

Introduce pure derived-layout helpers for equipment centers, nozzle points, pipe routing, and annotation placement. Keep output behavior equivalent where possible, but reduce overlap and centralize geometry rules.

**Step 4: Run test to verify it passes**

Run: `bun run test:run -- PumpSystemSchematic`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/pump-calculation/src/app/calculator/components/PumpSystemSchematic.tsx apps/pump-calculation/__tests__/PumpSystemSchematic.test.tsx
git commit -m "refactor(pump-calculation): structure schematic layout helpers"
```

### Task 3: Improve visual hierarchy and readability

**Files:**
- Modify: `apps/pump-calculation/src/app/calculator/components/PumpSystemSchematic.tsx`
- Modify: `apps/pump-calculation/src/app/calculator/components/ResultsPanel.tsx`
- Test: `apps/pump-calculation/__tests__/PumpSystemSchematic.test.tsx`

**Step 1: Write the failing test**

Add assertions for the presence of the new annotation groups or callout labels that represent the upgraded hierarchy.

**Step 2: Run test to verify it fails**

Run: `bun run test:run -- PumpSystemSchematic`
Expected: FAIL because the upgraded structure is not rendered yet.

**Step 3: Write minimal implementation**

Upgrade the SVG to use clearer annotation boxes, stronger line hierarchy, more compact legend content, and stable empty-state rendering. Adjust `ResultsPanel.tsx` only if the surrounding layout needs spacing or card tweaks.

**Step 4: Run test to verify it passes**

Run: `bun run test:run -- PumpSystemSchematic`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/pump-calculation/src/app/calculator/components/PumpSystemSchematic.tsx apps/pump-calculation/src/app/calculator/components/ResultsPanel.tsx apps/pump-calculation/__tests__/PumpSystemSchematic.test.tsx
git commit -m "feat(pump-calculation): improve live system schematic"
```

### Task 4: Verify app integrity

**Files:**
- Verify only

**Step 1: Run schematic tests**

Run: `bun run test:run -- PumpSystemSchematic`
Expected: PASS

**Step 2: Run lint**

Run: `bun run lint`
Expected: PASS

**Step 3: Run type check**

Run: `bun run check-types`
Expected: PASS

**Step 4: Commit**

```bash
git add docs/plans/2026-03-11-pump-schematic-design.md docs/plans/2026-03-11-pump-schematic-implementation.md
git commit -m "docs(pump-calculation): record schematic design and plan"
```
