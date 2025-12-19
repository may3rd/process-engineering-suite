// Domain hierarchy types
export interface Customer {
    id: string;
    name: string;
    code: string;
    status: 'active' | 'inactive';
    ownerId: string;
    createdAt: string;
}

export interface Plant {
    id: string;
    customerId: string;
    name: string;
    code: string;
    location: string;
    status: 'active' | 'inactive';
    ownerId: string;
    createdAt: string;
}

export interface Unit {
    id: string;
    plantId: string;
    name: string;
    code: string;
    service: string;
    status: 'active' | 'inactive';
    ownerId: string;
    createdAt: string;
}

export interface Area {
    id: string;
    unitId: string;
    name: string;
    code: string;
    status: 'active' | 'inactive';
    createdAt: string;
}

// Unit system preferences (display only; stored engineering data remains in base units)
export type UnitSystem = 'metric' | 'fieldSI' | 'metric_kgcm2' | 'imperial';

export interface Project {
    id: string;
    areaId: string;
    name: string;
    code: string;
    phase: 'design' | 'construction' | 'commissioning' | 'operation';
    status: 'draft' | 'in_review' | 'checked' | 'approved' | 'issued';
    unitSystem?: UnitSystem;
    startDate: string;
    endDate?: string;
    leadId: string;
    createdAt: string;
}

// Revision history for document control
export type RevisionEntityType = 'protective_system' | 'scenario' | 'sizing_case';

export interface RevisionHistory {
    id: string;
    entityType: RevisionEntityType;
    entityId: string;
    revisionCode: string;  // 'O1', 'A1', 'B1', etc.
    sequence: number;      // For ordering: 1, 2, 3...
    description?: string;  // Reason for revision

    // Lifecycle tracking
    originatedBy?: string | null;
    originatedAt?: string | null;
    checkedBy?: string | null;
    checkedAt?: string | null;
    approvedBy?: string | null;
    approvedAt?: string | null;
    issuedAt?: string | null;

    // Snapshot of entity state at this revision
    snapshot: Record<string, unknown>;
    createdAt: string;
}

// Import shared physics/network types
import { PipeProps, NodeProps } from '@eng-suite/physics';
import type { SizingInputs, SizingOutputs, SizingMethod, OrificeSize } from '@eng-suite/api/psv';
import { ORIFICE_SIZES } from '@eng-suite/api/psv';
export type { PipeProps, NodeProps };
export type { SizingInputs, SizingOutputs, SizingMethod, OrificeSize } from '@eng-suite/api/psv';
export { ORIFICE_SIZES } from '@eng-suite/api/psv';

// Stored pipe segment metadata (P&ID / isometric references)
export interface PipeSegmentMeta {
    lineNumber?: string; // P&ID line number
    isometricNumber?: string; // isometric reference number
    revision?: string; // revision record (e.g., "A", "B", "3")
}

export type PipeSegment = PipeProps & PipeSegmentMeta;

// Protective system types
export type ProtectiveSystemType = 'psv' | 'rupture_disc' | 'breather_valve' | 'flame_arrestor' | 'tank_vent' | 'control_valve' | 'vent_system' | 'prv';
export type DesignCode = 'API-520' | 'API-521' | 'API-2000' | 'ASME-VIII';
export type FluidPhase = 'gas' | 'liquid' | 'steam' | 'two_phase';
export type ValveOperatingType = 'conventional' | 'balanced_bellows' | 'pilot_operated';

export interface ProtectiveSystem {
    id: string;
    areaId: string;              // Changed: PSV belongs to Area (physical location)
    projectIds?: string[];       // Optional: PSV can be tagged with projects
    name: string;
    tag: string;
    type: ProtectiveSystemType;
    designCode: DesignCode;
    serviceFluid: string;
    fluidPhase: FluidPhase;
    setPressure: number; // barg
    mawp: number; // barg
    ownerId: string;
    status: 'draft' | 'in_review' | 'checked' | 'approved' | 'issued';
    currentRevisionId?: string; // FK to revision_history
    valveType?: ValveOperatingType; // Conventional, Balanced Bellows, or Pilot Operated
    tags: string[];
    // Shared piping networks (one physical install per device)
    inletNetwork?: PipelineNetwork;
    outletNetwork?: PipelineNetwork;
    // Version tracking for optimistic locking
    version?: number;
    createdAt: string;
    updatedAt: string;
}


// Overpressure scenario types
export type ScenarioCause =
    | 'blocked_outlet'
    | 'fire_case'
    | 'tube_rupture'
    | 'thermal_expansion'
    | 'utility_failure'
    | 'control_valve_failure'
    | 'power_failure'
    | 'cooling_water_failure'
    | 'reflux_failure'
    | 'abnormal_heat_input'
    | 'check_valve_failure'
    | 'external_fire'
    | 'other';

