"use client"

import type { CalculationResult } from "@/types"
import { SectionCard } from "./SectionCard"
import { UOM_LABEL, BASE_UNITS } from "@/lib/uom"
import { convertUnit } from "@eng-suite/physics"
import { useUomStore } from "@/lib/store/uomStore"

interface ResultsPanelProps {
  calculationResult: CalculationResult | null
}

/**
 * ResultsPanel — right-aligned column with results display.
 */
export function ResultsPanel({ calculationResult }: ResultsPanelProps) {
  const { units } = useUomStore()

  if (!calculationResult) {
    return (
      <div className="rounded-md border border-dashed py-12 flex flex-col items-center justify-center text-center">
        <p className="text-sm italic text-muted-foreground">
          Enter valid inputs to see results.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Top-level Summary (KPIs) */}
      <SectionCard title="Calculation Summary" className="border-primary/30 bg-primary/5">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Primary Metric</p>
            <p className="text-xl font-bold font-mono tabular-nums">
              {calculationResult.mainMetric.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">kPag</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Secondary Metric</p>
            <p className="text-xl font-bold font-mono tabular-nums">
              {calculationResult.secondaryMetric.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">m³/h</p>
          </div>
        </div>
      </SectionCard>

      {/* 2. Detailed Result Data */}
      <SectionCard title="Detailed Results">
        <div className="rounded-md border overflow-hidden divide-y text-xs">
          {/* Section header */}
          <div className="px-3 py-1.5 bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Result Breakdown
          </div>
          
          {/* Data row pattern */}
          <div className="flex justify-between items-center px-3 py-1.5">
            <span>Main Metric (Raw)</span>
            <span className="font-mono tabular-nums">
              {calculationResult.mainMetric.toFixed(4)} <span className="text-muted-foreground">kPag</span>
            </span>
          </div>

          <div className="flex justify-between items-center px-3 py-1.5">
            <span>Secondary Metric (Raw)</span>
            <span className="font-mono tabular-nums">
              {calculationResult.secondaryMetric.toFixed(4)} <span className="text-muted-foreground">m³/h</span>
            </span>
          </div>

          {/* Total / emphasis row pattern */}
          <div className="flex justify-between items-center px-3 py-1.5 bg-muted/30 font-semibold">
            <span>Safety Margin</span>
            <span className="font-mono tabular-nums">
              {calculationResult.summary.margin.toFixed(1)} <span className="text-muted-foreground">%</span>
            </span>
          </div>
        </div>
      </SectionCard>
      
      {/* 3. Status/Validation */}
      {calculationResult.summary.isSafe ? (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 font-medium">
          Calculation status: Sufficient capacity/margin.
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive font-medium">
          Calculation status: Insufficient capacity/margin detected.
        </div>
      )}
    </div>
  )
}
