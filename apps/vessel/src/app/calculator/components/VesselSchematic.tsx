"use client"

import { useFormContext } from "react-hook-form"
import { CalculationInput, VesselOrientation, HeadType } from "@/types"
import { SectionCard } from "./SectionCard"
import { autoHeadDepth } from "@/lib/calculations/vesselGeometry"
import { cn } from "@/lib/utils"

export function VesselSchematic() {
  const { watch } = useFormContext<CalculationInput>()

  const id = watch("insideDiameter")
  const length = watch("shellLength")
  const orientation = watch("orientation")
  const headType = watch("headType")
  const headDepthInput = watch("headDepth")

  const ll = watch("liquidLevel")
  const hll = watch("hll")
  const lll = watch("lll")
  const ofl = watch("ofl")

  if (!id || id <= 0 || !length || length <= 0) {
    return null
  }

  const headDepth = headDepthInput || autoHeadDepth(headType, id) || 0
  const isVertical = orientation === VesselOrientation.VERTICAL

  const padding = 60
  const svgSize = 400
  const drawArea = svgSize - 2 * padding

  // Calculate total dimensions for scaling
  const totalW = isVertical ? id : length + 2 * headDepth
  const totalH = isVertical ? length + 2 * headDepth : id

  const scale = Math.min(drawArea / totalW, drawArea / totalH)

  // Scaled dimensions
  const vW = (isVertical ? id : length) * scale
  const vH = (isVertical ? length : id) * scale
  const vHD = headDepth * scale

  // Origin point (top-left of shell for vertical, or left tangent for horizontal)
  const x0 = (svgSize - (isVertical ? vW : vW + 2 * vHD)) / 2 + (isVertical ? 0 : vHD)
  const y0 = (svgSize - (isVertical ? vH + 2 * vHD : vH)) / 2 + (isVertical ? vHD : 0)

  // Vessel Outline Path
  let path = ""
  if (isVertical) {
    // Shell
    path = `M ${x0},${y0} L ${x0 + vW},${y0} L ${x0 + vW},${y0 + vH} L ${x0},${y0 + vH} Z`
    // Top Head
    if (headType === HeadType.HEMISPHERICAL) {
      path += ` M ${x0 + vW},${y0} A ${vW / 2},${vW / 2} 0 0 0 ${x0},${y0}`
    } else if (headType === HeadType.ELLIPSOIDAL_2_1 || headType === HeadType.TORISPHERICAL_80_10) {
      path += ` M ${x0 + vW},${y0} A ${vW / 2},${vHD} 0 0 0 ${x0},${y0}`
    } else if (headType === HeadType.CONICAL) {
      path += ` M ${x0 + vW},${y0} L ${x0 + vW / 2},${y0 - vHD} L ${x0},${y0}`
    }
    // Bottom Head
    if (headType === HeadType.HEMISPHERICAL) {
      path += ` M ${x0},${y0 + vH} A ${vW / 2},${vW / 2} 0 0 0 ${x0 + vW},${y0 + vH}`
    } else if (headType === HeadType.ELLIPSOIDAL_2_1 || headType === HeadType.TORISPHERICAL_80_10) {
      path += ` M ${x0},${y0 + vH} A ${vW / 2},${vHD} 0 0 0 ${x0 + vW},${y0 + vH}`
    } else if (headType === HeadType.CONICAL) {
      path += ` M ${x0},${y0 + vH} L ${x0 + vW / 2},${y0 + vH + vHD} L ${x0 + vW},${y0 + vH}`
    }
  } else {
    // Horizontal
    // Shell
    path = `M ${x0},${y0} L ${x0 + vW},${y0} L ${x0 + vW},${y0 + vH} L ${x0},${y0 + vH} Z`
    // Left Head
    if (headType === HeadType.HEMISPHERICAL) {
      path += ` M ${x0},${y0 + vH} A ${vH / 2},${vH / 2} 0 0 1 ${x0},${y0}`
    } else if (headType === HeadType.ELLIPSOIDAL_2_1 || headType === HeadType.TORISPHERICAL_80_10) {
      path += ` M ${x0},${y0 + vH} A ${vHD},${vH / 2} 0 0 1 ${x0},${y0}`
    } else if (headType === HeadType.CONICAL) {
      path += ` M ${x0},${y0 + vH} L ${x0 - vHD},${y0 + vH / 2} L ${x0},${y0}`
    }
    // Right Head
    if (headType === HeadType.HEMISPHERICAL) {
      path += ` M ${x0 + vW},${y0} A ${vH / 2},${vH / 2} 0 0 1 ${x0 + vW},${y0 + vH}`
    } else if (headType === HeadType.ELLIPSOIDAL_2_1 || headType === HeadType.TORISPHERICAL_80_10) {
      path += ` M ${x0 + vW},${y0} A ${vHD},${vH / 2} 0 0 1 ${x0 + vW},${y0 + vH}`
    } else if (headType === HeadType.CONICAL) {
      path += ` M ${x0 + vW},${y0} L ${x0 + vW + vHD},${y0 + vH / 2} L ${x0 + vW},${y0 + vH}`
    }
  }

  const getLevelY = (levelMm: number | undefined) => {
    if (levelMm === undefined || isNaN(levelMm)) return undefined
    if (isVertical) {
      // Level from bottom tip
      return y0 + vH + vHD - levelMm * scale
    } else {
      // Level from bottom of shell
      return y0 + vH - levelMm * scale
    }
  }

  return (
    <SectionCard title="Vessel Schematic">
      <div className="flex flex-col items-center gap-4 py-2">
        <svg
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className="w-full max-w-[320px] h-auto text-foreground"
          aria-hidden="true"
        >
          <defs>
            <clipPath id="vesselClip">
              <path d={path} />
            </clipPath>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>

          {/* Liquid Fill */}
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

          {/* Vessel Outline */}
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-90"
          />

          {/* Level Lines */}
          <LevelLine y={getLevelY(ll)} label="LL" color="#38bdf8" x0={x0} xW={isVertical ? vW : vW} vHD={isVertical ? 0 : vHD} />
          <LevelLine y={getLevelY(hll)} label="HLL" color="#22c55e" x0={x0} xW={isVertical ? vW : vW} vHD={isVertical ? 0 : vHD} dashed />
          <LevelLine y={getLevelY(lll)} label="LLL" color="#f59e0b" x0={x0} xW={isVertical ? vW : vW} vHD={isVertical ? 0 : vHD} dashed />
          <LevelLine y={getLevelY(ofl)} label="OFL" color="#ef4444" x0={x0} xW={isVertical ? vW : vW} vHD={isVertical ? 0 : vHD} dashed />

          {/* Annotations */}
          {/* Diameter Annotation */}
          <Annotation
            x1={x0}
            y1={y0 + vH + (isVertical ? vHD + 25 : 25)}
            x2={x0 + vW}
            y2={y0 + vH + (isVertical ? vHD + 25 : 25)}
            label={`D = ${(id / 1000).toFixed(2)}m`}
          />
          {/* Length Annotation */}
          <Annotation
            x1={x0 - (isVertical ? 25 : vHD + 25)}
            y1={y0}
            x2={x0 - (isVertical ? 25 : vHD + 25)}
            y2={y0 + vH}
            label={`L = ${(length / 1000).toFixed(2)}m`}
            vertical
          />
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-sky-400/25 border border-sky-400/50 rounded-sm" />
            <span>Liquid</span>
          </div>
          {hll !== undefined && <LegendLineItem label="HLL" color="#22c55e" />}
          {lll !== undefined && <LegendLineItem label="LLL" color="#f59e0b" />}
          {ofl !== undefined && <LegendLineItem label="OFL" color="#ef4444" />}
        </div>
      </div>
    </SectionCard>
  )
}

function LevelLine({ y, label, color, x0, xW, vHD, dashed }: { 
  y?: number, 
  label: string, 
  color: string, 
  x0: number, 
  xW: number, 
  vHD: number,
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

function Annotation({ x1, y1, x2, y2, label, vertical }: { x1: number, y1: number, x2: number, y2: number, label: string, vertical?: boolean }) {
  return (
    <g className="text-muted-foreground/60">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
      <text
        x={(x1 + x2) / 2}
        y={(y1 + y2) / 2}
        dy={vertical ? "0" : "-6"}
        dx={vertical ? "-8" : "0"}
        textAnchor={vertical ? "middle" : "middle"}
        fontSize="10"
        fill="currentColor"
        transform={vertical ? `rotate(-90 ${(x1 + x2) / 2} ${(y1 + y2) / 2})` : ""}
      >
        {label}
      </text>
    </g>
  )
}

function LegendLineItem({ label, color }: { label: string, color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-4 h-0 border-t border-dashed" style={{ borderColor: color }} />
      <span>{label}</span>
    </div>
  )
}
