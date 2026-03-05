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
import { UOM_LABEL, BASE_UNITS, UOM_OPTIONS, type UomCategory } from '@/lib/uom'
import { useUomStore } from '@/lib/store/uomStore'
import type { CalculationInput } from '@/types'

interface UomInputProps {
  name: keyof CalculationInput
  category: UomCategory
  id?: string
  placeholder?: string
  disabled?: boolean
}

/**
 * UomInput — numeric input with inline unit selector.
 * Form always stores base unit values. Display converts to user's preferred unit.
 * Changing the unit dropdown updates the store but does NOT convert the stored base value.
 */
export function UomInput({ name, category, id, placeholder, disabled }: UomInputProps) {
  const { control } = useFormContext<CalculationInput>()
  const { units, setUnit } = useUomStore()
  const displayUnit = units[category]
  const baseUnit = BASE_UNITS[category]

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        // Convert base unit value to display unit for rendering
        const displayValue = isFinite(field.value)
          ? convertUnit(field.value, baseUnit, displayUnit)
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
                // Convert display unit input to base unit for storage
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
                {UOM_OPTIONS[category].map((u) => (
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
