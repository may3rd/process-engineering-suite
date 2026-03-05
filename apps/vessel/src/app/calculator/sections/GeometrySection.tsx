"use client"

import { useFormContext } from "react-hook-form"
import { SectionCard } from "../components/SectionCard"
import { FieldRow } from "../components/FieldRow"
import { UomInput } from "../components/UomInput"
import type { CalculationInput } from "@/types"
import { HeadType } from "@/types"
import { autoHeadDepth } from "@/lib/calculations"

export function GeometrySection() {
  const { watch, formState: { errors } } = useFormContext<CalculationInput>()
  const headType = watch("headType")
  const insideDiameter = watch("insideDiameter")

  const autoDepth = insideDiameter && isFinite(insideDiameter)
    ? autoHeadDepth(headType, insideDiameter)
    : null

  const showHeadDepthField = headType === HeadType.CONICAL

  const headDepthHint = !showHeadDepthField && autoDepth != null && isFinite(autoDepth)
    ? `Auto: ${autoDepth.toFixed(1)} mm`
    : undefined

  return (
    <SectionCard title="Geometry">
      <FieldRow
        label="Inside Diameter"
        htmlFor="insideDiameter"
        required
        error={errors.insideDiameter?.message}
      >
        <UomInput name="insideDiameter" category="length" id="insideDiameter" placeholder="e.g. 1500" />
      </FieldRow>

      <FieldRow
        label="Shell Length (TL–TL)"
        htmlFor="shellLength"
        required
        error={errors.shellLength?.message}
      >
        <UomInput name="shellLength" category="length" id="shellLength" placeholder="e.g. 3000" />
      </FieldRow>

      <FieldRow
        label="Wall Thickness"
        htmlFor="wallThickness"
        hint="Used for empty mass estimate"
        error={errors.wallThickness?.message}
      >
        <UomInput name="wallThickness" category="length" id="wallThickness" placeholder="e.g. 10" />
      </FieldRow>

      {showHeadDepthField ? (
        <FieldRow
          label="Head Depth"
          htmlFor="headDepth"
          required
          hint="Required for conical heads"
          error={errors.headDepth?.message}
        >
          <UomInput name="headDepth" category="length" id="headDepth" placeholder="e.g. 400" />
        </FieldRow>
      ) : (
        headDepthHint && (
          <div className="text-xs text-muted-foreground px-1">
            Head depth: {headDepthHint} (auto-calculated for {headType})
          </div>
        )
      )}
    </SectionCard>
  )
}
