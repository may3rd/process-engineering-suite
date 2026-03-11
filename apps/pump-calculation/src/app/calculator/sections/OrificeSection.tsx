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

export function OrificeSection() {
  const { register, watch, formState: { errors } } = useFormContext<CalculationInput>()
  const showOrifice = watch('showOrifice')

  return (
    <SectionCard title="Orifice Plate Estimate" collapsible defaultOpen={false}>
      <Collapsible open={showOrifice}>
        <CollapsibleTrigger asChild>
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                {...register('showOrifice')}
                className="h-4 w-4"
              />
              Calculate orifice plate ΔP (simplified ISO 5167)
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showOrifice ? 'rotate-180' : ''}`} />
          </label>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          <FieldRow
            label="Pipe Inside Diameter"
            htmlFor="orificePipeId"
            unit="mm"
            error={errors.orificePipeId?.message}
          >
            <Input
              id="orificePipeId"
              type="number"
              step="any"
              {...register('orificePipeId', { valueAsNumber: true })}
              placeholder="e.g. 150"
            />
          </FieldRow>

          <FieldRow
            label="Beta Ratio (d/D)"
            htmlFor="orificeBeta"
            hint="Orifice bore / pipe bore, typically 0.3–0.7"
            error={errors.orificeBeta?.message}
          >
            <Input
              id="orificeBeta"
              type="number"
              step="any"
              {...register('orificeBeta', { valueAsNumber: true })}
              placeholder="e.g. 0.5"
            />
          </FieldRow>
        </CollapsibleContent>
      </Collapsible>
    </SectionCard>
  )
}
