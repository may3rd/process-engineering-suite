# Python API Integration for PSV Hydraulic Calculations

## Objective
Migrate inlet/outlet pipeline pressure drop calculations from local TypeScript (`hydraulicValidation.ts`) to Python API backend, ensuring consistency with network-editor and leveraging more accurate Python physics engine.

## Current State
- **Local TypeScript**: `apps/psv/src/lib/hydraulicValidation.ts` calculates pressure drops
- **Network-Editor**: Uses `apps/network-editor/src/lib/apiClient.ts` for Python API
- **API Backend**: FastAPI at `http://localhost:8000` (same as network-editor)

> **NOTE**: Python API is the **default** calculation method. Internal TypeScript calculations (`hydraulicValidation.ts`) serve as automatic fallback when API is unavailable. A visual health indicator (like network-editor) shows which mode is active.

## Proposed Changes

### Phase 1: Create PSV API Client Module

**New File**: `apps/psv/src/lib/apiClient.ts`

```typescript
/**
 * API client for PSV hydraulic calculations via Python backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface NetworkPressureDropRequest {
    network: {
        nodes: NodeProps[];
        pipes: PipeProps[];
    };
    fluid: FluidProperties;
}

export interface NetworkPressureDropResult {
    success: boolean;
    totalPressureDrop: number;  // kPa
    pipeResults: Array<{
        pipeId: string;
        pressureDrop: number;
        reynoldsNumber?: number;
        frictionFactor?: number;
    }>;
    error?: string;
}

export interface InletValidationRequest {
    inletNetwork: { nodes: NodeProps[]; pipes: PipeProps[] };
    psvSetPressure: number;  // bar
    fluid: FluidProperties;
}

export interface InletValidationResult {
    success: boolean;
    inletPressureDrop: number;  // kPa
    inletPressureDropPercent: number;
    isValid: boolean;
    message: string;
    severity: 'success' | 'warning' | 'error';
    error?: string;
}

/**
 * Calculate total pressure drop for a pipeline network
 */
export async function calculateNetworkPressureDropAPI(
    request: NetworkPressureDropRequest
): Promise<NetworkPressureDropResult> {
    try {
        const response = await fetch(`${API_BASE_URL}/hydraulics/network/pressure-drop`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        return {
            success: false,
            totalPressureDrop: 0,
            pipeResults: [],
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Validate inlet pressure drop against API 520 guideline
 */
export async function validateInletPressureDropAPI(
    request: InletValidationRequest
): Promise<InletValidationResult> {
    try {
        const response = await fetch(`${API_BASE_URL}/hydraulics/validate-inlet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        return {
            success: false,
            inletPressureDrop: 0,
            inletPressureDropPercent: 0,
            isValid: false,
            message: "API unavailable",
            severity: 'error',
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Check if API is healthy
 */
export async function checkAPIHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        return data.status === "healthy";
    } catch {
        return false;
    }
}
```

### Phase 2: Backend API Endpoints (Python FastAPI)

**Files to Create/Modify** (in Python backend):

#### `/hydraulics/network/pressure-drop` (POST)
```python
@app.post("/hydraulics/network/pressure-drop")
async def calculate_network_pressure_drop(request: NetworkPressureDropRequest):
    """
    Calculate total pressure drop through a pipeline network.
    Sums individual pipe pressure drops accounting for flow direction.
    """
    total_dp = 0.0
    pipe_results = []
    
    for pipe in request.network.pipes:
        # Use existing pipe calculation logic
        result = calculate_pipe_section(pipe, request.fluid)
        
        pipe_results.append({
            "pipeId": pipe.id,
            "pressureDrop": result.totalSegmentPressureDrop,
            "reynoldsNumber": result.reynoldsNumber,
            "frictionFactor": result.frictionalFactor
        })
        
        # Accumulate pressure drop (respect direction)
        total_dp += result.totalSegmentPressureDrop
    
    return {
        "success": True,
        "totalPressureDrop": total_dp,
        "pipeResults": pipe_results
    }
