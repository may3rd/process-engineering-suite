'use client'

import { SectionCard } from '@/app/calculator/components/SectionCard'
import { FieldRow } from '@/app/calculator/components/FieldRow'
import { UomInput } from '@/app/calculator/components/UomInput'

export function SuctionSection() {
  return (
    <SectionCard title="Suction Conditions">
      <FieldRow label="Source Vessel Pressure" htmlFor="suctionSourcePressure">
        <UomInput name="suctionSourcePressure" category="pressure" id="suctionSourcePressure" placeholder="e.g. 101.325" />
      </FieldRow>

      <FieldRow label="Liquid Level / Elevation Above Pump" htmlFor="suctionElevation" hint="Positive = source above pump (flooded), negative = pump above source">
        <UomInput name="suctionElevation" category="length" id="suctionElevation" placeholder="e.g. 2.5" />
      </FieldRow>

      <FieldRow label="Line & Fitting Losses" htmlFor="suctionLineLoss">
        <UomInput name="suctionLineLoss" category="absolutePressure" id="suctionLineLoss" placeholder="e.g. 5.0" />
      </FieldRow>

      <FieldRow label="Suction Strainer Loss" htmlFor="suctionStrainerLoss">
        <UomInput name="suctionStrainerLoss" category="absolutePressure" id="suctionStrainerLoss" placeholder="e.g. 15.0" />
      </FieldRow>

      <FieldRow label="Other Suction Losses" htmlFor="suctionOtherLoss">
        <UomInput name="suctionOtherLoss" category="absolutePressure" id="suctionOtherLoss" placeholder="e.g. 0" />
      </FieldRow>
    </SectionCard>
  )
}