export interface OverpressureScenario {
    id: string;
    protectiveSystemId: string;
    currentRevisionId?: string; // FK to revision_history
    cause: ScenarioCause;
    description: string;
    relievingTemp: number; // °C
    relievingPressure: number; // barg
    phase: FluidPhase;
    relievingRate: number; // kg/h
    accumulationPct: number; // %
    requiredCapacity: number; // kg/h
    assumptions: string[];
    codeRefs: string[];
    isGoverning: boolean;
    caseConsideration?: string; // Markdown-formatted case consideration details

    // Fire case specific metadata
    fireCalculation?: {
        calculationMethod: 'api521' | 'manual';
        environmentalFactor?: number;  // API-521 F factor (0.075-1.0)
        heightAboveGrade?: number;  // meters
        latentHeat?: number;  // kJ/kg
        totalWettedArea?: number;  // m² (aggregated)
        heatAbsorption?: number;  // kW
        // Per-equipment details
        equipmentWettedAreas?: Array<{
            equipmentId: string;
            equipmentTag: string;
            wettedArea: number;  // m²
            liquidLevel: number;  // m
        }>;
    };

    createdAt: string;
    updatedAt: string;
    version?: number;
}

// Sizing case types
export type SizingStandard = 'API-520' | 'API-521' | 'API-2000' | 'ASME-VIII' | 'ISO-4126';
// Unit preferences for user display
export interface UnitPreferences {
    pressure: string;
    temperature: string;
    flow: string;
    length: string;
    area: string;
    density: string;
    viscosity: string;
}

export interface PipelineNetwork {
    nodes: NodeProps[];
    pipes: PipeSegment[];
}

// Calculated hydraulic summary for inlet/outlet pipelines
export interface PipelineHydraulicSummary {
    totalLength: number;        // m
    nominalDiameter: number;    // mm
    velocity: number;           // m/s
    pressureDrop: number;       // kPa
    pressureDropPercent: number; // % of set pressure
    reynoldsNumber: number;
    frictionFactor: number;
    validationStatus: 'pass' | 'warning' | 'fail';
    validationMessage: string;
}

export interface SizingCase {
    id: string;
    protectiveSystemId: string;
    scenarioId: string;
    standard: SizingStandard;
    method: SizingMethod;
    inputs: SizingInputs;
    outputs: SizingOutputs;
    unitPreferences: UnitPreferences;
    currentRevisionId?: string; // FK to revision_history
    status: 'draft' | 'calculated' | 'verified' | 'approved';
    createdBy: string;
    approvedBy?: string;
    createdAt: string;
    updatedAt: string;
}

// Equipment and attachments
// Equipment types
export type EquipmentType = 'vessel' | 'tank' | 'heat_exchanger' | 'column' | 'reactor' | 'pump' | 'compressor' | 'piping' | 'control_valve' | 'other';

// Insulation types
export type InsulationType = 'mineral_wool' | 'calcium_silicate' | 'ceramic_fiber' | 'polyurethane' | 'fiberglass' | 'other';

// Head types for vessels/columns/tanks
export type HeadType = 'ellipsoidal' | 'hemispherical' | 'torispherical' | 'flat';

// ============================================
// Vessel Details (for wetted area calculation)
// ============================================
export interface VesselDetails {
    orientation: 'horizontal' | 'vertical';
    innerDiameter: number;          // mm
    tangentToTangentLength: number; // mm (T-to-T)
    headType: HeadType;
    wallThickness?: number;         // mm
    insulated: boolean;
    insulationType?: InsulationType;
    insulationThickness?: number;   // mm

    // Liquid levels (% of height/diameter)
    normalLiquidLevel?: number;     // NLL %
    lowLiquidLevel?: number;        // LLL %
    highLiquidLevel?: number;       // HLL %

    // Calculated fields (stored after calculation)
    wettedArea?: number;            // m² (for fire case)
    totalSurfaceArea?: number;      // m²
    volume?: number;                // m³
}

// ============================================
// Column Details (for distillation/absorption)
// ============================================
export interface ColumnDetails {
    innerDiameter: number;          // mm
    tangentToTangentHeight: number; // mm
    headType: HeadType;
    wallThickness?: number;         // mm
    insulated: boolean;
    insulationType?: InsulationType;
    insulationThickness?: number;   // mm

    // Liquid levels (% of height)
    normalLiquidLevel?: number;     // NLL %
    lowLiquidLevel?: number;        // LLL %
    highLiquidLevel?: number;       // HLL %

    // Internals
    numberOfTrays?: number;
    traySpacing?: number;           // mm
    columnType?: 'tray' | 'packed' | 'structured_packing';
    packingHeight?: number;         // mm (for packed columns)

