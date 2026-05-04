"use client"

import { SectionCard } from "../components/SectionCard"
import { Badge } from "@/components/ui/badge"
import type { HorizontalTankResult, HorizontalTankSurfaceSnap } from "@/types"
import { CalculationStatus } from "@/types"

interface Props { result: HorizontalTankResult | null }

export function HorizontalResultsPanel({ result }: Props) {
  if (!result) return <SectionCard title="Results"><p className="text-sm italic text-muted-foreground text-center py-4">Enter inputs to see results.</p></SectionCard>
  if (result.status === CalculationStatus.ERROR) return <SectionCard title="Results" action={<Badge variant="outline" className="text-xs text-destructive">Error</Badge>}><p className="text-sm text-destructive">Calculation could not complete.</p></SectionCard>

  const { dryWall, wetWall, dryHead, wetHead, totalHeatLoss, totalArea, cooling, iterations } = result

  return (
    <div className="space-y-4">
      <SectionCard title="Design Summary" action={<Badge variant="secondary" className="text-xs">8 iterations</Badge>}>
        <div className="grid grid-cols-3 gap-4 text-center">
          <Kpi label="Total Heat Loss" value={formatSI(totalHeatLoss, 1)} unit="W" />
          <Kpi label="Total Area" value={totalArea.toFixed(2)} unit="m²" />
          <Kpi label="Cooling Rate" value={cooling.rateCHr.toFixed(4)} unit="°C/hr" />
        </div>
        {cooling.timeToAmbientHr !== null && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Time to ambient: <span className="font-mono font-semibold">{cooling.timeToAmbientHr.toFixed(1)} hr</span>
          </p>
        )}
      </SectionCard>

      <SectionCard title="Per-Surface Results">
        <div className="rounded-md border overflow-hidden text-xs">
          <div className="grid grid-cols-5 bg-muted/50 px-3 py-2 font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="text-left">Parameter</span><span className="text-right">Dry Wall</span><span className="text-right">Wet Wall</span><span className="text-right">Dry Head</span><span className="text-right">Wet Head</span>
          </div>
          <Row label="h Internal" unit="W/(m²·K)" vals={[dryWall.hInternal, wetWall.hInternal, dryHead.hInternal, wetHead.hInternal].map(v => v.toFixed(3))} />
          <Row label="h External" unit="W/(m²·K)" vals={[dryWall.hExternal, wetWall.hExternal, dryHead.hExternal, wetHead.hExternal].map(v => v.toFixed(3))} />
          <Row label="h Radiation" unit="W/(m²·K)" vals={[dryWall.hRadiation, wetWall.hRadiation, dryHead.hRadiation, wetHead.hRadiation].map(v => v.toFixed(3))} />
          <Row label="U Overall" unit="W/(m²·K)" vals={[dryWall.uOverall, wetWall.uOverall, dryHead.uOverall, wetHead.uOverall].map(v => v.toFixed(3))} emphasis />
          <Row label="Area" unit="m²" vals={[dryWall.area, wetWall.area, dryHead.area, wetHead.area].map(v => v.toFixed(2))} />
          <Row label="Heat Loss" unit="W" vals={[dryWall.heatLoss, wetWall.heatLoss, dryHead.heatLoss, wetHead.heatLoss].map(v => formatSI(v, 1))} emphasis />
          <Row label="Twall Inside" unit="°C" vals={[dryWall.twInside, wetWall.twInside, dryHead.twInside, wetHead.twInside].map(v => v.toFixed(1))} />
          <Row label="Twall Outside" unit="°C" vals={[dryWall.twOutside, wetWall.twOutside, dryHead.twOutside, wetHead.twOutside].map(v => v.toFixed(1))} />
        </div>
      </SectionCard>

      <SectionCard title="Dimensionless Numbers">
        <div className="rounded-md border overflow-hidden text-xs">
          <div className="grid grid-cols-5 bg-muted/50 px-3 py-2 font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="text-left">Parameter</span><span className="text-right">Dry Wall</span><span className="text-right">Wet Wall</span><span className="text-right">Dry Head</span><span className="text-right">Wet Head</span>
          </div>
          <Row label="Grashof" unit="" vals={[dryWall.grashof, wetWall.grashof, dryHead.grashof, wetHead.grashof].map(v => formatSI(v, 1))} />
          <Row label="Prandtl" unit="" vals={[dryWall.prandtl, wetWall.prandtl, dryHead.prandtl, wetHead.prandtl].map(v => v.toFixed(3))} />
          <Row label="Rayleigh" unit="" vals={[dryWall.rayleigh, wetWall.rayleigh, dryHead.rayleigh, wetHead.rayleigh].map(v => formatSI(v, 1))} />
          <Row label="Nu Internal" unit="" vals={[dryWall.nusseltInternal, wetWall.nusseltInternal, dryHead.nusseltInternal, wetHead.nusseltInternal].map(v => v.toFixed(3))} />
          <Row label="Nu External" unit="" vals={[dryWall.nusseltExternal, wetWall.nusseltExternal, dryHead.nusseltExternal, wetHead.nusseltExternal].map(v => v.toFixed(3))} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">Re (wind): {result.reynoldsExternal.toFixed(0)}</p>
      </SectionCard>

      {iterations.length >= 2 && (
        <SectionCard title="Iteration Convergence">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono tabular-nums">
              <thead><tr className="text-muted-foreground"><th className="text-left pr-2">Iter</th><th className="text-right px-1">U_dw</th><th className="text-right px-1">U_ww</th><th className="text-right px-1">U_dh</th><th className="text-right px-1">Q_total</th></tr></thead>
              <tbody>
                {iterations.map(it => (
                  <tr key={it.iteration} className="border-t">
                    <td className="text-left pr-2 font-semibold">{it.iteration}</td>
                    <td className="text-right px-1">{it.dryWall.uOverall.toFixed(3)}</td>
                    <td className="text-right px-1">{it.wetWall.uOverall.toFixed(3)}</td>
                    <td className="text-right px-1">{it.dryHead.uOverall.toFixed(3)}</td>
                    <td className="text-right px-1">{formatSI(it.dryWall.heatLoss + it.wetWall.heatLoss + it.dryHead.heatLoss + it.wetHead.heatLoss, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  )
}

function Kpi({ label, value, unit }: { label: string; value: string; unit: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-bold font-mono">{value}</p><p className="text-xs text-muted-foreground">{unit}</p></div>
}
function Row({ label, unit, vals, emphasis }: { label: string; unit: string; vals: string[]; emphasis?: boolean }) {
  return <div className={`grid grid-cols-5 px-3 py-1.5 border-t ${emphasis ? "bg-muted/30 font-semibold" : ""}`}><span className="text-muted-foreground">{label}</span>{vals.map((v, i) => <span key={i} className="text-right">{v}</span>)}</div>
}
function formatSI(value: number, decimals: number): string {
  if (value === 0) return "0"
  if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(decimals) + "M"
  if (Math.abs(value) >= 1e3) return (value / 1e3).toFixed(decimals) + "k"
  return value.toFixed(decimals)
}
