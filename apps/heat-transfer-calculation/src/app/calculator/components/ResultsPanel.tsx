"use client"

import { SectionCard } from "./SectionCard"
import { Badge } from "@/components/ui/badge"
import type { CalculationResult } from "@/types"
import { CalculationStatus } from "@/types"

interface ResultsPanelProps {
  calculationResult: CalculationResult | null
}

export function ResultsPanel({ calculationResult }: ResultsPanelProps) {

  if (!calculationResult) {
    return (
      <SectionCard title="Results">
        <p className="text-sm italic text-muted-foreground text-center py-4">
          Enter valid inputs to see results.
        </p>
      </SectionCard>
    )
  }

  if (calculationResult.status === CalculationStatus.ERROR) {
    return (
      <SectionCard title="Results"
        action={<Badge variant="outline" className="text-xs text-destructive">Error</Badge>}>
        <p className="text-sm text-destructive">Calculation could not complete. Check inputs.</p>
      </SectionCard>
    )
  }

  const { dryWall, wetWall, roof, floor, totalHeatLoss, totalArea, cooling, iterations } = calculationResult

  // Convergence delta between iteration 7 and 8
  const iter8 = iterations.length >= 8 ? iterations[7] : null
  const iter7 = iterations.length >= 7 ? iterations[6] : null
  const convergenceDelta = iter8 && iter7
    ? Math.abs(iter8.dryWall.twOutside - iter7.dryWall.twOutside) +
      Math.abs(iter8.wetWall.twOutside - iter7.wetWall.twOutside)
    : null

  return (
    <div className="space-y-4">
      {/* ── Summary KPI Card ── */}
      <SectionCard
        title="Design Summary"
        action={<Badge variant="secondary" className="text-xs">8 iterations</Badge>}
      >
        <div className="grid grid-cols-3 gap-4 text-center">
          <KpiMetric label="Total Heat Loss" value={formatSI(totalHeatLoss, 1)} unit="W" />
          <KpiMetric label="Total Area" value={totalArea.toFixed(2)} unit="m²" />
          <KpiMetric label="Cooling Rate" value={cooling.rateCHr.toFixed(4)} unit="°C/hr" />
        </div>
        {cooling.timeToAmbientHr !== null && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Estimated time to ambient:{" "}
            <span className="font-mono tabular-nums font-semibold">{cooling.timeToAmbientHr.toFixed(1)} hr</span>
          </p>
        )}
        {convergenceDelta !== null && (
          <p className="text-xs text-muted-foreground text-center mt-1">
            Convergence ΔT:{" "}
            <span className="font-mono tabular-nums">{convergenceDelta.toFixed(4)} °C</span>
          </p>
        )}
      </SectionCard>

      {/* ── Per-Surface Results Table ── */}
      <SectionCard title="Per-Surface Results">
        <div className="rounded-md border overflow-hidden text-xs">
          {/* Header */}
          <div className="grid grid-cols-5 bg-muted/50 px-3 py-2 font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="text-left">Parameter</span>
            <span className="text-right">Dry Wall</span>
            <span className="text-right">Wet Wall</span>
            <span className="text-right">Roof</span>
            <span className="text-right">Floor</span>
          </div>

          <TableRow label="h Internal" unit="W/(m²·K)"
            values={[dryWall, wetWall, roof, floor].map(s => s.hInternal.toFixed(3))} />
          <TableRow label="h External" unit="W/(m²·K)"
            values={[dryWall, wetWall, roof, floor].map(s => s.hExternal.toFixed(3))} />
          <TableRow label="h Radiation" unit="W/(m²·K)"
            values={[dryWall.hRadiation.toFixed(3), wetWall.hRadiation.toFixed(3), roof.hRadiation.toFixed(3), "—"]} />
          <TableRow label="U Overall" unit="W/(m²·K)" emphasis
            values={[dryWall, wetWall, roof, floor].map(s => s.uOverall.toFixed(3))} />
          <TableRow label="Area" unit="m²"
            values={[dryWall, wetWall, roof, floor].map(s => s.area.toFixed(2))} />
          <TableRow label="Heat Loss" unit="W" emphasis
            values={[dryWall, wetWall, roof, floor].map(s => formatSI(s.heatLoss, 1))} />
          <TableRow label="Twall Inside" unit="°C"
            values={[dryWall, wetWall, roof, floor].map(s => s.twInside.toFixed(1))} />
          <TableRow label="Twall Outside" unit="°C"
            values={[dryWall.twOutside.toFixed(1), wetWall.twOutside.toFixed(1), roof.twOutside.toFixed(1), "—"]} />
        </div>
      </SectionCard>

      {/* ── Dimensionless Numbers ── */}
      <SectionCard title="Dimensionless Numbers">
        <div className="rounded-md border overflow-hidden text-xs">
          <div className="grid grid-cols-5 bg-muted/50 px-3 py-2 font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="text-left">Parameter</span>
            <span className="text-right">Dry Wall</span>
            <span className="text-right">Wet Wall</span>
            <span className="text-right">Roof</span>
            <span className="text-right">Floor</span>
          </div>

          <TableRow label="Grashof" unit=""
            values={[dryWall, wetWall, roof, floor].map(s => formatSI(s.grashof, 1))} />
          <TableRow label="Prandtl" unit=""
            values={[dryWall, wetWall, roof, floor].map(s => s.prandtl.toFixed(3))} />
          <TableRow label="Rayleigh" unit=""
            values={[dryWall, wetWall, roof, floor].map(s => formatSI(s.rayleigh, 1))} />
          <TableRow label="Nu Internal" unit=""
            values={[dryWall, wetWall, roof, floor].map(s => s.nusseltInternal.toFixed(3))} />
          <TableRow label="Nu External" unit=""
            values={[dryWall.nusseltExternal.toFixed(3), wetWall.nusseltExternal.toFixed(3), roof.nusseltExternal.toFixed(3), "—"]} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Re (wind): {calculationResult.reynoldsExternal.toFixed(0)}
        </p>
      </SectionCard>

      {/* ── Iteration Convergence ── */}
      {iterations.length >= 2 && (
        <SectionCard title="Iteration Convergence">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono tabular-nums">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left pr-2">Iter</th>
                  <th className="text-right px-1">U_dry</th>
                  <th className="text-right px-1">U_wet</th>
                  <th className="text-right px-1">U_roof</th>
                  <th className="text-right px-1">Q_total</th>
                </tr>
              </thead>
              <tbody>
                {iterations.map((it) => (
                  <tr key={it.iteration} className="border-t">
                    <td className="text-left pr-2 font-semibold">{it.iteration}</td>
                    <td className="text-right px-1">{it.dryWall.uOverall.toFixed(3)}</td>
                    <td className="text-right px-1">{it.wetWall.uOverall.toFixed(3)}</td>
                    <td className="text-right px-1">{it.roof.uOverall.toFixed(3)}</td>
                    <td className="text-right px-1">{formatSI(
                      it.dryWall.heatLoss + it.wetWall.heatLoss + it.roof.heatLoss + it.floor.heatLoss, 1
                    )}</td>
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiMetric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold font-mono tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{unit}</p>
    </div>
  )
}

function TableRow({
  label, unit, values, emphasis,
}: {
  label: string
  unit: string
  values: readonly string[]
  emphasis?: boolean
}) {
  return (
    <div className={`grid grid-cols-5 px-3 py-1.5 border-t ${emphasis ? "bg-muted/30 font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{values[0]}</span>
      <span className="text-right">{values[1]}</span>
      <span className="text-right">{values[2]}</span>
      <span className="text-right text-muted-foreground">{values[3]}</span>
    </div>
  )
}

function formatSI(value: number, decimals: number): string {
  if (value === 0) return "0"
  if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(decimals) + "M"
  if (Math.abs(value) >= 1e3) return (value / 1e3).toFixed(decimals) + "k"
  return value.toFixed(decimals)
}
