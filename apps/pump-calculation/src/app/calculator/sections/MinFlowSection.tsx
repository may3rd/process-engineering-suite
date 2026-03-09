'use client'

import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { SectionCard } from '@/app/calculator/components/SectionCard'
import { FieldRow } from '@/app/calculator/components/FieldRow'
import { ChevronDown } from 'lucide-react'
import type { CalculationInput } from '@/types'

export function MinFlowSection() {
  const { register, watch, formState: { errors } } = useFormContext<CalculationInput>()
  const showMinFlow = watch('showMinFlow')

  return (
    <SectionCard title="Minimum Flow by Temperature Rise">
      <Collapsible open={showMinFlow}>
        <CollapsibleTrigger asChild>
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                {...register('showMinFlow')}
                className="h-4 w-4"
              />
              Calculate minimum continuous flow (temperature rise protection)
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showMinFlow ? 'rotate-180' : ''}`} />
          </label>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Requires shut-off section to be enabled. Uses PD.md formula:<br />
            Q_min = (P_shutoff × 0.746 × 2544.43) / (SG × Cp × 3600 × ΔT)
          </p>

          <FieldRow
            label="Specific Heat"
            htmlFor="specificHeat"
            unit="kJ/(kg·°C)"
            hint="Typical: water = 4.18, crude ≈ 2.0–2.2"
            error={errors.specificHeat?.message}
          >
            <Input
              id="specificHeat"
              type="number"
              step="any"
              {...register('specificHeat', { valueAsNumber: true })}
              placeholder="e.g. 2.1"
            />
          </FieldRow>

          <FieldRow
            label="Allowable Temperature Rise"
            htmlFor="allowedTempRise"
            unit="°C"
            hint="Typical: 8–15 °C"
            error={errors.allowedTempRise?.message}
          >
            <Input
              id="allowedTempRise"
              type="number"
              step="any"
              {...register('allowedTempRise', { valueAsNumber: true })}
              placeholder="e.g. 10"
            />
          </FieldRow>
        </CollapsibleContent>
      </Collapsible>
    </SectionCard>
  )
}
