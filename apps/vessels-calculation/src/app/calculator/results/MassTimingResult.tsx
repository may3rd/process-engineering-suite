"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { convertUnit } from "@eng-suite/physics"
import { BASE_UNITS, UOM_LABEL } from "@/lib/uom"
import { useUomStore } from "@/lib/store/uomStore"
import type { CalculationResult } from "@/types"

interface Props {
  result: CalculationResult
}

export function MassTimingResult({ result }: Props) {
  const { units } = useUomStore()
  const massUnit = units.mass ?? BASE_UNITS.mass
  const massLabel = UOM_LABEL[massUnit] ?? massUnit
  const lengthUnit = units.length ?? BASE_UNITS.length
  const lengthLabel = UOM_LABEL[lengthUnit] ?? lengthUnit

  const fmtMass = (v: number | null) => {
    if (v == null) return "—"
    return convertUnit(v, BASE_UNITS.mass, massUnit).toFixed(1)
  }

  const fmtLength = (v: number | null) => {
    if (v == null) return "—"
    return convertUnit(v, BASE_UNITS.length, lengthUnit).toFixed(1)
  }

  const fmtTime = (v: number | null) => {
    if (v == null) return "—"
    return `${(v * 60).toFixed(1)} min`
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Mass &amp; Timing</CardTitle>
        <Separator />
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md overflow-hidden divide-y text-xs">
          <div className="px-3 py-1.5 bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mass ({massLabel})
          </div>
          <div className="flex justify-between items-center px-3 py-1.5">
            <span>Empty vessel mass</span>
            <span className="font-mono tabular-nums">
              {fmtMass(result.masses.massEmpty)} <span className="text-muted-foreground">{result.masses.massEmpty != null ? massLabel : ""}</span>
            </span>
          </div>
          <div className="flex justify-between items-center px-3 py-1.5">
            <span>Liquid mass at LL</span>
            <span className="font-mono tabular-nums">
              {fmtMass(result.masses.massLiquid)} <span className="text-muted-foreground">{result.masses.massLiquid != null ? massLabel : ""}</span>
            </span>
          </div>
          <div className="flex justify-between items-center px-3 py-1.5 bg-muted/30 font-semibold">
            <span>Full liquid mass</span>
            <span className="font-mono tabular-nums">
              {fmtMass(result.masses.massFull)} <span className="text-muted-foreground font-normal">{result.masses.massFull != null ? massLabel : ""}</span>
            </span>
          </div>

          <div className="px-3 py-1.5 bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Timing
          </div>
          <div className="flex justify-between items-center px-3 py-1.5">
            <span>Surge time (LLL → HLL)</span>
            <span className="font-mono tabular-nums">{fmtTime(result.timing.surgeTime)}</span>
          </div>
          <div className="flex justify-between items-center px-3 py-1.5">
            <span>Inventory time (LL/OFL volume)</span>
            <span className="font-mono tabular-nums">{fmtTime(result.timing.inventory)}</span>
          </div>
          {result.vortexSubmergence != null && (
            <div className="flex justify-between items-center px-3 py-1.5">
              <span>Vortex submergence</span>
              <span className="font-mono tabular-nums">
                {fmtLength(result.vortexSubmergence)} <span className="text-muted-foreground">{lengthLabel}</span>
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
