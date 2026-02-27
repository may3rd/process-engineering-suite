"use client"

import { useMemo } from "react"
import { useWatch } from "react-hook-form"
import type { Control } from "react-hook-form"
import { z } from "zod"
import { calculationInputSchema } from "@/lib/validation/inputSchema"
import { computeDerivedGeometry } from "@/lib/calculations/geometry"
import { calculate } from "@/lib/calculations"
import { TankConfiguration } from "@/types"
import type { CalculationInput, CalculationResult, DerivedGeometry } from "@/types"

// Minimal schema covering only the fields needed for client-side geometry.
const nanOptionalPositive = z
  .number()
  .positive()
  .optional()
  .or(z.nan().transform(() => undefined))

const nanOptionalNonneg = z
  .number()
  .nonnegative()
  .optional()
  .or(z.nan().transform(() => undefined))

const geometrySchema = z
  .object({
    diameter: z.number().positive(),
    height: z.number().positive(),
    latitude: z.number().gt(0).lte(90),
    designPressure: z.number().positive(),
    tankConfiguration: z.nativeEnum(TankConfiguration),
    insulationThickness: nanOptionalPositive,
    insulationConductivity: nanOptionalPositive,
    insideHeatTransferCoeff: nanOptionalPositive,
    insulatedSurfaceArea: nanOptionalNonneg,
  })
  .passthrough()

export interface UseCalculationReturn {
  calculationResult: CalculationResult | null
  derivedGeometry: DerivedGeometry | null
  validationIssues: Array<{ path: string; message: string }> | null
}

export function useCalculation(control: Control<CalculationInput>): UseCalculationReturn {
  const formValues = useWatch({ control })

  return useMemo(() => {
    let derivedGeometry: DerivedGeometry | null = null
    let calculationResult: CalculationResult | null = null
    let validationIssues: Array<{ path: string; message: string }> | null = null

    // 1. Compute geometry if possible
    const geoParsed = geometrySchema.safeParse(formValues)
    if (geoParsed.success) {
      try {
        derivedGeometry = computeDerivedGeometry(geoParsed.data as unknown as CalculationInput)
      } catch {
        // e.g. INSULATED_FULL without insulation params — not yet fatal
      }
    }

    // 2. Full calculation
    const parsed = calculationInputSchema.safeParse(formValues)
    if (!parsed.success) {
      const hasBasicFields =
        typeof formValues.tankNumber === "string" &&
        formValues.tankNumber.trim().length > 0 &&
        typeof formValues.diameter === "number" &&
        Number.isFinite(formValues.diameter) &&
        typeof formValues.height === "number" &&
        Number.isFinite(formValues.height) &&
        typeof formValues.avgStorageTemp === "number" &&
        Number.isFinite(formValues.avgStorageTemp)

      validationIssues = hasBasicFields
        ? parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }))
        : null

      return { calculationResult, derivedGeometry, validationIssues }
    }

    // 3. Cross-validate insulatedSurfaceArea
    if (derivedGeometry && parsed.data.insulatedSurfaceArea !== undefined) {
      if (parsed.data.insulatedSurfaceArea > derivedGeometry.totalSurfaceArea) {
        validationIssues = [{
          path: "insulatedSurfaceArea",
          message: `Insulated surface area (${parsed.data.insulatedSurfaceArea.toFixed(2)} m²) exceeds total tank surface area (${derivedGeometry.totalSurfaceArea.toFixed(2)} m²)`,
        }]
        return { calculationResult, derivedGeometry, validationIssues }
      }
    }

    // 4. Calculate
    try {
      calculationResult = calculate(parsed.data)
    } catch {
      // Something unexpected
    }

    return { calculationResult, derivedGeometry, validationIssues }
  }, [formValues])
}
