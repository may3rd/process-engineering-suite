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
  const legHeight = watch("bottomHeight") ?? 0
  const bootID = watch("bootInsideDiameter") ?? 0
  const bootCylH = watch("bootHeight") ?? 0

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

  const padding = 16
  const svgWidth = 520
  const svgHeight = 420
  const zoomOutFactor = isVertical ? 1.0 : 0.7
  const drawAreaW = (svgWidth - 2 * padding) * zoomOutFactor
  const drawAreaH = (svgHeight - 2 * padding) * zoomOutFactor

  // Boot bottom head depth (unscaled) — computed early so totalH can use it
  const bootHeadDepth = bootID > 0 && bootCylH > 0
    ? headType === HeadType.CONICAL
      ? bootID * (headDepth / Math.max(id, 1))
      : (autoHeadDepth(headType, bootID) ?? 0)
    : 0

  // Cap drawn shell length at 4×ID for very tall vertical vessels to keep drawing practical
  const drawnLength = isVertical && id > 0 && length / id > 4 ? 4 * id : length
  const isTruncated  = drawnLength < length

  const totalW = isVertical ? id : length + 2 * headDepth
  const totalH = isVertical
    ? drawnLength + headDepth + Math.max(headDepth + (bootID > 0 && bootCylH > 0 ? bootCylH + bootHeadDepth : 0), legHeight)
    : id + Math.max(legHeight, bootCylH + bootHeadDepth)

  const scale = Math.min(drawAreaW / Math.max(totalW, 1), drawAreaH / Math.max(totalH, 1))

  const vW = (isVertical ? id : length) * scale
  const vH = (isVertical ? drawnLength : id) * scale
  const vHD = headDepth * scale
  const leg = Math.max(0, legHeight) * scale
  const bootCylScaledW = bootID > 0 ? Math.max(8, Math.min(bootID * scale, vW * 0.5)) : 0
  const bootCylScaledH = bootCylH > 0 ? bootCylH * scale : 0
  const hasBoot = bootID > 0 && bootCylH > 0
  const bootVHD = bootHeadDepth * scale

  const fullW = isVertical ? vW : vW + 2 * vHD
  const fullH = isVertical
    ? vH + vHD + Math.max(hasBoot ? vHD + bootCylScaledH + bootVHD : vHD, leg)
    : vH + Math.max(leg, bootCylScaledH + bootVHD)

  const left = (svgWidth - fullW) / 2
  const top = (svgHeight - fullH) / 2
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
  const groundY = isVertical ? lowerTangentY + leg : bottomY + leg
  const showLegs = leg > 0
  const bootTopY  = y0 + vH + vHD   // vertical: bottom of head apex → top of boot cylinder
  const bootX     = x0 + vW / 2 - bootCylScaledW / 2
  const bootBotY  = bootTopY + bootCylScaledH
  const bootApexY = bootBotY + bootVHD    // apex of boot bottom head
  // Vertical boot outline: open top, cylinder, then same head type as main vessel
  const vBootPath = !hasBoot ? "" : (() => {
    let p = `M ${bootX},${bootTopY} L ${bootX},${bootBotY}`
    if (headType === HeadType.HEMISPHERICAL) {
      p += ` A ${bootCylScaledW / 2},${bootCylScaledW / 2} 0 0 0 ${bootX + bootCylScaledW},${bootBotY}`
    } else if (headType === HeadType.ELLIPSOIDAL_2_1 || headType === HeadType.TORISPHERICAL_80_10) {
      p += ` A ${bootCylScaledW / 2},${bootVHD} 0 0 0 ${bootX + bootCylScaledW},${bootBotY}`
    } else if (headType === HeadType.CONICAL) {
      p += ` L ${bootX + bootCylScaledW / 2},${bootApexY}`
      p += ` L ${bootX + bootCylScaledW},${bootBotY}`
    } else {
      p += ` L ${bootX + bootCylScaledW},${bootBotY}`
    }
    p += ` L ${bootX + bootCylScaledW},${bootTopY}`
    return p
  })()

  // Horizontal boot: hangs down from the left side of the shell, flat top, vessel-head bottom
  const hBootX        = x0 + vW * 0.15 - bootCylScaledW / 2 - 10  // left-side position
  const hBootTopY     = y0 + vH                                 // top of boot = bottom of shell
  const hBootBodyBotY = hBootTopY + bootCylScaledH              // bottom of cylinder
  const hBootBotY     = hBootBodyBotY + bootVHD                 // apex of bottom head
  const hBootPath = !hasBoot ? "" : (() => {
    let p = `M ${hBootX},${hBootTopY} L ${hBootX},${hBootBodyBotY}`
    if (headType === HeadType.HEMISPHERICAL) {
      p += ` A ${bootCylScaledW / 2},${bootCylScaledW / 2} 0 0 0 ${hBootX + bootCylScaledW},${hBootBodyBotY}`
    } else if (headType === HeadType.ELLIPSOIDAL_2_1 || headType === HeadType.TORISPHERICAL_80_10) {
      p += ` A ${bootCylScaledW / 2},${bootVHD} 0 0 0 ${hBootX + bootCylScaledW},${hBootBodyBotY}`
    } else if (headType === HeadType.CONICAL) {
      p += ` L ${hBootX + bootCylScaledW / 2},${hBootBodyBotY + bootVHD}`
      p += ` L ${hBootX + bootCylScaledW},${hBootBodyBotY}`
    } else {
      p += ` L ${hBootX + bootCylScaledW},${hBootBodyBotY}`
    }
    p += ` L ${hBootX + bootCylScaledW},${hBootTopY}`
    return p
  })()

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
  const horizontalRightDimX = x0 + vW + vHD + 36
  const horizontalBootHeightDimX = hBootX - 26
  const horizontalBootDiameterDimY = hBootBotY + 18

  const renderSvg = (svgClassName: string) => (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className={svgClassName}
      aria-hidden="true"
    >
      <defs>
        <clipPath id="vesselClip">
          <path d={path} />
        </clipPath>
        {isVertical && hasBoot && (
          <clipPath id="bootClip">
            <path d={vBootPath} />
          </clipPath>
        )}
        {!isVertical && hasBoot && (
          <clipPath id="hBootClip">
            <path d={hBootPath} />
          </clipPath>
        )}
        <marker id="vesselArrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>

      {ll !== undefined && ll > 0 && (
        <rect
          x="0"
          y={getLevelY(ll)}
          width={svgWidth}
          height={svgHeight}
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

      {/* Break symbol — drawn when T-T is capped at 4×D */}
      {isVertical && isTruncated && (() => {
        const a   = 5      // half-amplitude: diagonal spans 2a × 2a (45°)
        const gap = 8      // visible gap between the two break lines (px)
        const cx  = x0 + vW / 2
        const yb  = y0 + vH * 0.5

        // Zone symmetric about yb; gap is constant everywhere (left & right)
        const y1L = yb - a - gap / 2   // line 1 left  (yb−9)
        const y1R = yb + a - gap / 2   // line 1 right (yb+1)
        const y2L = yb - a + gap / 2   // line 2 left  (yb−1)
        const y2R = yb + a + gap / 2   // line 2 right (yb+9)
        const zTop = y1L - 1           // 1 px above outermost line
        const zBot = y2R + 1           // 1 px below outermost line
        return (
          <g>
            {/* Blank break zone */}
            <rect x={x0 - 1} y={zTop} width={vW + 2} height={zBot - zTop}
                  fill="var(--background)" />
            {/* Left wall: upper half stops at line-1 left; lower half starts at line-2 left */}
            <line x1={x0} y1={zTop} x2={x0} y2={y1L}
                  stroke="currentColor" strokeWidth="2" className="opacity-90" />
            <line x1={x0} y1={y2L} x2={x0} y2={zBot}
                  stroke="currentColor" strokeWidth="2" className="opacity-90" />
            {/* Right wall: upper half stops at line-1 right; lower half starts at line-2 right */}
            <line x1={x0 + vW} y1={zTop} x2={x0 + vW} y2={y1R}
                  stroke="currentColor" strokeWidth="2" className="opacity-90" />
            <line x1={x0 + vW} y1={y2R} x2={x0 + vW} y2={zBot}
                  stroke="currentColor" strokeWidth="2" className="opacity-90" />
            {/* Break line 1 — flat / 45° diagonal (2a×2a) centred / flat */}
            <path d={`M ${x0},${y1L} H ${cx - a} L ${cx + a},${y1R} H ${x0 + vW}`}
                  fill="none" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" className="opacity-90" />
            {/* Break line 2 — same shape, gap px below */}
            <path d={`M ${x0},${y2L} H ${cx - a} L ${cx + a},${y2R} H ${x0 + vW}`}
                  fill="none" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" className="opacity-90" />
          </g>
        )
      })()}

      {isVertical && hasBoot && ll !== undefined && ll > 0 && (
        <rect
          x={bootX}
          y={bootTopY}
          width={bootCylScaledW}
          height={bootCylScaledH + bootVHD}
          fill="rgba(56, 189, 248, 0.25)"
          clipPath="url(#bootClip)"
        />
      )}

      {!isVertical && hasBoot && ll !== undefined && ll > 0 && (
        <rect
          x={hBootX}
          y={hBootTopY}
          width={bootCylScaledW}
          height={bootCylScaledH + bootVHD}
          fill="rgba(56, 189, 248, 0.25)"
          clipPath="url(#hBootClip)"
        />
      )}

      {showLegs && (
        <>
          <line x1={legX1} y1={legTopY} x2={legX1} y2={groundY} stroke="currentColor" strokeWidth="2" />
          <line x1={legX2} y1={legTopY} x2={legX2} y2={groundY} stroke="currentColor" strokeWidth="2" />
        </>
      )}

      {isVertical && hasBoot && (
        <path
          d={vBootPath}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-90"
        />
      )}

      {!isVertical && hasBoot && (
        <path
          d={hBootPath}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-90"
        />
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

      <LevelLine y={getLevelY(ll)} label={`LL ${fmtM(ll)}`} color="#38bdf8" x0={x0} xW={vW} vHD={isVertical ? 0 : vHD} labelOffset={isVertical ? 4 : 34} />
      <LevelLine y={getLevelY(hll)} label={`HLL ${fmtM(hll)}`} color="#22c55e" x0={x0} xW={vW} vHD={isVertical ? 0 : vHD} labelOffset={isVertical ? 4 : 34} dashed />
      <LevelLine y={getLevelY(lll)} label={`LLL ${fmtM(lll)}`} color="#f59e0b" x0={x0} xW={vW} vHD={isVertical ? 0 : vHD} labelOffset={isVertical ? 4 : 34} dashed />
      <LevelLine y={getLevelY(ofl)} label={`OFL ${fmtM(ofl)}`} color="#ef4444" x0={x0} xW={vW} vHD={isVertical ? 0 : vHD} labelOffset={isVertical ? 4 : 34} dashed />

      {isVertical ? (
        <g className="text-muted-foreground/70">
          {/* T-T: horizontal extension guides at top and bottom tangent lines */}
          <line x1={x0 - 2} y1={y0}      x2={x0 - 30} y2={y0}      stroke="currentColor" strokeWidth="0.75" />
          <line x1={x0 - 2} y1={y0 + vH} x2={x0 - 30} y2={y0 + vH} stroke="currentColor" strokeWidth="0.75" />
          <Annotation x1={x0 - 26} y1={y0} x2={x0 - 26} y2={y0 + vH} label={`T-T ${fmtM(length)}`} vertical labelSide="start" />

          {/* D: vertical extension guides up from top tangent, above top head */}
          <line x1={x0}      y1={y0} x2={x0}      y2={y0 - vHD - 22} stroke="currentColor" strokeWidth="0.75" />
          <line x1={x0 + vW} y1={y0} x2={x0 + vW} y2={y0 - vHD - 22} stroke="currentColor" strokeWidth="0.75" />
          <Annotation x1={x0} y1={y0 - vHD - 18} x2={x0 + vW} y2={y0 - vHD - 18} label={`D ${fmtM(id)}`} />

          {/* Btm: horizontal extension guides at lower tangent and ground */}
          {showLegs && (
            <>
              <line x1={x0 + vW + 2} y1={lowerTangentY} x2={x0 + vW + 28} y2={lowerTangentY} stroke="currentColor" strokeWidth="0.75" />
              <line x1={x0 + vW + 2} y1={groundY}        x2={x0 + vW + 28} y2={groundY}        stroke="currentColor" strokeWidth="0.75" />
              <Annotation x1={x0 + vW + 24} y1={lowerTangentY} x2={x0 + vW + 24} y2={groundY} label={`Btm ${fmtM(legHeight)}`} vertical labelSide="end" />
            </>
          )}

          {/* BH: short horizontal extension guides + annotation right of boot */}
          {hasBoot && bootCylScaledH >= 14 && (
            <>
              <line x1={bootX - 2} y1={bootTopY} x2={x0 - 30} y2={bootTopY} stroke="currentColor" strokeWidth="0.75" />
              <line x1={bootX - 2} y1={bootBotY} x2={x0 - 30} y2={bootBotY} stroke="currentColor" strokeWidth="0.75" />
              <Annotation x1={x0 - 26} y1={bootTopY} x2={x0 - 26} y2={bootBotY} label={`BH ${fmtM(bootCylH)}`} vertical labelSide="start" />
            </>
          )}

          {/* BD: vertical extension guides at left and right boot edges, below head apex */}
          {hasBoot && bootCylScaledW >= 14 && (
            <>
              <line x1={bootX}                    y1={bootApexY + 2} x2={bootX}                    y2={bootApexY + 16} stroke="currentColor" strokeWidth="0.75" />
              <line x1={bootX + bootCylScaledW}   y1={bootApexY + 2} x2={bootX + bootCylScaledW}   y2={bootApexY + 16} stroke="currentColor" strokeWidth="0.75" />
              <Annotation x1={bootX} y1={bootApexY + 12} x2={bootX + bootCylScaledW} y2={bootApexY + 12} label={`BD ${fmtM(bootID)}`} />
            </>
          )}
        </g>
      ) : (
        <g className="text-muted-foreground/70">
          {/* T-T: vertical extension guides at each tangent line */}
          <line x1={x0}      y1={y0 + 2} x2={x0}      y2={y0 - 24} stroke="currentColor" strokeWidth="0.75" />
          <line x1={x0 + vW} y1={y0 + 2} x2={x0 + vW} y2={y0 - 24} stroke="currentColor" strokeWidth="0.75" />
          <Annotation x1={x0} y1={y0 - 20} x2={x0 + vW} y2={y0 - 20} label={`T-T ${fmtM(length)}`} />

          {/* D: horizontal extension guides from right tangent to annotation */}
          <line x1={x0 + vW} y1={y0}      x2={horizontalRightDimX + 4} y2={y0}      stroke="currentColor" strokeWidth="0.75" />
          <line x1={x0 + vW} y1={y0 + vH} x2={horizontalRightDimX + 4} y2={y0 + vH} stroke="currentColor" strokeWidth="0.75" />
          <Annotation x1={horizontalRightDimX} y1={y0} x2={horizontalRightDimX} y2={y0 + vH} label={`D ${fmtM(id)}`} vertical labelSide="start" />

          {/* Btm: horizontal extension guides at shell-bottom and ground level */}
          {showLegs && (
            <>
              <line x1={x0 + vW + vHD} y1={bottomY} x2={horizontalRightDimX + 4} y2={bottomY} stroke="currentColor" strokeWidth="0.75" />
              <line x1={legX2}          y1={groundY} x2={horizontalRightDimX + 4} y2={groundY} stroke="currentColor" strokeWidth="0.75" />
              <Annotation x1={horizontalRightDimX} y1={bottomY} x2={horizontalRightDimX} y2={groundY} label={`Btm ${fmtM(legHeight)}`} vertical labelSide="start" />
            </>
          )}

          {/* BH: short extension guides + annotation just left of boot */}
          {hasBoot && bootCylScaledH >= 14 && (
            <>
              <line x1={hBootX - 2} y1={hBootTopY}     x2={horizontalBootHeightDimX - 4} y2={hBootTopY}     stroke="currentColor" strokeWidth="0.75" />
              <line x1={hBootX - 2} y1={hBootBodyBotY} x2={horizontalBootHeightDimX - 4} y2={hBootBodyBotY} stroke="currentColor" strokeWidth="0.75" />
              <Annotation x1={horizontalBootHeightDimX} y1={hBootTopY} x2={horizontalBootHeightDimX} y2={hBootBodyBotY} label={`BH ${fmtM(bootCylH)}`} vertical labelSide="start" />
            </>
          )}

          {/* BD: below boot head */}
          {hasBoot && bootCylScaledW >= 14 && (
            <>
              <line x1={hBootX} y1={hBootBotY} x2={hBootX} y2={horizontalBootDiameterDimY - 4} stroke="currentColor" strokeWidth="0.75" />
              <line x1={hBootX + bootCylScaledW} y1={hBootBotY} x2={hBootX + bootCylScaledW} y2={horizontalBootDiameterDimY - 4} stroke="currentColor" strokeWidth="0.75" />
              <Annotation x1={hBootX} y1={horizontalBootDiameterDimY} x2={hBootX + bootCylScaledW} y2={horizontalBootDiameterDimY} label={`BD ${fmtM(bootID)}`} />
            </>
          )}
        </g>
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
              {renderSvg("h-auto w-full min-w-[680px] text-foreground")}
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2">
        {renderSvg("w-full max-w-[460px] h-auto text-foreground")}

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
          {hasBoot && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 border-2 border-current rounded-sm" />
              <span>Boot</span>
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
  labelOffset = 4,
  dashed,
}: {
  y?: number
  label: string
  color: string
  x0: number
  xW: number
  vHD: number
  labelOffset?: number
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
        x={lineX2 + labelOffset}
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
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1" markerStart="url(#vesselArrow)" markerEnd="url(#vesselArrow)" />
      <text
        x={textX}
        y={cy}
        dy={vertical ? "0.32em" : "-6"}
        textAnchor={vertical ? (labelSide === "start" ? "end" : "start") : "middle"}
        fontSize="10"
        fill="currentColor"
      >
        {label}
      </text>
    </g>
  )
}
