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

export function PressureResult({ result }: Props) {
  return (
    <SectionCard title="Pressure Summary">
      <div className="space-y-0">
        <Row label="Suction Pressure" value={`${result.suctionPressureKpa.toFixed(1)} kPaa`} />
        <Row label="Discharge Pressure" value={`${result.dischargePressureKpa.toFixed(1)} kPaa`} />
        <Row label="Differential Pressure" value={`${result.differentialPressureKpa.toFixed(1)} kPa`} highlight />
        <Row label="Static Head Component" value={`${result.staticHead.toFixed(2)} m`} />
        <Row label="Friction Head Component" value={`${result.frictionHead.toFixed(2)} m`} />
        <Row label="Differential Head" value={`${result.differentialHead.toFixed(2)} m`} highlight />
      </div>
    </SectionCard>
  )
}
