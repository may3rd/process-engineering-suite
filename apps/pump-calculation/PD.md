**Process Engineering Suite**  
**Project: Excel-to-Web Pump Calculation Module Conversion**  
**Deliverable ID:** PTS-ENG-2026-0301-PD-v2  
**Document Title:** PD.md – Product Description & Implementation Guideline  
**Revision:** 1 (company name updated to GCME, backend simplified to TypeScript-only)  
**Date:** 09 March 2026  
**Prepared for:** Vibe / Claude / Cursor / Codex-style coding agents  

---

# PD.md – Pump Calculation Web Module  
**One source of truth – from legacy Excel to modern browser-native calculation engine**

## 1. Project Goal

Convert confidential GCME pump sizing spreadsheet (“Pump Calc Sheet 2.xlsx” – sheet CA-PR-1050.0301) into a clean, single-page React + TypeScript web application.

**Key constraints / decisions (2026 edition):**

- Frontend-only architecture → **no backend server**, no FastAPI, no Python
- All business logic, validation, unit conversion and PDF generation happen in browser (TypeScript)
- Use modern libraries that are small & tree-shake friendly
- PDF output must visually match original Excel layout (including title block, footer, REV.1 stamp)
- Company name is now **GCME** (not PTTME)

## 2. Target Users

Process / Mechanical engineers & inspectors inside GCME Ban Chang office and project sites  
Typical usage: 5–15 min per calculation, frequently during pump datasheet preparation or vendor document review.

## 3. Non-Functional Requirements

| Requirement               | Target value / choice                                 |
|---------------------------|-------------------------------------------------------|
| Technology stack          | React 18+, TypeScript, Vite, Tailwind CSS, Zustand   |
| State management          | Zustand (lightweight, no boilerplate)                 |
| UI framework              | shadcn/ui + Radix UI (or Headless UI + custom style) |
| PDF generation            | pdf-lib.js or @react-pdf/renderer (preferred)        |
| No external API calls     | everything computed in-browser                        |
| File size (bundle)        | < 1.2 MB gzipped (aggressive target)                 |
| First meaningful paint    | < 1.2 s on mid-range mobile                           |
| Offline capable           | Yes (after first load – service worker optional)      |
| Browser support           | Chrome/Edge 110+, Firefox 115+, Safari 16+            |
| Dark mode                 | Yes (matches company laptop default)                  |
| Language                  | English only (labels from Excel preserved)            |

## 4. High-Level Screen Structure (Single Page Application)

1. **Header / Title Block**
   - Company: GC MAINTENANCE & ENGINEERING COMPANY LIMITED
   - Document: CA-PR-1050.0301 – Pump Calculation Sheet
   - REV.1 – VALIDATION REPORT : RPT-PR-1050.0301
   - Project / Client / Page fields (editable)

2. **Wizard-style collapsible sections** (accordion recommended)

   - Fluid Data
   - Suction Conditions
   - Discharge Conditions
   - Pump Type & Subtype
   - NPSH Available (with recip acceleration head logic)
   - Motor Sizing
   - Orifice Plate Estimate
   - Control Valve Recommended ΔP
   - Minimum Flow by Temperature Rise
   - Shut-off Pressure & Power Estimate
   - Results Summary (big cards)

3. **Floating Action Bar** (bottom right on mobile)

   - Calculate / Recalculate
   - Export PDF
   - Reset Form
   - Help / Legend

## 5. Core Data Shape (TypeScript)

