/**
 * API-521 Fire Exposure Calculations
 * 
 * Implements API Standard 521 "Pressure-relieving and Depressuring Systems"
 * Section 4.4 - Fire Exposure
 * 
 * @module api521
 */

/**
 * Calculate heat absorption from fire exposure (API-521)
 * 
 * Heat absorption Equations for Vessels Containing Liquids
 * Q = 43,200 * F * A^0.82  (Watts)
 * 
 * Where:
 * - Q = Heat absorption rate (W)
 * - F = Environmental factor (dimensionless)
 * - A = Wetted surface area (m²)
 * 
 * @param wettedArea - Wetted surface area in m²
 * @param environmentalFactor - Environmental factor (default 1.0)
 * @returns Heat absorption rate in Watts
 */
export function calculateFireHeatAbsorption(
    wettedArea: number,
    environmentalFactor: number = 1.0,
    drainageAndFireFighting: boolean = true
): number {
    if (wettedArea <= 0) {
        throw new Error('Wetted area must be positive');
    }

    if (environmentalFactor <= 0) {
        throw new Error('Environmental factor must be positive');
    }

    // API-521 formula for unwetted surfaces
    // Q = 43,200 * F * A^0.82 (Watts)
    if (drainageAndFireFighting) {
        return 43200 * environmentalFactor * Math.pow(wettedArea, 0.82);
    } else {
        return 70900 * environmentalFactor * Math.pow(wettedArea, 0.82);
    }
}

/**
 * Environmental factors per API-521 Table 4.4.1
 */
export const ENVIRONMENTAL_FACTORS = {
    /** Bare steel vessel, no insulation, no water spray */
    BARE: 1.0,

    /** Insulated vessel (50-100mm insulation) */
    INSULATED: 0.3,

    /** Water spray or deluge system */
    WATER_SPRAY: 0.15,

    /** Insulated + water spray */
    INSULATED_WITH_WATER: 0.075,

    /** Buried or underground */
    BURIED: 0.0,
} as const;

/**
 * Calculate required relief rate for fire exposure (vapor/gas)
 * 
 * @param heatAbsorption - Heat absorption rate in W
 * @param latentHeat - Latent heat of vaporization in kJ/kg
 * @returns Required relief rate in kg/h
 */
export function calculateFireReliefRate(
    heatAbsorption: number,
    latentHeat: number
): number {
    if (heatAbsorption <= 0) {
        throw new Error('Heat absorption must be positive');
    }

    if (latentHeat <= 0) {
        throw new Error('Latent heat must be positive');
    }

    // Convert W to kJ/h: W * 3.6
    const heatAbsorptionKJh = heatAbsorption * 3.6;

    // Required relief rate: Q / λ (kg/h)
    return heatAbsorptionKJh / latentHeat;
}

/**
 * Calculate wetted surface area limit per API-521
 * 
 * The wetted surface area is limited to:
 * - Height of 7.6m (25 ft) above grade for vessels on grade
 * - Height of 7.6m above highest probable liquid level for elevated vessels
 * 
 * @param totalWettedArea - Total wetted surface area in m²
 * @param heightAboveGrade - Height of vessel above grade in m
 * @param maxHeight - Maximum height to consider (default 7.6m per API-521)
 * @returns Limited wetted surface area in m²
 */
export function limitWettedArea(
    totalWettedArea: number,
    heightAboveGrade: number = 0,
    maxHeight: number = 7.6
): number {
    if (heightAboveGrade >= maxHeight) {
        // Vessel is above the fire exposure zone
        return 0;
    }

    // For simplicity, if vessel is within fire zone, return full wetted area
    // More sophisticated calculation would compute area up to maxHeight only
    return totalWettedArea;
}

/**
 * Complete fire sizing calculation per API-521
 * 
 * @param wettedArea - Wetted surface area in m²
 * @param latentHeat - Latent heat of vaporization in kJ/kg
 * @param environmentalFactor - Environmental factor (default 1.0)
 * @param heightAboveGrade - Height above grade in m (default 0)
 * @returns Fire relief calculation results
 */
export function calculateAPI521FireLoad(
    wettedArea: number,
    latentHeat: number,
    environmentalFactor: number = 1.0,
    heightAboveGrade: number = 0
): {
    wettedArea: number;
    limitedWettedArea: number;
    heatAbsorption: number;  // W
    reliefRate: number;       // kg/h
    environmentalFactor: number;
} {
    // Apply height limitation
    const limitedArea = limitWettedArea(wettedArea, heightAboveGrade);

    // Calculate heat absorption
    const Q = calculateFireHeatAbsorption(limitedArea, environmentalFactor);

    // Calculate required relief rate
    const reliefRate = calculateFireReliefRate(Q, latentHeat);

    return {
        wettedArea,
        limitedWettedArea: limitedArea,
        heatAbsorption: Q,
        reliefRate,
        environmentalFactor,
    };
}

/**
 * Get environmental factor description
 */
export function getEnvironmentalFactorDescription(factor: number): string {
    if (factor === ENVIRONMENTAL_FACTORS.BARE) return 'Bare vessel (no protection)';
    if (factor === ENVIRONMENTAL_FACTORS.INSULATED) return 'Insulated vessel';
    if (factor === ENVIRONMENTAL_FACTORS.WATER_SPRAY) return 'Water spray protection';
    if (factor === ENVIRONMENTAL_FACTORS.INSULATED_WITH_WATER) return 'Insulated with water spray';
    if (factor === ENVIRONMENTAL_FACTORS.BURIED) return 'Buried/underground';
    return `Custom factor (${factor})`;
}

/**
 * Validate fire sizing inputs
 */
export function validateFireSizingInputs(
    wettedArea: number,
    latentHeat: number,
    environmentalFactor: number
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (wettedArea <= 0) {
        errors.push('Wetted area must be positive');
    }

    if (wettedArea > 2800) {
        // API-521 recommends A_w ≤ 2,800 m² (30,000 ft²)
        errors.push('Wetted area exceeds API-521 recommended maximum of 2,800 m²');
    }

    if (latentHeat <= 0) {
        errors.push('Latent heat must be positive');
    }

    if (latentHeat < 50 || latentHeat > 2500) {
        errors.push('Latent heat should typically be between 50-2500 kJ/kg');
    }

    if (environmentalFactor < 0 || environmentalFactor > 1) {
        errors.push('Environmental factor should be between 0 and 1');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
