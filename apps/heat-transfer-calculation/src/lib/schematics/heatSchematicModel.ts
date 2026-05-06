import { HeadType, TankRoofType, type CalculationInput, type HorizontalTankInput, type PipeCalculationInput } from '@/types'

export type HeatSchematicMode = 'tank' | 'pipe' | 'horizontal'
export type LabelSide = 'start' | 'end'
export type FillTone = 'dry' | 'wet' | 'liquid' | 'insulation' | 'metal' | 'ambient'

export interface LineSpec {
  key: string
  x1: number
  y1: number
  x2: number
  y2: number
  strokeWidth?: number
  dashed?: string
  opacity?: number
}

export interface RectSpec {
  key: string
  x: number
  y: number
  width: number
  height: number
  rx?: number
  ry?: number
  tone?: FillTone
  opacity?: number
}

export interface CircleSpec {
  key: string
  cx: number
  cy: number
  r: number
  tone?: FillTone
  opacity?: number
}

export interface EllipseSpec {
  key: string
  cx: number
  cy: number
  rx: number
  ry: number
  tone?: FillTone
  opacity?: number
}

export interface PathSpec {
  key: string
  d: string
  tone?: FillTone
  opacity?: number
}

export interface HeatSchematicLevel {
  key: string
  label: string
  y: number
  x0: number
  x1: number
  color: string
  dashed?: boolean
  labelOffset?: number
}

export interface HeatSchematicAnnotation {
  key: string
  label: string
  x1: number
  y1: number
  x2: number
  y2: number
  vertical?: boolean
  labelSide?: LabelSide
}

export interface HeatSchematicLabel {
  key: string
  text: string
  x: number
  y: number
  anchor?: 'start' | 'middle' | 'end'
  tone?: FillTone
  size?: number
}

export interface HeatSchematicClipPath {
  id: string
  path?: string
  rect?: RectSpec
}

export interface HeatSchematicModel {
  mode: HeatSchematicMode
  width: number
  height: number
  clipPath?: HeatSchematicClipPath
  zoneFills: {
    rects: RectSpec[]
    paths: PathSpec[]
    circles: CircleSpec[]
    ellipses: EllipseSpec[]
  }
  liquidFill?: RectSpec
  outlines: {
    paths: PathSpec[]
    rects: RectSpec[]
    circles: CircleSpec[]
    ellipses: EllipseSpec[]
    lines: LineSpec[]
  }
  guideLines: LineSpec[]
  levels: HeatSchematicLevel[]
  annotations: HeatSchematicAnnotation[]
  labels: HeatSchematicLabel[]
  subtitle: string
}

const ZOOM_OUT_FACTOR = 0.88

function fmtM(valueMm?: number): string {
  if (valueMm == null || Number.isNaN(valueMm)) return '—'
  return `${(valueMm / 1000).toFixed(2)}m`
}

function fmtPipeLength(valueM?: number): string {
  if (valueM == null || Number.isNaN(valueM)) return '—'
  return `${valueM.toFixed(2)}m`
}

