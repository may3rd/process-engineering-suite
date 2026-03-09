'use client'

import { SectionCard } from '@/app/calculator/components/SectionCard'
import type { PumpCalculationResult } from '@/types'

interface Props {
  result: PumpCalculationResult
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 text-sm border-b last:border-0 ${highlight ? 'bg-muted/30 px-2 -mx-2 rounded font-semibold' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  )
}

export function PowerResult({ result }: Props) {
  return (
    <SectionCard title="Power & Motor Sizing">
      <div className="space-y-0">
        <Row label="Hydraulic Power" value={`${result.hydraulicPowerKw.toFixed(2)} kW`} />
        <Row label="Shaft Power (incl. wear margin)" value={`${result.shaftPowerKw.toFixed(2)} kW`} />
        <Row label="API 610 Min Motor" value={`${result.apiMinMotorKw.toFixed(2)} kW`} />
        <Row label="Recommended Standard Motor" value={`${result.recommendedMotorKw} kW`} highlight />
      </div>
    </SectionCard>
  )
}
