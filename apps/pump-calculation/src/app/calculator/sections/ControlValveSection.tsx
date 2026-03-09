'use client'

import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { SectionCard } from '@/app/calculator/components/SectionCard'
import { FieldRow } from '@/app/calculator/components/FieldRow'
import { ChevronDown } from 'lucide-react'
import type { CalculationInput } from '@/types'
import { ValveType } from '@/types'

export function ControlValveSection() {
  const { register, watch, setValue } = useFormContext<CalculationInput>()
  const showCv = watch('showControlValve')

  return (
    <SectionCard title="Control Valve Recommended ΔP">
      <Collapsible open={showCv}>
        <CollapsibleTrigger asChild>
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                {...register('showControlValve')}
                className="h-4 w-4"
              />
              Calculate recommended control valve ΔP
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showCv ? 'rotate-180' : ''}`} />
          </label>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          <FieldRow
            label="Max/Design Flow Ratio"
            htmlFor="cvFlowRatio"
            hint="Q_max / Q_design, typically 1.1–1.3"
          >
            <Input
              id="cvFlowRatio"
              type="number"
              step="any"
              {...register('cvFlowRatio', { valueAsNumber: true })}
              placeholder="e.g. 1.2"
            />
          </FieldRow>

          <FieldRow label="Valve Type">
            <Select
              value={watch('cvValveType') ?? ''}
              onValueChange={(v) => setValue('cvValveType', v as ValveType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select valve type…" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ValveType).map((vt) => (
                  <SelectItem key={vt} value={vt}>{vt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
        </CollapsibleContent>
      </Collapsible>
    </SectionCard>
  )
}
