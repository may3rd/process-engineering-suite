# Vessel Calculator — TODO / Known Issues

## 🐛 Code Issues (from review, 2026-03-05)

### 1. Dead constants
- **`WETTED_AREA_HEIGHT_CAP_MM`** in `src/lib/constants.ts` is defined but never imported or applied.
  If this is an API 521 fire-case wetted area cap, apply it in `calculations/index.ts`; otherwise remove it.
- **`MIN_CONICAL_DEPTH_FRACTION`** in `src/lib/constants.ts` is defined but never used anywhere.
  Remove or enforce it in the Zod schema / calculation guard.

### 2. `surgeTime === inventory` — always identical
In `calculations/index.ts` (lines 160–161), `surgeTime` and `inventory` are always computed as
`deltaVol / flowrate` — they are always the same number. If the intent is to eventually support
separate inlet/outlet flowrates, document it. Otherwise collapse into one field.

### 3. Empty mass approximation is undocumented
Line 135 of `calculations/index.ts`:
```ts
const headVolMetal = headVol2x * 0.1
```
The 10% head-volume metal mass approximation needs a code comment or JSDoc explaining the engineering
basis. Currently looks like a magic number.

### 4. `as any` on form defaultValues
`page.tsx` uses `as any` on `createDefaultValues()` due to `CalculationInput` requiring non-optional
`insideDiameter` and `shellLength`. Consider making those fields optional in the TypeScript type
(enforced only in Zod) to remove the cast.

### 5. `NEXT_PUBLIC_API_URL` guard in `api.ts` is redundant
`typeof process !== 'undefined'` is always true in Next.js; simplify to:
```ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
```

### 6. `CalculationMetadataSection.tsx` is too large (463 lines)
Consider splitting into `MetadataDialog.tsx` and `RevisionDialog.tsx` sub-components for readability.

---

## ✅ Completed
_(move items here when resolved)_
