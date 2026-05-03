"use client"

import { useMemo } from "react"
import { useWatch, type Control } from "react-hook-form"
import type { CalculationInput, CalculationResult, ValidationIssue } from "@/types"
import { calculate } from "@/lib/calculations"

export interface UseCalculationResult {
  calculationResult: CalculationResult | null
  validationIssues: ValidationIssue[] | null
}

/**
 * Hook that watches form values and runs the calculation whenever inputs change.
 * Returns null for calculationResult when inputs are incomplete/invalid.
 */
export function useCalculation(control: Control<CalculationInput>): UseCalculationResult {
  const watchedValues = useWatch({ control })

  return useMemo(() => {
    if (
      !watchedValues.tankDiameter ||
      !watchedValues.tankHeight ||
      watchedValues.fluidTemp === undefined ||
      watchedValues.ambientTemp === undefined
    ) {
      return { calculationResult: null, validationIssues: null }
    }

    try {
      const input = watchedValues as CalculationInput
      const result = calculate(input)
      return { calculationResult: result, validationIssues: null }
    } catch {
      return { calculationResult: null, validationIssues: null }
    }
  }, [watchedValues])
}
