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
import { cn } from "@/lib/utils"
import type { CalculationInput } from "@/types"
import { TankRoofType, TankType } from "@/types"

export function TankSchematic() {
  const { watch } = useFormContext<CalculationInput>()
  const diameter = watch("insideDiameter")
  const tankType = watch("tankType")
  const shellHeight = watch("shellLength")
  const roofType = watch("tankRoofType")
  const roofHeight = watch("roofHeight") ?? 0
  const bottomHeight = watch("bottomHeight") ?? 0
  const ll = watch("liquidLevel")
  const hll = watch("hll")
  const lll = watch("lll")
  const ofl = watch("ofl")

  const [isOpen, setIsOpen] = useState(false)

  if (!diameter || diameter <= 0 || !tankType) {
    return null
  }

  if (tankType === TankType.SPHERICAL) {
    const svgWidth = 560
    const svgHeight = 380
    const padding = 40
    const zoomOutFactor = 0.88
    const radiusMm = diameter / 2
    const maxW = (svgWidth - 2 * padding) * zoomOutFactor
    const maxH = (svgHeight - 2 * padding) * zoomOutFactor
    const supportHeightMm = bottomHeight > 0 ? bottomHeight : diameter * 0.25
    const totalH = radiusMm + supportHeightMm
    const scale = Math.min(maxW / diameter, maxH / Math.max(totalH, 1))
    const r = radiusMm * scale
    const cx = svgWidth / 2
    const cy = padding + radiusMm * scale
    const groundY = cy + supportHeightMm * scale
    const showLegs = true
    const legYTop = cy
    const diameterDimY = cy - r - 22
    const heightDimX = cx - r - 34

    const levelY = (levelMm?: number) => {
      if (levelMm == null || isNaN(levelMm)) return undefined
      const h = Math.max(0, Math.min(levelMm, diameter))
      return cy + r - h * scale
    }

    const renderSvg = (svgClassName: string) => (
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className={svgClassName} aria-hidden="true">
        <defs>
          <clipPath id="tankSphereClip">
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
          <marker id="tankArrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>
        {ll != null && ll > 0 && (
          <rect
            x={0}
            y={levelY(ll)}
            width={svgWidth}
            height={svgHeight}
            fill="rgba(56, 189, 248, 0.25)"
            clipPath="url(#tankSphereClip)"
          />
        )}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="2" />
        {showLegs && (
          <>
            <line x1={cx - r} y1={legYTop} x2={cx - r} y2={groundY} stroke="currentColor" strokeWidth="2" />
            <line x1={cx + r} y1={legYTop} x2={cx + r} y2={groundY} stroke="currentColor" strokeWidth="2" />
          </>
        )}
        <line
          x1={cx - r - 28}
          y1={groundY}
          x2={cx + r + 28}
          y2={groundY}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity="0.8"
        />
        <TankLevelLine y={levelY(ll)} label={`LL ${fmtM(ll)}`} color="#38bdf8" x0={cx - r} x1={cx + r} labelOffset={20} />
        <TankLevelLine y={levelY(hll)} label={`HLL ${fmtM(hll)}`} color="#22c55e" x0={cx - r} x1={cx + r} labelOffset={20} dashed />
        <TankLevelLine y={levelY(lll)} label={`LLL ${fmtM(lll)}`} color="#f59e0b" x0={cx - r} x1={cx + r} labelOffset={20} dashed />
        <TankLevelLine y={levelY(ofl)} label={`OFL ${fmtM(ofl)}`} color="#ef4444" x0={cx - r} x1={cx + r} labelOffset={20} dashed />
        <line x1={cx - r - 2} y1={cy} x2={heightDimX - 4} y2={cy} stroke="currentColor" strokeWidth="0.75" />
        <line x1={cx - r - 2} y1={groundY} x2={heightDimX - 4} y2={groundY} stroke="currentColor" strokeWidth="0.75" />
        {bottomHeight > 0 && (
          <TankAnnotation x1={heightDimX} y1={cy} x2={heightDimX} y2={groundY} label={`Center line level ${fmtM(bottomHeight)}`} vertical labelSide="start" />
        )}
        <line x1={cx - r} y1={cy - r - 100} x2={cx - r} y2={cy - r * 0.12 - 20} stroke="currentColor" strokeWidth="0.75" />
        <line x1={cx + r} y1={cy - r - 100} x2={cx + r} y2={cy - r * 0.12 - 20} stroke="currentColor" strokeWidth="0.75" />
        <TankAnnotation x1={cx - r} y1={diameterDimY} x2={cx + r} y2={diameterDimY} label={`D ${fmtM(diameter)}`} />
      </svg>
    )

    return (
      <SectionCard
        title="Tank Schematic"
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
                <DialogTitle>Expanded Tank Schematic</DialogTitle>
                <DialogDescription>
                  Larger view of the live tank schematic.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-auto rounded-xl border bg-card/40 p-3">
                {renderSvg("h-auto w-full min-w-[620px] text-foreground")}
              </div>
            </DialogContent>
          </Dialog>
        }
      >
        <div className="flex flex-col items-center gap-4 py-2">
          {renderSvg("w-full max-w-[440px] h-auto text-foreground")}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-sky-400/25 border border-sky-400/50 rounded-sm" />
              <span>Liquid</span>
            </div>
            {showLegs && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 border border-current rounded-sm" />
                <span>Legs</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0 border-t border-dashed border-current" />
              <span>Ground</span>
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Spherical tank</p>
        </div>
      </SectionCard>
    )
  }

  if (!shellHeight || shellHeight <= 0) {
    return null
  }

  const svgWidth = 520
  const svgHeight = 420
  const padding = 48
  const zoomOutFactor = 0.88
  const maxW = (svgWidth - 2 * padding) * zoomOutFactor
  const maxH = (svgHeight - 2 * padding) * zoomOutFactor
  const totalH = shellHeight + (roofType === TankRoofType.FLAT ? 0 : roofHeight)
  const scale = Math.min(maxW / diameter, maxH / Math.max(totalH, 1))
  const bodyW = diameter * scale
  const bodyH = shellHeight * scale
  const roofH = (roofType === TankRoofType.FLAT ? 0 : roofHeight) * scale
  const x0 = (svgWidth - bodyW) / 2
  const y0 = (svgHeight - (bodyH + roofH)) / 2 + roofH
  const tankHeightDimX = x0 - 24
  const tankRoofDimX = tankHeightDimX
  const tankDiameterDimY = y0 + bodyH + 22

  const roofPath = (() => {
    if (roofType === TankRoofType.CONE) {
      return `M ${x0},${y0} L ${x0 + bodyW / 2},${y0 - roofH} L ${x0 + bodyW},${y0}`
    }
    if (roofType === TankRoofType.DOME) {
      return `M ${x0},${y0} Q ${x0 + bodyW / 2},${y0 - roofH * 1.6} ${x0 + bodyW},${y0}`
    }
    return `M ${x0},${y0} L ${x0 + bodyW},${y0}`
  })()

  const maxLevel = shellHeight + (roofType === TankRoofType.FLAT ? 0 : roofHeight)
  const levelY = (levelMm?: number) => {
    if (levelMm == null || isNaN(levelMm)) return undefined
    const clamped = Math.max(0, Math.min(levelMm, maxLevel))
    return y0 + bodyH - (clamped / Math.max(maxLevel, 1)) * (bodyH + roofH)
  }

  const renderSvg = (svgClassName: string) => (
    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className={svgClassName} aria-hidden="true">
      <defs>
        <clipPath id="tankTopRoofClip">
          <path d={`${roofPath} L ${x0 + bodyW},${y0 + bodyH} L ${x0},${y0 + bodyH} Z`} />
        </clipPath>
        <marker id="tankArrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>
      {ll != null && ll > 0 && (
        <rect
          x={0}
          y={levelY(ll)}
          width={svgWidth}
          height={svgHeight}
          fill="rgba(56, 189, 248, 0.25)"
          clipPath="url(#tankTopRoofClip)"
        />
      )}
      <path d={roofPath} fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x={x0} y={y0} width={bodyW} height={bodyH} fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1={x0} y1={y0 + bodyH} x2={x0 + bodyW} y2={y0 + bodyH} stroke="currentColor" strokeWidth="2" />
      <TankLevelLine y={levelY(ll)} label={`LL ${fmtM(ll)}`} color="#38bdf8" x0={x0} x1={x0 + bodyW} labelOffset={22} />
      <TankLevelLine y={levelY(hll)} label={`HLL ${fmtM(hll)}`} color="#22c55e" x0={x0} x1={x0 + bodyW} labelOffset={22} dashed />
      <TankLevelLine y={levelY(lll)} label={`LLL ${fmtM(lll)}`} color="#f59e0b" x0={x0} x1={x0 + bodyW} labelOffset={22} dashed />
      <TankLevelLine y={levelY(ofl)} label={`OFL ${fmtM(ofl)}`} color="#ef4444" x0={x0} x1={x0 + bodyW} labelOffset={22} dashed />
      <line x1={x0} y1={y0 + bodyH} x2={x0} y2={tankDiameterDimY - 4} stroke="currentColor" strokeWidth="0.75" />
      <line x1={x0 + bodyW} y1={y0 + bodyH} x2={x0 + bodyW} y2={tankDiameterDimY - 4} stroke="currentColor" strokeWidth="0.75" />
      <TankAnnotation x1={x0} y1={tankDiameterDimY} x2={x0 + bodyW} y2={tankDiameterDimY} label={`D ${fmtM(diameter)}`} />
      <line x1={x0 - 2} y1={y0} x2={tankHeightDimX - 4} y2={y0} stroke="currentColor" strokeWidth="0.75" />
      <line x1={x0 - 2} y1={y0 + bodyH} x2={tankHeightDimX - 4} y2={y0 + bodyH} stroke="currentColor" strokeWidth="0.75" />
      <TankAnnotation x1={tankHeightDimX} y1={y0} x2={tankHeightDimX} y2={y0 + bodyH} label={`H ${fmtM(shellHeight)}`} vertical labelSide="start" />
      {roofH > 0 && (
        <>
          <line x1={x0 - 2} y1={y0 - roofH} x2={tankRoofDimX - 4} y2={y0 - roofH} stroke="currentColor" strokeWidth="0.75" />
          <line x1={x0 - 2} y1={y0} x2={tankRoofDimX - 4} y2={y0} stroke="currentColor" strokeWidth="0.75" />
          <TankAnnotation
            x1={tankRoofDimX}
            y1={y0 - roofH}
            x2={tankRoofDimX}
            y2={y0}
            label={`Roof ${fmtM(roofHeight)}`}
            vertical
            labelSide="start"
          />
        </>
      )}
    </svg>
  )

  return (
    <SectionCard
      title="Tank Schematic"
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
              <DialogTitle>Expanded Tank Schematic</DialogTitle>
              <DialogDescription>
                Larger view of the live tank schematic.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto rounded-xl border bg-card/40 p-3">
              {renderSvg("h-auto w-full min-w-[680px] text-foreground")}
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2">
        {renderSvg("w-full max-w-[460px] h-auto text-foreground")}
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Top roof tank · {roofType ?? TankRoofType.FLAT}
        </p>
      </div>
    </SectionCard>
  )
}

