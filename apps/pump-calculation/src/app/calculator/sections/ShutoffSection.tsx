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
import { ShutoffMethod } from '@/types'

export function ShutoffSection() {
  const { register, watch, setValue } = useFormContext<CalculationInput>()
  const showShutoff = watch('showShutoff')
  const method = watch('shutoffMethod')

  return (
    <SectionCard title="Shut-off Pressure & Power Estimate" collapsible defaultOpen={false}>
      <Collapsible open={showShutoff}>
        <CollapsibleTrigger asChild>
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                {...register('showShutoff')}
                className="h-4 w-4"
              />
              Calculate shut-off head / pressure
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showShutoff ? 'rotate-180' : ''}`} />
          </label>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          <FieldRow label="Estimation Method" hint="Select how shut-off head is estimated">
            <div className="space-y-2">
              {Object.values(ShutoffMethod).map((m) => (
                <label key={m} className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="shutoffMethod"
                    value={m}
                    checked={method === m}
                    onChange={() => setValue('shutoffMethod', m)}
                    className="h-4 w-4 mt-0.5"
                  />
                  <span>{m}</span>
                </label>
              ))}
            </div>
          </FieldRow>

          {method === ShutoffMethod.CURVE_FACTOR && (
            <FieldRow
              label="Curve Factor"
              htmlFor="shutoffCurveFactor"
              hint="Multiply design head by this factor (typical: 1.10–1.25)"
            >
              <Input
                id="shutoffCurveFactor"
                type="number"
                step="any"
                {...register('shutoffCurveFactor', { valueAsNumber: true })}
                placeholder="e.g. 1.15"
              />
            </FieldRow>
          )}

          {method === ShutoffMethod.HEAD_RATIO && (
            <FieldRow
              label="Head Ratio"
              htmlFor="shutoffRatio"
              hint="Shut-off head / design head ratio"
            >
              <Input
                id="shutoffRatio"
                type="number"
                step="any"
                {...register('shutoffRatio', { valueAsNumber: true })}
                placeholder="e.g. 1.20"
              />
            </FieldRow>
          )}

          {method === ShutoffMethod.KNOWN_HEAD && (
            <FieldRow
              label="Known Shut-off Head"
              htmlFor="knownShutoffHead"
              unit="m"
              hint="Enter the actual shut-off head from pump curve"
            >
              <Input
                id="knownShutoffHead"
                type="number"
                step="any"
                {...register('knownShutoffHead', { valueAsNumber: true })}
                placeholder="e.g. 120"
              />
            </FieldRow>
          )}
        </CollapsibleContent>
      </Collapsible>
    </SectionCard>
  )
}
