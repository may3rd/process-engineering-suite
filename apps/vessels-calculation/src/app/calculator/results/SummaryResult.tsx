"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { convertUnit } from "@eng-suite/physics"
import { BASE_UNITS, UOM_LABEL } from "@/lib/uom"
import { useUomStore } from "@/lib/store/uomStore"
import type { CalculationResult } from "@/types"
import { EquipmentMode, TankType } from "@/types"

interface Props {
  result: CalculationResult
  equipmentMode?: EquipmentMode
  tankType?: TankType
}

export function SummaryResult({ result, equipmentMode, tankType }: Props) {
  const { units } = useUomStore()
  const volUnit = units.volume ?? BASE_UNITS.volume
  const areaUnit = units.area ?? BASE_UNITS.area

  const totalVol = convertUnit(result.volumes.totalVolume, BASE_UNITS.volume, volUnit)
  const shellVol = convertUnit(result.volumes.shellVolume, BASE_UNITS.volume, volUnit)
  const totalSA = convertUnit(result.surfaceAreas.totalSurfaceArea, BASE_UNITS.area, areaUnit)

  const isTank = equipmentMode === EquipmentMode.TANK
  const isSphericalTank = isTank && tankType === TankType.SPHERICAL

  const metrics = [
    {
      label: isSphericalTank ? "Sphere Volume" : isTank ? "Total Tank Volume" : "Total Volume",
      value: totalVol.toFixed(3),
      unit: UOM_LABEL[volUnit] ?? volUnit,
    },
    {
      label: isSphericalTank ? "Wetted Volume (LL)" : "Shell Volume",
      value: (isSphericalTank
        ? convertUnit(result.volumes.partialVolume ?? 0, BASE_UNITS.volume, volUnit)
        : shellVol).toFixed(3),
      unit: UOM_LABEL[volUnit] ?? volUnit,
    },
    {
      label: isSphericalTank ? "Sphere Surface Area" : isTank ? "Total Tank Surface Area" : "Total Surface Area",
      value: totalSA.toFixed(3),
      unit: UOM_LABEL[areaUnit] ?? areaUnit,
    },
  ]

  return (
    <Card className="shadow-sm border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Summary</CardTitle>
        <Separator />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          {metrics.map((m) => (
            <div key={m.label}>
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-xl font-bold font-mono tabular-nums">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.unit}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
