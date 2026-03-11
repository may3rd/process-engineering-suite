'use client'

import { useFormContext } from 'react-hook-form'
import { SectionCard } from '@/app/calculator/components/SectionCard'
import { FieldRow } from '@/app/calculator/components/FieldRow'
import type { CalculationInput, PumpCalculationResult } from '@/types'
import { PumpType } from '@/types'

interface Props {
  result: PumpCalculationResult | null
}

export function NpshaSection({ result }: Props) {
  const { register, watch } = useFormContext<CalculationInput>()
  const pumpType = watch('pumpType')
  const isPD = pumpType === PumpType.POSITIVE_DISPLACEMENT

  return (
    <SectionCard title="NPSH Available" collapsible defaultOpen={false}>
      {isPD && (
        <FieldRow label="Acceleration Head" hint="Only applicable to reciprocating PD pumps">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              {...register('calculateAccelHead')}
              className="h-4 w-4"
            />
            Calculate & subtract acceleration head (h_accel)
          </label>
        </FieldRow>
      )}

      {result && (
        <div className="rounded-md bg-muted/30 p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">NPSHa</span>
            <span className="font-mono font-semibold tabular-nums">
              {result.npsha.toFixed(2)} m
            </span>
          </div>
          {result.accelHead != null && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Acceleration Head (subtracted)</span>
              <span className="font-mono tabular-nums text-amber-600 dark:text-amber-400">
                {result.accelHead.toFixed(2)} m
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Suction Pressure</span>
            <span className="font-mono tabular-nums">
              {result.suctionPressureKpa.toFixed(1)} kPaa
            </span>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            NPSHa = (P_suction – P_vapour) / (SG × 9.807){result.accelHead != null ? ' – h_accel' : ''}
          </p>
        </div>
      )}

      {!result && (
        <p className="text-sm text-muted-foreground">Enter fluid data and suction conditions to see NPSHa.</p>
      )}
    </SectionCard>
  )
}
