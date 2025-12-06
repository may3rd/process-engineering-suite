export enum FluidState {
    Gas = 'Gas/Vapor',
    Liquid = 'Liquid',
    Water = 'Water',
    Oil = 'Oil',
    Air = 'Air',
    Steam = 'Steam'
  }

export interface Fluid {
    name?: string;
    density?: number;
    densityUnit?: string;
    viscosity?: number;
    viscosityUnit?: string;
    phase?: "liquid" | "gas";
    molecularWeight?: number;
    zFactor?: number;
    specificHeatRatio?: number;
}

export interface ControlValve {
    cv?: number;
    pressureDrop?: number;
    pressureDropUnit?: string;
    inputMode?: "cv" | "pressure_drop";
    cg?: number; // Added
    xT?: number; // Added
    C1?: number; // Added
}

export interface Orifice {
    diameter?: number;
    pressureDrop?: number;
    pressureDropUnit?: string;
    inputMode?: "diameter" | "pressure_drop" | "beta_ratio";
    betaRatio?: number; // Added
}

export interface FittingType {
    type: string;
    count: number;
    k_each?: number; // Added based on error
    k_total?: number; // Added
}

export interface PressureDropCalculationResults {
    totalSegmentPressureDrop?: number; // Changed to optional/undefined allowed
    pipeLengthK?: number; // Added
    fittingK?: number; // Added
    userK?: number; // Added
    pipingFittingSafetyFactor?: number; // Added
    totalK?: number; // Added
    reynoldsNumber?: number; // Added
    frictionalFactor?: number; // Added
    flowScheme?: string; // Added
    pipeAndFittingPressureDrop?: number; // Added
    elevationPressureDrop?: number; // Added
    controlValvePressureDrop?: number; // Added
    controlValveCV?: number; // Added
    orificePressureDrop?: number; // Added
    controlValveCg?: number; // Added
    orificeBetaRatio?: number; // Added
    userSpecifiedPressureDrop?: number; // Added
    normalizedPressureDrop?: number; // Added
    gasFlowCriticalPressure?: number; // Added
}

export interface resultSummary { // Renamed to match import
    outletState?: pipeState; // Changed to pipeState to be more generic/inclusive
    inletState?: pipeState; // Added
}

// Added missing type
export interface pipeState {
    // Inferring properties if possible, or leaving loose for now
    [key: string]: any;
}

export interface PipeProps {
    id: string;
    name: string;
    startNodeId: string;
    endNodeId: string;
    direction?: "forward" | "backward";
    length?: number;
    lengthUnit?: string;
    boundaryPressure?: number;
    boundaryPressureUnit?: string;
    boundaryTemperature?: number;
    boundaryTemperatureUnit?: string;
    pipeSectionType?: string;
    controlValve?: ControlValve;
    orifice?: Orifice;
    fluid?: Fluid;
    fittings?: FittingType[];

    pipingFittingSafetyFactor?: number;
    diameterUnit?: string;
    pipeDiameterUnit?: string;
    inletDiameter?: number;
    inletDiameterUnit?: string;
    outletDiameter?: number;
    outletDiameterUnit?: string;
    roughness?: number;
    roughnessUnit?: string;
    fittingType?: string;
    erosionalConstant?: number;
    velocity?: number;
    velocityUnit?: string; // Added
    fittingK?: number;
    pipeLengthK?: number; // Added
    totalK?: number; // Added
    equivalentLength?: number; // Added

    // Added based on latest errors
    diameter?: number;
    pipeDiameter?: number;
    massFlowRate?: number;
    massFlowRateUnit?: string;
    designMassFlowRate?: number;
    designMassFlowRateUnit?: string;
    designMargin?: number;
    userK?: number;

    userSpecifiedPressureLoss?: number; // Added
    userSpecifiedPressureLossUnit?: string; // Added
    elevation?: number; // Added
    elevationUnit?: string; // Added
    gasFlowModel?: string; // Added

    pressureDropCalculationResults?: PressureDropCalculationResults;
    resultSummary?: resultSummary;
}

export interface NodeProps {
    id: string;
    label: string;
    pressure?: number;
    pressureUnit?: string;
    temperature?: number;
    temperatureUnit?: string;
    fluid?: Fluid;
}

export interface NetworkState {
    nodes: NodeProps[];
    pipes: PipeProps[];
}
