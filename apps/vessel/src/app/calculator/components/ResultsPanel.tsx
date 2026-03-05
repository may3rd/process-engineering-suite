"use client"

import { useFormContext } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle } from "lucide-react"
import { SectionCard } from "./SectionCard"
import { SummaryResult } from "../results/SummaryResult"
import { VesselSchematic } from "./VesselSchematic"
import { VolumeResult } from "../results/VolumeResult"
import { SurfaceAreaResult } from "../results/SurfaceAreaResult"
import { MassTimingResult } from "../results/MassTimingResult"
import type { CalculationInput, CalculationResult } from "@/types"
import { HeadType } from "@/types"

interface Props {
  calculationResult: CalculationResult | null
}

export function ResultsPanel({ calculationResult }: Props) {
  if (!calculationResult) {
    return (
      <div className="space-y-4">
        <RequirementsChecklist />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SummaryResult result={calculationResult} />
      <VesselSchematic />
      <VolumeResult result={calculationResult} />
      <SurfaceAreaResult result={calculationResult} />
      <MassTimingResult result={calculationResult} />
    </div>
  )
}

// ─── Dynamic requirements checklist ───────────────────────────────────────────

function RequirementsChecklist() {
  const { watch } = useFormContext<CalculationInput>()
  const values = watch()

  const isValidNumber = (v: unknown): v is number =>
    typeof v === "number" && !isNaN(v) && isFinite(v) && (v as number) > 0

  const isConical = values.headType === HeadType.CONICAL

  const requiredChecks = [
    {
      label: "Tag / equipment number",
      hint: "e.g. V-101",
      done: typeof values.tag === "string" && values.tag.trim().length > 0,
    },
    {
      label: "Orientation & head type",
      hint: "Select vessel orientation and head type",
      done: !!values.orientation && !!values.headType,
    },
    {
      label: "Inside diameter",
      hint: "Shell inside diameter in mm",
      done: isValidNumber(values.insideDiameter),
    },
    {
      label: "Shell length (TL–TL)",
      hint: "Tangent-to-tangent length in mm",
      done: isValidNumber(values.shellLength),
    },
    ...(isConical
      ? [
        {
          label: "Head depth (conical)",
          hint: "Required for conical head geometry calculation",
          done: isValidNumber(values.headDepth),
        },
      ]
      : []),
  ]

  const optionalChecks = [
    {
      label: "Wall thickness",
      hint: "Required for empty vessel mass calculation",
      done: isValidNumber(values.wallThickness),
    },
    {
      label: "Liquid level",
      hint: "For partial volume & wetted area calculation",
      done: typeof values.liquidLevel === "number" && !isNaN(values.liquidLevel as number),
    },
    {
      label: "HLL / LLL levels",
      hint: "High/Low liquid levels for working volume & surge time",
      done:
        typeof values.hll === "number" && !isNaN(values.hll as number) &&
        typeof values.lll === "number" && !isNaN(values.lll as number),
    },
    {
      label: "Fluid density",
      hint: "Required for liquid mass calculation",
      done: isValidNumber(values.density),
    },
    {
      label: "Flowrate",
      hint: "Required for surge / inventory time calculation",
      done: typeof values.flowrate === "number" && !isNaN(values.flowrate as number),
    },
  ]

  const allChecks = [
    ...requiredChecks.map((c) => ({ ...c, optional: false })),
    ...optionalChecks.map((c) => ({ ...c, optional: true })),
  ]

  const missingRequired = requiredChecks.filter((c) => !c.done).length
  const allRequiredDone = missingRequired === 0

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Results</CardTitle>
          {allRequiredDone ? (
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

// ─── Checklist item ────────────────────────────────────────────────────────────

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
          <p className="text-xs text-muted-foreground/70 leading-tight mt-0.5">{check.hint}</p>
        )}
      </div>
    </div>
  )
}