    // Calculated
    wettedArea?: number;            // m²
    totalSurfaceArea?: number;      // m²
    volume?: number;                // m³
}

// ============================================
// Tank Details (storage tanks)
// ============================================
export interface TankDetails {
    tankType: 'atmospheric' | 'low_pressure' | 'pressure';
    orientation: 'horizontal' | 'vertical';
    innerDiameter: number;          // mm
    height: number;                 // mm (for vertical) or length (for horizontal)
    roofType?: 'fixed_cone' | 'fixed_dome' | 'floating_internal' | 'floating_external' | 'none';
    wallThickness?: number;         // mm
    insulated: boolean;
    insulationType?: InsulationType;
    insulationThickness?: number;   // mm

    // Liquid levels (% of height)
    normalLiquidLevel?: number;     // NLL %
    lowLiquidLevel?: number;        // LLL %
    highLiquidLevel?: number;       // HLL %

    // Calculated
    wettedArea?: number;            // m²
    volume?: number;                // m³
    heelVolume?: number;            // m³ (unusable volume)
}

// ============================================
// Pump Details (for blocked outlet/deadhead)
// ============================================
export interface PumpDetails {
    pumpType: 'centrifugal' | 'positive_displacement' | 'reciprocating' | 'rotary';
    ratedFlow: number;              // m³/h
    ratedHead: number;              // m
    maxDischargePressure: number;   // barg
    shutoffHead?: number;           // m (for centrifugal)
    npshRequired?: number;          // m
    efficiency?: number;            // %
    motorPower?: number;            // kW

    // For positive displacement
    reliefValveSetPressure?: number; // barg (internal relief)
    maxViscosity?: number;          // cP

    // Operating conditions
    suctionPressure?: number;       // barg
    dischargePressure?: number;     // barg
    fluidTemperature?: number;      // °C
    fluidDensity?: number;          // kg/m³
}

// ============================================
// Compressor Details
// ============================================
export interface CompressorDetails {
    compressorType: 'centrifugal' | 'reciprocating' | 'screw' | 'axial';
    ratedCapacity: number;          // m³/h (actual)
    standardCapacity?: number;      // Nm³/h (at STP)
    suctionPressure: number;        // barg
    dischargePressure: number;      // barg
    compressionRatio?: number;      // P2/P1
    suctionTemperature?: number;    // °C
    dischargeTemperature?: number;  // °C
    efficiency?: number;            // %
    motorPower?: number;            // kW

    // Surge protection (for centrifugal)
    surgeFlow?: number;             // m³/h
    antiSurgeValveSetpoint?: number; // %
}

// ============================================
// Heat Exchanger Details
// ============================================
export interface HeatExchangerDetails {
    hxType: 'shell_tube' | 'plate' | 'air_cooler' | 'double_pipe' | 'spiral';
    shellDiameter?: number;         // mm
    tubeLength?: number;            // mm
    numberOfTubes?: number;
    tubePitch?: number;             // mm
    numberOfPasses?: number;
    shellSidePressure?: number;     // barg
    tubeSidePressure?: number;      // barg
    shellSideTemperature?: number;  // °C
    tubeSideTemperature?: number;   // °C
    heatDuty?: number;              // kW
    heatTransferArea?: number;      // m² (heat transfer area)

    // Calculated (for fire case)
    wettedArea?: number;            // m² (external surface)
}

// ============================================
// Control Valve Details
// ============================================
export interface ControlValveDetails {
    valveType: 'globe' | 'butterfly' | 'ball' | 'rotary' | 'eccentric';
    bodySize: number;               // mm (nominal diameter)
    rating: string;                 // e.g., "ANSI 300", "ANSI 600"
    cv: number;                     // Valve coefficient
    cg?: number;                    // Gas sizing coefficient
    xT?: number;                    // Pressure drop ratio
    fL?: number;                    // Liquid pressure recovery factor
    fd?: number;                    // Valve style modifier

    // Actuator
    actuatorType?: 'pneumatic' | 'electric' | 'hydraulic';
    failPosition?: 'open' | 'closed' | 'last';

    // Operating conditions
    upstreamPressure?: number;      // barg
    downstreamPressure?: number;    // barg
    normalFlow?: number;            // kg/h
    maxFlow?: number;               // kg/h

    // Trim
    trimType?: 'linear' | 'equal_percent' | 'quick_opening';
    rangeability?: number;          // e.g., 50:1
}

// ============================================
// Piping Details
// ============================================
export interface PipingDetails {
    nominalDiameter: number;        // mm
    schedule: string;               // e.g., "40", "80", "STD"
    material: string;               // e.g., "Carbon Steel", "SS316"
    totalLength?: number;           // m
    designPressure?: number;        // barg
    designTemperature?: number;     // °C
    insulated: boolean;
    insulationType?: InsulationType;
    insulationThickness?: number;   // mm
}

