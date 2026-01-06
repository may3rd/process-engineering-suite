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
    calculatedBackpressure?: number;  // barg - calculated from outlet network
    destinationPressure?: number;  // barg - destination pressure for backward calculation
    inletPressureDrop?: number;  // kPa - calculated from inlet network
    dischargeCoefficient?: number; // Kd - manual override
    backpressureCorrectionFactor?: number; // Kb/Kw - manual override

    // Two-Phase fields
    omega?: number; // Omega parameter for two-phase flow (API-520 Annex C)
    valveType?: 'conventional' | 'balanced' | 'pilot'; // Valve operating type
    setPressure?: number; // barg - PSV set pressure (for Kw calculation)
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

    // Hydraulic validation outputs
    inletPressureDrop?: number; // kPa - actual pressure drop value
    inletPressureDropPercent?: number; // % of set pressure
    inletValidation?: {
        isValid: boolean;
        message: string;
        severity: 'success' | 'warning' | 'error';
    };

    // Outlet hydraulic outputs
    builtUpBackpressure?: number; // kPa - calculated from outlet piping
    outletPressureDrop?: number;  // kPa - total pressure drop in outlet piping
}

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
