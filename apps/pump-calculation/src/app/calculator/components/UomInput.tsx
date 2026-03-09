'use client'

import { useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { convertUnit } from '@eng-suite/physics'
import { UOM_LABEL, UOM_OPTIONS, BASE_UNITS } from '@/lib/uom'
import type { PumpUomCategory } from '@/lib/uom'
import type { CalculationInput } from '@/types'

interface UomInputProps {
  name: keyof CalculationInput
  category: PumpUomCategory
  /** Override the initial display unit (defaults to BASE_UNITS[category]). */
  defaultUnit?: string
  id?: string
  placeholder?: string
  disabled?: boolean
}

/**
 * UomInput — numeric input with inline unit selector.
 *
 * Each instance manages its own display unit independently via local state.
 * Form state always stores values in the base unit for the category.
 */
export function UomInput({ name, category, defaultUnit, id, placeholder, disabled }: UomInputProps) {
  const { control } = useFormContext<CalculationInput>()
  const baseUnit = BASE_UNITS[category]
  const options = (UOM_OPTIONS as Record<string, readonly string[]>)[category] ?? [baseUnit]

  // Per-instance unit — independent of other inputs in the same category
  const [displayUnit, setDisplayUnit] = useState<string>(defaultUnit ?? baseUnit)

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const numericValue = typeof field.value === 'number' ? field.value : NaN
        const displayValue = Number.isFinite(numericValue)
          ? convertUnit(numericValue, baseUnit, displayUnit)
          : ''

        return (
          <div className="flex items-center gap-1.5">
            <Input
              id={id}
              type="number"
              step="any"
              placeholder={placeholder}
              disabled={disabled}
              value={displayValue === '' ? '' : Number(displayValue.toFixed(6))}
              onChange={(e) => {
                const raw = parseFloat(e.target.value)
                field.onChange(isNaN(raw) ? NaN : convertUnit(raw, displayUnit, baseUnit))
              }}
              onBlur={field.onBlur}
              className="flex-1"
            />
            <Select value={displayUnit} onValueChange={setDisplayUnit}>
              <SelectTrigger className="h-8 min-w-fit px-2 border-muted bg-muted/40 text-xs whitespace-nowrap">
                <SelectValue>{UOM_LABEL[displayUnit] ?? displayUnit}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {options.map((u) => (
                  <SelectItem key={u} value={u} className="text-xs">
                    {UOM_LABEL[u] ?? u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      }}
    />
  )
}