function fmtTemp(value?: number): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(0)}°C`
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

function finitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function computeHeadDepth(headType: HeadType, diameter: number): number {
  switch (headType) {
    case HeadType.FLAT:
      return 0
    case HeadType.HEMISPHERICAL:
      return diameter / 2
    case HeadType.TORISPHERICAL_80_10:
      return diameter * 0.169
    case HeadType.ELLIPSOIDAL_2_1:
    default:
      return diameter / 4
  }
}

export function buildVerticalTankSchematic(
  input: CalculationInput,
  width: number,
  height: number,
  padding: number,
): HeatSchematicModel | null {
  const diameter = input.tankDiameter
  const shellHeight = input.tankHeight

  if (!finitePositive(diameter) || !finitePositive(shellHeight)) return null

  const roofType = input.tankRoofType ?? (input.roofHeight && input.roofHeight > 0 ? TankRoofType.CONE : TankRoofType.FLAT)
  const roofHeight = roofType === TankRoofType.FLAT ? 0 : Math.max(input.roofHeight ?? 0, 0)
  const totalHeight = shellHeight + roofHeight
  const maxW = (width - 2 * padding) * ZOOM_OUT_FACTOR
  const maxH = (height - 2 * padding) * ZOOM_OUT_FACTOR
  const scale = Math.min(maxW / diameter, maxH / totalHeight)

  const bodyW = diameter * scale
  const bodyH = shellHeight * scale
  const roofH = roofHeight * scale
  const x0 = (width - bodyW) / 2
  const y0 = (height - (bodyH + roofH)) / 2 + roofH
  const x1 = x0 + bodyW
  const y1 = y0 + bodyH
  const cx = width / 2

  const levelMm = clamp(input.liquidLevel ?? 0, 0, shellHeight)
  const levelY = y1 - (levelMm / shellHeight) * bodyH
  const roofPath = roofType === TankRoofType.DOME
    ? `M ${x0},${y0} Q ${cx},${y0 - roofH * 1.6} ${x1},${y0}`
    : roofH > 0
      ? `M ${x0},${y0} L ${cx},${y0 - roofH} L ${x1},${y0}`
      : `M ${x0},${y0} L ${x1},${y0}`

  const bodyClipId = 'heat-vertical-tank-body'

  return {
    mode: 'tank',
    width,
    height,
    clipPath: { id: bodyClipId, rect: { key: 'vertical-body-clip', x: x0, y: y0, width: bodyW, height: bodyH } },
    zoneFills: {
      rects: [
        { key: 'vertical-dry-zone', x: x0, y: y0, width: bodyW, height: Math.max(levelY - y0, 0), tone: 'dry', opacity: 0.14 },
      ],
      paths: roofH > 0 ? [{ key: 'vertical-roof-fill', d: `${roofPath} Z`, tone: 'dry', opacity: 0.1 }] : [],
      circles: [],
      ellipses: [],
    },
    liquidFill: levelMm > 0
      ? { key: 'vertical-liquid-fill', x: x0, y: levelY, width: bodyW, height: y1 - levelY, tone: 'liquid', opacity: 0.22 }
      : undefined,
    outlines: {
      paths: [{ key: 'vertical-roof-outline', d: roofPath }],
      rects: [{ key: 'vertical-shell-outline', x: x0, y: y0, width: bodyW, height: bodyH, rx: 4 }],
      circles: [],
      ellipses: [],
      lines: [
        { key: 'vertical-floor-outline', x1: x0, y1, x2: x1, y2: y1, strokeWidth: 2 },
        { key: 'vertical-centerline', x1: cx, y1: y0 - roofH - 8, x2: cx, y2: y1 + 8, dashed: '4 4', opacity: 0.35 },
      ],
    },
    guideLines: [
      { key: 'vertical-diameter-left', x1: x0, y1, x2: x0, y2: y1 + 26, opacity: 0.55 },
      { key: 'vertical-diameter-right', x1, y1, x2: x1, y2: y1 + 26, opacity: 0.55 },
      { key: 'vertical-height-top', x1: x0 - 2, y1: y0, x2: x0 - 30, y2: y0, opacity: 0.55 },
      { key: 'vertical-height-bottom', x1: x0 - 2, y1, x2: x0 - 30, y2: y1, opacity: 0.55 },
      { key: 'vertical-ll-bottom', x1: x1 + 2, y1, x2: x1 + 30, y2: y1, opacity: 0.55 },
      { key: 'vertical-ll-level', x1: x1 + 2, y1: levelY, x2: x1 + 30, y2: levelY, opacity: 0.55 },
    ],
    levels: [{
      key: 'vertical-liquid-level',
      label: `LL ${fmtM(levelMm)}`,
      y: levelY,
      x0,
      x1,
      color: '#38bdf8',
      labelOffset: 24,
    }],
    annotations: [
      { key: 'vertical-diameter', label: `D ${fmtM(diameter)}`, x1: x0, y1: y1 + 30, x2: x1, y2: y1 + 30 },
      { key: 'vertical-height', label: `H ${fmtM(shellHeight)}`, x1: x0 - 34, y1: y0, x2: x0 - 34, y2: y1, vertical: true, labelSide: 'start' },
      { key: 'vertical-ll', label: `LL ${fmtM(levelMm)}`, x1: x1 + 34, y1: levelY, x2: x1 + 34, y2: y1, vertical: true, labelSide: 'end' },
    ],
    labels: [
      { key: 'vertical-dry-label', text: 'dry wall', x: x1 + 12, y: y0 + Math.max((levelY - y0) / 2, 14), anchor: 'start', tone: 'dry' },
      { key: 'vertical-wet-label', text: 'wet wall', x: x1 + 12, y: levelY + Math.max((y1 - levelY) / 2, 16), anchor: 'start', tone: 'liquid' },
      { key: 'vertical-roof-label', text: 'roof', x: cx, y: y0 - Math.max(roofH / 2, 10), anchor: 'middle', tone: 'dry' },
      { key: 'vertical-floor-label', text: 'floor', x: cx, y: y1 - 8, anchor: 'middle' },
      { key: 'vertical-temp-label', text: `Tᶠ ${fmtTemp(input.fluidTemp)} · Tₐ ${fmtTemp(input.ambientTemp)}`, x: width / 2, y: height - 14, anchor: 'middle', size: 11 },
    ],
    subtitle: `${roofType} vertical tank · dry/wet heat-transfer zones`,
  }
}

export function buildPipeSchematic(
  input: PipeCalculationInput,
  width: number,
  height: number,
  padding: number,
): HeatSchematicModel | null {
  const lengthM = input.pipeLength
  const innerD = input.insideDiameter ?? input.sideA
  const outerD = input.outsideDiameter ?? (innerD != null ? innerD + 2 * (input.wallThickness ?? 0) : undefined)

  if (!finitePositive(lengthM) || !finitePositive(innerD)) return null

  const insulationThickness = Math.max(input.insulationThickness ?? 0, 0)
  const wallOuterD = Math.max(outerD ?? innerD, innerD)
  const insulatedOuterD = wallOuterD + 2 * insulationThickness
  const maxW = (width - 2 * padding) * ZOOM_OUT_FACTOR
  const maxH = (height - 2 * padding) * ZOOM_OUT_FACTOR
  const physicalAspect = (lengthM * 1000) / Math.max(insulatedOuterD, 1)
  const displayAspect = clamp(physicalAspect, 5.2, 11.5)
  const pipeH = Math.min(maxH * 0.42, maxW / displayAspect)
  const pipeW = pipeH * displayAspect
  const x0 = (width - pipeW) / 2 - pipeH * 0.12
  const x1 = x0 + pipeW
  const cy = height / 2
  const outerR = pipeH / 2
  const wallR = outerR * clamp(wallOuterD / Math.max(insulatedOuterD, 1), 0.58, 0.94)
  const innerR = outerR * clamp(innerD / Math.max(insulatedOuterD, 1), 0.42, 0.86)
  const bodyY = cy - outerR
  const crossCx = x1

  return {
    mode: 'pipe',
    width,
    height,
    zoneFills: {
      rects: [
        { key: 'pipe-insulation-body', x: x0, y: bodyY, width: pipeW, height: pipeH, rx: outerR, tone: 'insulation', opacity: 0.22 },
        { key: 'pipe-wall-body', x: x0, y: cy - wallR, width: pipeW, height: wallR * 2, rx: wallR, tone: 'metal', opacity: 0.18 },
        { key: 'pipe-fluid-body', x: x0, y: cy - innerR, width: pipeW, height: innerR * 2, rx: innerR, tone: 'liquid', opacity: 0.16 },
      ],
      paths: [],
      circles: [
        { key: 'pipe-insulation-cross-fill', cx: crossCx, cy, r: outerR, tone: 'insulation', opacity: 0.28 },
        { key: 'pipe-wall-cross-fill', cx: crossCx, cy, r: wallR, tone: 'metal', opacity: 0.24 },
        { key: 'pipe-fluid-cross-fill', cx: crossCx, cy, r: innerR, tone: 'liquid', opacity: 0.22 },
      ],
      ellipses: [],
    },
    outlines: {
      paths: [],
      rects: [
        { key: 'pipe-outer-outline', x: x0, y: bodyY, width: pipeW, height: pipeH, rx: outerR },
        { key: 'pipe-wall-outline', x: x0, y: cy - wallR, width: pipeW, height: wallR * 2, rx: wallR },
        { key: 'pipe-bore-outline', x: x0, y: cy - innerR, width: pipeW, height: innerR * 2, rx: innerR },
      ],
      circles: [
        { key: 'pipe-outer-cross-outline', cx: crossCx, cy, r: outerR },
        { key: 'pipe-wall-cross-outline', cx: crossCx, cy, r: wallR },
        { key: 'pipe-bore-cross-outline', cx: crossCx, cy, r: innerR },
      ],
      ellipses: [],
      lines: [
        { key: 'pipe-flow-arrow', x1: x0 + pipeW * 0.18, y1: cy, x2: x0 + pipeW * 0.62, y2: cy, strokeWidth: 2 },
        { key: 'pipe-ambient-up', x1: x0 + pipeW * 0.45, y1: bodyY - 44, x2: x0 + pipeW * 0.45, y2: bodyY - 12, dashed: '3 3', opacity: 0.7 },
      ],
    },
    guideLines: [
      { key: 'pipe-length-left', x1: x0, y1: bodyY + pipeH + 4, x2: x0, y2: bodyY + pipeH + 30, opacity: 0.55 },
      { key: 'pipe-length-right', x1, y1: bodyY + pipeH + 4, x2: x1, y2: bodyY + pipeH + 30, opacity: 0.55 },
    ],
    liquidFill: undefined,
    levels: [],
    annotations: [
      { key: 'pipe-length', label: `L ${fmtPipeLength(lengthM)}`, x1: x0, y1: bodyY + pipeH + 34, x2: x1, y2: bodyY + pipeH + 34 },
      { key: 'pipe-diameter', label: `Dᵢ ${fmtM(innerD)}`, x1: crossCx + outerR + 24, y1: cy - innerR, x2: crossCx + outerR + 24, y2: cy + innerR, vertical: true, labelSide: 'end' },
    ],
    labels: [
      { key: 'pipe-inlet-temp', text: `Tᵢₙ ${fmtTemp(input.inletTemp)}`, x: x0 - 10, y: cy + outerR + 18, anchor: 'end' },
      { key: 'pipe-outlet-temp', text: 'Tₒᵤₜ', x: crossCx + outerR + 12, y: cy + outerR + 18, anchor: 'start' },
      { key: 'pipe-ambient-temp', text: `Tₐ ${fmtTemp(input.ambientTemp)}`, x: x0 + pipeW * 0.45, y: bodyY - 50, anchor: 'middle', tone: 'ambient' },
      { key: 'pipe-flow-label', text: 'flow direction', x: x0 + pipeW * 0.4, y: cy - 8, anchor: 'middle', size: 11 },
      { key: 'pipe-insulation-label', text: insulationThickness > 0 ? `insulation ${fmtM(insulationThickness)}` : 'bare pipe', x: crossCx, y: cy - outerR - 12, anchor: 'middle', tone: 'insulation' },
      { key: 'pipe-wall-label', text: `wall ${fmtM(input.wallThickness)}`, x: x0 + pipeW * 0.74, y: cy + innerR + 16, anchor: 'middle', tone: 'metal', size: 11 },
    ],
    subtitle: 'Horizontal pipe · insulation and temperature boundary labels',
  }
}

export function buildHorizontalTankSchematic(
  input: HorizontalTankInput,
  width: number,
  height: number,
  padding: number,
): HeatSchematicModel | null {
  const diameter = input.insideDiameter
  const shellLength = input.tankLength
  if (!finitePositive(diameter) || !finitePositive(shellLength)) return null

  const headDepth = Math.max(input.headDepth ?? computeHeadDepth(input.headType, diameter), 0)
  const flangeWidth = Math.max(input.flangeWidth ?? 0, 0)
  const totalLength = shellLength + 2 * headDepth + 2 * flangeWidth
  const maxW = (width - 2 * padding) * ZOOM_OUT_FACTOR
  const maxH = (height - 2 * padding) * ZOOM_OUT_FACTOR
  const scale = Math.min(maxW / totalLength, maxH / diameter)

  const bodyW = shellLength * scale
  const tankH = diameter * scale
  const headW = headDepth * scale
  const flangeW = flangeWidth * scale
  const tankW = totalLength * scale
  const xOuter0 = (width - tankW) / 2
  const xTan0 = xOuter0 + flangeW + headW
  const xTan1 = xTan0 + bodyW
  const xOuter1 = xTan1 + headW + flangeW
  const y0 = (height - tankH) / 2
  const y1 = y0 + tankH
  const cy = height / 2
  const liquidMm = clamp(input.liquidLevel ?? 0, 0, diameter)
  const levelY = y1 - (liquidMm / diameter) * tankH

  const shellPath = headW > 0
    ? `M ${xTan0},${y0} L ${xTan1},${y0} C ${xTan1 + headW},${y0} ${xTan1 + headW},${y1} ${xTan1},${y1} L ${xTan0},${y1} C ${xTan0 - headW},${y1} ${xTan0 - headW},${y0} ${xTan0},${y0} Z`
    : `M ${xTan0},${y0} L ${xTan1},${y0} L ${xTan1},${y1} L ${xTan0},${y1} Z`
  const fullPath = flangeW > 0
    ? `M ${xOuter0},${y0 + tankH * 0.08} L ${xTan0},${y0} L ${xTan1},${y0} L ${xOuter1},${y0 + tankH * 0.08} L ${xOuter1},${y1 - tankH * 0.08} L ${xTan1},${y1} L ${xTan0},${y1} L ${xOuter0},${y1 - tankH * 0.08} Z`
    : shellPath

  return {
    mode: 'horizontal',
    width,
    height,
    clipPath: { id: 'heat-horizontal-tank-shell', path: shellPath },
    zoneFills: {
      rects: [
        { key: 'horizontal-dry-zone', x: xOuter0, y: y0, width: tankW, height: Math.max(levelY - y0, 0), tone: 'dry', opacity: 0.14 },
      ],
      paths: [],
      circles: [],
      ellipses: [],
    },
    liquidFill: liquidMm > 0
      ? { key: 'horizontal-liquid-fill', x: xOuter0, y: levelY, width: tankW, height: y1 - levelY, tone: 'liquid', opacity: 0.22 }
      : undefined,
    outlines: {
      paths: [{ key: 'horizontal-shell-outline', d: fullPath }],
      rects: [],
      circles: [],
      ellipses: [],
      lines: [
        { key: 'horizontal-left-tangent', x1: xTan0, y1: y0 - 8, x2: xTan0, y2: y1 + 8, dashed: '4 4', opacity: 0.45 },
        { key: 'horizontal-right-tangent', x1: xTan1, y1: y0 - 8, x2: xTan1, y2: y1 + 8, dashed: '4 4', opacity: 0.45 },
        { key: 'horizontal-centerline', x1: xOuter0 - 8, y1: cy, x2: xOuter1 + 8, y2: cy, dashed: '6 4', opacity: 0.35 },
      ],
    },
    guideLines: [
      { key: 'horizontal-length-left', x1: xTan0, y1: y1 + 4, x2: xTan0, y2: y1 + 28, opacity: 0.55 },
      { key: 'horizontal-length-right', x1: xTan1, y1: y1 + 4, x2: xTan1, y2: y1 + 28, opacity: 0.55 },
      { key: 'horizontal-diameter-top', x1: xOuter1 + 6, y1: y0, x2: xOuter1 + 34, y2: y0, opacity: 0.55 },
      { key: 'horizontal-diameter-bottom', x1: xOuter1 + 6, y1, x2: xOuter1 + 34, y2: y1, opacity: 0.55 },
    ],
    levels: [{
      key: 'horizontal-liquid-level',
      label: `LL ${fmtM(liquidMm)}`,
      y: levelY,
      x0: xOuter0,
      x1: xOuter1,
      color: '#38bdf8',
      labelOffset: 18,
    }],
    annotations: [
      { key: 'horizontal-length', label: `L ${fmtM(shellLength)}`, x1: xTan0, y1: y1 + 32, x2: xTan1, y2: y1 + 32 },
      { key: 'horizontal-diameter', label: `D ${fmtM(diameter)}`, x1: xOuter1 + 38, y1: y0, x2: xOuter1 + 38, y2: y1, vertical: true, labelSide: 'end' },
    ],
    labels: [
      { key: 'horizontal-dry-label', text: 'dry wall/head', x: width / 2, y: y0 + Math.max((levelY - y0) / 2, 16), anchor: 'middle', tone: 'dry' },
      { key: 'horizontal-wet-label', text: 'wet wall/head', x: width / 2, y: levelY + Math.max((y1 - levelY) / 2, 18), anchor: 'middle', tone: 'liquid' },
      { key: 'horizontal-head-label', text: input.headType === HeadType.ELLIPSOIDAL_2_1 ? '2:1 elliptical heads' : input.headType, x: width / 2, y: y0 - 14, anchor: 'middle', size: 11 },
      { key: 'horizontal-temp-label', text: `Tᶠ ${fmtTemp(input.fluidTemp)} · Tₐ ${fmtTemp(input.ambientTemp)}`, x: width / 2, y: height - 14, anchor: 'middle', size: 11 },
    ],
    subtitle: 'Horizontal cylinder · elliptical heads and liquid split',
  }
}
