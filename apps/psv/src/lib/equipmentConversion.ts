/**
 * Equipment Unit Conversion Utilities
 * 
 * Handles conversion between display units and database storage units:
 * - Pressure: Database stores Pa (absolute), displays barg, psig, etc.
 * - Temperature: Database stores K, displays °C, °F, etc.
 */

import { convertUnit } from '@eng-suite/physics';

/**
 * Convert pressure from display unit (gauge or absolute) to Pa absolute for database storage
 */
export function convertToAbsolutePa(value: number | null, unit: string): number | null {
    if (value === null) return null;

    // Check if it's a gauge pressure (ends with 'g')
    const isGauge = unit.endsWith('g');
    const baseUnit = isGauge ? unit.slice(0, -1) : unit;  // Remove 'g' if present

    // Convert to Pa
    const pressurePa = convertUnit(value, baseUnit, 'Pa');

    // If gauge pressure, add atmospheric pressure (101325 Pa)
    const absolutePa = isGauge ? pressurePa + 101325 : pressurePa;

    return absolutePa;
}

/**
 * Convert pressure from Pa absolute (database) to display unit
 */
export function convertFromAbsolutePa(value: number | null, unit: string): number | null {
    if (value === null) return null;

    // Check if target is gauge pressure
    const isGauge = unit.endsWith('g');
    const baseUnit = isGauge ? unit.slice(0, -1) : unit;  // Remove 'g' if present

    // If converting to gauge, subtract atmospheric pressure first
    const pressurePa = isGauge ? value - 101325 : value;

    // Convert from Pa to target unit
    const converted = convertUnit(pressurePa, 'Pa', baseUnit);

    return converted;
}

/**
 * Convert temperature from display unit to K for database storage
 */
export function convertToKelvin(value: number | null, unit: string): number | null {
    if (value === null) return null;
    return convertUnit(value, unit, 'K');
}

/**
 * Convert temperature from K (database) to display unit
 */
export function convertFromKelvin(value: number | null, unit: string): number | null {
    if (value === null) return null;
    return convertUnit(value, 'K', unit);
}

/**
 * Convert Equipment object from frontend format (with display units) to API format (SI units)
 */
export function equipmentToAPI(equipment: any): any {
    return {
        ...equipment,
        designPressure: convertToAbsolutePa(
            equipment.designPressure,
            equipment.designPressureUnit || 'barg'
        ),
        mawp: convertToAbsolutePa(
            equipment.mawp,
            equipment.mawpUnit || 'barg'
        ),
        designTemperature: convertToKelvin(
            equipment.designTemperature,
            equipment.designTempUnit || 'C'
        ),
        // Remove unit fields (API doesn't store them)
        designPressureUnit: undefined,
        mawpUnit: undefined,
        designTempUnit: undefined,
    };
}

/**
 * Convert Equipment object from API format (SI units) to frontend format (with display units)
 */
export function equipmentFromAPI(apiEquipment: any): any {
    // User-confirmed per-field defaults
    const defaultPressureUnit = 'barg';
    const defaultTempUnit = 'C';

    return {
        ...apiEquipment,
        designPressure: convertFromAbsolutePa(
            apiEquipment.designPressure,
            defaultPressureUnit
        ),
        designPressureUnit: defaultPressureUnit,
        mawp: convertFromAbsolutePa(
            apiEquipment.mawp,
            defaultPressureUnit
        ),
        mawpUnit: defaultPressureUnit,
        designTemperature: convertFromKelvin(
            apiEquipment.designTemperature,
            defaultTempUnit
        ),
        designTempUnit: defaultTempUnit,
    };
}
