import { useState, useCallback } from "react";
import { UnitPreferences } from "@/data/types";
import { convertUnit } from '@eng-suite/physics';

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

// Normalize UI-friendly unit labels to the ASCII values accepted by convertUnit
const UNIT_ALIASES: Record<string, string> = {
    'kg/m³': 'kg/m3',
    'lb/ft³': 'lb/ft3',
    'mm²': 'mm2',
    'm²': 'm2',
    'in²': 'in2',
    'Pa·s': 'Pa.s',
};

// Mapping from gauge units to differential units for pressure drop
const PRESSURE_GAUGE_TO_DIFF: Record<string, string> = {
    'barg': 'bar',
    'psig': 'psi',
    'kPag': 'kPa',
    'MPag': 'MPa',
    'kg/cm2g': 'kg/cm2',
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

    const normalizeUnit = useCallback((unit?: string): string | undefined => {
        if (!unit) return unit ?? undefined;
        return UNIT_ALIASES[unit] || unit;
    }, []);

    /**
     * Convert a value from Base Unit -> Display Unit (for absolute/gauge pressures)
     */
    const toDisplay = useCallback((value: number | undefined, type: UnitType, decimalPlaces?: number): number => {
        if (value === undefined || value === null) return 0;

        const targetUnit = normalizeUnit(preferences[type]) || preferences[type];

        if (decimalPlaces === undefined) {
            return convertUnit(value, BASE_UNITS[type], targetUnit);
        }
        return Number(convertUnit(value, BASE_UNITS[type], targetUnit).toFixed(decimalPlaces));
    }, [preferences, normalizeUnit]);

    /**
     * Convert a DIFFERENTIAL value (like ΔP or ΔT) from base unit -> display unit
     * For pressure: Uses bar/kPa/psi, NEVER barg/psig
     * Base unit for ΔP is 'bar' (not 'barg')
     */
    const toDisplayDelta = useCallback((value: number | undefined, type: UnitType, decimalPlaces: number = 3): number => {
        if (value === undefined || value === null) return 0;

        // Get the display preference and convert to differential unit
        const preferredUnit = normalizeUnit(preferences[type]) || preferences[type];
        const diffUnit = PRESSURE_GAUGE_TO_DIFF[preferredUnit] || preferredUnit;

        // For pressure delta, base unit is 'bar' (not 'barg')
        const baseUnit = type === 'pressure' ? 'bar' : BASE_UNITS[type];

        const converted = convertUnit(value, baseUnit, diffUnit);
        return Number(converted.toFixed(decimalPlaces));
    }, [preferences, normalizeUnit]);

    /**
     * Get the differential unit label for display (e.g., 'bar' instead of 'barg')
     */
    const getDeltaUnit = useCallback((type: UnitType): string => {
        const preferredUnit = normalizeUnit(preferences[type]) || preferences[type];
        return PRESSURE_GAUGE_TO_DIFF[preferredUnit] || preferredUnit;
    }, [preferences, normalizeUnit]);

    /**
     * Convert a value from Display Unit -> Base Unit
     */
    const toBase = useCallback((value: number, type: UnitType): number => {
        const sourceUnit = normalizeUnit(preferences[type]) || preferences[type];
        return convertUnit(value, sourceUnit, BASE_UNITS[type]);
    }, [preferences, normalizeUnit]);

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
