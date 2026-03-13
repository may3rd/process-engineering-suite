import { autoHeadDepth } from '@/lib/calculations/vesselGeometry'
import {
  EquipmentMode,
  HeadType,
  VesselOrientation,
  type CalculationInput,
} from '@/types'

type LabelSide = 'start' | 'end'

interface LineSpec {
  key: string
  x1: number
  y1: number
  x2: number
  y2: number
}

interface RectSpec {
  x: number
  y: number
  width: number
  height: number
}

interface PathSpec {
  key: string
  d: string
}

export interface VesselSchematicLevel {
  key: string
  name: 'LL' | 'HLL' | 'LLL' | 'OFL'
  label: string
  color: string
  y: number
  lineX1: number
  lineX2: number
  textX: number
  textY: number
  dashed: boolean
}

export interface VesselSchematicAnnotation {
  key: 'tt' | 'diameter' | 'bottomHeight' | 'bootHeight' | 'bootDiameter'
  label: string
  x1: number
  y1: number
  x2: number
  y2: number
  vertical?: boolean
  labelSide?: LabelSide
}

export type VesselSchematicGuideLine = LineSpec

export interface VesselSchematicBreakMarker {
  background: RectSpec
  wallSegments: LineSpec[]
  zigzags: PathSpec[]
}

export interface VesselSchematicModel {
  width: number
  height: number
  isVertical: boolean
  hasBoot: boolean
  showLegs: boolean
  isTruncated: boolean
  vesselPath: string
  bootPath?: string
  clipPaths: {
    vesselId: string
    bootId?: string
  }
  fills: {
    vessel?: RectSpec
    boot?: RectSpec
  }
  breakMarker?: VesselSchematicBreakMarker
  outlines: PathSpec[]
  legs: LineSpec[]
  groundLine: LineSpec
  levels: VesselSchematicLevel[]
  guideLines: VesselSchematicGuideLine[]
  annotations: VesselSchematicAnnotation[]
  captionParts: string[]
  legend: {
    showHll: boolean
    showLll: boolean
    showOfl: boolean
  }
}

export interface BuildVesselSchematicModelOptions {
  input: CalculationInput
  width: number
  height: number
  padding: number
  zoomOutFactor?: number
}

