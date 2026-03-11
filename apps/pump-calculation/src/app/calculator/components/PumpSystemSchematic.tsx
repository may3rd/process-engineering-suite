"use client"

import { useState } from "react"
import { Expand } from "lucide-react"
import { useFormContext } from "react-hook-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SectionCard } from "./SectionCard"
import { EquipmentType, PumpType } from "@/types"
import type { CalculationInput, PumpCalculationResult } from "@/types"

interface Props {
  result: PumpCalculationResult | null
}

interface Point {
  x: number
  y: number
}

interface SummaryCardLine {
  label: string
  value: string
}

interface EquipmentLayout {
  center: Point
  nozzle: Point
  typeLabelY: number
  pressureLabelY: number
  elevationArrowX: number
}

interface SchematicLayout {
  source: EquipmentLayout
  destination: EquipmentLayout
  pumpLeft: number
  pumpRight: number
  suctionPoints: string
  dischargePoints: string
  suctionLossMidX: number
  dischargeLossMidX: number
}

const W = 800
const H = 420
const PUMP_CX = 400
const PUMP_CY = 220
const PUMP_R = 32
const EQUIP_W = 70
const EQUIP_H = 90
const EQUIP_HD = 10
const SOURCE_CX = 90
const DEST_CX = 710
const PIPE_Y = PUMP_CY
const GROUND_Y = 276
const VESSEL_BOTTOM_OFF = EQUIP_H / 2 + EQUIP_HD - 10
const COLUMN_H = EQUIP_H + 20
const COLUMN_BOTTOM_OFF = COLUMN_H / 2 + EQUIP_HD - 10
const HEADER_HALF_H = 55
const HEADER_CENTER_CY = 150
const HEADER_BRANCH_OFF = 100
const SOURCE_BOTTOM_CONNECT_CY = 145
const SOURCE_SIDE_CONNECT_CY = 165
const DESTINATION_CENTER_CY = 150
const TABLE_Y = 292

function fmtKpa(v: number | undefined | null): string {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return "--"
  return `${v.toFixed(1)} kPa`
}

function fmtM(v: number | undefined | null): string {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return "--"
  return `${v.toFixed(1)} m`
}

function fmtFlow(v: number | undefined | null): string {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return "--"
  return `${v.toFixed(1)} m3/h`
}

function numberOr(v: number | undefined, fallback = 0): number {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) {
    return fallback
  }
  return v
}

function isBottomConnect(type: EquipmentType): boolean {
  return type === EquipmentType.VESSEL || type === EquipmentType.COLUMN
}

function bottomOff(type: EquipmentType): number {
  return type === EquipmentType.COLUMN ? COLUMN_BOTTOM_OFF : VESSEL_BOTTOM_OFF
}

function equipTopY(type: EquipmentType, cy: number): number {
  switch (type) {
    case EquipmentType.COLUMN:
      return cy - COLUMN_H / 2 - EQUIP_HD
    case EquipmentType.VESSEL:
      return cy - EQUIP_H / 2 - EQUIP_HD
    case EquipmentType.HEADER:
      return cy - HEADER_HALF_H
    default:
      return cy - EQUIP_H / 2
  }
}

