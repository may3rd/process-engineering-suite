/**
 * Physical Input Validation Rules
 * 
 * Provides validation functions for engineering inputs based on physical constraints.
 */

import { convertUnit } from "@eng-suite/physics";

export type ValidationResult = {
    valid: boolean;
    error?: string;   // Hard error (blocks save)
    warning?: string; // Soft warning (allows save)
};

const OK: ValidationResult = { valid: true };

/**
 * Validate temperature (must be > 0 K / > -273.15 °C)
 */
export const validateTemperature = (value: number, unit: string): ValidationResult => {
    // Convert to Kelvin for validation using direct formulas
    let kelvin: number;

    switch (unit) {
        case 'K':
            kelvin = value;
            break;
        case 'C':
            kelvin = value + 273.15;
            break;
        case 'F':
            kelvin = (value + 459.67) * 5 / 9;
            break;
        case 'R':
            kelvin = value * 5 / 9;
            break;
        default:
            // Try using convertUnit as fallback
            try {
                kelvin = convertUnit(value, unit, "K");
            } catch {
                // If conversion fails, assume value is already in sensible units
                kelvin = value + 273.15; // Assume Celsius
            }
    }

    if (kelvin <= 0) {
        return {
            valid: false,
            error: `Temperature must be above absolute zero (0 K / -273.15 °C)`
        };
    }

    // Warning for extreme temperatures
    const celsius = kelvin - 273.15;
    if (celsius > 500) {
        return { valid: true, warning: "Very high temperature (> 500°C)" };
    }
    if (celsius < -50) {
        return { valid: true, warning: "Very low temperature (< -50°C)" };
    }

    return OK;
};

/**
 * Validate pressure (must be > 0 Pa absolute)
 * Converts gauge pressure to absolute by adding atmospheric pressure
 */
export const validatePressure = (value: number, unit: string): ValidationResult => {
    const atmPa = 101325; // Atmospheric pressure in Pa

    // Convert to absolute Pa based on unit
    let absolutePa: number;

    // Check if gauge unit (ends with 'g')
    const isGauge = unit.endsWith('g');

    switch (unit) {
        // Gauge units - add atmospheric pressure
        case 'kPag':
            absolutePa = (value * 1000) + atmPa;
            break;
        case 'barg':
            absolutePa = (value * 100000) + atmPa;
            break;
        case 'kg/cm2g':
        case 'kscg':
            absolutePa = (value * 98066.5) + atmPa;
            break;
        case 'psig':
            absolutePa = (value * 6894.76) + atmPa;
            break;
        // Absolute units
        case 'kPa':
            absolutePa = value * 1000;
            break;
        case 'Pa':
        case 'Pag':
            absolutePa = isGauge ? value + atmPa : value;
            break;
        case 'bar':
            absolutePa = value * 100000;
            break;
        case 'kg/cm2':
        case 'ksc':
            absolutePa = value * 98066.5;
            break;
        case 'psi':
            absolutePa = value * 6894.76;
            break;
        case 'atm':
            absolutePa = value * atmPa;
            break;
        case 'mmH2O':
            absolutePa = value * 9.80665;
            break;
        case 'torr':
            absolutePa = value * 133.322;
            break;
        case 'inHg':
            absolutePa = value * 3386.39;
            break;
        default:
            // For unknown units, assume value is in kPa gauge
            absolutePa = (value * 1000) + atmPa;
    }

    if (absolutePa <= 0) {
        return {
            valid: false,
            error: `Pressure must be above absolute vacuum (> 0 Pa absolute)`
        };
    }

    // Warning for very high pressure (> 50 MPa)
    if (absolutePa > 50e6) {
        return { valid: true, warning: "Very high pressure (> 50 MPa)" };
    }

    return OK;
};

/**
 * Validate that a value is strictly positive (> 0)
 */
export const validatePositive = (value: number, fieldName: string): ValidationResult => {
    if (value <= 0) {
        return {
            valid: false,
            error: `${fieldName} must be greater than zero`
        };
    }
    return OK;
};

/**
 * Validate that a value is non-negative (>= 0)
 */
export const validateNonNegative = (value: number, fieldName: string): ValidationResult => {
    if (value < 0) {
        return {
            valid: false,
            error: `${fieldName} cannot be negative`
        };
    }
    return OK;
};

/**
 * Validate that a value is within a range
 */
export const validateRange = (
    value: number,
    min: number,
    max: number,
    fieldName: string,
    exclusive: boolean = false
): ValidationResult => {
    if (exclusive) {
        if (value <= min || value >= max) {
            return {
                valid: false,
                error: `${fieldName} must be between ${min} and ${max} (exclusive)`
            };
        }
    } else {
        if (value < min || value > max) {
            return {
                valid: false,
                error: `${fieldName} must be between ${min} and ${max}`
            };
        }
    }
    return OK;
};

/**
 * Validate elevation against pipe length
 */
export const validateElevationVsLength = (elevation: number, length: number): ValidationResult => {
    if (Math.abs(elevation) > length) {
        return {
            valid: false,
            error: `Elevation change (${Math.abs(elevation).toFixed(2)}) cannot exceed pipe length (${length.toFixed(2)})`
        };
    }
    return OK;
};

/**
 * Validate specific heat ratio (Cp/Cv) for gases
 * Must be > 1 (physically required)
 */
export const validateSpecificHeatRatio = (value: number): ValidationResult => {
    if (value <= 1) {
        return {
            valid: false,
            error: "Specific heat ratio (k = Cp/Cv) must be greater than 1"
        };
    }
    if (value > 2) {
        return { valid: true, warning: "Unusually high specific heat ratio (> 2)" };
    }
    return OK;
};

/**
 * Validate Z factor (compressibility factor)
 */
export const validateZFactor = (value: number): ValidationResult => {
    if (value <= 0) {
        return {
            valid: false,
            error: "Compressibility factor (Z) must be greater than 0"
        };
    }
    if (value > 2) {
        return { valid: true, warning: "Unusually high Z factor (> 2)" };
    }
    return OK;
};

/**
 * Validate orifice beta ratio (d/D)
 * Must be 0 < β < 1
 */
export const validateBetaRatio = (value: number): ValidationResult => {
    if (value <= 0 || value >= 1) {
        return {
            valid: false,
            error: "Beta ratio (d/D) must be between 0 and 1 (exclusive)"
        };
    }
    if (value < 0.2 || value > 0.75) {
        return { valid: true, warning: "Beta ratio outside typical range (0.2 - 0.75)" };
    }
    return OK;
};

/**
 * Validate control valve xT (terminal pressure drop ratio)
 */
export const validateXt = (value: number): ValidationResult => {
    if (value <= 0 || value > 1) {
        return {
            valid: false,
            error: "xT must be between 0 (exclusive) and 1 (inclusive)"
        };
    }
    return OK;
};

/**
 * Validate erosional constant C (API 14E)
 * Typical range: 80-200 for most services
 */
export const validateErosionalConstant = (value: number): ValidationResult => {
    if (value <= 0) {
        return {
            valid: false,
            error: "Erosional constant must be greater than 0"
        };
    }
    if (value < 80 || value > 200) {
        return { valid: true, warning: "Erosional constant outside typical range (80-200)" };
    }
    return OK;
};

/**
 * Validate molecular weight
 */
export const validateMolecularWeight = (value: number): ValidationResult => {
    if (value <= 0) {
        return {
            valid: false,
            error: "Molecular weight must be greater than 0"
        };
    }
    if (value < 2 || value > 500) {
        return { valid: true, warning: "Molecular weight outside typical range (2-500 g/mol)" };
    }
    return OK;
};
