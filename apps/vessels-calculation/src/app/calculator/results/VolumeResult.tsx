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

export function VolumeResult({ result, equipmentMode, tankType }: Props) {
  const { units } = useUomStore()
  const volUnit = units.volume ?? BASE_UNITS.volume
  const label = UOM_LABEL[volUnit] ?? volUnit

  const fmt = (v: number | null) => {
    if (v == null) return "—"
    return convertUnit(v, BASE_UNITS.volume, volUnit).toFixed(4)
  }

  const isTank = equipmentMode === EquipmentMode.TANK
  const isSphericalTank = isTank && tankType === TankType.SPHERICAL

  const rows = isSphericalTank
    ? [
      { label: "Sphere Volume", value: fmt(result.volumes.totalVolume), isSub: false, isTotal: true },
      { label: "Effective Volume (up to OFL)", value: fmt(result.volumes.effectiveVolume), isSub: false },
      { label: "Working Volume (LLL–HLL)", value: fmt(result.volumes.workingVolume), isSub: false },
      { label: "Overflow Volume (above OFL)", value: fmt(result.volumes.overflowVolume), isSub: false },
      { label: "Partial Volume (at LL)", value: fmt(result.volumes.partialVolume), isSub: false },
    ]
    : isTank
      ? [
        { label: "Roof Volume", value: fmt(result.volumes.headVolume), isSub: false },
        { label: "Shell Volume", value: fmt(result.volumes.shellVolume), isSub: false },
        { label: "Total Tank Volume", value: fmt(result.volumes.totalVolume), isSub: false, isTotal: true },
        { label: "Shell Volume (cylindrical body)", value: fmt(result.volumes.tangentVolume), isSub: true },
        { label: "Effective Volume (up to OFL)", value: fmt(result.volumes.effectiveVolume), isSub: false },
        { label: "Working Volume (LLL–HLL)", value: fmt(result.volumes.workingVolume), isSub: false },
        { label: "Overflow Volume (above OFL)", value: fmt(result.volumes.overflowVolume), isSub: false },
        { label: "Partial Volume (at LL)", value: fmt(result.volumes.partialVolume), isSub: false },
      ]
      : (() => {
        const hasBootVol = result.volumes.bootVolume > 0
        return [
          { label: "Head Volume (2 heads)", value: fmt(result.volumes.headVolume), isSub: false },
          { label: "Shell Volume", value: fmt(result.volumes.shellVolume), isSub: false },
          ...(hasBootVol ? [{ label: "Boot Volume", value: fmt(result.volumes.bootVolume), isSub: true }] : []),
          { label: hasBootVol ? "Total Volume (incl. Boot)" : "Total Volume", value: fmt(result.volumes.totalVolume), isSub: false, isTotal: true },
          { label: "Tangent Volume (shell only)", value: fmt(result.volumes.tangentVolume), isSub: true },
          { label: "Effective Volume (up to OFL)", value: fmt(result.volumes.effectiveVolume), isSub: false },
          { label: "Working Volume (LLL–HLL)", value: fmt(result.volumes.workingVolume), isSub: false },
          { label: "Overflow Volume (above OFL)", value: fmt(result.volumes.overflowVolume), isSub: false },
          { label: "Partial Volume (at LL)", value: fmt(result.volumes.partialVolume), isSub: false },
        ]
      })()

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Volumes</CardTitle>
        <Separator />
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md overflow-hidden divide-y text-xs">
          <div className="px-3 py-1.5 bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Volume Results ({label})
          </div>
          {rows.map((row) => (
            <div
              key={row.label}
              className={`flex justify-between items-center px-3 py-1.5 ${
                row.isTotal ? "bg-muted/30 font-semibold" : row.isSub ? "pl-6 text-muted-foreground" : ""
              }`}
            >
              <span>{row.label}</span>
              <span className="font-mono tabular-nums">
                {row.value} <span className="text-muted-foreground">{label}</span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
