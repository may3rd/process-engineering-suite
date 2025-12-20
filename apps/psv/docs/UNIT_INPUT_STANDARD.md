# Unit Input Design Standard

**Status**: ✅ OFFICIAL STANDARD  
**Date**: December 17, 2025  
**Applies to**: ALL number+unit inputs across apps/psv

---

## Reference

This pattern is used in:
- `ScenarioEditor.tsx` (lines 277-395) - Original reference
- `SizingWorkspace.tsx` - Production usage
- `UnitSelector.tsx` - Reusable component

---

## The Standard Pattern

### Visual Appearance
```
┌─────────────────────────────────┐
│ Label                           │
│ 2.8              barg ▼         │  ← Single seamless field
│                  ─────           │  ← Unit dropdown underlined
└─────────────────────────────────┘
```

### Code Template

```tsx
import { TextField, MenuItem, InputAdornment } from '@mui/material';

<TextField
    label="Relieving Pressure"
    type="number"
    value={pressureValue}
    onChange={(e) => handleChange(e.target.value)}
    slotProps={{
        input: {
            endAdornment: (
                <InputAdornment position="end">
                    <TextField
                        select
                        variant="standard"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        sx={{ minWidth: 60 }}
                    >
                        {UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                    </TextField>
                </InputAdornment>
            ),
        }
    }}
    fullWidth
/>
```

---

## Key Requirements

### ✅ MUST Use
1. **Outer component**: `TextField` with `type="number"`
2. **Inner component**: `TextField` with `select` and `variant="standard"` (NOT `Select` component)
3. **Wrapper**: `InputAdornment position="end"`
4. **Location**: `slotProps.input.endAdornment` (NOT `InputProps.endAdornment`)

### ❌ DO NOT Use
- Separate `Select` component
- `InputProps.endAdornment` (old API)
- Custom underline styling
- Side-by-side layout with separate components

---

## Reusable Component

**File**: `/apps/psv/src/components/shared/UnitSelector.tsx`

**Usage**:
```tsx
import { UnitSelector } from '@/components/shared';

<UnitSelector
    label="Design Pressure"
    value={pressure}
    unit={pressureUnit}
    availableUnits={['barg', 'psig', 'kPag', 'MPag', 'bara', 'psia']}
    onChange={(val, unit) => {
        setPressure(val);
        setPressureUnit(unit);
    }}
    required
/>
```

**Features**:
- Auto-conversion when unit changes
- Null-safe value handling
- Disabled state support
- Automatic min-width calculation

---

## Why This Pattern?

### Benefits
1. **Consistent UX** - All unit inputs look and behave the same
2. **Clean UI** - Seamless single-field appearance
3. **Native MUI** - Uses standard TextField behaviors
4. **Accessibility** - Proper label associations
5. **Theme-aware** - Underline automatically matches theme

### Alternatives Rejected
- **Side-by-side layout**: Too visually cluttered
- **`Select` component**: Doesn't integrate seamlessly with TextField
- **`InputProps.endAdornment`**: Old API, less flexible
- **Custom styling**: Breaks theme consistency

---

## Migration Checklist

When updating existing code:

- [ ] Replace separate TextField + Select with single TextField
- [ ] Change `InputProps.endAdornment` to `slotProps.input.endAdornment`
- [ ] Replace `Select` with `TextField select variant="standard"`
- [ ] Remove custom underline styling (handled automatically)
- [ ] Add`minWidth` to inner TextField sx
- [ ] Test unit conversion works correctly

---

## Examples

### Pressure Input
```tsx
<UnitSelector
    label="Relieving Pressure"
    value={2.8}
    unit="barg"
    availableUnits={['barg', 'bara', 'psig', 'psia', 'kPag', 'kPaa']}
    onChange={(val, unit) => { /* ... */ }}
/>
```

### Temperature Input
```tsx
<UnitSelector
    label="Relieving Temp"
    value={180}
    unit="C"
    availableUnits={['C', 'F', 'K']}
    onChange={(val, unit) => { /* ... */ }}
/>
```

### Flow Rate Input
```tsx
<UnitSelector
    label="Mass Flow Rate"
    value={50000}
    unit="kg/h"
    availableUnits={['kg/h', 'lb/h', 'kg/s']}
    onChange={(val, unit) => { /* ... */ }}
/>
```

---

## Future Development

**CRITICAL**: ALL new number+unit inputs MUST follow this pattern.

**Before submitting code**:
1. ✅ Check your input matches the template
2. ✅ Verify it uses `UnitSelector` or the exact pattern
3. ✅ Test unit conversion works
4. ✅ Verify visual appearance matches reference

**If you need a new type of unit**:
1. Add it to the appropriate constant (e.g., `PRESSURE_UNITS`)
2. Ensure conversion logic exists in `@eng-suite/physics`
3. Document the new unit in this file

---

## Contact

Questions about this standard? Refer to:
- `ScenarioEditor.tsx` - Original implementation
- `UnitSelector.tsx` - Component source
- `unit_input_standardization.md` - Detailed implementation plan
