'use client'

import { convertUnit } from '@eng-suite/physics'
import type { NormalVentingResult as NVResult, ApiEdition } from '@/types'
import { useUomStore } from '@/lib/store/uomStore'
import { UOM_LABEL, BASE_UNITS } from '@/lib/uom'

interface Props {
  result: NVResult
  apiEdition: ApiEdition
  drainInbreathing?: number
}

interface RowProps {
  label: string
  value: number
  bold?: boolean
  displayUnit: string
}

function Row({ label, value, bold, displayUnit }: RowProps) {
  const displayValue = convertUnit(value, BASE_UNITS.ventRate, displayUnit)
  return (
    <div className={`flex justify-between px-3 py-1.5 text-xs ${bold ? 'bg-muted/30 font-semibold' : ''}`}>
      <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
      <span className="font-mono tabular-nums">
        {displayValue.toFixed(2)} {UOM_LABEL[displayUnit] ?? displayUnit}
      </span>
    </div>
  )
}

export function NormalVentingResult({ result, apiEdition, drainInbreathing }: Props) {
  const { outbreathing, inbreathing } = result
  const { units } = useUomStore()
  const displayUnit = units.ventRate
  const showFactors = apiEdition === '6TH' || apiEdition === '7TH'

  return (
    <div className="space-y-4">
      {/* Outbreathing */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Outbreathing
        </p>
        <div className="divide-y rounded-md border overflow-hidden">
          <Row label="Process flowrate" value={outbreathing.processFlowrate} displayUnit={displayUnit} />
          <Row
            label={
              showFactors
                ? `Thermal (Y = ${outbreathing.yFactor.toFixed(2)}, R = ${outbreathing.reductionFactor.toFixed(4)})`
                : 'Thermal outbreathing'
            }
            value={outbreathing.thermalOutbreathing}
            displayUnit={displayUnit}
          />
          <Row label="Total outbreathing" value={outbreathing.total} bold displayUnit={displayUnit} />
        </div>
      </div>

      {/* Inbreathing */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Inbreathing
        </p>
        <div className="divide-y rounded-md border overflow-hidden">
          <Row label="Process flowrate" value={inbreathing.processFlowrate} displayUnit={displayUnit} />
          <Row
            label={
              showFactors
                ? `Thermal (C = ${inbreathing.cFactor.toFixed(2)}, R = ${inbreathing.reductionFactor.toFixed(4)})`
                : 'Thermal inbreathing'
            }
            value={inbreathing.thermalInbreathing}
            displayUnit={displayUnit}
          />
          <Row label="Total inbreathing" value={inbreathing.total} bold displayUnit={displayUnit} />
        </div>
      </div>

      {/* Drain */}
      {drainInbreathing !== undefined && (
        <div className="flex justify-between px-3 py-1.5 text-xs rounded-md border">
          <span className="text-muted-foreground">Drain system inbreathing</span>
          <span className="font-mono tabular-nums">
            {convertUnit(drainInbreathing, BASE_UNITS.ventRate, displayUnit).toFixed(2)}{' '}
            {UOM_LABEL[displayUnit] ?? displayUnit}
          </span>
        </div>
      )}
    </div>
  )
}