function deriveLayout(
  suctionSourceType: EquipmentType,
  dischargeDestType: EquipmentType,
  _suctionElevation: number,
  _dischargeElevation: number,
): SchematicLayout {
  const sourceBottomConn = isBottomConnect(suctionSourceType)
  const sourceCenterY = sourceBottomConn
    ? SOURCE_BOTTOM_CONNECT_CY
    : suctionSourceType === EquipmentType.HEADER
      ? HEADER_CENTER_CY
      : SOURCE_SIDE_CONNECT_CY
  const destinationCenterY = dischargeDestType === EquipmentType.HEADER
    ? HEADER_CENTER_CY
    : DESTINATION_CENTER_CY

  const pumpLeft = PUMP_CX - PUMP_R
  const pumpRight = PUMP_CX + PUMP_R

  const sourceNozzle = {
    x: sourceBottomConn || suctionSourceType === EquipmentType.HEADER
      ? SOURCE_CX
      : SOURCE_CX + EQUIP_W / 2,
    y: sourceBottomConn ? sourceCenterY + bottomOff(suctionSourceType) : sourceCenterY,
  }

  const destinationNozzle = {
    x: dischargeDestType === EquipmentType.HEADER ? DEST_CX : DEST_CX - EQUIP_W / 2,
    y: destinationCenterY,
  }

  let suctionPoints: string
  if (sourceBottomConn) {
    suctionPoints = `${sourceNozzle.x},${sourceNozzle.y} ${SOURCE_CX},${PIPE_Y} ${pumpLeft},${PIPE_Y}`
  } else if (suctionSourceType === EquipmentType.HEADER) {
    const branchX = SOURCE_CX + HEADER_BRANCH_OFF
    suctionPoints = `${SOURCE_CX},${sourceCenterY} ${branchX},${sourceCenterY} ${branchX},${PIPE_Y} ${pumpLeft},${PIPE_Y}`
  } else {
    const midX = (sourceNozzle.x + pumpLeft) / 2
    suctionPoints =
      `${sourceNozzle.x},${sourceCenterY} ${midX},${sourceCenterY} ${midX},${PIPE_Y} ${pumpLeft},${PIPE_Y}`
  }

  let dischargePoints: string
  if (dischargeDestType === EquipmentType.HEADER) {
    const branchX = DEST_CX - HEADER_BRANCH_OFF
    dischargePoints = `${pumpRight},${PIPE_Y} ${branchX},${PIPE_Y} ${branchX},${destinationCenterY} ${DEST_CX},${destinationCenterY}`
  } else if (Math.abs(destinationNozzle.y - PIPE_Y) < 0.01) {
    dischargePoints = `${pumpRight},${PIPE_Y} ${destinationNozzle.x},${destinationNozzle.y}`
  } else {
    const midX = (pumpRight + destinationNozzle.x) / 2
    dischargePoints =
      `${pumpRight},${PIPE_Y} ${midX},${PIPE_Y} ${midX},${destinationNozzle.y} ${destinationNozzle.x},${destinationNozzle.y}`
  }

  return {
    source: {
      center: { x: SOURCE_CX, y: sourceCenterY },
      nozzle: sourceNozzle,
      typeLabelY: suctionSourceType === EquipmentType.HEADER
        ? sourceCenterY + HEADER_HALF_H + 14
        : sourceCenterY + EQUIP_H / 2 + 20,
      pressureLabelY: equipTopY(suctionSourceType, sourceCenterY) - 28,
      elevationArrowX: SOURCE_CX + EQUIP_W / 2 + 16,
    },
    destination: {
      center: { x: DEST_CX, y: destinationCenterY },
      nozzle: destinationNozzle,
      typeLabelY: dischargeDestType === EquipmentType.HEADER
        ? destinationCenterY + HEADER_HALF_H + 14
        : destinationCenterY + EQUIP_H / 2 + 20,
      pressureLabelY: equipTopY(dischargeDestType, destinationCenterY) - 28,
      elevationArrowX: DEST_CX - EQUIP_W / 2 - 16,
    },
    pumpLeft,
    pumpRight,
    suctionPoints,
    dischargePoints,
    suctionLossMidX: sourceBottomConn
      ? (SOURCE_CX + pumpLeft) / 2 + 20
      : suctionSourceType === EquipmentType.HEADER
        ? (SOURCE_CX + pumpLeft) / 2
        : (SOURCE_CX + EQUIP_W / 2 + pumpLeft) / 2,
    dischargeLossMidX: dischargeDestType === EquipmentType.HEADER
      ? (pumpRight + DEST_CX) / 2
      : (pumpRight + destinationNozzle.x) / 2,
  }
}