function fmtM(value?: number): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${(value / 1000).toFixed(2)}m`
}

export function buildVesselSchematicModel({
  input,
  width,
  height,
  padding,
  zoomOutFactor,
}: BuildVesselSchematicModelOptions): VesselSchematicModel | null {
  const id = input.insideDiameter
  const length = input.shellLength
  const equipmentMode = input.equipmentMode ?? EquipmentMode.VESSEL
  const orientation = input.orientation ?? VesselOrientation.VERTICAL
  const headType = input.headType ?? HeadType.ELLIPSOIDAL_2_1
  const headDepthInput = input.headDepth
  const legHeight = input.bottomHeight ?? 0
  const bootID = input.bootInsideDiameter ?? 0
  const bootCylH = input.bootHeight ?? 0
  const ll = input.liquidLevel
  const hll = input.hll
  const lll = input.lll
  const ofl = input.ofl

  if (equipmentMode === EquipmentMode.TANK || !id || id <= 0 || !length || length <= 0) {
    return null
  }

  const isVertical = orientation === VesselOrientation.VERTICAL
  const factor = zoomOutFactor ?? (isVertical ? 1 : 0.7)
  const drawAreaW = (width - 2 * padding) * factor
  const drawAreaH = (height - 2 * padding) * factor
  const headDepth = headDepthInput || autoHeadDepth(headType, id) || 0
  const hasBoot = bootID > 0 && bootCylH > 0
  const bootHeadDepth = hasBoot
    ? headType === HeadType.CONICAL
      ? bootID * (headDepth / Math.max(id, 1))
      : (autoHeadDepth(headType, bootID) ?? 0)
    : 0
  const drawnLength = isVertical && id > 0 && length / id > 4 ? 4 * id : length
  const isTruncated = drawnLength < length
  const totalW = isVertical ? id : length + 2 * headDepth
  const totalH = isVertical
    ? drawnLength + headDepth + Math.max(headDepth + (hasBoot ? bootCylH + bootHeadDepth : 0), legHeight)
    : id + Math.max(legHeight, bootCylH + bootHeadDepth)
  const scale = Math.min(drawAreaW / Math.max(totalW, 1), drawAreaH / Math.max(totalH, 1))
  const vW = (isVertical ? id : length) * scale
  const vH = (isVertical ? drawnLength : id) * scale
  const vHD = headDepth * scale
  const leg = Math.max(0, legHeight) * scale
  const bootCylScaledW = hasBoot ? Math.max(8, Math.min(bootID * scale, vW * 0.5)) : 0
  const bootCylScaledH = hasBoot ? bootCylH * scale : 0
  const bootVHD = bootHeadDepth * scale
  const fullW = isVertical ? vW : vW + 2 * vHD
  const fullH = isVertical
    ? vH + vHD + Math.max(hasBoot ? vHD + bootCylScaledH + bootVHD : vHD, leg)
    : vH + Math.max(leg, bootCylScaledH + bootVHD)
  const left = (width - fullW) / 2
  const top = (height - fullH) / 2
  const x0 = isVertical ? left : left + vHD
  const y0 = isVertical ? top + vHD : top

  let vesselPath = `M ${x0},${y0} L ${x0 + vW},${y0} L ${x0 + vW},${y0 + vH} L ${x0},${y0 + vH} Z`
  if (isVertical) {
    if (headType === HeadType.HEMISPHERICAL) {
      vesselPath += ` M ${x0 + vW},${y0} A ${vW / 2},${vW / 2} 0 0 0 ${x0},${y0}`
      vesselPath += ` M ${x0},${y0 + vH} A ${vW / 2},${vW / 2} 0 0 0 ${x0 + vW},${y0 + vH}`
    } else if (headType === HeadType.ELLIPSOIDAL_2_1 || headType === HeadType.TORISPHERICAL_80_10) {
      vesselPath += ` M ${x0 + vW},${y0} A ${vW / 2},${vHD} 0 0 0 ${x0},${y0}`
      vesselPath += ` M ${x0},${y0 + vH} A ${vW / 2},${vHD} 0 0 0 ${x0 + vW},${y0 + vH}`
    } else if (headType === HeadType.CONICAL) {
      vesselPath += ` M ${x0 + vW},${y0} L ${x0 + vW / 2},${y0 - vHD} L ${x0},${y0}`
      vesselPath += ` M ${x0},${y0 + vH} L ${x0 + vW / 2},${y0 + vH + vHD} L ${x0 + vW},${y0 + vH}`
    }
  } else {
    if (headType === HeadType.HEMISPHERICAL) {
      vesselPath += ` M ${x0},${y0 + vH} A ${vH / 2},${vH / 2} 0 0 1 ${x0},${y0}`
      vesselPath += ` M ${x0 + vW},${y0} A ${vH / 2},${vH / 2} 0 0 1 ${x0 + vW},${y0 + vH}`
    } else if (headType === HeadType.ELLIPSOIDAL_2_1 || headType === HeadType.TORISPHERICAL_80_10) {
      vesselPath += ` M ${x0},${y0 + vH} A ${vHD},${vH / 2} 0 0 1 ${x0},${y0}`
      vesselPath += ` M ${x0 + vW},${y0} A ${vHD},${vH / 2} 0 0 1 ${x0 + vW},${y0 + vH}`
    } else if (headType === HeadType.CONICAL) {
      vesselPath += ` M ${x0},${y0 + vH} L ${x0 - vHD},${y0 + vH / 2} L ${x0},${y0}`
      vesselPath += ` M ${x0 + vW},${y0} L ${x0 + vW + vHD},${y0 + vH / 2} L ${x0 + vW},${y0 + vH}`
    }
  }

  const lowerTangentY = y0 + vH
  const bottomY = y0 + vH
  const groundY = isVertical ? lowerTangentY + leg : bottomY + leg
  const showLegs = leg > 0
  const bootTopY = y0 + vH + vHD
  const bootX = x0 + vW / 2 - bootCylScaledW / 2
  const bootBotY = bootTopY + bootCylScaledH
  const bootApexY = bootBotY + bootVHD

  const bootPath = !hasBoot
    ? undefined
    : isVertical
      ? (() => {
          let path = `M ${bootX},${bootTopY} L ${bootX},${bootBotY}`
          if (headType === HeadType.HEMISPHERICAL) {
            path += ` A ${bootCylScaledW / 2},${bootCylScaledW / 2} 0 0 0 ${bootX + bootCylScaledW},${bootBotY}`
          } else if (headType === HeadType.ELLIPSOIDAL_2_1 || headType === HeadType.TORISPHERICAL_80_10) {
            path += ` A ${bootCylScaledW / 2},${bootVHD} 0 0 0 ${bootX + bootCylScaledW},${bootBotY}`
          } else if (headType === HeadType.CONICAL) {
            path += ` L ${bootX + bootCylScaledW / 2},${bootApexY}`
            path += ` L ${bootX + bootCylScaledW},${bootBotY}`
          } else {
            path += ` L ${bootX + bootCylScaledW},${bootBotY}`
          }
          path += ` L ${bootX + bootCylScaledW},${bootTopY}`
          return path
        })()
      : (() => {
          const hBootX = x0 + vW * 0.15 - bootCylScaledW / 2 - 10
          const hBootTopY = y0 + vH
          const hBootBodyBotY = hBootTopY + bootCylScaledH
          const hBootBotY = hBootBodyBotY + bootVHD
          let path = `M ${hBootX},${hBootTopY} L ${hBootX},${hBootBodyBotY}`
          if (headType === HeadType.HEMISPHERICAL) {
            path += ` A ${bootCylScaledW / 2},${bootCylScaledW / 2} 0 0 0 ${hBootX + bootCylScaledW},${hBootBodyBotY}`
          } else if (headType === HeadType.ELLIPSOIDAL_2_1 || headType === HeadType.TORISPHERICAL_80_10) {
            path += ` A ${bootCylScaledW / 2},${bootVHD} 0 0 0 ${hBootX + bootCylScaledW},${hBootBodyBotY}`
          } else if (headType === HeadType.CONICAL) {
            path += ` L ${hBootX + bootCylScaledW / 2},${hBootBodyBotY + bootVHD}`
            path += ` L ${hBootX + bootCylScaledW},${hBootBodyBotY}`
          } else {
            path += ` L ${hBootX + bootCylScaledW},${hBootBodyBotY}`
          }
          path += ` L ${hBootX + bootCylScaledW},${hBootTopY}`
          return path
        })()

  const hBootX = x0 + vW * 0.15 - bootCylScaledW / 2 - 10
  const hBootTopY = y0 + vH
  const hBootBodyBotY = hBootTopY + bootCylScaledH
  const hBootBotY = hBootBodyBotY + bootVHD

  const getLevelY = (levelMm: number | undefined): number | undefined => {
    if (levelMm === undefined || Number.isNaN(levelMm)) return undefined
    return isVertical ? y0 + vH + vHD - levelMm * scale : y0 + vH - levelMm * scale
  }

  const levelEntries = [
    { key: 'll', name: 'LL' as const, value: ll, color: '#38bdf8', dashed: false },
    { key: 'hll', name: 'HLL' as const, value: hll, color: '#22c55e', dashed: true },
    { key: 'lll', name: 'LLL' as const, value: lll, color: '#f59e0b', dashed: true },
    { key: 'ofl', name: 'OFL' as const, value: ofl, color: '#ef4444', dashed: true },
  ]

  const levels: VesselSchematicLevel[] = levelEntries
    .map((entry) => {
      const y = getLevelY(entry.value)
      if (y === undefined) return null
      const lineX1 = x0 - (isVertical ? 10 : vHD + 10)
      const lineX2 = x0 + vW + (isVertical ? 10 : vHD + 10)
      return {
        key: entry.key,
        name: entry.name,
        label: `${entry.name} ${fmtM(entry.value)}`,
        color: entry.color,
        y,
        lineX1,
        lineX2,
        textX: lineX2 + (isVertical ? 4 : 34),
        textY: y + 4,
        dashed: entry.dashed,
      }
    })
    .filter((level): level is VesselSchematicLevel => level !== null)

  const guideLines: VesselSchematicGuideLine[] = []
  const annotations: VesselSchematicAnnotation[] = []

  if (isVertical) {
    guideLines.push(
      { key: 'tt-top-guide', x1: x0 - 2, y1: y0, x2: x0 - 30, y2: y0 },
      { key: 'tt-bottom-guide', x1: x0 - 2, y1: y0 + vH, x2: x0 - 30, y2: y0 + vH },
      { key: 'd-left-guide', x1: x0, y1: y0, x2: x0, y2: y0 - vHD - 22 },
      { key: 'd-right-guide', x1: x0 + vW, y1: y0, x2: x0 + vW, y2: y0 - vHD - 22 },
    )
    annotations.push(
      { key: 'tt', label: `T-T ${fmtM(length)}`, x1: x0 - 26, y1: y0, x2: x0 - 26, y2: y0 + vH, vertical: true, labelSide: 'start' },
      { key: 'diameter', label: `D ${fmtM(id)}`, x1: x0, y1: y0 - vHD - 18, x2: x0 + vW, y2: y0 - vHD - 18 },
    )
    if (showLegs) {
      guideLines.push(
        { key: 'btm-top-guide', x1: x0 + vW + 2, y1: lowerTangentY, x2: x0 + vW + 28, y2: lowerTangentY },
        { key: 'btm-bottom-guide', x1: x0 + vW + 2, y1: groundY, x2: x0 + vW + 28, y2: groundY },
      )
      annotations.push({
        key: 'bottomHeight',
        label: `Btm ${fmtM(legHeight)}`,
        x1: x0 + vW + 24,
        y1: lowerTangentY,
        x2: x0 + vW + 24,
        y2: groundY,
        vertical: true,
        labelSide: 'end',
      })
    }
    if (hasBoot && bootCylScaledH >= 14) {
      guideLines.push(
        { key: 'bh-top-guide', x1: bootX - 2, y1: bootTopY, x2: x0 - 30, y2: bootTopY },
        { key: 'bh-bottom-guide', x1: bootX - 2, y1: bootBotY, x2: x0 - 30, y2: bootBotY },
      )
      annotations.push({
        key: 'bootHeight',
        label: `BH ${fmtM(bootCylH)}`,
        x1: x0 - 26,
        y1: bootTopY,
        x2: x0 - 26,
        y2: bootBotY,
        vertical: true,
        labelSide: 'start',
      })
    }
    if (hasBoot && bootCylScaledW >= 14) {
      guideLines.push(
        { key: 'bd-left-guide', x1: bootX, y1: bootApexY + 2, x2: bootX, y2: bootApexY + 16 },
        { key: 'bd-right-guide', x1: bootX + bootCylScaledW, y1: bootApexY + 2, x2: bootX + bootCylScaledW, y2: bootApexY + 16 },
      )
      annotations.push({
        key: 'bootDiameter',
        label: `BD ${fmtM(bootID)}`,
        x1: bootX,
        y1: bootApexY + 12,
        x2: bootX + bootCylScaledW,
        y2: bootApexY + 12,
      })
    }
  } else {
    const horizontalLeftDimX = x0 - vHD - 36
    const horizontalRightDimX = x0 + vW + vHD + 36
    const horizontalBootHeightDimX = hBootX - 26
    const horizontalBootDiameterDimY = hBootBotY + 18

    guideLines.push(
      { key: 'tt-left-guide', x1: x0, y1: y0 + 2, x2: x0, y2: y0 - 24 },
      { key: 'tt-right-guide', x1: x0 + vW, y1: y0 + 2, x2: x0 + vW, y2: y0 - 24 },
      { key: 'd-top-guide', x1: x0, y1: y0, x2: horizontalLeftDimX - 4, y2: y0 },
      { key: 'd-bottom-guide', x1: x0, y1: y0 + vH, x2: horizontalLeftDimX - 4, y2: y0 + vH },
    )
    annotations.push(
      { key: 'tt', label: `T-T ${fmtM(length)}`, x1: x0, y1: y0 - 20, x2: x0 + vW, y2: y0 - 20 },
      { key: 'diameter', label: `D ${fmtM(id)}`, x1: horizontalLeftDimX, y1: y0, x2: horizontalLeftDimX, y2: y0 + vH, vertical: true, labelSide: 'start' },
    )
    if (showLegs) {
      const legX2 = x0 + vW * 0.82
      guideLines.push(
        { key: 'btm-shell-guide', x1: x0 + vW + vHD, y1: bottomY, x2: horizontalRightDimX + 4, y2: bottomY },
        { key: 'btm-ground-guide', x1: legX2, y1: groundY, x2: horizontalRightDimX + 4, y2: groundY },
      )
      annotations.push({
        key: 'bottomHeight',
        label: `Btm ${fmtM(legHeight)}`,
        x1: horizontalRightDimX,
        y1: bottomY,
        x2: horizontalRightDimX,
        y2: groundY,
        vertical: true,
        labelSide: 'start',
      })
    }
    if (hasBoot && bootCylScaledH >= 14) {
      guideLines.push(
        { key: 'bh-top-guide', x1: hBootX - 2, y1: hBootTopY, x2: horizontalBootHeightDimX - 4, y2: hBootTopY },
        { key: 'bh-bottom-guide', x1: hBootX - 2, y1: hBootBodyBotY, x2: horizontalBootHeightDimX - 4, y2: hBootBodyBotY },
      )
      annotations.push({
        key: 'bootHeight',
        label: `BH ${fmtM(bootCylH)}`,
        x1: horizontalBootHeightDimX,
        y1: hBootTopY,
        x2: horizontalBootHeightDimX,
        y2: hBootBodyBotY,
        vertical: true,
        labelSide: 'start',
      })
    }
    if (hasBoot && bootCylScaledW >= 14) {
      guideLines.push(
        { key: 'bd-left-guide', x1: hBootX, y1: hBootBotY, x2: hBootX, y2: horizontalBootDiameterDimY - 4 },
        { key: 'bd-right-guide', x1: hBootX + bootCylScaledW, y1: hBootBotY, x2: hBootX + bootCylScaledW, y2: horizontalBootDiameterDimY - 4 },
      )
      annotations.push({
        key: 'bootDiameter',
        label: `BD ${fmtM(bootID)}`,
        x1: hBootX,
        y1: horizontalBootDiameterDimY,
        x2: hBootX + bootCylScaledW,
        y2: horizontalBootDiameterDimY,
      })
    }
  }

  const breakMarker = !isVertical || !isTruncated
    ? undefined
    : (() => {
        const a = 5
        const gap = 8
        const cx = x0 + vW / 2
        const yb = y0 + vH * 0.5
        const y1L = yb - a - gap / 2
        const y1R = yb + a - gap / 2
        const y2L = yb - a + gap / 2
        const y2R = yb + a + gap / 2
        const zTop = y1L - 1
        const zBot = y2R + 1
        return {
          background: { x: x0 - 1, y: zTop, width: vW + 2, height: zBot - zTop },
          wallSegments: [
            { key: 'break-left-top', x1: x0, y1: zTop, x2: x0, y2: y1L },
            { key: 'break-left-bottom', x1: x0, y1: y2L, x2: x0, y2: zBot },
            { key: 'break-right-top', x1: x0 + vW, y1: zTop, x2: x0 + vW, y2: y1R },
            { key: 'break-right-bottom', x1: x0 + vW, y1: y2R, x2: x0 + vW, y2: zBot },
          ],
          zigzags: [
            { key: 'break-zigzag-1', d: `M ${x0},${y1L} L ${cx - a},${y1L} L ${cx + a},${y1R} L ${x0 + vW},${y1R}` },
            { key: 'break-zigzag-2', d: `M ${x0},${y2L} L ${cx - a},${y2L} L ${cx + a},${y2R} L ${x0 + vW},${y2R}` },
          ],
        }
      })()

  const legs: LineSpec[] = showLegs
    ? isVertical
      ? [
          { key: 'leg-left', x1: x0, y1: lowerTangentY, x2: x0, y2: groundY },
          { key: 'leg-right', x1: x0 + vW, y1: lowerTangentY, x2: x0 + vW, y2: groundY },
        ]
      : [
          { key: 'leg-left', x1: x0 + vW * 0.18, y1: bottomY, x2: x0 + vW * 0.18, y2: groundY },
          { key: 'leg-right', x1: x0 + vW * 0.82, y1: bottomY, x2: x0 + vW * 0.82, y2: groundY },
        ]
    : []

  const captionParts: string[] = [
    `T-T: ${fmtM(length)}`,
    `D: ${fmtM(id)}`,
    ...(isTruncated ? ['(truncated in drawing)'] : []),
    ...(showLegs ? [`Btm: ${fmtM(legHeight)}`] : []),
    ...(hasBoot ? [`BH: ${fmtM(bootCylH)}`, `BD: ${fmtM(bootID)}`] : []),
  ]

  return {
    width,
    height,
    isVertical,
    hasBoot,
    showLegs,
    isTruncated,
    vesselPath,
    bootPath,
    clipPaths: {
      vesselId: 'vesselClip',
      bootId: hasBoot ? (isVertical ? 'bootClip' : 'hBootClip') : undefined,
    },
    fills: {
      vessel: ll !== undefined && ll > 0
        ? {
            x: 0,
            y: getLevelY(ll) ?? 0,
            width,
            height,
          }
        : undefined,
      boot: hasBoot && ll !== undefined && ll > 0
        ? isVertical
          ? {
              x: bootX,
              y: bootTopY,
              width: bootCylScaledW,
              height: bootCylScaledH + bootVHD,
            }
          : {
              x: hBootX,
              y: hBootTopY,
              width: bootCylScaledW,
              height: bootCylScaledH + bootVHD,
            }
        : undefined,
    },
    breakMarker,
    outlines: [
      { key: 'vessel-outline', d: vesselPath },
      ...(bootPath ? [{ key: 'boot-outline', d: bootPath }] : []),
    ],
    legs,
    groundLine: {
      key: 'ground-line',
      x1: x0 - vHD - 24,
      y1: groundY,
      x2: x0 + vW + vHD + 24,
      y2: groundY,
    },
    levels,
    guideLines,
    annotations,
    captionParts,
    legend: {
      showHll: hll !== undefined,
      showLll: lll !== undefined,
      showOfl: ofl !== undefined,
    },
  }
}