function TankLevelLine({
  y,
  label,
  color,
  x0,
  x1,
  labelOffset = 16,
  dashed,
}: {
  y?: number
  label: string
  color: string
  x0: number
  x1: number
  labelOffset?: number
  dashed?: boolean
}) {
  if (y === undefined || isNaN(y)) return null

  return (
    <g>
      <line
        x1={x0 - 12}
        y1={y}
        x2={x1 + 12}
        y2={y}
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray={dashed ? "4 2" : "none"}
      />
      <text
        x={x1 + labelOffset}
        y={y}
        dy="0.35em"
        fill={color}
        fontSize="11"
        fontWeight="bold"
        className={cn("tracking-wide")}
      >
        {label}
      </text>
    </g>
  )
}

function fmtM(value?: number): string {
  if (value == null || isNaN(value)) return "—"
  return `${(value / 1000).toFixed(2)}m`
}

function TankAnnotation({
  x1,
  y1,
  x2,
  y2,
  label,
  vertical,
  labelSide = "end",
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
  vertical?: boolean
  labelSide?: "start" | "end"
}) {
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2
  const verticalTextOffset = 8
  const textX = vertical
    ? cx + (labelSide === "start" ? -verticalTextOffset : verticalTextOffset)
    : cx

  return (
    <g className="text-muted-foreground/70">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1" markerStart="url(#tankArrow)" markerEnd="url(#tankArrow)" />
      <text
        x={textX}
        y={cy}
        dy={vertical ? "0.32em" : "-6"}
        textAnchor={vertical ? (labelSide === "start" ? "end" : "start") : "middle"}
        fontSize="10"
        fill="currentColor"
        className={cn("tracking-wide")}
      >
        {label}
      </text>
    </g>
  )
}
