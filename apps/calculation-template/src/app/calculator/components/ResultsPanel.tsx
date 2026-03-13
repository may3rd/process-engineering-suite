"use client"

import { SectionCard } from "./SectionCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Circle } from "lucide-react"
import type { CalculationResult, ValidationIssue, DerivedGeometry } from "@/types"

interface Props {
  calculationResult: CalculationResult | null
  validationIssues: ValidationIssue[] | null
  derivedGeometry: DerivedGeometry | null
}

export function ResultsPanel({ calculationResult, validationIssues }: Props) {
  return (
    <div className="space-y-4">
      {/* Empty state — show what's still needed */}
      {!calculationResult && !validationIssues && (
        <RequirementsChecklist />
      )}

      {/* Validation issues — form looks complete but schema rejects the data */}
      {!calculationResult && validationIssues && validationIssues.length > 0 && (
        <ValidationIssuesCard issues={validationIssues} />
      )}

      {calculationResult && (
        <SectionCard title="Results">
          {/* TODO: Add app-specific results display here */}
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
            {JSON.stringify(calculationResult, null, 2)}
          </pre>
        </SectionCard>
      )}
    </div>
  )
}

// ─── Requirements checklist (empty state) ─────────────────────────────────────
// TODO: Replace with app-specific checks using useFormContext<YourInput>()

function RequirementsChecklist() {
  const requiredChecks = [
    { label: "Equipment tag", hint: "Tag / equipment number", done: false },
    { label: "Key input A", hint: "e.g. flow rate, diameter", done: false },
    { label: "Key input B", hint: "e.g. pressure, temperature", done: false },
  ]

  const optionalChecks = [
    { label: "Optional field", hint: "Improves accuracy", done: false },
  ]

  const allChecks = [
    ...requiredChecks.map((c) => ({ ...c, optional: false })),
    ...optionalChecks.map((c) => ({ ...c, optional: true })),
  ]

  const missingRequired = requiredChecks.filter((c) => !c.done).length

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Results</CardTitle>
          {missingRequired === 0 ? (
            <Badge variant="secondary" className="text-xs">All fields complete</Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {missingRequired} required {missingRequired !== 1 ? "fields" : "field"} missing
            </Badge>
          )}
        </div>
        <Separator />
      </CardHeader>
      <CardContent className="space-y-1.5 pt-1">
        <p className="text-xs text-muted-foreground mb-3">
          Complete the following to generate results:
        </p>
        {allChecks.map((check) => (
          <ChecklistItem key={check.label} check={check} optional={check.optional} />
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Validation issues card ───────────────────────────────────────────────────

export function ValidationIssuesCard({ issues }: { issues: ValidationIssue[] }) {
  return (
    <Card className="shadow-sm border-orange-300/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Results</CardTitle>
          <Badge variant="outline" className="text-xs text-orange-600">
            {issues.length} validation {issues.length !== 1 ? "issues" : "issue"}
          </Badge>
        </div>
        <Separator />
      </CardHeader>
      <CardContent className="space-y-1.5 pt-1">
        <p className="text-xs text-muted-foreground mb-3">
          Fix the following to generate results:
        </p>
        {issues.map((issue, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium leading-tight">{issue.message}</p>
              {issue.field && (
                <p className="text-xs text-muted-foreground/70 leading-tight mt-0.5">
                  Field: {issue.field}
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Shared checklist item ────────────────────────────────────────────────────

export function ChecklistItem({
  check,
  optional,
}: {
  check: { label: string; hint: string; done: boolean }
  optional: boolean
}) {
  return (
    <div className="flex items-start gap-2.5">
      {check.done ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
      ) : (
        <Circle
          className={`h-4 w-4 shrink-0 mt-0.5 ${optional ? "text-muted-foreground/40" : "text-orange-400"}`}
        />
      )}
      <div>
        <p
          className={`text-xs font-medium leading-tight ${check.done
            ? "text-muted-foreground line-through"
            : optional
              ? "text-muted-foreground"
              : ""
            }`}
        >
          {check.label}
          {optional && !check.done && (
            <span className="ml-1.5 font-normal text-muted-foreground/60">optional</span>
          )}
        </p>
        {!check.done && (
          <p className="text-xs text-muted-foreground/70 leading-tight mt-0.5">
            {check.hint}
          </p>
        )}
      </div>
    </div>
  )
}
