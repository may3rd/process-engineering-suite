# Pump Input Sections Collapsible Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-section collapse controls to pump calculator input sections and default those sections to collapsed.

**Architecture:** Extend the shared `SectionCard` wrapper with optional collapsible behavior using the existing Radix collapsible primitive. Opt only the calculator input sections into the new behavior so results and summary cards keep their current presentation.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Radix UI, Testing Library, Vitest

---

### Task 1: Cover collapsible card behavior

**Files:**
- Create: `apps/pump-calculation/__tests__/SectionCard.test.tsx`
- Modify: `apps/pump-calculation/src/app/calculator/components/SectionCard.tsx`

**Step 1: Write the failing test**

Add a test that renders a collapsible `SectionCard` with `defaultOpen={false}`, verifies the body starts hidden, then clicks the toggle and verifies the body appears.

**Step 2: Run test to verify it fails**

Run: `bun run test:run -- SectionCard`
Expected: FAIL because collapsible behavior and toggle are not implemented.

**Step 3: Write minimal implementation**

Add optional collapse props and wire the shared collapsible primitive into `SectionCard`.

**Step 4: Run test to verify it passes**

Run: `bun run test:run -- SectionCard`
Expected: PASS

### Task 2: Opt input sections into collapsed-by-default

**Files:**
- Modify: `apps/pump-calculation/src/app/calculator/sections/FluidSection.tsx`
- Modify: `apps/pump-calculation/src/app/calculator/sections/PumpDetailsSection.tsx`
- Modify: `apps/pump-calculation/src/app/calculator/sections/SuctionSection.tsx`
- Modify: `apps/pump-calculation/src/app/calculator/sections/DischargeSection.tsx`
- Modify: `apps/pump-calculation/src/app/calculator/sections/MotorSection.tsx`
- Modify: `apps/pump-calculation/src/app/calculator/sections/NpshaSection.tsx`
- Modify: `apps/pump-calculation/src/app/calculator/sections/OrificeSection.tsx`
- Modify: `apps/pump-calculation/src/app/calculator/sections/ControlValveSection.tsx`
- Modify: `apps/pump-calculation/src/app/calculator/sections/MinFlowSection.tsx`
- Modify: `apps/pump-calculation/src/app/calculator/sections/ShutoffSection.tsx`

**Step 1: Write the failing test**

Extend the `SectionCard` test or add a second assertion path to confirm a section configured with `defaultOpen={false}` stays collapsed until toggled.

**Step 2: Run test to verify it fails**

Run: `bun run test:run -- SectionCard`
Expected: FAIL until input section call sites use the new props.

**Step 3: Write minimal implementation**

Pass `collapsible` and `defaultOpen={false}` to all input section `SectionCard` usages.

**Step 4: Run test to verify it passes**

Run: `bun run test:run -- SectionCard`
Expected: PASS

### Task 3: Verify the app-level behavior

**Files:**
- Verify only

**Step 1: Run focused tests**

Run: `bun run test:run -- SectionCard`
Expected: PASS

**Step 2: Re-run schematic regression tests**

Run: `bun run test:run -- PumpSystemSchematic`
Expected: PASS

**Step 3: Run lint**

Run: `bun run lint`
Expected: PASS
