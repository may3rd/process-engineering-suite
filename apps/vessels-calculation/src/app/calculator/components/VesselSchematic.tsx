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
import { CalculationInput, EquipmentMode, VesselOrientation, HeadType } from "@/types"
import { SectionCard } from "./SectionCard"
import { autoHeadDepth } from "@/lib/calculations/vesselGeometry"

export function VesselSchematic() {
  const { watch } = useFormContext<CalculationInput>()

  const id = watch("insideDiameter")
  const length = watch("shellLength")
  const equipmentMode = watch("equipmentMode") ?? EquipmentMode.VESSEL
  const orientation = watch("orientation") ?? VesselOrientation.VERTICAL
  const headType = watch("headType") ?? HeadType.ELLIPSOIDAL_2_1
  const headDepthInput = watch("headDepth")
  const bootHeight = watch("bootHeight") ?? 0

  const ll = watch("liquidLevel")
  const hll = watch("hll")
  const lll = watch("lll")
  const ofl = watch("ofl")

  const [isOpen, setIsOpen] = useState(false)

  if (equipmentMode === EquipmentMode.TANK || !id || id <= 0 || !length || length <= 0) {
    return null
  }

  const headDepth = headDepthInput || autoHeadDepth(headType, id) || 0
  const isVertical = orientation === VesselOrientation.VERTICAL

  const padding = 56
  const svgSize = 420
  const drawArea = svgSize - 2 * padding

  const totalW = isVertical ? id : length + 2 * headDepth
  const totalH = isVertical
    ? length + headDepth + Math.max(headDepth, bootHeight)
    : id + bootHeight

  const scale = Math.min(drawArea / Math.max(totalW, 1), drawArea / Math.max(totalH, 1))

  const vW = (isVertical ? id : length) * scale
  const vH = (isVertical ? length : id) * scale
  const vHD = headDepth * scale
  const boot = Math.max(0, bootHeight) * scale

  const fullW = isVertical ? vW : vW + 2 * vHD
  const fullH = isVertical
    ? vH + vHD + Math.max(vHD, boot)
    : vH + boot

  const left = (svgSize - fullW) / 2
  const top = (svgSize - fullH) / 2
  const x0 = isVertical ? left : left + vHD
  const y0 = isVertical ? top + vHD : top

  let path = ""
  if (isVertical) {
    path = `M ${x0},${y0} L ${x0 + vW},${y0} L ${x0 + vW},${y0 + vH} L ${x0},${y0 + vH} Z`
    if (headType === HeadType.HEMISPHERICAL) {
      path += ` M ${x0 + vW},${y0} A ${vW / 2},${vW / 2} 0 0 0 ${x0},${y0}`
      path += ` M ${x0},${y0 + vH} A ${vW / 2},${vW / 2} 0 0 0 ${x0 + vW},${y0 + vH}`
    } else if (headType === HeadType.ELLIPSOIDAL_2_1 || headType === HeadType.TORISPHERICAL_80_10) {
      path += ` M ${x0 + vW},${y0} A ${vW / 2},${vHD} 0 0 0 ${x0},${y0}`
      path += ` M ${x0},${y0 + vH} A ${vW / 2},${vHD} 0 0 0 ${x0 + vW},${y0 + vH}`
    } else if (headType === HeadType.CONICAL) {
      path += ` M ${x0 + vW},${y0} L ${x0 + vW / 2},${y0 - vHD} L ${x0},${y0}`
      path += ` M ${x0},${y0 + vH} L ${x0 + vW / 2},${y0 + vH + vHD} L ${x0 + vW},${y0 + vH}`
    }
  } else {
    path = `M ${x0},${y0} L ${x0 + vW},${y0} L ${x0 + vW},${y0 + vH} L ${x0},${y0 + vH} Z`
    if (headType === HeadType.HEMISPHERICAL) {
      path += ` M ${x0},${y0 + vH} A ${vH / 2},${vH / 2} 0 0 1 ${x0},${y0}`
      path += ` M ${x0 + vW},${y0} A ${vH / 2},${vH / 2} 0 0 1 ${x0 + vW},${y0 + vH}`
    } else if (headType === HeadType.ELLIPSOIDAL_2_1 || headType === HeadType.TORISPHERICAL_80_10) {
      path += ` M ${x0},${y0 + vH} A ${vHD},${vH / 2} 0 0 1 ${x0},${y0}`
      path += ` M ${x0 + vW},${y0} A ${vHD},${vH / 2} 0 0 1 ${x0 + vW},${y0 + vH}`
    } else if (headType === HeadType.CONICAL) {
      path += ` M ${x0},${y0 + vH} L ${x0 - vHD},${y0 + vH / 2} L ${x0},${y0}`
      path += ` M ${x0 + vW},${y0} L ${x0 + vW + vHD},${y0 + vH / 2} L ${x0 + vW},${y0 + vH}`
    }
  }

  const lowerTangentY = y0 + vH
  const bottomY = y0 + vH
  const groundY = isVertical ? lowerTangentY + boot : bottomY + boot
  const showBoots = boot > 0

  const getLevelY = (levelMm: number | undefined) => {
    if (levelMm === undefined || isNaN(levelMm)) return undefined
    if (isVertical) {
      return y0 + vH + vHD - levelMm * scale
    }
    return y0 + vH - levelMm * scale
  }

  const legX1 = isVertical ? x0 : x0 + vW * 0.18
  const legX2 = isVertical ? x0 + vW : x0 + vW * 0.82
  const legTopY = isVertical ? lowerTangentY : bottomY

  const renderSvg = (svgClassName: string) => (
    <svg
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      className={svgClassName}
      aria-hidden="true"
    >
      <defs>
        <clipPath id="vesselClip">
          <path d={path} />
        </clipPath>
        <marker id="vesselArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>

      {ll !== undefined && ll > 0 && (
        <rect
          x="0"
          y={getLevelY(ll)}
          width={svgSize}
          height={svgSize}
          fill="rgba(56, 189, 248, 0.25)"
          clipPath="url(#vesselClip)"
        />
      )}

      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-90"
      />

      {showBoots && (
        <>
          <line x1={legX1} y1={legTopY} x2={legX1} y2={groundY} stroke="currentColor" strokeWidth="2" />
          <line x1={legX2} y1={legTopY} x2={legX2} y2={groundY} stroke="currentColor" strokeWidth="2" />
        </>
      )}
      <line
        x1={x0 - vHD - 24}
        y1={groundY}
        x2={x0 + vW + vHD + 24}
        y2={groundY}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        opacity="0.8"
      />

      <LevelLine y={getLevelY(ll)} label={`LL ${fmtM(ll)}`} color="#38bdf8" x0={x0} xW={vW} vHD={isVertical ? 0 : vHD} />
      <LevelLine y={getLevelY(hll)} label={`HLL ${fmtM(hll)}`} color="#22c55e" x0={x0} xW={vW} vHD={isVertical ? 0 : vHD} dashed />
      <LevelLine y={getLevelY(lll)} label={`LLL ${fmtM(lll)}`} color="#f59e0b" x0={x0} xW={vW} vHD={isVertical ? 0 : vHD} dashed />
      <LevelLine y={getLevelY(ofl)} label={`OFL ${fmtM(ofl)}`} color="#ef4444" x0={x0} xW={vW} vHD={isVertical ? 0 : vHD} dashed />

      {isVertical ? (
        <>
          <Annotation x1={x0 - 26} y1={y0} x2={x0 - 26} y2={y0 + vH} label={`T-T ${fmtM(length)}`} vertical />
          <Annotation x1={x0} y1={y0 + vH + vHD + 18} x2={x0 + vW} y2={y0 + vH + vHD + 18} label={`D ${fmtM(id)}`} />
          {showBoots && (
            <Annotation x1={x0 + vW + 24} y1={lowerTangentY} x2={x0 + vW + 24} y2={groundY} label={`Boot ${fmtM(bootHeight)}`} vertical />
          )}
        </>
      ) : (
        <>
          <Annotation x1={x0} y1={y0 - 20} x2={x0 + vW} y2={y0 - 20} label={`T-T ${fmtM(length)}`} />
          <Annotation x1={x0 + vW + vHD + 20} y1={y0} x2={x0 + vW + vHD + 20} y2={y0 + vH} label={`D ${fmtM(id)}`} vertical />
          {showBoots && (
            <Annotation x1={x0 + vW + vHD + 36} y1={bottomY} x2={x0 + vW + vHD + 36} y2={groundY} label={`Boot ${fmtM(bootHeight)}`} vertical />
          )}
        </>
      )}
    </svg>
  )

  return (
    <SectionCard
      title="Vessel Schematic"
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
              <DialogTitle>Expanded Vessel Schematic</DialogTitle>
              <DialogDescription>
                Larger view of the live vessel schematic.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto rounded-xl border bg-card/40 p-3">
              {renderSvg("h-auto w-full min-w-[480px] text-foreground")}
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2">
        {renderSvg("w-full max-w-[340px] h-auto text-foreground")}

        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-sky-400/25 border border-sky-400/50 rounded-sm" />
            <span>Liquid</span>
          </div>
          {showBoots && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 border border-current rounded-sm" />
              <span>Legs / Boots</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0 border-t border-dashed border-current" />
            <span>Ground</span>
          </div>
          {hll !== undefined && <LegendLineItem label="HLL" color="#22c55e" />}
          {lll !== undefined && <LegendLineItem label="LLL" color="#f59e0b" />}
          {ofl !== undefined && <LegendLineItem label="OFL" color="#ef4444" />}
        </div>
      </div>
    </SectionCard>
  )
}

function fmtM(value?: number): string {
  if (value == null || isNaN(value)) return "—"
  return `${(value / 1000).toFixed(2)}m`
}

function LevelLine({
  y,
  label,
  color,
  x0,
  xW,
  vHD,
  dashed,
}: {
  y?: number
  label: string
  color: string
  x0: number
  xW: number
  vHD: number
  dashed?: boolean
}) {
  if (y === undefined || isNaN(y)) return null

  const lineX1 = x0 - vHD - 10
  const lineX2 = x0 + xW + vHD + 10

  return (
    <g>
      <line
        x1={lineX1}
        y1={y}
        x2={lineX2}
        y2={y}
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray={dashed ? "4 2" : "none"}
      />
      <text
        x={lineX2 + 4}
        y={y}
        dy="0.35em"
        fill={color}
        fontSize="11"
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  )
}

function LegendLineItem({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-4 h-0 border-t border-dashed" style={{ borderColor: color }} />
      <span>{label}</span>
    </div>
  )
}

function Annotation({
  x1,
  y1,
  x2,
  y2,
  label,
  vertical,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
  vertical?: boolean
}) {
  return (
    <g className="text-muted-foreground/70">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1" markerStart="url(#vesselArrow)" markerEnd="url(#vesselArrow)" />
      <text
        x={(x1 + x2) / 2}
        y={(y1 + y2) / 2}
        dy={vertical ? "0" : "-6"}
        dx={vertical ? "-8" : "0"}
        textAnchor="middle"
        fontSize="10"
        fill="currentColor"
        transform={vertical ? `rotate(-90 ${(x1 + x2) / 2} ${(y1 + y2) / 2})` : ""}
      >
        {label}
      </text>
    </g>
  )
}
