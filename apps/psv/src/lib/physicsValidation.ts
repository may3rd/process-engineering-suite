import { convertUnit } from "@eng-suite/physics";

const ATMOSPHERE_PA = 101325;

const GAUGE_PRESSURE_UNITS = new Set([
  "barg",
  "psig",
  "kpag",
  "mpag",
  "kg/cm2g",
]);

const TEMP_ALIAS: Record<string, string> = {
  "°c": "c",
  "°f": "f",
  C: "c",
  F: "f",
  K: "k",
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
  const normalizedUnit = unit || "barg";
  const pa = convertUnit(value, normalizedUnit, "Pa");
  return isGaugePressureUnit(normalizedUnit) ? pa + ATMOSPHERE_PA : pa;
}

function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return NaN;
  if (typeof value === "number") return value;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function getPressureValidationError(
  value: string | number | null | undefined,
  unit: string,
  label: string = "Pressure",
): string | null {
  const numeric = parseNumber(value);
  if (!Number.isFinite(numeric)) {
    return `${label} is required`;
  }
  const absolute = toAbsolutePressureValue(numeric, unit);
  if (!(absolute > 0)) {
    const gaugeDisplay = isGaugePressureUnit(unit)
      ? `${numeric} ${unit}`
      : `${Math.round(convertUnit(absolute, "Pa", "barg"))} barg`;
    return `${label} (${gaugeDisplay}) is below absolute zero. Must be >0 Pa absolute.`;
  }
  return null;
}

export function getTemperatureValidationError(
  value: string | number | null | undefined,
  unit: string,
  label: string = "Temperature",
): string | null {
  const numeric = parseNumber(value);
  if (!Number.isFinite(numeric)) {
    return `${label} is required`;
  }
  const normalizedUnit = normalizeTemperatureUnit(unit);
  const kelvin = convertUnit(numeric, normalizedUnit, "K");
  if (!(kelvin > 0)) {
    const displayValue = `${numeric} ${unit}`;
    return `${label} (${displayValue}) is below absolute zero. Must be >0 K (> -273.15 °C).`;
  }
  return null;
}

export function getPositiveNumberError(
  value: string | number | null | undefined,
  label: string,
): string | null {
  const numeric = parseNumber(value);
  if (!Number.isFinite(numeric)) {
    return `${label} is required`;
  }
  if (numeric <= 0) {
    return `${label} must be greater than 0`;
  }
  return null;
}

export function getNonNegativeNumberError(
  value: string | number | null | undefined,
  label: string,
): string | null {
  const numeric = parseNumber(value);
  if (!Number.isFinite(numeric)) {
    return `${label} is required`;
  }
  if (numeric < 0) {
    return `${label} must be 0 or greater`;
  }
  return null;
}

export function getRangeValidationError(
  value: number | null | undefined,
  min: number,
  max: number,
  unit: string = "",
  label: string = "Value",
): string | null {
  if (value === undefined || value === null || isNaN(value)) return null;
  if (min !== undefined && value < min) {
    return `${label} (${value}${unit ? " " + unit : ""}) is below minimum of ${min}${unit ? " " + unit : ""}`;
  }
  if (max !== undefined && value > max) {
    return `${label} (${value}${unit ? " " + unit : ""}) exceeds maximum of ${max}${unit ? " " + unit : ""}`;
  }
  return null;
}
