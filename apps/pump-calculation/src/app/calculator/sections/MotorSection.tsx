'use client'

import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { SectionCard } from '@/app/calculator/components/SectionCard'
import { FieldRow } from '@/app/calculator/components/FieldRow'
import type { CalculationInput } from '@/types'

export function MotorSection() {
  const { register, formState: { errors } } = useFormContext<CalculationInput>()

  return (
    <SectionCard title="Motor & Efficiency" collapsible defaultOpen={false}>
      <FieldRow
        label="Pump Hydraulic Efficiency"
        htmlFor="efficiency"
        unit="%"
        hint="Default 75% — use curve-based value if available"
        error={errors.efficiency?.message}
      >
        <Input
          id="efficiency"
          type="number"
          step="any"
          {...register('efficiency', { valueAsNumber: true })}
          placeholder="75"
        />
      </FieldRow>

      <FieldRow
        label="Wear/Mechanical Margin"
        htmlFor="wearMarginPct"
        unit="%"
        hint="Default 5% — added on top of shaft power for motor selection"
        error={errors.wearMarginPct?.message}
      >
        <Input
          id="wearMarginPct"
          type="number"
          step="any"
          {...register('wearMarginPct', { valueAsNumber: true })}
          placeholder="5"
        />
      </FieldRow>
    </SectionCard>
  )
}
