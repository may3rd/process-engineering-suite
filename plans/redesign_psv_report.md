# PSV Report Redesign Plan

## Problem Analysis

### Current Issues

1. **Data Acquisition Issues:**
    - `transformNetworkForReport()` only captures basic pipe data (diameter, length, pressure_drop, mach_number)
    - Missing critical data:
        - Inlet/outlet pressures (P1, P2) from `resultSummary.inletState.pressure` and `resultSummary.outletState.pressure`
        - Fluid information from `pipe.fluid.name` or `pipe.resultSummary.inletState.phase`
        - Fittings information from `pipe.fittings`
        - Section type from `pipe.pipeSectionType`
        - Proper unit conversions for display
    - No equipment data being sent to the report
    - No notes/attachments data
    - No revision history data
    - No unit system information for proper formatting

2. **Report Format Issues:**
    - Template is very basic and doesn't match the comprehensive SummaryTab UI
    - Missing sections:
        - Document metadata header (client, facility, area, project, document no., prepared by, revision date, workflow status)
        - Valve design data section (tag, type, operating type, design code, set pressure, MAWP)
        - Service & governing scenario details
        - Protected equipment table
        - Relief scenarios table (all scenarios, not just governing)
        - Sizing cases table (all cases, not just governing)
        - Hydraulic network overview with validation status (PASS/CAUTION/EXCEEDS)
        - Detailed segment tables with proper formatting
        - Notes and attachments sections
        - Revision history table
    - No visual hierarchy or professional styling
    - Missing unit system support for metric/imperial display

3. **Template Issues:**
    - `psv_report.html` is incomplete (lines 1-169 show truncated content)
    - Missing proper table structures for complex data
    - No conditional rendering for missing data
    - No proper formatting functions for units

## Solution Design

### 1. Enhanced Data Structure

#### Frontend Payload Structure

```typescript
interface ReportPayload {
    // Document metadata
    psv: ProtectiveSystem;
    project: Project;
    customer: Customer;
    plant: Plant;
    unit: Unit;
    area: Area;
    owner: User;

    // Scenarios and sizing
    scenarios: OverpressureScenario[];
    sizingCases: SizingCase[];
    governingScenario: OverpressureScenario | null;
    governingSizingCase: SizingCase | null;

    // Equipment
    linkedEquipment: Equipment[];

    // Hydraulic data
    inletNetwork: TransformedNetwork | null;
    outletNetwork: TransformedNetwork | null;
    inletSummary: HydraulicSummary | null;
    outletSummary: HydraulicSummary | null;

    // Additional data
    notes: ProjectNote[];
    attachments: Attachment[];
    revisions: RevisionData[];

    // System info
    unitSystem: UnitSystem;
    generatedDate: string;
}
```

#### Transformed Network Structure

```typescript
interface TransformedNetwork {
    segments: {
        id: string;
        description: string;
        sectionType: string;
        diameter: number; // mm
        diameterUnit: string;
        length: number; // m
        lengthUnit: string;
        p1: number | null; // barg
        p2: number | null; // barg
        pressureDrop: number; // kPa
        pressureDropUnit: string;
        machNumber: number;
        fluid: string;
        fittings: string;
    }[];
}
```

#### Hydraulic Summary Structure

```typescript
interface HydraulicSummary {
    totalLength: number; // m
    avgDiameter: number; // mm
    minDiameter: number; // mm
    maxDiameter: number; // mm
    velocity: number; // m/s
    pressureDrop: number; // kPa
    pressureDropPercent: number; // %
    segmentCount: number;
    status: {
        label: string; // 'PASS', 'CAUTION', 'EXCEEDS', 'N/A'
        color: string; // 'success', 'warning', 'error', 'default'
        message: string;
    };
}
```

### 2. Template Redesign

#### New Template Structure

```
1. Header Section
   - Logo/Title
   - Report date
   - Project name

2. Document Metadata Table
   - Client, Facility, Area, Project
   - Document No., Prepared By, Revision Date, Workflow Status

3. Revision History Table
   - Revision, Description, By, Date
   - Checked By, Checked Date
   - Approved By, Approved Date

4. PSV Summary Box
   - Tag, Name, Type, Design Code
   - Set Pressure, MAWP
   - Service Fluid, Fluid Phase

5. Service & Governing Scenario
   - Service Fluid, Fluid Phase
   - Relief Scenarios count
   - Governing Scenario
   - Relieving Rate, Relieving Pressure

6. Protected Equipment Table
   - Tag, Type, Relationship
   - Design Pressure, Design Temperature

7. Relief Scenarios Table
   - Cause, Description, Phase
   - Relieving Rate, Pressure
   - Governing indicator

8. Sizing Cases Table
   - Scenario, Method
   - Required Area, Selected Orifice, % Used
   - Inlet ΔP, Backpressure, Status

9. Hydraulic Networks Section
   - Inlet Network Overview (summary metrics + status)
   - Outlet Network Overview (summary metrics + status)
   - Inlet Segments Table
   - Outlet Segments Table

10. Notes Section
    - List of notes with author and date

11. Attachments Section
    - List of attachments with size and date

12. Footer
    - Generated timestamp
```

### 3. Implementation Steps

#### Step 1: Update useReport Hook

- Add missing data from store (equipment, notes, attachments, revisions)
- Enhance `transformNetworkForReport()` to include:
    - P1/P2 pressures from resultSummary
    - Fluid information
    - Fittings
    - Section type
    - Proper unit conversions
- Add `calculateHydraulicSummary()` function
- Format revision data for export
- Include unit system information

#### Step 2: Redesign psv_report.html Template

- Create comprehensive template matching SummaryTab UI
- Add all missing sections
- Implement proper table structures
- Add conditional rendering for missing data
- Add formatting filters for units
- Improve visual hierarchy with proper styling

#### Step 3: Update Report Service

- Ensure all new data fields are properly passed to template
- Add any necessary helper functions for formatting

#### Step 4: Update Backend Router

- Update `PsvReportRequest` model to accept additional fields
- Ensure proper field aliasing (camelCase ↔ snake_case)

### 4. Key Technical Decisions

#### Unit Handling

- Store all engineering data in base units (Pa, K, m, mm, kg/h)
- Convert to display units in frontend before sending to report
- Include unit system in payload for template reference
- Use consistent formatting across all sections

#### Data Validation

- Handle missing data gracefully with "—" placeholders
- Show "No data available" messages for empty sections
- Validate required fields before generating report

#### Performance

- Keep payload size reasonable
- Only send calculated data (not raw inputs)
- Use efficient data structures

#### Styling

- Use professional, clean design
- Consistent color scheme (blue headers, gray backgrounds)
- Proper spacing and typography
- Print-optimized layout

## Files to Modify

1. **apps/psv/src/hooks/useReport.ts**
    - Add missing data extraction
    - Enhance network transformation
    - Add hydraulic summary calculation
    - Format revision data

2. **apps/api/app/templates/psv_report.html**
    - Complete redesign with all sections
    - Add proper table structures
    - Add formatting filters
    - Improve styling

3. **apps/api/app/routers/reports.py**
    - Update `PsvReportRequest` model
    - Add new fields to request

4. **apps/api/app/services/report_service.py**
    - Update render method signature
    - Pass additional data to template

## Success Criteria

1. Report includes all data shown in SummaryTab UI
2. Proper unit conversions for all values
3. Professional, readable layout
4. Handles missing data gracefully
5. Matches engineering documentation standards
6. Includes revision history
7. Shows hydraulic validation status
8. Displays all scenarios and sizing cases
9. Includes equipment, notes, and attachments