```

#### `/hydraulics/validate-inlet` (POST)
```python
@app.post("/hydraulics/validate-inlet")
async def validate_inlet_pressure_drop(request: InletValidationRequest):
    """
    Validate inlet pressure drop against API 520 3% guideline
    """
    # Calculate inlet network pressure drop
    network_result = calculate_network_pressure_drop(
        request.inletNetwork, 
        request.fluid
    )
    
    inlet_dp = network_result["totalPressureDrop"]  # kPa
    set_pressure_kPa = request.psvSetPressure * 100  # bar to kPa
    
    percent = (inlet_dp / set_pressure_kPa) * 100
    
    # API 520 guideline: < 3%
    if percent < 3.0:
        severity = "success"
        message = f"Inlet pressure drop is {percent:.1f}% of set pressure. Complies with API 520 guideline (< 3%)."
        is_valid = True
    elif percent < 5.0:
        severity = "warning"
        message = f"Inlet pressure drop is {percent:.1f}% of set pressure. Exceeds API 520 guideline (< 3%) but may be acceptable."
        is_valid = False
    else:
        severity = "error"
        message = f"Inlet pressure drop is {percent:.1f}% of set pressure. Significantly exceeds API 520 guideline. Piping redesign required."
        is_valid = False
    
    return {
        "success": True,
        "inletPressureDrop": inlet_dp,
        "inletPressureDropPercent": percent,
        "isValid": is_valid,
        "message": message,
        "severity": severity
    }
```

### Phase 3: Update SizingWorkspace.tsx

**File**: `apps/psv/src/components/SizingWorkspace.tsx`

#### Add API Client Import
```typescript
import {
    calculateNetworkPressureDropAPI,
    validateInletPressureDropAPI,
    checkAPIHealth
} from "@/lib/apiClient";
```

#### Add Loading State
```typescript
const [isCalculatingHydraulics, setIsCalculatingHydraulics] = useState(false);
const [apiHealthy, setApiHealthy] = useState(false);

// Check API health on mount
useEffect(() => {
    checkAPIHealth().then(setApiHealthy);
}, []);
```

#### Add API Health Indicator (Like Network-Editor)

Add visual indicator showing API connection status:

```typescript
// In toolbar or header area
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Tooltip title={apiHealthy ? 'Python API Connected' : 'Using Local Calculations'}>
        <Box 
            sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: apiHealthy ? 'success.main' : 'warning.main',
                color: 'white',
                fontSize: '0.75rem'
            }}
        >
            {apiHealthy ? <CloudDone fontSize="small" /> : <CloudOff fontSize="small" />}
            {apiHealthly ? 'API' : 'Local'}
        </Box>
    </Tooltip>
