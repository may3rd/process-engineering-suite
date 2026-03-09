"use client"

import { useFormContext } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Circle } from "lucide-react"
import { SectionCard } from "./SectionCard"
import { SummaryResult } from "@/app/calculator/results/SummaryResult"
import { PressureResult } from "@/app/calculator/results/PressureResult"
import { PowerResult } from "@/app/calculator/results/PowerResult"
import { OptionalResults } from "@/app/calculator/results/OptionalResults"
import type { PumpCalculationResult, CalculationInput } from "@/types"

interface Props {
  result: PumpCalculationResult | null
  validationIssues: Array<{ path: string; message: string }> | null
}

export function ResultsPanel({ result, validationIssues }: Props) {
  return (
    <div className="space-y-4">
      {/* Empty state — show what's still needed */}
      {!result && !validationIssues && (
        <RequirementsChecklist />
      )}

      {/* Validation issues — cross-field rules failed */}
      {!result && validationIssues && validationIssues.length > 0 && (
        <ValidationIssuesCard issues={validationIssues} />
      )}

      {result && (
        <>
          <SectionCard title="Results Summary">
            <SummaryResult result={result} />
          </SectionCard>
          <PressureResult result={result} />
          <PowerResult result={result} />
          <OptionalResults result={result} />
        </>
      )}
    </div>
  )
}

// ─── Pump-specific requirements checklist ─────────────────────────────────────

function RequirementsChecklist() {
  const { watch } = useFormContext<CalculationInput>()
  const values = watch()

  const isValidPositive = (v: unknown) =>
    typeof v === "number" && !isNaN(v) && isFinite(v) && v > 0

  const requiredChecks = [
    {
      label: "Equipment tag",
      hint: "Tag / equipment number — e.g. P-101A",
      done: typeof values.tag === "string" && values.tag.trim().length > 0,
    },
    {
      label: "Design flow rate",
      hint: "Must be a positive number (m³/h)",
      done: isValidPositive(values.flowDesign),
    },
    {
      label: "Specific gravity (SG)",
      hint: "Liquid SG relative to water at 15 °C — must be > 0",
      done: isValidPositive(values.sg),
    },
    ...(values.showOrifice
      ? [
        {
          label: "Orifice — pipe inside diameter",
          hint: "Required when orifice section is enabled",
          done: isValidPositive(values.orificePipeId),
        },
        {
          label: "Orifice — beta ratio (β)",
          hint: "Must be between 0.1 and 0.9",
          done:
            typeof values.orificeBeta === "number" &&
            !isNaN(values.orificeBeta) &&
            values.orificeBeta >= 0.1 &&
            values.orificeBeta <= 0.9,
        },
      ]
      : []),
    ...(values.showMinFlow
      ? [
        {
          label: "Min flow — specific heat",
          hint: "Required when minimum flow section is enabled (kJ/kg·°C)",
          done: isValidPositive(values.specificHeat),
        },
        {
          label: "Min flow — allowed temperature rise",
          hint: "Typical 8–15 °C",
          done: isValidPositive(values.allowedTempRise),
        },
        {
          label: "Shut-off section enabled",
          hint: "Required for minimum flow calculation — enable the Shut-off section",
          done: values.showShutoff === true,
        },
      ]
      : []),
  ]

  const optionalChecks = [
    {
      label: "Fluid name",
      hint: "Label for the working fluid — appears on PDF report",
      done: typeof values.fluidName === "string" && values.fluidName.trim().length > 0,
    },
    {
      label: "Vapour pressure",
      hint: "Required for accurate NPSHa — defaults to 0 kPa (abs)",
      done:
        typeof values.vapourPressure === "number" &&
        !isNaN(values.vapourPressure) &&
        values.vapourPressure > 0,
    },
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

function ValidationIssuesCard({ issues }: { issues: Array<{ path: string; message: string }> }) {
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
              {issue.path && (
                <p className="text-xs text-muted-foreground/70 leading-tight mt-0.5">
                  Field: {issue.path}
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

function ChecklistItem({
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
