import { describe, it, expect } from "vitest";
import { validateSizingInputs } from "../inputValidation";
import type { SizingInputs } from "@/data/types";

// Mock minimal SizingInputs for testing
interface MockSizingInputs {
  massFlowRate?: number;
  temperature?: number;
  pressure?: number;
  backpressure?: number;
  molecularWeight?: number;
  compressibilityZ?: number;
  viscosity?: number;
  liquidDensity?: number;
  specificHeatRatio?: number;
  gasViscosity?: number;
  liquidViscosity?: number;
  vaporFraction?: number;
  backpressureType?: "superimposed" | "built_up";
}

describe("Input Validation", () => {
  // Create a helper to convert our mock to the real type
  const createMockInputs = (
    overrides: Partial<MockSizingInputs> = {},
  ): SizingInputs => ({
    massFlowRate: 1000,
    temperature: 25,
    pressure: 100,
    backpressure: 10,
    molecularWeight: 29,
    compressibilityZ: 1.0,
    liquidDensity: 1.2,
    specificHeatRatio: 1.4,
    gasViscosity: 0.01,
    backpressureType: "superimposed" as const,
    ...overrides,
  });

  describe("Basic Validation", () => {
    it("accepts valid inputs", () => {
      const inputs = createMockInputs();
      const result = validateSizingInputs("gas", inputs);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects negative mass flow rate", () => {
      const inputs = createMockInputs({ massFlowRate: -100 });
      const result = validateSizingInputs("gas", inputs);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "massFlowRate")).toBe(true);
    });

    it("rejects invalid temperature", () => {
      const inputs = createMockInputs({ temperature: -300 });
      const result = validateSizingInputs("gas", inputs);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "temperature")).toBe(true);
    });

    it("rejects negative pressure", () => {
      const inputs = createMockInputs({ pressure: -10 });
      const result = validateSizingInputs("gas", inputs);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "pressure")).toBe(true);
    });

    it("accepts zero backpressure", () => {
      const inputs = createMockInputs({ backpressure: 0 });
      const result = validateSizingInputs("gas", inputs);

      expect(result.isValid).toBe(true);
    });

    it("rejects negative backpressure", () => {
      const inputs = createMockInputs({ backpressure: -5 });
      const result = validateSizingInputs("gas", inputs);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "backpressure")).toBe(true);
    });
  });

  describe("Gas Phase Validation", () => {
    it("validates molecular weight for gas phase", () => {
      const inputs = createMockInputs({
        molecularWeight: 0,
      });
      const result = validateSizingInputs("gas", inputs);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "molecularWeight")).toBe(
        true,
      );
    });

    it("warns about unusual compressibility", () => {
      const inputs = createMockInputs({
        compressibilityZ: 2.0, // Above typical range (> 1.5)
      });
      const result = validateSizingInputs("gas", inputs);

      expect(result.isValid).toBe(true); // Warning, not error
      expect(result.warnings.some((w) => w.field === "compressibilityZ")).toBe(
        true,
      );
    });

    it("rejects invalid specific heat ratio", () => {
      const inputs = createMockInputs({
        specificHeatRatio: 1.0, // Must be > 1
      });
      const result = validateSizingInputs("gas", inputs);

      expect(result.isValid).toBe(false); // Error, not warning
      expect(result.errors.some((e) => e.field === "specificHeatRatio")).toBe(
        true,
      );
    });
  });

  describe("Liquid Phase Validation", () => {
    it("requires density for liquid phase", () => {
      const inputs = createMockInputs({
        liquidDensity: undefined,
      });
      const result = validateSizingInputs("liquid", inputs);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "liquidDensity")).toBe(true);
    });

    it("rejects negative density", () => {
      const inputs = createMockInputs({
        liquidDensity: -1,
      });
      const result = validateSizingInputs("liquid", inputs);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "liquidDensity")).toBe(true);
    });
  });

  describe("Steam Phase Validation", () => {
    it("validates steam inputs using gas validation", () => {
      const inputs = createMockInputs();
      const result = validateSizingInputs("steam", inputs);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Two-Phase Validation", () => {
    it("requires density for two-phase", () => {
      const inputs = createMockInputs({
        liquidDensity: undefined,
      });
      const result = validateSizingInputs("two_phase", inputs);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "liquidDensity")).toBe(true);
    });
  });

  describe("Error Accumulation", () => {
    it("accumulates multiple validation errors", () => {
      const inputs = createMockInputs({
        massFlowRate: -100,
        temperature: -300,
        pressure: 0,
      });
      const result = validateSizingInputs("gas", inputs);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it("accumulates warnings correctly", () => {
      const inputs = createMockInputs({
        compressibilityZ: 2.0, // > 1.5 triggers warning
      });
      const result = validateSizingInputs("gas", inputs);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
