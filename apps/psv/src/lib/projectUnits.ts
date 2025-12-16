import { UnitSystem } from "@/data/types";
import { convertUnit } from "@eng-suite/physics";

export type ProjectUnits = {
    pressureGauge: { unit: string; label: string };
    pressureDrop: { unit: string; label: string };
    temperature: { unit: string; label: string };
    massFlow: { unit: string; label: string };
    length: { unit: string; label: string };
    diameter: { unit: string; label: string };
    area: { unit: string; label: string };
};

export function getProjectUnits(system: UnitSystem): ProjectUnits {
    switch (system) {
        case "imperial":
            return {
                pressureGauge: { unit: "psig", label: "psig" },
                pressureDrop: { unit: "psi", label: "psi" },
                temperature: { unit: "F", label: "°F" },
                massFlow: { unit: "lb/h", label: "lb/h" },
                length: { unit: "ft", label: "ft" },
                diameter: { unit: "in", label: "in" },
                area: { unit: "in2", label: "in²" },
            };
        case "metric_kgcm2":
            return {
                pressureGauge: { unit: "kg/cm2g", label: "kg/cm²(g)" },
                pressureDrop: { unit: "kg/cm2", label: "kg/cm²" },
                temperature: { unit: "C", label: "°C" },
                massFlow: { unit: "kg/h", label: "kg/h" },
                length: { unit: "m", label: "m" },
                diameter: { unit: "mm", label: "mm" },
                area: { unit: "mm2", label: "mm²" },
            };
        case "fieldSI":
            return {
                pressureGauge: { unit: "kPag", label: "kPag" },
                pressureDrop: { unit: "kPa", label: "kPa" },
                temperature: { unit: "C", label: "°C" },
                massFlow: { unit: "kg/h", label: "kg/h" },
                length: { unit: "m", label: "m" },
                diameter: { unit: "mm", label: "mm" },
                area: { unit: "mm2", label: "mm²" },
            };
        case "metric":
        default:
            return {
                pressureGauge: { unit: "barg", label: "barg" },
                pressureDrop: { unit: "kPa", label: "kPa" },
                temperature: { unit: "C", label: "°C" },
                massFlow: { unit: "kg/h", label: "kg/h" },
                length: { unit: "m", label: "m" },
                diameter: { unit: "mm", label: "mm" },
                area: { unit: "mm2", label: "mm²" },
            };
    }
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
    if (value === undefined || value === null) return "—";
    if (!Number.isFinite(value)) return "—";
    return value.toFixed(digits);
}

export function formatLocaleNumber(value: number | null | undefined, digits = 0): string {
    if (value === undefined || value === null) return "—";
    if (!Number.isFinite(value)) return "—";
    return value.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
}

export function formatWithUnit(value: number | null | undefined, unitLabel: string, digits = 2): string {
    const formatted = formatNumber(value, digits);
    return formatted === "—" ? formatted : `${formatted} ${unitLabel}`;
}

export function convertValue(value: number | null | undefined, fromUnit: string, toUnit: string): number | undefined {
    if (value === undefined || value === null) return undefined;
    if (!Number.isFinite(value)) return undefined;
    return convertUnit(value, fromUnit, toUnit);
}

export function formatPressureGauge(valueBarg: number | null | undefined, system: UnitSystem, digits = 2): string {
    const units = getProjectUnits(system);
    const converted = convertValue(valueBarg, "barg", units.pressureGauge.unit);
    return formatWithUnit(converted, units.pressureGauge.label, digits);
}

export function formatPressureDrop(valueKPa: number | null | undefined, system: UnitSystem, digits = 2): string {
    const units = getProjectUnits(system);
    const converted = convertValue(valueKPa, "kPa", units.pressureDrop.unit);
    return formatWithUnit(converted, units.pressureDrop.label, digits);
}

export function formatTemperatureC(valueC: number | null | undefined, system: UnitSystem, digits = 1): string {
    const units = getProjectUnits(system);
    const converted = convertValue(valueC, "C", units.temperature.unit);
    return formatWithUnit(converted, units.temperature.label, digits);
}

export function formatMassFlowKgH(valueKgH: number | null | undefined, system: UnitSystem, digits = 0): string {
    const units = getProjectUnits(system);
    const converted = convertValue(valueKgH, "kg/h", units.massFlow.unit);
    if (converted === undefined) return "—";
    const rounded = Number.isFinite(converted) ? converted : undefined;
    return rounded === undefined ? "—" : `${converted.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })} ${units.massFlow.label}`;
}