function EquipmentShape({ cx, cy, type }: { cx: number; cy: number; type: EquipmentType }) {
  const x = cx - EQUIP_W / 2
  const y = cy - EQUIP_H / 2
  const w = EQUIP_W
  const h = EQUIP_H

  switch (type) {
    case EquipmentType.VESSEL: {
      const path =
        `M ${x},${y + EQUIP_HD} L ${x + w},${y + EQUIP_HD} L ${x + w},${y + h - EQUIP_HD} L ${x},${y + h - EQUIP_HD} Z` +
        ` M ${x + w},${y + EQUIP_HD} A ${w / 2},${EQUIP_HD} 0 0 0 ${x},${y + EQUIP_HD}` +
        ` M ${x},${y + h - EQUIP_HD} A ${w / 2},${EQUIP_HD} 0 0 0 ${x + w},${y + h - EQUIP_HD}`
      return <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.72" />
    }
    case EquipmentType.TANK: {
      const roofH = 16
      const path =
        `M ${x},${y + roofH} L ${x + w / 2},${y} L ${x + w},${y + roofH}` +
        ` L ${x + w},${y + h} L ${x},${y + h} Z`
      return <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.72" />
    }
    case EquipmentType.COLUMN: {
      const cw = 40
      const ch = COLUMN_H
      const cx2 = cx - cw / 2
      const cy2 = cy - ch / 2
      let path =
        `M ${cx2},${cy2 + EQUIP_HD} L ${cx2 + cw},${cy2 + EQUIP_HD} L ${cx2 + cw},${cy2 + ch - EQUIP_HD} L ${cx2},${cy2 + ch - EQUIP_HD} Z` +
        ` M ${cx2 + cw},${cy2 + EQUIP_HD} A ${cw / 2},${EQUIP_HD} 0 0 0 ${cx2},${cy2 + EQUIP_HD}` +
        ` M ${cx2},${cy2 + ch - EQUIP_HD} A ${cw / 2},${EQUIP_HD} 0 0 0 ${cx2 + cw},${cy2 + ch - EQUIP_HD}`
      const traySpacing = (ch - 2 * EQUIP_HD) / 4
      for (let i = 1; i <= 3; i++) {
        const trayY = cy2 + EQUIP_HD + i * traySpacing
        path += ` M ${cx2},${trayY} L ${cx2 + cw},${trayY}`
      }
      return <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.72" />
    }
    case EquipmentType.HEADER:
      return (
        <g opacity="0.75">
          <line x1={cx} y1={cy - HEADER_HALF_H} x2={cx} y2={cy + HEADER_HALF_H} stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
          <line x1={cx - 9} y1={cy - HEADER_HALF_H} x2={cx + 9} y2={cy - HEADER_HALF_H} stroke="currentColor" strokeWidth="2" />
          <line x1={cx - 9} y1={cy + HEADER_HALF_H} x2={cx + 9} y2={cy + HEADER_HALF_H} stroke="currentColor" strokeWidth="2" />
        </g>
      )
    case EquipmentType.ATMOSPHERIC: {
      const path = `M ${x},${y} L ${x},${y + h} L ${x + w},${y + h} L ${x + w},${y}`
      return (
        <g opacity="0.72">
          <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" />
          <line x1={x} y1={y} x2={x + w} y2={y} stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.6" />
          <text x={cx} y={y + h / 2 + 4} textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.5">ATM</text>
        </g>
      )
    }
  }
}

