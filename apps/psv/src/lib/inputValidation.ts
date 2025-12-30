/**
 * Input validation for PSV sizing calculations.
 * Validates required parameters based on relieving phase (gas, liquid, steam, two-phase).
 *
 * All values are stored in SI base units:
 * - Temperature: °C (must convert to K for validation: > 0 K means > -273.15 °C)
 * - Pressure: kPa (must be > 0 kPa absolute)
 * - Viscosity: cP (required by API for all phases)
 */

import { SizingInputs, SizingMethod } from "@/data/types";

export interface ValidationError {
  field: keyof SizingInputs | "general";
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Check if a numeric value is defined and positive
 */
function isPositive(value: number | undefined): boolean {
  return value !== undefined && !isNaN(value) && value > 0;
}

/**
 * Check if a numeric value is defined and non-negative
 */
function isNonNegative(value: number | undefined): boolean {
  return value !== undefined && !isNaN(value) && value >= 0;
}

/**
 * Validate common inputs required for all phases
 */
function validateCommon(inputs: SizingInputs): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!isPositive(inputs.massFlowRate)) {
    errors.push({
      field: "massFlowRate",
      message: "Mass flow rate must be positive",
      severity: "error",
    });
  }

  // Temperature stored in °C, must be > -273.15 (0 K)
  if (
    inputs.temperature === undefined ||
    isNaN(inputs.temperature) ||
    inputs.temperature <= -273.15
  ) {
    errors.push({
      field: "temperature",
      message: "Temperature must be > 0 K (> -273.15 °C)",
      severity: "error",
    });
  }

  // Pressure must be > 0 (absolute)
  if (!isPositive(inputs.pressure)) {
    errors.push({
      field: "pressure",
      message: "Set pressure must be > 0 (absolute)",
      severity: "error",
    });
  }

  // Backpressure can be 0 (atmospheric) or undefined (treated as 0)
  const backpressure = inputs.backpressure ?? 0;
  if (isNaN(backpressure) || backpressure < 0) {
    errors.push({
      field: "backpressure",
      message: "Backpressure must be non-negative",
      severity: "error",
    });
  }

  return errors;
}

/**
 * Validate gas/vapor phase inputs (also used for steam)
 */
function validateGas(inputs: SizingInputs): {
  errors: ValidationError[];
  warnings: ValidationError[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!isPositive(inputs.molecularWeight)) {
    errors.push({
      field: "molecularWeight",
      message: "Molecular weight must be positive",
      severity: "error",
    });
  }

  if (!isPositive(inputs.compressibilityZ)) {
    errors.push({
      field: "compressibilityZ",
      message: "Compressibility factor (Z) must be positive",
      severity: "error",
    });
  } else if (inputs.compressibilityZ > 1.5) {
    warnings.push({
      field: "compressibilityZ",
      message: "Z factor > 1.5 is unusual, please verify",
      severity: "warning",
    });
  }

  if (
    !isPositive(inputs.specificHeatRatio) ||
    (inputs.specificHeatRatio && inputs.specificHeatRatio <= 1)
  ) {
    errors.push({
      field: "specificHeatRatio",
      message: "Specific heat ratio (k) must be > 1",
      severity: "error",
    });
  }

  // Gas viscosity is REQUIRED by API
  if (!isPositive(inputs.gasViscosity) && !isPositive(inputs.viscosity)) {
    errors.push({
      field: "gasViscosity",
      message: "Gas viscosity must be positive (required by API)",
      severity: "error",
    });
  }

  return { errors, warnings };
}

/**
 * Validate liquid phase inputs
 */
