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

export function SurfaceAreaResult({ result }: Props) {
  const { units } = useUomStore()
  const areaUnit = units.area ?? BASE_UNITS.area
  const label = UOM_LABEL[areaUnit] ?? areaUnit

  const fmt = (v: number) => convertUnit(v, BASE_UNITS.area, areaUnit).toFixed(4)

  const rows = [
    { label: "Head Surface Area (2 heads)", value: fmt(result.surfaceAreas.headSurfaceArea) },
    { label: "Shell Surface Area", value: fmt(result.surfaceAreas.shellSurfaceArea) },
    { label: "Total Surface Area", value: fmt(result.surfaceAreas.totalSurfaceArea), isTotal: true },
    { label: "Wetted Surface Area (at LL)", value: fmt(result.surfaceAreas.wettedSurfaceArea) },
  ]

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Surface Areas</CardTitle>
        <Separator />
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md overflow-hidden divide-y text-xs">
          <div className="px-3 py-1.5 bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Surface Area Results ({label})
          </div>
          {rows.map((row) => (
            <div
              key={row.label}
              className={`flex justify-between items-center px-3 py-1.5 ${
                row.isTotal ? "bg-muted/30 font-semibold" : ""
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
