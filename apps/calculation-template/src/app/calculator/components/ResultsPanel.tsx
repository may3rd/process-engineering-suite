"use client"

import { SectionCard } from "./SectionCard"
import type { CalculationResult, ValidationIssue, DerivedGeometry } from "@/types"
import { CheckCircle2 } from "lucide-react"

interface Props {
  calculationResult: CalculationResult | null
  validationIssues: ValidationIssue[]
  derivedGeometry: DerivedGeometry | null
}

export function ResultsPanel({ calculationResult, validationIssues }: Props) {
  if (!calculationResult && validationIssues.length > 0) {
    return (
      <div className="space-y-4">
        <SectionCard title="Results">
          <div className="py-6 text-center space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Enter valid inputs to see results
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold mb-2">Required inputs missing:</p>
              {validationIssues.map((issue) => (
                <div key={issue.code || issue.message} className="flex gap-2 justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Results">
        {/* TODO: Add app specific results displaying logic here */}
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
          {JSON.stringify(calculationResult, null, 2)}
        </pre>
      </SectionCard>
    </div>
  )
}
