'use client'

import { SectionCard } from '@/app/calculator/components/SectionCard'
import type { PumpCalculationResult } from '@/types'

interface Props {
  result: PumpCalculationResult
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 text-sm border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums font-semibold">{value}</span>
    </div>
  )
}

export function OptionalResults({ result }: Props) {
  const hasOrifice = result.orificeDeltaPKpa != null
  const hasCv = result.recommendedCvDeltaPKpa != null
  const hasMinFlow = result.minFlowM3h != null
  const hasShutoff = result.shutoffPressureKpa != null || result.shutoffHead != null

  if (!hasOrifice && !hasCv && !hasMinFlow && !hasShutoff) {
    return null
  }

  return (
    <SectionCard title="Optional Results">
      <div className="space-y-0">
        {hasOrifice && (
          <Row
            label="Orifice Plate ΔP"
            value={`${result.orificeDeltaPKpa!.toFixed(1)} kPa`}
          />
        )}
        {hasCv && (
          <Row
            label="Recommended CV ΔP"
            value={`${result.recommendedCvDeltaPKpa!.toFixed(1)} kPa`}
          />
        )}
        {hasMinFlow && (
          <Row
            label="Min. Continuous Flow (temp rise)"
            value={`${result.minFlowM3h!.toFixed(2)} m³/h`}
          />
        )}
        {hasShutoff && (
          <>
            {result.shutoffHead != null && (
              <Row
                label="Shut-off Head"
                value={`${result.shutoffHead.toFixed(1)} m`}
              />
            )}
            {result.shutoffPressureKpa != null && (
              <Row
                label="Shut-off Pressure"
                value={`${result.shutoffPressureKpa.toFixed(1)} kPaa`}
              />
            )}
            {result.shutoffPowerKw != null && (
              <Row
                label="Shut-off Power"
                value={`${result.shutoffPowerKw.toFixed(2)} kW`}
              />
            )}
          </>
        )}
      </div>
    </SectionCard>
  )
}
