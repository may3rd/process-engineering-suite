import { useMemo } from "react"
import { useWatch, type Control } from "react-hook-form"
import type { CalculationInput, CalculationResult } from "@/types"

/**
 * useCalculation — React hook that re-runs calculations when form values change.
 * Encapsulates the reactive logic for the ResultsPanel.
 */
export function useCalculation(control: Control<CalculationInput>) {
  // Watch all inputs for changes
  const inputs = useWatch({ control })

  return useMemo(() => {
    // 1. Basic validation check (skip if required inputs are missing)
    if (!inputs.tag || inputs.pressure === undefined || inputs.temperature === undefined) {
      return { calculationResult: null }
    }

    // 2. Perform the actual engineering math
    // Example logic for the template
    const mainMetric = (inputs.pressure ?? 0) * 1.5 + (inputs.temperature ?? 0) * 0.1
    const secondaryMetric = (inputs.flowrate ?? 0) * (inputs.length ?? 1) / 100
    const margin = mainMetric > 0 ? (mainMetric - (inputs.pressure ?? 0)) / mainMetric * 100 : 0

    // 3. Assemble the result object
    const result: CalculationResult = {
      mainMetric,
      secondaryMetric,
      summary: {
        isSafe: margin > 10, // simple safety rule for template
        margin,
      },
      calculatedAt: new Date().toISOString(),
    }

    return {
      calculationResult: result,
    }
  }, [inputs])
}
