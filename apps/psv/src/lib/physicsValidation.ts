import { convertUnit } from '@eng-suite/physics';

const ATMOSPHERE_PA = 101325;

const GAUGE_PRESSURE_UNITS = new Set([
    'barg',
    'psig',
    'kpag',
    'mpag',
    'kg/cm2g',
]);

const TEMP_ALIAS: Record<string, string> = {
    '°c': 'c',
    '°f': 'f',
};

function normalizeTemperatureUnit(unit: string): string {
    if (!unit) return unit;
    const lower = unit.toLowerCase();
    return TEMP_ALIAS[lower] ?? unit;
}

function isGaugePressureUnit(unit: string): boolean {
    if (!unit) return false;
    return GAUGE_PRESSURE_UNITS.has(unit.toLowerCase());
}

function toAbsolutePressureValue(value: number, unit: string): number {
    const normalizedUnit = unit || 'barg';
    const pa = convertUnit(value, normalizedUnit, 'Pa');
    return isGaugePressureUnit(normalizedUnit) ? pa + ATMOSPHERE_PA : pa;
}

function parseNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined) return NaN;
    if (typeof value === 'number') return value;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : NaN;
}

export function getPressureValidationError(value: string | number | null | undefined, unit: string, label: string = 'Pressure'): string | null {
    const numeric = parseNumber(value);
    if (!Number.isFinite(numeric)) {
        return `${label} is required`;
    }
    const absolute = toAbsolutePressureValue(numeric, unit);
    if (!(absolute > 0)) {
        return `${label} must be greater than 0 Pa absolute`;
    }
    return null;
}

export function getTemperatureValidationError(value: string | number | null | undefined, unit: string, label: string = 'Temperature'): string | null {
    const numeric = parseNumber(value);
    if (!Number.isFinite(numeric)) {
        return `${label} is required`;
    }
    const normalizedUnit = normalizeTemperatureUnit(unit);
    const kelvin = convertUnit(numeric, normalizedUnit, 'K');
    if (!(kelvin > 0)) {
        return `${label} must be greater than 0 K`;
    }
    return null;
}

export function getPositiveNumberError(value: string | number | null | undefined, label: string): string | null {
    const numeric = parseNumber(value);
    if (!Number.isFinite(numeric)) {
        return `${label} is required`;
    }
    if (numeric <= 0) {
        return `${label} must be greater than 0`;
    }
    return null;
}
