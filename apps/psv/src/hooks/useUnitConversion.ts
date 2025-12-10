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

// Mapping from gauge units to differential units for pressure drop
const PRESSURE_GAUGE_TO_DIFF: Record<string, string> = {
    'barg': 'bar',
    'psig': 'psi',
    'kPag': 'kPa',
    'MPag': 'MPa',
    // Absolute units stay the same for differential
    'bar': 'bar',
    'psi': 'psi',
    'kPa': 'kPa',
    'MPa': 'MPa',
    'Pa': 'Pa',
};

export type UnitType = keyof UnitPreferences;

export function useUnitConversion(initialPreferences: UnitPreferences) {
    const [preferences, setPreferences] = useState<UnitPreferences>(initialPreferences);

    /**
     * Convert a value from Base Unit -> Display Unit (for absolute/gauge pressures)
     */
    const toDisplay = useCallback((value: number | undefined, type: UnitType, decimalPlaces?: number): number => {
        if (value === undefined || value === null) return 0;

        let targetUnit = preferences[type];

        if (decimalPlaces === undefined) {
            return convertUnit(value, BASE_UNITS[type], targetUnit);
        }
        return Number(convertUnit(value, BASE_UNITS[type], targetUnit).toFixed(decimalPlaces));
    }, [preferences]);

    /**
     * Convert a DIFFERENTIAL value (like ΔP or ΔT) from base unit -> display unit
     * For pressure: Uses bar/kPa/psi, NEVER barg/psig
     * Base unit for ΔP is 'bar' (not 'barg')
     */
    const toDisplayDelta = useCallback((value: number | undefined, type: UnitType, decimalPlaces: number = 3): number => {
        if (value === undefined || value === null) return 0;

        // Get the display preference and convert to differential unit
        const preferredUnit = preferences[type];
        const diffUnit = PRESSURE_GAUGE_TO_DIFF[preferredUnit] || preferredUnit;

        // For pressure delta, base unit is 'bar' (not 'barg')
        const baseUnit = type === 'pressure' ? 'bar' : BASE_UNITS[type];

        const converted = convertUnit(value, baseUnit, diffUnit);
        return Number(converted.toFixed(decimalPlaces));
    }, [preferences]);

    /**
     * Get the differential unit label for display (e.g., 'bar' instead of 'barg')
     */
    const getDeltaUnit = useCallback((type: UnitType): string => {
        const preferredUnit = preferences[type];
        return PRESSURE_GAUGE_TO_DIFF[preferredUnit] || preferredUnit;
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
        toDisplayDelta,
        getDeltaUnit,
        toBase,
        BASE_UNITS
    };
}
