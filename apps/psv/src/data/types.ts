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
export type EquipmentType = 'vessel' | 'tank' | 'heat_exchanger' | 'column' | 'reactor' | 'pump' | 'compressor' | 'piping' | 'other';

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
