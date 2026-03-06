"use client"

import { useMemo, useState } from "react"
import { useFormContext } from "react-hook-form"
import { Loader2, Upload, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/apiClient"
import { convertUnit } from "@eng-suite/physics"
import { TankConfiguration, type CalculationInput } from "@/types"

interface Props {
  equipmentId: string | null
  calculationResult: import("@/types").CalculationResult | null
  derivedGeometry: import("@/types").DerivedGeometry | null
}

function fromKPag(value: number, unit: string | null | undefined): number | null {
  const targetUnit = unit ?? "barg"
  const converted = convertUnit(value, "kPag", targetUnit)
  return Number.isFinite(converted) ? converted : null
}

export function UpdateEquipmentButton({ equipmentId, calculationResult, derivedGeometry }: Props) {
  const { getValues } = useFormContext<CalculationInput>()
  const [isUpdating, setIsUpdating] = useState(false)
  const [updated, setUpdated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const disabled = useMemo(() => !equipmentId || isUpdating, [equipmentId, isUpdating])

  const resolveLinkedTankTag = async (): Promise<string | null> => {
    if (!equipmentId) {
      return null
    }

    const tanks = await apiClient.engineeringObjects.list({
      objectType: 'TANK',
      includeInactive: true,
    })
    const found = tanks.find((item) => (item as { id?: string | null }).id === equipmentId)
    return found?.tag ?? null
  }

  const handleUpdate = async () => {
    if (!equipmentId) return
    setError(null)
    setUpdated(false)
    setIsUpdating(true)

    try {
      const resolvedTag = await resolveLinkedTankTag()
      if (!resolvedTag) {
        throw new Error('Linked engineering object tag could not be resolved')
      }

      const current = await apiClient.engineeringObjects.get(resolvedTag)
      if (current.object_type !== 'TANK') {
        throw new Error('Linked equipment is not a tank')
      }

      const values = getValues()
      const currentProperties = (current.properties ?? {}) as Record<string, unknown>
      const designParameters =
        (currentProperties.design_parameters as Record<string, unknown> | undefined) ?? {}
      const existingDetails = (currentProperties.details ?? {}) as Record<string, unknown>
      const insulated =
        values.tankConfiguration === TankConfiguration.INSULATED_FULL ||
        values.tankConfiguration === TankConfiguration.INSULATED_PARTIAL

      const details: Record<string, unknown> = {
        ...existingDetails,
        innerDiameter: values.diameter,
        height: values.height,
        insulated,
        insulationThickness: insulated ? values.insulationThickness : null,
        insulationConductivity: insulated ? values.insulationConductivity : null,
        insideHeatTransferCoeff: insulated ? values.insideHeatTransferCoeff : null,
        insulatedSurfaceArea:
          values.tankConfiguration === TankConfiguration.INSULATED_PARTIAL
            ? values.insulatedSurfaceArea
            : null,
        latitude: values.latitude,
        workingTemperature: values.avgStorageTemp,
        workingTemperatureUnit: 'C',
        fluid:
          (typeof existingDetails.fluid === 'string' ? existingDetails.fluid : null) ??
          calculationResult?.emergencyVenting.referenceFluid ??
          null,
        vapourPressure: values.vapourPressure,
        vapourPressureUnit: 'kPa',
        flashPoint: values.flashBoilingPointType === 'FP' ? values.flashBoilingPoint ?? null : null,
        flashPointUnit: 'C',
        boilingPoint: values.flashBoilingPointType === 'BP' ? values.flashBoilingPoint ?? null : null,
        boilingPointUnit: 'C',
        latentHeat: values.latentHeat ?? null,
        latentHeatUnit: 'kJ/kg',
        relievingTemperature: values.relievingTemperature ?? null,
        relievingTemperatureUnit: 'C',
        molecularWeight: values.molecularMass ?? null,
        tankConfiguration: values.tankConfiguration,
        volume: derivedGeometry?.maxTankVolume ?? calculationResult?.derived.maxTankVolume ?? null,
        wettedArea: derivedGeometry?.wettedArea ?? calculationResult?.derived.wettedArea ?? null,
        ventingCalculation: {
          inputs: values,
          result: calculationResult ?? null,
          syncedAt: new Date().toISOString(),
        },
      }

      const targetPressureUnit =
        typeof designParameters.designPressureUnit === 'string'
          ? designParameters.designPressureUnit
          : 'barg'
      const convertedDesignPressure = fromKPag(values.designPressure, targetPressureUnit)
      if (convertedDesignPressure === null) {
        throw new Error(`Unsupported pressure unit for update: ${targetPressureUnit}`)
      }

      await apiClient.engineeringObjects.upsert(resolvedTag, {
        object_type: current.object_type,
        status: current.status ?? undefined,
        properties: {
          ...currentProperties,
          design_parameters: {
            ...designParameters,
            designPressure: convertedDesignPressure,
            designPressureUnit: targetPressureUnit,
          },
          details,
        },
      })

      setUpdated(true)
      setTimeout(() => setUpdated(false), 1800)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update equipment'
      setError(msg)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        disabled={disabled}
        onClick={handleUpdate}
      >
        {isUpdating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating...
          </>
        ) : updated ? (
          <>
            <Check className="h-4 w-4" />
            Updated
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Update Equipment
          </>
        )}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
