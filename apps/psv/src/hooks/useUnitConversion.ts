import { useState, useCallback } from "react";
import { UnitPreferences, SizingInputs } from "@/data/types";
import { convertUnit } from '@eng-suite/physics/unitConversion';

// Define base units for our system
const BASE_UNITS = {
    pressure: 'barg',
    temperature: 'C',  // Use 'C' not '°C' for convertUnit compatibility
    flow: 'kg/h',
    length: 'm',
    area: 'mm2',
    density: 'kg/m3',
    viscosity: 'cP',
} as const;

export type UnitType = keyof UnitPreferences;

export function useUnitConversion(initialPreferences: UnitPreferences) {
    const [preferences, setPreferences] = useState<UnitPreferences>(initialPreferences);

    /**
     * Convert a value from Base Unit -> Display Unit
     * Returns a formatted string with specified decimal places (default: 3)
     */
    const toDisplay = useCallback((value: number | undefined, type: UnitType, decimals: number = 3): string => {
        if (value === undefined || value === null) return '0.000';

        let targetUnit = preferences[type];

        // Specific fix for "C" vs "°C" mismatch in libraries if needed
        // Assuming convertUnit handles standard aliases via its normalization

        // Handle density special case if needed (e.g. specific gravity)
        // For now trusting physics-engine

        const converted = convertUnit(value, BASE_UNITS[type], targetUnit);
        return converted.toFixed(decimals);
    }, [preferences]);

    /**
     * Convert a value from Display Unit -> Base Unit
     */
    const toBase = useCallback((value: number, type: UnitType): number => {
        const sourceUnit = preferences[type];
        return convertUnit(value, sourceUnit, BASE_UNITS[type]);
    }, [preferences]);

    /**
     * Update a specific unit preference
     */
    const setUnit = useCallback((type: UnitType, unit: string) => {
        setPreferences(prev => ({
            ...prev,
            [type]: unit
        }));
    }, []);

    return {
        preferences,
        setUnit,
        toDisplay,
        toBase,
        BASE_UNITS
    };
}
