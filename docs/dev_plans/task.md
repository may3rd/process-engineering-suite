# PSV Hydraulic Calculations Implementation

## Objective
Implement inlet and outlet hydraulic calculations for PSV sizing with Python API integration and local fallback.

## Tasks

### [/] Phase 1: Data Model & UI Setup
- [x] Add `destinationPressure` field to SizingInputs for outlet calculations
- [x] Add `inletPressureDropPercent` to SizingOutputs
- [x] Add `inletValidation` object to SizingOutputs  
- [ ] Add UI input for destination pressure in Backpressure card
- [ ] Add "Calculate from Network" button for backpressure
- [ ] Add inlet/outlet network state management

### [x] Phase 2: API Client (Frontend)
- [x] Create `apps/psv/src/lib/apiClient.ts`
  - [x] `calculateNetworkPressureDropAPI()` function
  - [x] `validateInletPressureDropAPI()` function
  - [x] `checkAPIHealth()` function
- [x] Create `apps/psv/src/lib/hydraulicValidation.ts` (local fallback)
- [x] Add API health state to SizingWorkspace
- [ ] Add API health indicator icon to toolbar

### [x] Phase 3: Inlet Validation (3% Check)
- [x] Integrate API call in `handleCalculate`
- [x] Fallback to local calculation if API unavailable
- [x] Display validation result (success/warning/error)
- [x] Show inlet pressure drop as % of set pressure
- [x] Add validation message to outputs

### [x] Phase 4: Outlet Backpressure Calculation
- [x] Add destination pressure input field
- [x] Implement backward calculation logic
- [x] Calculate built-up backpressure from outlet network
- [x] Update backpressure input with calculated value
- [x] Show calculation source (manual vs calculated)

### [x] Phase 5: Python API Backend (Phase 3)
- [x] Create `/hydraulics/network/pressure-drop` endpoint
- [x] Create `/hydraulics/validate-inlet` endpoint
- [ ] Test endpoints with Postman/curl
- [ ] Deploy to development environment

### [ ] Phase 6: Testing & Validation
- [ ] Test inlet validation with various networks
- [ ] Test outlet calculation with destination pressure
- [ ] Test API fallback when backend unavailable
- [ ] Verify 3% guideline alerts work correctly
- [ ] Test with existing mock data

## Notes
- Python API is default, local TypeScript is fallback
- API health indicator shows which mode is active
- All unit conversions must respect base units (barg, °C, kg/h)
