"use client"

import { CheckCircle2 } from "lucide-react"
import { SectionCard } from "./SectionCard"
import { SummaryResult } from "../results/SummaryResult"
import { VolumeResult } from "../results/VolumeResult"
import { SurfaceAreaResult } from "../results/SurfaceAreaResult"
import { MassTimingResult } from "../results/MassTimingResult"
import type { CalculationResult } from "@/types"

interface Props {
  calculationResult: CalculationResult | null
}

export function ResultsPanel({ calculationResult }: Props) {
  if (!calculationResult) {
    return (
      <div className="space-y-4">
        <SectionCard title="Results">
          <div className="py-6 text-center space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Enter valid inputs to see results
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold mb-2">Required inputs:</p>
              <div className="flex items-center gap-2 justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Tag / Equipment number</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Inside diameter</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Shell length (TL–TL)</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Orientation &amp; head type</span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SummaryResult result={calculationResult} />
      <VolumeResult result={calculationResult} />
      <SurfaceAreaResult result={calculationResult} />
      <MassTimingResult result={calculationResult} />
    </div>
  )
}
