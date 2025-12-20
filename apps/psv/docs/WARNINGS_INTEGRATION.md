# Warnings Dashboard - Integration Guide

## Status
- ✅ Infrastructure complete (100%)
- ⏸️ Integration paused (will continue in next session)

## Completed Work

### 1. Type System (`src/data/types.ts`)
```typescript
export type WarningSeverity = 'error' | 'warning' | 'info';
export type WarningSource = 'hydraulic' | 'sizing' | 'scenario' | 'validation';

export interface Warning {
    id: string;
    sizingCaseId: string;
    severity: WarningSeverity;
    source: WarningSource;
    message: string;
    details?: string;
    location?: string;
    value?: number | string;
    threshold?: number | string;
    timestamp: string;
}
```

### 2. Store Methods (`src/store/usePsvStore.ts`)
```typescript
// State
warnings: Map<string, Warning[]>; // Key: sizingCaseId

// Methods
addWarning: (warning: Warning) => void;
clearWarnings: (sizingCaseId: string) => void;
getWarnings: (sizingCaseId: string) => Warning[];
```

### 3. Dashboard Component (`src/components/WarningsDashboard.tsx`)
- Severity-based color coding (error=red, warning=yellow, info=blue)
- Collapsible panel
- Grouped display
- Warning counts with chips
- Click navigation support (via `onWarningClick` prop)
- Empty state with success message

## Integration Steps (Next Session)

### Step 1: Import WarningsDashboard into SizingWorkspace.tsx

Add to imports (around line 56):
```typescript
import { WarningsDashboard } from './WarningsDashboard';
import { Warning, WarningSeverity, WarningSource } from '@/data/types';
import { usePsvStore } from '@/store/usePsvStore';
```

### Step 2: Add Store Methods

Add after line 301 (after `canEdit` declaration):
```typescript
const { addWarning, clearWarnings, getWarnings } = usePsvStore();
```

### Step 3: Collect Warnings During Calculation

In `handleCalculate` function, around line 655-760 where hydraulic warnings are collected:

**Current code** (line 656):
```typescript
const allWarnings: string[] = [];
```

**Replace with:**
```typescript
const allWarnings: string[] = [];
const warnings: Warning[] = [];

// Clear old warnings
clearWarnings(currentCase.id);
```

**Then, when adding warnings** (lines 687-689, 736-738):

**Current:**
```typescript
if (inletResult.warnings.length > 0) {
    allWarnings.push(...inletResult.warnings.map(w => `Inlet: ${w}`));
}
```

**Add after:**
```typescript
// Add to structured warnings
inletResult.warnings.forEach((msg, idx) => {
    addWarning({
        id: `${currentCase.id}-inlet-${idx}-${Date.now()}`,
        sizingCaseId: currentCase.id,
        severity: msg.includes('choked') ? 'error' : 'warning',
        source: 'hydraulic',
        message: msg,
        location: 'Inlet Network',
        timestamp: new Date().toISOString(),
    });
});
```

**Similarly for outlet warnings** (lines 736-738):
```typescript
outletResult.warnings.forEach((msg, idx) => {
    addWarning({
        id: `${currentCase.id}-outlet-${idx}-${Date.now()}`,
        sizingCaseId: currentCase.id,
        severity: msg.includes('choked') || msg.includes('Mach') ? 'error' : 'warning',
        source: 'hydraulic',
        message: msg,
        location: 'Outlet Network',
        timestamp: new Date().toISOString(),
    });
});
```

### Step 4: Add Dashboard to Results Tab

Find the Results TabPanel (search for index={2} or "Results" tab content).

Add WarningsDashboard **at the top** of the results content:
```tsx
<TabPanel value={activeTab} index={2}>
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        {/* Warnings Dashboard */}
        {isCalculated && (
            <WarningsDashboard 
                warnings={getWarnings(currentCase.id)}
                onWarningClick={(warning) => {
                    // Navigate to the issue location
                    if (warning.location?.includes('Inlet')) {
                        setActiveTab(3); // Switch to Inlet tab
                    } else if (warning.location?.includes('Outlet')) {
                        setActiveTab(4); // Switch to Outlet tab
                    }
                }}
            />
        )}
        
        {/* Existing results content continues here... */}
```

### Step 5: Add Badge to Sizing Tab

In `ProtectiveSystemDetail.tsx`, find where tabs are defined (search for `<Tabs` component).

**Current:**
```tsx
<Tab label="Sizing" />
```

**Replace with:**
```tsx
<Tab 
    label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Sizing
            {selectedSizingCase && getWarnings(selectedSizingCase.id).length > 0 && (
                <Chip 
                    label={getWarnings(selectedSizingCase.id).length}
                    size="small"
                    color="error"
                    sx={{ height: 18, fontSize: '0.7rem' }}
                />
            )}
        </Box>
    }
/>
```

Don't forget to import:
```typescript
import { Box, Chip } from '@mui/material';
import { usePsvStore } from '@/store/usePsvStore';

// In component:
const { getWarnings } = usePsvStore();
```

## Testing Checklist

Once integrated:

- [ ] Create scenario with choked flow → Error warning appears
- [ ] Design network with high Mach number → Warning appears
- [ ] Undersized valve → Warning appears
- [ ] Click warning → Navigates to correct location
- [ ] Switch tabs → Warning count badge updates
- [ ] Fix issue → Warning clears
- [ ] Collapse/expand dashboard → Works smoothly
- [ ] Multiple warnings → All displayed
- [ ] No warnings → Success message shown

## Example Warnings to Generate

1. **Choked Flow**: Reduce outlet pipe diameter to < 50mm
2. **High Mach Number**: Use gas at high velocity (> 100 m/s)
3. **Erosional Velocity**: Liquid with high flow rate in small pipe
4. **Undersized Orifice**: Mass flow rate too high for selected orifice

## Code Locations

- **SizingWorkspace.tsx**: Lines 298-900 (setup), 615-900 (calculation)
- **ProtectiveSystemDetail.tsx**: Search for `<Tabs` component
- **WarningsDashboard.tsx**: Complete and ready to use

## Why Pause Integration?

1. **SizingWorkspace.tsx is 2595 lines** - requires careful review
2. **Token limits** - better to integrate fresh in next session
3. **Infrastructure is complete** - no blockers for next steps
4. **Clear documentation** - easy to pick up later

## Estimated Time to Complete

**30 minutes** in next session:
- 10 min: Add imports and store hooks
- 10 min: Modify handleCalculate to add warnings
- 10 min: Add dashboard to UI and badge to tab

---

**Last Updated**: December 17, 2025  
**Next Action**: Follow integration steps above  
**Ready for**: Phase 1 Day 1 completion