function validateLiquid(inputs: SizingInputs): {
  errors: ValidationError[];
  warnings: ValidationError[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const density = inputs.liquidDensity ?? inputs.density;
  if (!isPositive(density)) {
    errors.push({
      field: "liquidDensity",
      message: "Liquid density must be positive",
      severity: "error",
    });
  }

  // Liquid viscosity is REQUIRED by API
  const viscosity = inputs.liquidViscosity ?? inputs.viscosity;
  if (!isPositive(viscosity)) {
    errors.push({
      field: "liquidViscosity",
      message: "Liquid viscosity must be positive (required by API)",
      severity: "error",
    });
  }

  return { errors, warnings };
}

/**
 * Validate two-phase inputs (requires both gas and liquid properties)
 */
function validateTwoPhase(inputs: SizingInputs): {
  errors: ValidationError[];
  warnings: ValidationError[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Vapor fraction is required for two-phase
  if (inputs.vaporFraction === undefined || isNaN(inputs.vaporFraction)) {
    errors.push({
      field: "vaporFraction",
      message: "Vapor fraction (quality) is required for two-phase flow",
      severity: "error",
    });
  } else if (inputs.vaporFraction < 0 || inputs.vaporFraction > 1) {
    errors.push({
      field: "vaporFraction",
      message: "Vapor fraction must be between 0 and 1",
      severity: "error",
    });
  }

  // Validate gas properties
  const gasValidation = validateGas(inputs);
  errors.push(...gasValidation.errors);
  warnings.push(...gasValidation.warnings);

  // Validate liquid properties
  const liquidValidation = validateLiquid(inputs);
  errors.push(...liquidValidation.errors);
  warnings.push(...liquidValidation.warnings);

  return { errors, warnings };
}

/**
 * Main validation function - validates inputs based on sizing method (phase)
 */
export function validateSizingInputs(
  method: SizingMethod,
  inputs: SizingInputs,
): ValidationResult {
  const commonErrors = validateCommon(inputs);

  // Validate phase-specific inputs
  let phaseErrors: ValidationError[] = [];
  let phaseWarnings: ValidationError[] = [];

  switch (method) {
    case "gas":
      const gasResult = validateGas(inputs);
      phaseErrors = gasResult.errors;
      phaseWarnings = gasResult.warnings;
      break;
    case "liquid":
      const liquidResult = validateLiquid(inputs);
      phaseErrors = liquidResult.errors;
      phaseWarnings = liquidResult.warnings;
      break;
    case "steam":
      // Steam uses same validation as gas (MW, Z, k, viscosity)
      const steamResult = validateGas(inputs);
      phaseErrors = steamResult.errors;
      phaseWarnings = steamResult.warnings;
      break;
    case "two_phase":
      const twoPhaseResult = validateTwoPhase(inputs);
      phaseErrors = twoPhaseResult.errors;
      phaseWarnings = twoPhaseResult.warnings;
      break;
  }

  const allErrors = [...commonErrors, ...phaseErrors];
  const allWarnings = phaseWarnings;

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Get a user-friendly field label
 */
export function getFieldLabel(field: keyof SizingInputs | "general"): string {
  const labels: Record<string, string> = {
    massFlowRate: "Mass Flow Rate",
    temperature: "Temperature",
    pressure: "Set Pressure",
    backpressure: "Backpressure",
    molecularWeight: "Molecular Weight",
    compressibilityZ: "Compressibility (Z)",
    specificHeatRatio: "Specific Heat Ratio (k)",
    gasViscosity: "Gas Viscosity",
    liquidDensity: "Liquid Density",
    liquidViscosity: "Liquid Viscosity",
    vaporFraction: "Vapor Fraction",
    general: "General",
  };
  return labels[field] || field;
}

export function getValidationResultDisplay(result: ValidationResult): {
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
  hasAnyIssues: boolean;
} {
  return {
    errors: result.errors.map((e) => ({
      field: getFieldLabel(e.field),
      message: e.message,
    })),
    warnings: result.warnings.map((w) => ({
      field: getFieldLabel(w.field),
      message: w.message,
    })),
    hasAnyIssues: result.errors.length > 0 || result.warnings.length > 0,
  };
}
