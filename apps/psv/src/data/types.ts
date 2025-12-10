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
    status: 'draft' | 'in_review' | 'approved' | 'issued';
    startDate: string;
    endDate?: string;
    leadId: string;
    createdAt: string;
}

// Import types from physics-engine for interoperability
import { PipeProps, NodeProps } from '@eng-suite/physics';
export type { PipeProps, NodeProps };

// Protective system types
export type ProtectiveSystemType = 'psv' | 'rupture_disc' | 'vent_system' | 'prv';
export type DesignCode = 'API-520' | 'API-521' | 'API-2000' | 'ASME-VIII';
export type FluidPhase = 'gas' | 'liquid' | 'steam' | 'two_phase';

export interface ProtectiveSystem {
    id: string;
    projectId: string;
    name: string;
    tag: string;
    type: ProtectiveSystemType;
    designCode: DesignCode;
    serviceFluid: string;
    fluidPhase: FluidPhase;
    setPressure: number; // barg
    mawp: number; // barg
    ownerId: string;
    status: 'draft' | 'in_review' | 'approved' | 'issued';
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
    createdAt: string;
    updatedAt: string;
}

// Sizing case types
export type SizingStandard = 'API-520' | 'API-521' | 'API-2000' | 'ASME-VIII' | 'ISO-4126';
export type SizingMethod = 'gas' | 'liquid' | 'steam' | 'two_phase';

export interface SizingInputs {
    massFlowRate: number; // kg/h

    // Gas/Vapor phase properties (for gas, steam, and gas phase of two-phase)
    molecularWeight: number;
    compressibilityZ: number;
    specificHeatRatio: number; // k = Cp/Cv
    gasViscosity?: number; // cP (for gas phase)

    // Liquid phase properties (for liquid and liquid phase of two-phase)
    liquidDensity?: number; // kg/m³
    liquidViscosity?: number; // cP

    // Two-phase properties
    vaporFraction?: number; // Mass vapor fraction (0-1), aka quality (x)

    // Common properties
    temperature: number; // °C
    pressure: number; // barg
    backpressure: number; // barg
    backpressureType: 'superimposed' | 'built_up';

    // Backward compatibility - these map to appropriate phase properties
    viscosity?: number; // Deprecated: use gasViscosity or liquidViscosity
    density?: number; // Deprecated: use liquidDensity

    // Hydraulic validation inputs
    backpressureSource?: 'manual' | 'calculated';
    calculatedBackpressure?: number;
    inletPressureDrop?: number;
}

export interface SizingOutputs {
    requiredArea: number;   // mm2
    requiredAreaIn2: number; // in2
    selectedOrifice: string; // Designation (e.g., "J"), "K", "L"
    orificeArea: number; // mm²
    percentUsed: number; // %
    ratedCapacity: number; // kg/h
    dischargeCoefficient: number;
    backpressureCorrectionFactor: number;
    isCriticalFlow: boolean;
    numberOfValves: number; // Number of parallel valves (default: 1)
    messages: string[];
}
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
export interface Equipment {
    id: string;
    projectId: string;
    type: 'vessel' | 'tank' | 'heat_exchanger' | 'column' | 'reactor' | 'piping';
    tag: string;
    description: string;
    designPressure: number; // barg
    designTemp: number; // °C
    locationRef: string;
    createdAt: string;
}

export interface EquipmentLink {
    id: string;
    protectiveSystemId: string;
    equipmentId: string;
    relationship: 'protects' | 'inlet_from' | 'discharge_to';
    notes: string;
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
    role: 'engineer' | 'lead' | 'approver' | 'viewer';
    status: 'active' | 'inactive';
}

// Orifice size reference
export interface OrificeSize {
    designation: string;
    area: number; // mm²
    areaIn2: number; // in²
}

export const ORIFICE_SIZES: OrificeSize[] = [
    { designation: 'D', area: 71, areaIn2: 0.110 },
    { designation: 'E', area: 126, areaIn2: 0.196 },
    { designation: 'F', area: 198, areaIn2: 0.307 },
    { designation: 'G', area: 325, areaIn2: 0.503 },
    { designation: 'H', area: 506, areaIn2: 0.785 },
    { designation: 'J', area: 830, areaIn2: 1.287 },
    { designation: 'K', area: 1186, areaIn2: 1.838 },
    { designation: 'L', area: 1841, areaIn2: 2.853 },
    { designation: 'M', area: 2323, areaIn2: 3.600 },
    { designation: 'N', area: 2800, areaIn2: 4.340 },
    { designation: 'P', area: 4116, areaIn2: 6.380 },
    { designation: 'Q', area: 7129, areaIn2: 11.05 },
    { designation: 'R', area: 10323, areaIn2: 16.00 },
    { designation: 'T', area: 16774, areaIn2: 26.00 },
];