function PumpSymbol({ cx, cy, type }: { cx: number; cy: number; type: PumpType }) {
  if (type === PumpType.CENTRIFUGAL) {
    const wedgePoints = [
      `${cx - 6},${cy - (PUMP_R - 2)}`,
      `${cx + PUMP_R - 1},${cy}`,
      `${cx - 6},${cy + (PUMP_R - 2)}`,
    ].join(" ")
    return (
      <g data-testid="pump-symbol">
        <circle cx={cx} cy={cy} r={PUMP_R} fill="none" stroke="currentColor" strokeWidth="2.6" />
        <line
          x1={cx - 6}
          y1={cy - (PUMP_R - 2)}
          x2={cx + PUMP_R - 1}
          y2={cy}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <line
          x1={cx - 6}
          y1={cy + (PUMP_R - 2)}
          x2={cx + PUMP_R - 1}
          y2={cy}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <polygon
          points={wedgePoints}
          fill="currentColor"
          opacity="0.0"
        />
      </g>
    )
  }

  const pw = PUMP_R * 1.6
  const ph = PUMP_R * 1.2
  return (
    <g>
      <rect x={cx - pw / 2} y={cy - ph / 2} width={pw} height={ph} rx="6" fill="rgba(255,255,255,0.03)" stroke="currentColor" strokeWidth="2.3" />
      <line x1={cx - pw / 2 + 8} y1={cy + ph / 2 - 8} x2={cx + pw / 2 - 8} y2={cy - ph / 2 + 8} stroke="currentColor" strokeWidth="1.5" />
    </g>
  )
}

function MetricLabel({
  x,
  y,
  label,
  value,
  align = "middle",
}: {
  x: number
  y: number
  label: string
  value: string
  align?: "start" | "middle" | "end"
}) {
  return (
    <g>
      <text x={x} y={y} textAnchor={align} fontSize="8.5" fill="currentColor" opacity="0.55" fontFamily="monospace">
        {label}
      </text>
      <text x={x} y={y + 12} textAnchor={align} fontSize="10.5" fontWeight="700" fill="currentColor" fontFamily="monospace">
        {value}
      </text>
    </g>
  )
}

function LossCallout({ x, y, label, value }: { x: number; y: number; label: string; value: string }) {
  return (
    <g opacity="0.92">
      <rect x={x - 34} y={y - 15} width="68" height="28" rx="2" fill="none" stroke="currentColor" opacity="0.28" />
      <line x1={x - 34} y1={y - 1} x2={x + 34} y2={y - 1} stroke="currentColor" opacity="0.16" />
      <text x={x} y={y - 5} textAnchor="middle" fontSize="7" fill="currentColor" opacity="0.62" fontFamily="monospace" letterSpacing="0.7">
        {label}
      </text>
      <text x={x} y={y + 8} textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" fontFamily="monospace">
        {value}
      </text>
    </g>
  )
}

function ElevationArrow({ x, pumpY, equipCY, elevM }: { x: number; pumpY: number; equipCY: number; elevM: number }) {
  if (Math.abs(elevM) < 0.01) return null
  const minY = Math.min(pumpY, equipCY)
  const maxY = Math.max(pumpY, equipCY)
  const midY = (minY + maxY) / 2
  return (
    <g opacity="0.5">
      <line
        x1={x}
        y1={minY}
        x2={x}
        y2={maxY}
        stroke="currentColor"
        strokeWidth="1"
        markerStart="url(#pumpDimArrow)"
        markerEnd="url(#pumpDimArrow)"
      />
      <text
        x={x - 5}
        y={midY}
        textAnchor="end"
        fontSize="8"
        fill="currentColor"
        fontFamily="monospace"
        transform={`rotate(-90 ${x - 5} ${midY})`}
      >
        {fmtM(Math.abs(elevM))}
      </text>
    </g>
  )
}

