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

export interface Project {
    id: string;
    areaId: string;
    name: string;
    code: string;
    phase: 'design' | 'construction' | 'commissioning' | 'operation';
    status: 'draft' | 'in_review' | 'checked' | 'approved' | 'issued';
    startDate: string;
    endDate?: string;
    leadId: string;
    createdAt: string;
}

// Import shared physics/network types
import { PipeProps, NodeProps } from '@eng-suite/physics';
import type { SizingInputs, SizingOutputs, SizingMethod, OrificeSize } from '@eng-suite/api/psv';
import { ORIFICE_SIZES } from '@eng-suite/api/psv';
export type { PipeProps, NodeProps };
export type { SizingInputs, SizingOutputs, SizingMethod, OrificeSize } from '@eng-suite/api/psv';
export { ORIFICE_SIZES } from '@eng-suite/api/psv';

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
    valveType?: ValveOperatingType; // Conventional, Balanced Bellows, or Pilot Operated
    tags: string[];
    // Shared piping networks (one physical install per device)
    inletNetwork?: PipelineNetwork;
    outletNetwork?: PipelineNetwork;
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
    | 'check_valve_failure'
    | 'external_fire'
    | 'other';

export interface OverpressureScenario {
    id: string;
    protectiveSystemId: string;
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
    createdAt: string;
    updatedAt: string;
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
    pipes: PipeProps[];
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
    revisionNo: number;
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
    designPressure: number;   // barg
    mawp: number;             // barg
    designTemperature: number; // °C
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

// User types
export interface User {
    id: string;
    name: string;
    email: string;
    role: 'engineer' | 'lead' | 'approver' | 'viewer' | 'admin';
    status: 'active' | 'inactive';
    avatarUrl?: string; // Optional mock avatar URL
}

// Mock authentication credentials
export interface MockCredential {
    userId: string;
    username: string;
    password: string; // Plain text for mock purposes only
}
