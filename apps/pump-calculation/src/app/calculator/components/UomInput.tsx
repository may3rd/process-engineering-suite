'use client'

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
import { UOM_LABEL, UOM_OPTIONS } from '@/lib/uom'
import { BASE_UNITS, type PumpUomCategory } from '@/lib/uom'
import { useUomStore } from '@/lib/store/uomStore'
import type { CalculationInput } from '@/types'

interface UomInputProps {
  name: keyof CalculationInput
  category: PumpUomCategory
  id?: string
  placeholder?: string
  disabled?: boolean
}

/**
 * UomInput — numeric input with inline unit selector.
 * Form always stores base unit values. Display converts to user's preferred unit.
 */
export function UomInput({ name, category, id, placeholder, disabled }: UomInputProps) {
  const { control } = useFormContext<CalculationInput>()
  const { units, setUnit } = useUomStore()
  const displayUnit = (units as Record<string, string>)[category] ?? BASE_UNITS[category]
  const baseUnit = BASE_UNITS[category]

  // Get options from UOM_OPTIONS (only categories that exist there)
  const options = (UOM_OPTIONS as Record<string, readonly string[]>)[category] ?? [baseUnit]

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
            <Select value={displayUnit} onValueChange={(newUnit) => setUnit(category, newUnit)}>
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