// Union type for equipment-specific details
export type EquipmentDetails =
    | VesselDetails
    | TankDetails
    | ColumnDetails
    | PumpDetails
    | CompressorDetails
    | HeatExchangerDetails
    | ControlValveDetails
    | PipingDetails
    | Record<string, unknown>;  // For 'reactor' and 'other' types

// Equipment (physical assets in areas)
export interface Equipment {
    id: string;
    areaId: string;           // Equipment belongs to Area (physical location)
    type: EquipmentType;
    tag: string;
    name: string;
    description?: string;

    // Design parameters with per-field units
    designPressure: number | null;       // Stored in database as Pa (absolute)
    designPressureUnit?: string;         // Display unit (barg, psig, etc.) - defaults to barg
    mawp: number | null;                 // Stored in database as Pa (absolute)
    mawpUnit?: string;                   // Display unit - defaults to barg
    designTemperature: number | null;    // Stored in database as K
    designTempUnit?: string;             // Display unit (C, F, K) - defaults to C

    ownerId: string;
    status: 'active' | 'inactive';

    // Type-specific details
    details?: EquipmentDetails;

    createdAt: string;
    updatedAt: string;
}

// Equipment link (PSV to protected equipment)
export interface EquipmentLink {
    id: string;
    psvId: string;
    equipmentId: string;
    isPrimary: boolean;       // Primary protection device
    scenarioId?: string;      // Optional link to specific scenario
    relationship?: string;
    notes?: string;
    createdAt: string;
}

export interface Attachment {
    id: string;
    protectiveSystemId: string;
    fileUri: string;
    fileName: string;
    mimeType: string;
    size: number;
    uploadedBy: string;
    createdAt: string;
}

// Calculation warnings types
export type WarningSeverity = 'error' | 'warning' | 'info';
export type WarningSource = 'hydraulic' | 'sizing' | 'scenario' | 'validation';

export interface Warning {
    id: string;
    sizingCaseId: string;
    severity: WarningSeverity;
    source: WarningSource;
    message: string;
    details?: string; // Additional context
    location?: string; // Where in the UI (e.g., "Inlet Network, Segment 2")
    value?: number | string; // The problematic value
    threshold?: number | string; // The limit that was exceeded
    timestamp: string;
}

// Comments and Todos for Notes tab
export interface Comment {
    id: string;
    protectiveSystemId: string;
    body: string;
    createdBy: string;
    createdAt: string;
    updatedAt?: string;
    updatedBy?: string;
}

export interface ProjectNote {
    id: string;
    protectiveSystemId: string;
    body: string;
    createdBy: string;
    createdAt: string;
    updatedAt?: string;
    updatedBy?: string;
}

export interface TodoItem {
    id: string;
    protectiveSystemId: string;
    text: string;
    completed: boolean;
    assignedTo?: string;
    dueDate?: string;
    createdBy: string;
    createdAt: string;
}

// User display preferences
export interface DisplaySettings {
    decimalPlaces: {
        pressure: number;      // default: 2
        temperature: number;   // default: 1
        flow: number;          // default: 0
        length: number;        // default: 2
        general: number;       // default: 2 (fallback for other values)
    };
}

// User types
export interface User {
    id: string;
    username?: string;
    name: string;
    initials?: string; // e.g. "MTL", "TE"
    email: string;
    role: 'engineer' | 'lead' | 'approver' | 'viewer' | 'division_manager' | 'admin';
    status: 'active' | 'inactive';
    avatarUrl?: string; // Optional mock avatar URL
    displaySettings?: DisplaySettings; // User display preferences
}

// Mock authentication credentials
export interface MockCredential {
    userId: string;
    username: string;
    password: string; // Plain text for mock purposes only
}

// Audit Log types
export type AuditAction = 'create' | 'update' | 'delete' | 'status_change' | 'calculate';
export type AuditEntityType =
    | 'protective_system'
    | 'scenario'
    | 'sizing_case'
    | 'project'
    | 'revision'
    | 'comment'
    | 'attachment'
    | 'note'
    | 'todo';

export interface AuditFieldChange {
    field: string;
    oldValue: unknown;
    newValue: unknown;
}

export interface AuditLog {
    id: string;

    // What happened
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    entityName: string; // Human-readable identifier (e.g., "PSV-105")

    // Who did it
    userId: string;
    userName: string;
    userRole?: string;

    // What changed (for updates)
    changes?: AuditFieldChange[];
    description?: string; // Optional description of what was done

    // Context
    projectId?: string;
    projectName?: string;

    // Timestamps
    createdAt: string;
}

// Version tracking for optimistic locking
export interface VersionedEntity {
    version: number;
    updatedAt: string;
    updatedBy?: string;
}