function DataTableSection({
  x,
  y,
  width,
  title,
  lines,
  testId,
}: {
  x: number
  y: number
  width: number
  title: string
  lines: SummaryCardLine[]
  testId?: string
}) {
  const height = 74
  return (
    <g data-testid={testId}>
      <rect x={x} y={y} width={width} height={height} rx="2" fill="none" stroke="currentColor" opacity="0.3" />
      <line x1={x} y1={y + 22} x2={x + width} y2={y + 22} stroke="currentColor" opacity="0.2" />
      <text x={x + 10} y={y + 14} fontSize="8" fontWeight="700" fill="currentColor" fontFamily="monospace" letterSpacing="1">
        {title}
      </text>
      {lines.map((line, index) => {
        const rowY = y + 37 + index * 17
        return (
          <g key={`${title}-${line.label}`}>
            <text x={x + 10} y={rowY} fontSize="7.5" fill="currentColor" opacity="0.64" fontFamily="monospace" letterSpacing="0.4">
              {line.label}
            </text>
            <text x={x + width - 10} y={rowY} textAnchor="end" fontSize="8.5" fontWeight="700" fill="currentColor" fontFamily="monospace">
              {line.value}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function SchematicSvg({
  layout,
  suctionSourceType,
  dischargeDestType,
  suctionSourcePressure,
  dischargeDestPressure,
  suctionElevation,
  dischargeElevation,
  suctionLosses,
  dischargeLosses,
  result,
  flowDesign,
  pumpType,
  tag,
  className,
}: {
  layout: SchematicLayout
  suctionSourceType: EquipmentType
  dischargeDestType: EquipmentType
  suctionSourcePressure: number | undefined
  dischargeDestPressure: number | undefined
  suctionElevation: number
  dischargeElevation: number
  suctionLosses: Array<{ label: string; value: number; show: boolean }>
  dischargeLosses: Array<{ label: string; value: number; show: boolean }>
  result: PumpCalculationResult | null
  flowDesign: number | undefined
  pumpType: PumpType
  tag: string | undefined
  className?: string
}) {
  const suctionSummary: SummaryCardLine[] = [
    { label: "Source", value: suctionSourceType },
    { label: "Source P", value: fmtKpa(suctionSourcePressure) },
    { label: "Pump inlet", value: fmtKpa(result?.suctionPressureKpa) },
  ]

  const operatingSummary: SummaryCardLine[] = [
    { label: "Flow", value: fmtFlow(flowDesign) },
    { label: "Diff head", value: fmtM(result?.differentialHead) },
    { label: "Pump dP", value: fmtKpa(result?.differentialPressureKpa) },
  ]

  const dischargeSummary: SummaryCardLine[] = [
    { label: "Destination", value: dischargeDestType },
    { label: "Pump outlet", value: fmtKpa(result?.dischargePressureKpa) },
    { label: "Dest P", value: fmtKpa(dischargeDestPressure) },
  ]

  return (
    <svg
      id="pump-schematic-svg"
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <marker id="pumpFlowArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
        <marker id="pumpDimArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" opacity="0.45" />
        </marker>
      </defs>

      <text x="34" y="36" fontSize="9" fontWeight="700" fill="currentColor" fontFamily="monospace" letterSpacing="1">
        PUMP SYSTEM SCHEMATIC
      </text>
      <text x="766" y="36" textAnchor="end" fontSize="8" fill="currentColor" opacity="0.56" fontFamily="monospace">
        NOT TO SCALE
      </text>

      <DataTableSection
        x={34}
        y={TABLE_Y}
        width={220}
        title="SUCTION DATA"
        lines={suctionSummary}
        testId="data-table-suction"
      />
      <DataTableSection
        x={290}
        y={TABLE_Y}
        width={220}
        title="OPERATING DATA"
        lines={operatingSummary}
        testId="data-table-operating"
      />
      <DataTableSection
        x={546}
        y={TABLE_Y}
        width={220}
        title="DISCHARGE DATA"
        lines={dischargeSummary}
        testId="data-table-discharge"
      />

      <line x1={layout.pumpLeft - 12} y1={PUMP_CY} x2={layout.pumpRight + 12} y2={PUMP_CY} stroke="currentColor" strokeWidth="0.7" strokeDasharray="4 4" opacity="0.14" />

      <EquipmentShape cx={layout.source.center.x} cy={layout.source.center.y} type={suctionSourceType} />
      <EquipmentShape cx={layout.destination.center.x} cy={layout.destination.center.y} type={dischargeDestType} />

      <text x={layout.source.center.x} y={layout.source.typeLabelY} textAnchor="middle" fontSize="8.5" fill="currentColor" opacity="0.52" fontFamily="monospace">
        {suctionSourceType}
      </text>
      <text x={layout.destination.center.x} y={layout.destination.typeLabelY} textAnchor="middle" fontSize="8.5" fill="currentColor" opacity="0.52" fontFamily="monospace">
        {dischargeDestType}
      </text>

      <polyline
        data-testid="suction-line"
        points={layout.suctionPoints}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.92"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd="url(#pumpFlowArrow)"
      />
      <polyline
        data-testid="discharge-line"
        points={layout.dischargePoints}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.92"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd="url(#pumpFlowArrow)"
      />

      <circle cx={layout.pumpLeft} cy={PIPE_Y} r="4.5" fill="currentColor" opacity="0.8" />
      <circle cx={layout.pumpRight} cy={PIPE_Y} r="4.5" fill="currentColor" opacity="0.8" />

      <PumpSymbol cx={PUMP_CX} cy={PUMP_CY} type={pumpType} />
      {tag ? (
        <text x={PUMP_CX} y={PUMP_CY + PUMP_R + 16} textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor" fontFamily="monospace">
          {tag}
        </text>
      ) : null}

      <MetricLabel x={layout.source.center.x} y={layout.source.pressureLabelY} label="Source P" value={fmtKpa(suctionSourcePressure)} />
      <MetricLabel x={layout.destination.center.x} y={layout.destination.pressureLabelY} label="Dest P" value={fmtKpa(dischargeDestPressure)} />
      <MetricLabel x={layout.pumpLeft - 14} y={PIPE_Y - 28} label="P suction" value={fmtKpa(result?.suctionPressureKpa)} align="end" />
      <MetricLabel x={layout.pumpRight + 14} y={PIPE_Y - 28} label="P discharge" value={fmtKpa(result?.dischargePressureKpa)} align="start" />

      {suctionLosses.length > 0 ? (
        suctionLosses.map((loss, index) => (
          <LossCallout
            key={`suction-${loss.label}`}
            x={layout.suctionLossMidX - (suctionLosses.length - 1) * 34 + index * 68}
            y={PIPE_Y + 46}
            label={`-${loss.label}`}
            value={fmtKpa(loss.value)}
          />
        ))
      ) : (
        <LossCallout x={layout.suctionLossMidX} y={PIPE_Y + 46} label="Suction" value="clean" />
      )}

      {dischargeLosses.length > 0 ? (
        dischargeLosses.map((loss, index) => {
          const count = dischargeLosses.length
          const span = Math.abs(layout.dischargeLossMidX - layout.pumpRight) * 1.5
          const spacing = Math.min(74, span / Math.max(count, 1))
          const startX = layout.dischargeLossMidX - ((count - 1) * spacing) / 2
          return (
              <LossCallout
                key={`discharge-${loss.label}`}
                x={startX + index * spacing}
                y={PIPE_Y + 46}
                label={`+${loss.label}`}
                value={fmtKpa(loss.value)}
              />
            )
          })
      ) : (
        <LossCallout x={layout.dischargeLossMidX} y={PIPE_Y + 46} label="Discharge" value="clean" />
      )}

      <ElevationArrow x={layout.source.elevationArrowX} pumpY={PUMP_CY} equipCY={layout.source.center.y} elevM={suctionElevation} />
      <ElevationArrow x={layout.destination.elevationArrowX} pumpY={PUMP_CY} equipCY={layout.destination.center.y} elevM={dischargeElevation} />
    </svg>
  )
}

export function PumpSystemSchematic({ result }: Props) {
  const { watch } = useFormContext<CalculationInput>()
  const [isOpen, setIsOpen] = useState(false)

  const suctionSourceType = watch("suctionSourceType") ?? EquipmentType.VESSEL
  const dischargeDestType = watch("dischargeDestType") ?? EquipmentType.VESSEL
  const suctionSourcePressure = watch("suctionSourcePressure")
  const suctionElevation = numberOr(watch("suctionElevation"))
  const suctionLineLoss = numberOr(watch("suctionLineLoss"))
  const suctionStrainerLoss = numberOr(watch("suctionStrainerLoss"))
  const suctionOtherLoss = numberOr(watch("suctionOtherLoss"))
  const dischargeDestPressure = watch("dischargeDestPressure")
  const dischargeElevation = numberOr(watch("dischargeElevation"))
  const dischargeEquipmentDp = numberOr(watch("dischargeEquipmentDp"))
  const dischargeLineLoss = numberOr(watch("dischargeLineLoss"))
  const dischargeFlowElementDp = numberOr(watch("dischargeFlowElementDp"))
  const dischargeControlValveDp = watch("dischargeControlValveDp")
  const dischargeDesignMargin = numberOr(watch("dischargeDesignMargin"))
  const pumpType = watch("pumpType") ?? PumpType.CENTRIFUGAL
  const flowDesign = watch("flowDesign")
  const tag = watch("tag")

  const layout = deriveLayout(
    suctionSourceType,
    dischargeDestType,
    suctionElevation,
    dischargeElevation,
  )

  const suctionLosses = [
    { label: "Line", value: suctionLineLoss, show: suctionLineLoss > 0 },
    { label: "Strainer", value: suctionStrainerLoss, show: suctionStrainerLoss > 0 },
    { label: "Other", value: suctionOtherLoss, show: suctionOtherLoss > 0 },
  ].filter((loss) => loss.show)

  const dischargeLosses = [
    { label: "Equip", value: dischargeEquipmentDp, show: dischargeEquipmentDp > 0 },
    { label: "Line", value: dischargeLineLoss, show: dischargeLineLoss > 0 },
    { label: "Flow", value: dischargeFlowElementDp, show: dischargeFlowElementDp > 0 },
    {
      label: "Valve",
      value: dischargeControlValveDp ?? 0,
      show: dischargeControlValveDp != null && dischargeControlValveDp > 0,
    },
    { label: "Margin", value: dischargeDesignMargin, show: dischargeDesignMargin > 0 },
  ].filter((loss) => loss.show)

  return (
    <SectionCard
      title="System Schematic"
      action={
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Open larger schematic">
              <Expand />
              View larger
            </Button>
          </DialogTrigger>
          <DialogContent className="grid h-[78vh] w-[88vw] max-w-[88vw] grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-4 sm:h-[82vh] sm:w-[84vw] sm:max-w-[84vw] xl:w-[1240px] xl:max-w-[1240px]">
            <DialogHeader>
              <DialogTitle>Expanded System Schematic</DialogTitle>
              <DialogDescription>
                Larger view of the live pump system schematic.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto rounded-xl border bg-card/40 p-3">
              <SchematicSvg
                layout={layout}
                suctionSourceType={suctionSourceType}
                dischargeDestType={dischargeDestType}
                suctionSourcePressure={suctionSourcePressure}
                dischargeDestPressure={dischargeDestPressure}
                suctionElevation={suctionElevation}
                dischargeElevation={dischargeElevation}
                suctionLosses={suctionLosses}
                dischargeLosses={dischargeLosses}
                result={result}
                flowDesign={flowDesign}
                pumpType={pumpType}
                tag={tag}
                className="h-auto w-full min-w-[960px] text-foreground"
              />
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="flex flex-col items-center gap-3 py-2">
        <SchematicSvg
          layout={layout}
          suctionSourceType={suctionSourceType}
          dischargeDestType={dischargeDestType}
          suctionSourcePressure={suctionSourcePressure}
          dischargeDestPressure={dischargeDestPressure}
          suctionElevation={suctionElevation}
          dischargeElevation={dischargeElevation}
          suctionLosses={suctionLosses}
          dischargeLosses={dischargeLosses}
          result={result}
          flowDesign={flowDesign}
          pumpType={pumpType}
          tag={tag}
          className="h-auto w-full text-foreground"
        />
      </div>
    </SectionCard>
  )
}
