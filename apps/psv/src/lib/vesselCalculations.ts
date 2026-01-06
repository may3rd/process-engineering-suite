/**
 * Vessel Wetted Area Calculator Utility
 * 
 * This module provides wetted area calculations for various vessel types.
 * Used primarily for API-521 fire exposure area calculations in PSV sizing.
 * 
 * @example
 * ```typescript
 * import { calculateWettedArea } from '@/lib/vesselCalculations';
 * 
 * const wettedArea = calculateWettedArea({
 *   vesselType: 'vertical-torispherical',
 *   diameter: 3.5,
 *   length: 10.0,
 *   liquidLevel: 6.5
 * });
 * ```
 */

import {
    VerticalTorisphericalVessel,
    VerticalFlatVessel,
    VerticalEllipticalVessel,
    VerticalHemisphericalVessel,
    VerticalConicalVessel,
    HorizontalTorisphericalVessel,
    HorizontalFlatVessel,
    HorizontalEllipticalVessel,
    HorizontalHemisphericalVessel,
    HorizontalConicalVessel,
    SphericalTank,
    type Vessel,
} from '@eng-suite/vessels';

export type VesselOrientation = 'vertical' | 'horizontal' | 'spherical';
export type VesselHeadType = 'torispherical' | 'flat' | 'elliptical' | 'hemispherical' | 'conical';

export interface VesselCalculationInput {
    vesselType: 'vertical-torispherical' | 'vertical-flat' | 'vertical-elliptical' |
    'vertical-hemispherical' | 'vertical-conical' | 'horizontal-torispherical' |
    'horizontal-flat' | 'horizontal-elliptical' | 'horizontal-hemispherical' |
    'horizontal-conical' | 'spherical';
    diameter: number;          // meters
    length: number;            // meters (tangent-to-tangent for vertical, L for horizontal)
    liquidLevel: number;       // meters (from vessel bottom)
    headDistance?: number;     // meters (for conical heads)
}

export interface VesselCalculationResult {
    wettedArea: number;        // m²
    liquidVolume: number;      // m³
    totalVolume: number;       // m³
    totalHeight: number;       // m (for vertical)
    percentFull: number;       // %
}

/**
 * Create a vessel instance based on type
 */
function createVessel(input: VesselCalculationInput): Vessel {
    const { vesselType, diameter, length, headDistance } = input;

    switch (vesselType) {
        case 'vertical-torispherical':
            return new VerticalTorisphericalVessel(diameter, length);
        case 'vertical-flat':
            return new VerticalFlatVessel(diameter, length);
        case 'vertical-elliptical':
            return new VerticalEllipticalVessel(diameter, length);
        case 'vertical-hemispherical':
            return new VerticalHemisphericalVessel(diameter, length);
        case 'vertical-conical':
            const vConical = new VerticalConicalVessel(diameter, length);
            if (headDistance) vConical.headDistance = headDistance;
            return vConical;
        case 'horizontal-torispherical':
            return new HorizontalTorisphericalVessel(diameter, length);
        case 'horizontal-flat':
            return new HorizontalFlatVessel(diameter, length);
        case 'horizontal-elliptical':
            return new HorizontalEllipticalVessel(diameter, length);
        case 'horizontal-hemispherical':
            return new HorizontalHemisphericalVessel(diameter, length);
        case 'horizontal-conical':
            const hConical = new HorizontalConicalVessel(diameter, length);
            if (headDistance) hConical.headDistance = headDistance;
            return hConical;
        case 'spherical':
            return new SphericalTank(diameter);
        default:
            throw new Error(`Unknown vessel type: ${vesselType}`);
    }
}

/**
 * Calculate wetted area and related properties for a vessel
 * 
 * This function is used in fire case calculations where the wetted surface area
 * determines the heat absorption from external fire exposure.
 * 
 * @param input - Vessel dimensions and liquid level
 * @returns Calculation results including wetted area
 */
export function calculateWettedArea(input: VesselCalculationInput): VesselCalculationResult {
    const vessel = createVessel(input);
    const { liquidLevel } = input;

    const wettedArea = vessel.wettedArea(liquidLevel);
    const liquidVolume = vessel.liquidVolume(liquidLevel);
    const totalVolume = vessel.totalVolume;
    const totalHeight = vessel.totalHeight;
    const percentFull = totalVolume > 0 ? (liquidVolume / totalVolume) * 100 : 0;

    return {
        wettedArea,
        liquidVolume,
        totalVolume,
        totalHeight,
        percentFull,
    };
}

/**
 * Calculate fire exposure area according to API-521
 * 
 * For vessels with fire protection (insulation/water spray):
 * - Use total surface area up to 7.6m (25 ft) above grade
 * 
 * For unprotected vessels:
 * - Use wetted surface area up to 7.6m (25 ft) above grade
 * 
 * @param input - Vessel configuration
 * @param isProtected - Whether vessel has fire protection
 * @param maxHeightAboveGrade - Maximum height to consider (default 7.6m)
 * @returns Fire exposure area in m²
 */
export function calculateFireExposureArea(
    input: VesselCalculationInput,
    isProtected: boolean = false,
    maxHeightAboveGrade: number = 7.6,
    heightAboveGrade: number = 0
): number {
    const vessel = createVessel(input);
    const { liquidLevel } = input;

    // Calculate effective fire zone height relative to vessel bottom
    // e.g. if vessel is at 5m, and fire zone is 7.6m, only bottom 2.6m is exposed
    const effectiveFireLimit = Math.max(0, maxHeightAboveGrade - heightAboveGrade);

    if (effectiveFireLimit <= 0) {
        // Vessel is completely above the fire zone
        return 0;
    }

    if (isProtected) {
        // For protected vessels, use total surface area up to max height
        // Limited by effective fire zone relative to vessel
        const effectiveHeight = Math.min(vessel.totalHeight, effectiveFireLimit);
        return vessel.wettedArea(effectiveHeight);
    } else {
        // For unprotected vessels, use actual wetted surface area
        // limited to the lesser of liquid level or effective fire zone limit
        const effectiveLevel = Math.min(liquidLevel, effectiveFireLimit);
        return vessel.wettedArea(effectiveLevel);
    }
}

/**
 * Quick wetted area calculation for common cases
 * Assumes vertical torispherical vessel (most common pressure vessel type)
 */
export function quickWettedArea(
    diameter: number,
    length: number,
    liquidLevel: number
): number {
    const vessel = new VerticalTorisphericalVessel(diameter, length);
    return vessel.wettedArea(liquidLevel);
}
