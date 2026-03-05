"use client"

import { Controller, useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import { convertUnit } from "@eng-suite/physics"
import { UOM_LABEL, UOM_OPTIONS, BASE_UNITS, type VesselUomCategory } from "@/lib/uom"
import { useUomStore } from "@/lib/store/uomStore"
import type { CalculationInput } from "@/types"

interface UomInputProps {
  name: keyof CalculationInput
  category: VesselUomCategory
  id?: string
  placeholder?: string
  disabled?: boolean
}

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
        const numericValue = typeof field.value === "number" ? field.value : NaN
        const displayValue = Number.isFinite(numericValue)
          ? convertUnit(numericValue, baseUnit, displayUnit)
          : ""

        return (
          <div className="flex items-center gap-1.5">
            <Input
              id={id}
              type="number"
              step="any"
              placeholder={placeholder}
              disabled={disabled}
              value={displayValue === "" ? "" : Number(Number(displayValue).toFixed(6))}
              onChange={(e) => {
                const raw = parseFloat(e.target.value)
                field.onChange(isNaN(raw) ? NaN : convertUnit(raw, displayUnit, baseUnit))
              }}
              onBlur={field.onBlur}
              className="flex-1"
            />
            <Select value={displayUnit} onValueChange={(u) => setUnit(category, u)}>
              <SelectTrigger className="h-8 min-w-fit px-2 border-muted bg-muted/40 text-xs whitespace-nowrap">
                <SelectValue>{UOM_LABEL[displayUnit] ?? displayUnit}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(UOM_OPTIONS as unknown as Record<string, string[]>)[category].map((u) => (
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
