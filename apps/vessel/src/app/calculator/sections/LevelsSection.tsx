"use client"

import { SectionCard } from "../components/SectionCard"
import { FieldRow } from "../components/FieldRow"
import { UomInput } from "../components/UomInput"

export function LevelsSection() {
  return (
    <SectionCard title="Liquid Levels">
      <FieldRow
        label="Liquid Level (LL)"
        htmlFor="liquidLevel"
        hint="Partial volume and wetted area calculation"
      >
        <UomInput name="liquidLevel" category="length" id="liquidLevel" placeholder="e.g. 1200" />
      </FieldRow>

      <FieldRow label="High Liquid Level (HLL)" htmlFor="hll">
        <UomInput name="hll" category="length" id="hll" placeholder="e.g. 1800" />
      </FieldRow>

      <FieldRow label="Low Liquid Level (LLL)" htmlFor="lll">
        <UomInput name="lll" category="length" id="lll" placeholder="e.g. 600" />
      </FieldRow>

      <FieldRow label="Overflow Level (OFL)" htmlFor="ofl">
        <UomInput name="ofl" category="length" id="ofl" placeholder="e.g. 2200" />
      </FieldRow>
    </SectionCard>
  )
}