</Box>
```

#### Update handleCalculate Function

**Strategy**: Python API is the **default**, with automatic fallback to internal calculations when API is unavailable.

```typescript
const handleCalculate = async () => {
    setIsCalculating(true);
    setIsCalculatingHydraulics(true);
    
    try {
        // Build fluid properties
        const fluid: FluidProperties = {
            phase: currentCase.inputs.fluidPhase,
            density: currentCase.inputs.density,
            viscosity: currentCase.inputs.viscosity,
            molecularWeight: currentCase.inputs.molecularWeight,
            zFactor: currentCase.inputs.zFactor,
            specificHeatRatio: currentCase.inputs.specificHeatRatio,
        };
        
        // 1. Calculate inlet pressure drop - API FIRST, fallback to internal
        let inletValidation;
        if (apiHealthy && localInletNetwork?.pipes?.length > 0) {
            console.log('🌐 Using Python API for inlet validation (default)');
            inletValidation = await validateInletPressureDropAPI({
                inletNetwork: localInletNetwork,
                psvSetPressure: psvSetPressure,
                fluid: fluid
            });
            
            // If API fails, fallback to internal
            if (!inletValidation.success) {
                console.warn('⚠️ API failed, falling back to internal calculation');
                const localResult = calculateNetworkPressureDrop(localInletNetwork, fluid);
                inletValidation = validateInletPressureDrop(localResult, psvSetPressure);
            }
        } else {
            console.log('📊 API unavailable, using internal TypeScript calculation');
            // Internal calculation fallback
            const localResult = calculateNetworkPressureDrop(localInletNetwork, fluid);
            inletValidation = validateInletPressureDrop(
                localResult,
                psvSetPressure
            );
        }
        
        // 2. Calculate built-up backpressure (if mode = calculated)
        let builtUpBackpressure = currentCase.inputs.backpressure;
        if (currentCase.inputs.backpressureSource === 'calculated' 
            && localOutletNetwork?.pipes?.length > 0) {
            
            if (apiHealthy) {
                const outletResult = await calculateNetworkPressureDropAPI({
                    network: localOutletNetwork,
                    fluid: fluid
                });
                
                if (outletResult.success) {
                    builtUpBackpressure = outletResult.totalPressureDrop / 100; // kPa to bar
                }
            } else {
                // Local fallback
                builtUpBackpressure = calculateBuiltUpBackpressure(
                    localOutletNetwork,
                    fluid
                );
            }
        }
        
        setIsCalculatingHydraulics(false);
        
        // 3. Update inputs with hydraulic results
        const updatedInputs = {
            ...currentCase.inputs,
            inletPressureDrop: inletValidation.inletPressureDrop,
            calculatedBackpressure: currentCase.inputs.backpressureSource === 'calculated' 
                ? builtUpBackpressure 
                : undefined,
            backpressure: currentCase.inputs.backpressureSource === 'calculated'
                ? builtUpBackpressure
                : currentCase.inputs.backpressure
        };
        
        // 4. Run PSV sizing calculations...
        // (existing calculation code)
        
        // 5. Update outputs with validation results
        const updatedOutputs = {
            ...sizingOutputs,
            inletPressureDropPercent: inletValidation.inletPressureDropPercent,
            inletValidation: {
                isValid: inletValidation.isValid,
                message: inletValidation.message,
                severity: inletValidation.severity
            }
        };
        
        // Update case...
    } catch (error) {
        console.error('Hydraulic calculation error:', error);
    } finally {
        setIsCalculating(false);
        setIsCalculatingHydraulics(false);
    }
};
```

#### Add Loading UI
```tsx
{/* Show loading indicator during hydraulic calculations */}
{isCalculatingHydraulics && (
    <Alert severity="info" sx={{ mb: 2 }}>
        <CircularProgress size={16} sx={{ mr: 1 }} />
        Calculating hydraulic validation via Python API...
    </Alert>
)}
```

## Migration Strategy

### Option A: Direct Migration (Recommended)
1. ✅ Create `apiClient.ts` with API functions
2. ✅ Update backend with new endpoints
3. ✅ Modify `handleCalculate` to use API
4. ✅ Keep `hydraulicValidation.ts` as fallback
5. ✅ Test with API available & unavailable

### Option B: Gradual Migration
1. ✅ Add API functions alongside local functions
2. ✅ Add feature flag: `useAPIHydraulics`
3. ✅ Toggle between API/local in dev
4. ✅ Full cutover after validation

## Error Handling

```typescript
// Graceful degradation strategy
try {
    // Try API first
    const result = await validateInletPressureDropAPI(request);
    if (result.success) {
        return result;
    }
} catch (error) {
    console.warn('API failed, using local calculation:', error);
}

// Fallback to local TypeScript
return validateInletPressureDrop(localInletNetwork, psvSetPressure, fluid);
```

## Testing Checklist

- [ ] API endpoints return correct results
- [ ] Frontend gracefully falls back to local when API down
- [ ] Loading states display correctly
- [ ] Results match between API and local calculations
- [ ] Network with 0 pipes handled correctly
- [ ] Large networks (10+ pipes) calculate quickly
- [ ] Error messages are user-friendly

## Benefits

1. **Consistency**: Same calculation engine as network-editor
2. **Accuracy**: Python's robust physics calculations
3. **Maintainability**: Single source of truth for hydraulics
4. **Performance**: Offload heavy calculations to backend
5. **Future-proof**: Easy to add more complex calculations

## Timeline

- **Phase 1** (API Client): 30 mins
- **Phase 2** (Backend): 1-2 hours
- **Phase 3** (Frontend): 1 hour
- **Testing**: 30 mins
- **Total**: ~3-4 hours
