'use client'

import type { PumpCalculationResult } from '@/types'

interface Props {
  result: PumpCalculationResult
}

export function SummaryResult({ result }: Props) {
  const kpis = [
    {
      label: 'Differential Head',
      value: `${result.differentialHead.toFixed(2)} m`,
      sub: `ΔP = ${result.differentialPressureKpa.toFixed(1)} kPa`,
    },
    {
      label: 'NPSHa',
      value: `${result.npsha.toFixed(2)} m`,
      sub: result.accelHead != null ? `h_accel = ${result.accelHead.toFixed(2)} m` : 'Centrifugal',
    },
    {
      label: 'Motor (Recommended)',
      value: `${result.recommendedMotorKw} kW`,
      sub: `API min = ${result.apiMinMotorKw.toFixed(1)} kW`,
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center"
        >
          <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
          <p className="text-lg font-semibold font-mono tabular-nums leading-tight">{kpi.value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
        </div>
      ))}
    </div>
  )
}
