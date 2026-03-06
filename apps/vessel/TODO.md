# Vessel Calculator — TODO / Known Issues

## 🐛 Code Issues (from review, 2026-03-05)

### 1. Empty mass approximation is undocumented
Line 135 of `calculations/index.ts`:
```ts
const headVolMetal = headVol2x * 0.1
```
The 10% head-volume metal mass approximation needs a code comment or JSDoc explaining the engineering
basis. Currently looks like a magic number.

### 2. `as any` on form defaultValues
`page.tsx` uses `as any` on `createDefaultValues()` due to `CalculationInput` requiring non-optional
`insideDiameter` and `shellLength`. Consider making those fields optional in the TypeScript type
(enforced only in Zod) to remove the cast.

### 3. `NEXT_PUBLIC_API_URL` guard in `api.ts` is redundant
`typeof process !== 'undefined'` is always true in Next.js; simplify to:
```ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
```

### 4. `CalculationMetadataSection.tsx` is too large (463 lines)
Consider splitting into `MetadataDialog.tsx` and `RevisionDialog.tsx` sub-components for readability.

---

## ✅ Completed
- Applied `WETTED_AREA_HEIGHT_CAP_MM` in wetted-area calculations.
- Enforced `MIN_CONICAL_DEPTH_FRACTION` in Zod schema for conical heads.
- Separated `surgeTime` and `inventory` semantics:
  - `surgeTime` is computed from `HLL-LLL` delta volume.
  - `inventory` is computed from current `LL` volume, or effective volume when `LL` is not set.
- Fixed flat-roof tank wetted-area edge case at shell-full level (roof area now included).
- Added targeted regressions for all items above.
