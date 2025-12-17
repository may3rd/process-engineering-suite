import { useState } from 'react';
import { convertUnit } from '@eng-suite/physics';

export const UNITS = {
    LENGTH: ['mm', 'm', 'in', 'ft'],
    AREA: ['m2', 'ft2', 'cm2', 'mm2'],
    VOLUME: ['m3', 'ft3', 'gal', 'bbl'],
    PRESSURE: ['barg', 'psig', 'kPag', 'MPag', 'bara', 'psia'], // Be careful with gauge/abs
    TEMPERATURE: ['C', 'F', 'K'],
    POWER: ['kW', 'W', 'MW', 'hp', 'BTU/h'],
    FLOW_RATE: ['m3/h', 'gpm', 'bbl/d', 'ft3/h'],
    MASS_FLOW: ['kg/h', 'lb/h', 'kg/s'],
    THICKNESS: ['mm', 'in'], // Subset of length often used for thickness
    VELOCITY: ['m/s', 'ft/s'],
    DENSITY: ['kg/m3', 'lb/ft3'],
    VISCOSITY: ['cP', 'Pa.s']
};

export function useUnitDetails(initialUnits: Record<string, string> = {}) {
    const [fieldUnits, setFieldUnits] = useState<Record<string, string>>(initialUnits);

    const getUnit = (field: string, defaultUnit: string) => {
        return fieldUnits[field] || defaultUnit;
    };

    const setUnit = (field: string, unit: string) => {
        setFieldUnits(prev => ({ ...prev, [field]: unit }));
    };

    /**
     * Helper to handle UnitSelector change.
     * Takes the new value/unit from UnitSelector, converts value back to storage unit,
     * updates the persistent details state (via onSave equivalent), and updates local unit state.
     * 
     * @param field The field name in the details object
     * @param newValue The value returned by UnitSelector (in newUnit)
     * @param newUnit The unit returned by UnitSelector
     * @param storageUnit The unit expected by the details object
     * @param currentDetails The current details object
     * @param onChange The form's onChange handler
     */
    const handleUnitChange = <T>(
        field: keyof T,
        newValue: number | null,
        newUnit: string,
        storageUnit: string,
        currentDetails: T | null,
        onChange: (d: T) => void
    ) => {
        // 1. Update local unit state
        setUnit(field as string, newUnit);

        // 2. Convert value to storage unit
        let storageValue = newValue;
        if (newValue !== null) {
            try {
                storageValue = convertUnit(newValue, newUnit, storageUnit);
            } catch (e) {
                console.error(`Conversion failed from ${newUnit} to ${storageUnit}`, e);
                // Fallback to raw value? Or just keep it.
            }
        }

        // 3. Update parent state
        onChange({
            ...currentDetails,
            [field]: storageValue
        } as T);
    };

    /**
     * Helper to get display value for UnitSelector
     */
    const getDisplayValue = (storedValue: number | undefined | null, field: string, storageUnit: string, defaultDisplayUnit: string): number | null => {
        if (storedValue === undefined || storedValue === null) return null;

        const targetUnit = getUnit(field, defaultDisplayUnit);

        // Optimize: no conversion if same
        if (targetUnit === storageUnit) return storedValue;

        try {
            return convertUnit(storedValue, storageUnit, targetUnit);
        } catch (e) {
            console.error(`Conversion failed from ${storageUnit} to ${targetUnit}`, e);
            return storedValue;
        }
    };

    return {
        getUnit,
        setUnit,
        handleUnitChange,
        getDisplayValue,
        UNITS
    };
}