```ts
interface PumpCalculation {
  // ── Metadata ───────────────────────────────────────
  project: {
    title: string;
    number: string;
    client: string;
    rev: string;           // "1"
    date: string;
  };

  // ── Fluid ──────────────────────────────────────────
  fluid: {
    name: string;
    flowDesign_m3h: number;
    temperature_C: number;
    sg: number;
    vapourPressure_kPaa: number;
    viscosity_cP: number;
  };

  // ── Suction ────────────────────────────────────────
  suction: {
    sourcePressure_kPaa: number;
    elevationAbovePump_m: number;
    staticHead_kPa: number;         // usually auto
    lineFittingLoss_kPa: number;
    strainerLoss_kPa: number;
    otherLoss_kPa: number;
  };

  // ── Discharge ──────────────────────────────────────
  discharge: {
    destPressure_kPaa: number;
    elevationDiff_m: number;
    staticHead_kPa: number;
    equipmentDeltaP_kPa: number;
    lineFittingLoss_kPa: number;
    flowElementDeltaP_kPa: number;
    controlValveDeltaP_kPa: number | null; // can be recommended
    designMargin_kPa: number;
    isExistingSystem: boolean;
  };

  // ── Pump configuration ─────────────────────────────
  pump: {
    type: 'Centrifugal' | 'PositiveDisplacement';
    pdSubtype?: 'Single-acting Simplex' | 'Double-acting Simplex' | 'Triplex' | ...;
    speed_rpm?: number;               // only for PD
    compressibilityFactor_K?: number; // only for PD
  };

  // ── Motor & Efficiency ─────────────────────────────
  motor: {
    wearMargin_pct: number;           // default 5
    centrifugalEfficiency_pct: number;// user or curve-based
  };

  // ── Orifice ────────────────────────────────────────
  orifice?: {
    pipeID_mm: number;
    betaRatio: number;
  };

  // ── Control Valve recommendation ───────────────────
  controlValve?: {
    flowRatioMaxDesign: number;
    valveType: 'Single Plug' | 'Double Plug' | 'Caged' | 'Butterfly' | 'V-ball';
  };

  // ── Minimum flow by temp rise ──────────────────────
  minFlow: {
    specificHeat_kJkgC: number;
    allowedTempRise_C: number;        // typical 8–15 °C
  };

  // ── Flags / toggles ────────────────────────────────
  flags: {
    calculateAccelerationHead: boolean;
    showOrifice: boolean;
    showControlValve: boolean;
    showMinFlow: boolean;
    showShutoff: boolean;
    useKnownShutoffHead: boolean;
  };

  // ── Computed / output (filled by engine) ───────────
  computed: {
    suctionPressure_kPaa: number;
    dischargePressure_kPaa: number;
    differentialHead_m: number;
    npsha_m: number;
    accelerationHead_m?: number;
    hydraulicPower_kW: number;
    shaftPower_kW: number;
    apiMinMotor_kW: number;
    recommendedStdMotor_kW: number;
    orificeDeltaP_kPa?: number;
    recommendedCvDeltaP_kPa?: number;
    minFlow_m3h?: number;
    shutoffPressure_kPaa?: number;
    shutoffPower_kW?: number;
    errors: string[];               // user-friendly messages
  };
}
```

## 6. Must-have Business Rules (copy-paste into code comments)

- NPSHa = (Psuction – Pv) / (sg × 9.807) – h_accel – minor velocity head
- Acceleration head only shown & subtracted when pump.type = PositiveDisplacement **and** flags.calculateAccelerationHead = true
- Motor power rounding ladder: [0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 150, 185, 200, 220, 250, 280, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000] kW
- Shut-off head estimation logic has three paths (A/B/C) – expose as radio group
- Minimum flow formula (temperature rise protection):

```ts
const minFlow_m3h = (shutoffPower_kW * 0.746 * 2544.43) /
  (fluid.sg * minFlow.specificHeat_kJkgC * 3600 * minFlow.allowedTempRise_C);
```

- Orifice ΔP → simplified ISO 5167 or empirical correlation (implement either Miller, ISO equation, or company-preferred approximation)

## 7. PDF Output Requirements

- A4 portrait, 210 × 297 mm
- Exact column widths & row heights should be visually similar to original Excel
- Use same font family if possible (Calibri / Arial)
- Footer: confidentiality notice + GCME logo placeholder + page number
- Filename suggestion: `CA-PR-1050.0301_PumpCalc_${projectNumber}_${date}.pdf`

## 8. Recommended Folder Structure (Vite project)

```
src/
├── components/
│   ├── ui/                 ← shadcn components
│   ├── sections/
│   │   ├── FluidSection.tsx
│   │   ├── SuctionSection.tsx
│   │   ├── DischargeSection.tsx
│   │   ├── PumpTypeSection.tsx
│   │   ├── NpshaSection.tsx
│   │   ├── MotorSection.tsx
│   │   ├── OrificeSection.tsx
│   │   ├── CvSection.tsx
│   │   ├── MinFlowSection.tsx
│   │   └── ShutoffSection.tsx
│   ├── HeaderTitleBlock.tsx
│   ├── FloatingActions.tsx
│   └── ResultCards.tsx
├── store/
│   └── pumpStore.ts          ← Zustand store + calculation engine
├── lib/
│   ├── calculations.ts       ← pure functions
│   ├── motorTable.ts         ← const array of standard kW
│   ├── pdfGenerator.ts
│   └── utils.ts
├── App.tsx
└── main.tsx
```

## 9. Acceptance Criteria Checklist (for vibe agent / Claude)

- [ ] All input labels match Excel exactly (including units)
- [ ] NPSHa calculation visible & correct (with recip accel head toggle)
- [ ] Motor size jumps to next standard value
- [ ] PDF export visually acceptable (title block, grid, footer)
- [ ] No calculation crashes on empty/missing fields → nice error messages
- [ ] Dark mode works without visual bugs
- [ ] Form remembers values on refresh (localStorage – optional bonus)
- [ ] Mobile layout readable (accordion collapses nicely)

---

**End of Product Description – PD.md**  
Ready to be handed to coding agent / Claude / Cursor.  

Start implementation from the data interface → calculation engine → UI sections in that order.