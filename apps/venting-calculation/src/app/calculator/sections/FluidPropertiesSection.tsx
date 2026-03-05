"use client"

import { useFormContext, Controller } from "react-hook-form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { CalculationInput } from "@/types"
import { HEXANE_DEFAULTS, FLASH_POINT_THRESHOLD, BOILING_POINT_THRESHOLD } from "@/lib/constants"
import { SectionCard } from "../components/SectionCard"
import { FieldRow } from "../components/FieldRow"
import { UomInput } from "../components/UomInput"

export function FluidPropertiesSection() {
  const {
    register,
    watch,
    control,
    formState: { errors },
  } = useFormContext<CalculationInput>()

  const fpType = watch("flashBoilingPointType")
  const flashBPValue = watch("flashBoilingPoint")
  const latentHeat = watch("latentHeat")
  const relievingTemperature = watch("relievingTemperature")
  const molecularMass = watch("molecularMass")
  const apiEdition = watch("apiEdition")
  const vapourPressure = watch("vapourPressure")
  const hasFlashBP = flashBPValue !== undefined && !Number.isNaN(flashBPValue)
  const is5th = apiEdition === "5TH"
  const isLowVol =
    hasFlashBP &&
    (fpType === "FP"
      ? flashBPValue! >= FLASH_POINT_THRESHOLD
      : flashBPValue! >= BOILING_POINT_THRESHOLD)
  const hasVP = vapourPressure !== undefined && !Number.isNaN(vapourPressure)
  const isLowVolByVP = hasVP && vapourPressure <= 5
  const vapourPressurePlaceholder = is5th ? "Optional" : "Required"
  const flashBoilingPointPlaceholder = is5th ? "Required" : "Optional"
  const hasCustomReferenceFluid =
    latentHeat !== undefined &&
    !Number.isNaN(latentHeat) &&
    relievingTemperature !== undefined &&
    !Number.isNaN(relievingTemperature) &&
    molecularMass !== undefined &&
    !Number.isNaN(molecularMass)

  return (
    <SectionCard title="Fluid Properties">
      <div className="grid grid-cols-2 gap-3">
        <FieldRow
          label="Average Storage Temp"
          htmlFor="avgStorageTemp"
          required
          error={errors.avgStorageTemp?.message}
        >
          <UomInput
            name="avgStorageTemp"
            category="temperature"
            id="avgStorageTemp"
            placeholder="e.g. 25"
          />
        </FieldRow>
        <FieldRow
          label="Vapour Pressure"
          htmlFor="vapourPressure"
          required={!is5th}
          error={errors.vapourPressure?.message}
          hint={
            !is5th && hasVP
              ? (isLowVolByVP ? "Non-volatile (VP ≤ 5 kPa)" : "Volatile (VP > 5 kPa)")
              : undefined
          }
        >
          <UomInput
            name="vapourPressure"
            category="absolutePressure"
            id="vapourPressure"
            placeholder={vapourPressurePlaceholder}
          />
        </FieldRow>
      </div>

      {/* Flash/Boiling Point */}
      <div className="grid grid-cols-2 gap-3">
        <FieldRow
          label="Flash / Boiling Point Type"
          htmlFor="flashBoilingPointType"
          required
          error={errors.flashBoilingPointType?.message}
          hint={is5th ? "Used to classify fluid volatility (5th edition)" : "Not used for volatility in 6th/7th edition (VP-based)"}
        >
          <Controller
            name="flashBoilingPointType"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="flashBoilingPointType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FP">Flash Point (FP)</SelectItem>
                  <SelectItem value="BP">Boiling Point (BP)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FieldRow>
        <FieldRow
          label={fpType === "FP" ? "Flash Point" : "Boiling Point"}
          htmlFor="flashBoilingPoint"
          required={is5th}
          error={errors.flashBoilingPoint?.message}
          hint={
            is5th
              ? (!hasFlashBP
                  ? (fpType === "FP"
                      ? "Required — low volatility if FP ≥ 37.8°C"
                      : "Required — low volatility if BP ≥ 149°C")
                  : isLowVol
                      ? (fpType === "FP" ? "Low volatility (FP ≥ 37.8°C)" : "Low volatility (BP ≥ 149°C)")
                      : (fpType === "FP" ? "High volatility (FP < 37.8°C)" : "High volatility (BP < 149°C)"))
              : "Not used for volatility classification in 6th/7th edition"
          }
        >
          <UomInput
            name="flashBoilingPoint"
            category="temperature"
            id="flashBoilingPoint"
            placeholder={flashBoilingPointPlaceholder}
          />
        </FieldRow>
      </div>

      {/* Hexane defaults section */}
      <div className="rounded-md border border-dashed p-3 space-y-3 bg-muted/20">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {hasCustomReferenceFluid ? "Emergency Venting" : "Emergency Venting — Reference Fluid"}
          </p>
          {!hasCustomReferenceFluid && (
            <Badge variant="secondary" className="text-xs">
              Hexane defaults if blank
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <FieldRow
            label="Latent Heat (L)"
            htmlFor="latentHeat"
            error={errors.latentHeat?.message}
          >
            <UomInput
              name="latentHeat"
              category="energy"
              id="latentHeat"
              placeholder={`${HEXANE_DEFAULTS.latentHeat}`}
            />
          </FieldRow>
          <FieldRow
            label="Relieving Temp (T_r)"
            htmlFor="relievingTemperature"
            error={errors.relievingTemperature?.message}
          >
            <UomInput
              name="relievingTemperature"
              category="temperature"
              id="relievingTemperature"
              placeholder={`${HEXANE_DEFAULTS.relievingTemperature}`}
            />
          </FieldRow>
          <FieldRow
            label="Molecular Mass (M)"
            htmlFor="molecularMass"
            unit="g/mol"
            error={errors.molecularMass?.message}
          >
            <Input
              id="molecularMass"
              type="number"
              step="any"
              placeholder={`${HEXANE_DEFAULTS.molecularMass}`}
              {...register("molecularMass", { valueAsNumber: true })}
            />
          </FieldRow>
        </div>
      </div>
    </SectionCard>
  )
}
