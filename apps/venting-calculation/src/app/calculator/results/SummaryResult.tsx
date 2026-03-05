'use client'

import { convertUnit } from '@eng-suite/physics'
import type { VentingSummary } from '@/types'
import { useUomStore } from '@/lib/store/uomStore'
import { UOM_LABEL, BASE_UNITS } from '@/lib/uom'

interface Props {
  summary: VentingSummary
}

interface SummaryMetricProps {
  label: string
  value: number
  displayUnit: string
}

function SummaryMetric({ label, value, displayUnit }: SummaryMetricProps) {
  const displayValue = convertUnit(value, BASE_UNITS.ventRate, displayUnit)
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground leading-none mb-1">{label}</p>
      <p className="text-xl font-bold tabular-nums leading-none">
        {displayValue.toFixed(1)}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{UOM_LABEL[displayUnit] ?? displayUnit}</p>
    </div>
  )
}

export function SummaryResult({ summary }: Props) {
  const { units } = useUomStore()
  const displayUnit = units.ventRate

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 py-1">
        <SummaryMetric
          label="Design Outbreathing"
          value={summary.designOutbreathing}
          displayUnit={displayUnit}
        />
        <SummaryMetric
          label="Design Inbreathing"
          value={summary.designInbreathing}
          displayUnit={displayUnit}
        />
        <SummaryMetric
          label="Emergency Venting"
          value={summary.emergencyVenting}
          displayUnit={displayUnit}
        />
      </div>
      <p className="text-center text-[10px] text-muted-foreground pt-1.5">
        All flowrates at 0 °C / 101.325 kPa (standard reference conditions, metric API 2000)
      </p>
    </div>
  )
}
