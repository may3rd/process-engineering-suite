"use client"

import { SectionCard } from "../components/SectionCard"
import { Badge } from "@/components/ui/badge"
import type { PipeCalculationResult } from "@/types"
import { CalculationStatus } from "@/types"

interface PipeResultsPanelProps {
  result: PipeCalculationResult | null
}

export function PipeResultsPanel({ result }: PipeResultsPanelProps) {
  if (!result) {
    return (
      <SectionCard title="Results">
        <p className="text-sm italic text-muted-foreground text-center py-4">
          Enter inputs to see results.
        </p>
      </SectionCard>
    )
  }

  if (result.status === CalculationStatus.ERROR) {
    return (
      <SectionCard title="Results"
        action={<Badge variant="outline" className="text-xs text-destructive">Error</Badge>}>
        <p className="text-sm text-destructive">Calculation could not complete. Check inputs.</p>
      </SectionCard>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── KPI Row ── */}
      <SectionCard title="Pipe Summary"
        action={<Badge variant="secondary" className="text-xs">8 iterations</Badge>}>
        <div className="grid grid-cols-3 gap-4 text-center">
          <KpiMetric label="Outlet Temp" value={result.outletTemp.toFixed(1)} unit="°C" />
          <KpiMetric label="Heat Loss" value={formatSI(result.heatLoss, 1)} unit="W" />
          <KpiMetric label="ΔT" value={(result.inletTemp - result.outletTemp).toFixed(1)} unit="°C" />
        </div>
        <div className="grid grid-cols-3 gap-4 text-center mt-3">
          <KpiMetric label="Inlet Temp" value={result.inletTemp.toFixed(1)} unit="°C" />
          <KpiMetric label="Surface Area" value={result.surfaceArea.toFixed(2)} unit="m²" />
          <KpiMetric label="Overall U" value={result.uOverall.toFixed(3)} unit="W/(m²·K)" />
        </div>
      </SectionCard>

      {/* ── HTC Breakdown ── */}
      <SectionCard title="Heat Transfer Coefficients">
        <div className="rounded-md border overflow-hidden text-xs divide-y">
          <HtcRow label="Internal (forced conv.)" value={result.internalHTC} />
          <HtcRow label="External (natural + wind)" value={result.externalHTC} />
          <HtcRow label="External Natural" value={result.externalNaturalHTC} muted />
          <HtcRow label="Radiation" value={result.radiationHTC} />
          <HtcRow label="Overall U" value={result.uOverall} emphasis />
        </div>
      </SectionCard>

      {/* ── Dimensionless ── */}
      <SectionCard title="Dimensionless Numbers">
        <div className="rounded-md border overflow-hidden text-xs divide-y">
          <DimRow label="Re (internal)" value={formatSI(result.reynoldsInternal, 1)} />
          <DimRow label="Pr (fluid)" value={result.prandtl.toFixed(3)} />
          <DimRow label="Nu (internal)" value={result.nusseltInternal.toFixed(3)} />
          <DimRow label="Nu (external)" value={result.nusseltExternal.toFixed(3)} />
          <DimRow label="Re (wind)" value={formatSI(result.reynoldsExternal, 1)} />
        </div>
      </SectionCard>

      {/* ── Wall Temperatures ── */}
      <SectionCard title="Wall Temperatures">
        <div className="rounded-md border overflow-hidden text-xs divide-y">
          <DimRow label="T wall inside" value={result.twInside.toFixed(1) + " °C"} />
          <DimRow label="T wall outside" value={result.twOutside.toFixed(1) + " °C"} />
        </div>
      </SectionCard>

      {/* ── Iteration Convergence ── */}
      {result.iterations.length >= 2 && (
        <SectionCard title="Iteration Convergence">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono tabular-nums">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left pr-2">Iter</th>
                  <th className="text-right px-1">T_out</th>
                  <th className="text-right px-1">U</th>
                  <th className="text-right px-1">Q</th>
                </tr>
              </thead>
              <tbody>
                {result.iterations.map(it => (
                  <tr key={it.iteration} className="border-t">
                    <td className="text-left pr-2 font-semibold">{it.iteration}</td>
                    <td className="text-right px-1">{it.outletTemp.toFixed(1)}</td>
                    <td className="text-right px-1">{it.uOverall.toFixed(3)}</td>
                    <td className="text-right px-1">{formatSI(it.heatLoss, 1)}</td>
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

function KpiMetric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold font-mono tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{unit}</p>
    </div>
  )
}

function HtcRow({ label, value, emphasis, muted }: {
  label: string; value: number; emphasis?: boolean; muted?: boolean
}) {
  return (
    <div className={`flex justify-between px-3 py-1.5 ${emphasis ? "bg-muted/30 font-semibold" : ""}`}>
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`font-mono ${muted ? "text-muted-foreground" : ""}`}>
        {value.toFixed(3)} <span className="text-muted-foreground">W/(m²·K)</span>
      </span>
    </div>
  )
}

function DimRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-3 py-1.5">
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}

function formatSI(value: number, decimals: number): string {
  if (value === 0) return "0"
  if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(decimals) + "M"
  if (Math.abs(value) >= 1e3) return (value / 1e3).toFixed(decimals) + "k"
  return value.toFixed(decimals)
}
