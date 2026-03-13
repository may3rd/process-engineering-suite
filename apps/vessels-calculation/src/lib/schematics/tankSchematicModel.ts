import {
  TankRoofType,
  TankType,
  type CalculationInput,
} from '@/types'

type LabelSide = 'start' | 'end'

interface LineSpec {
  key: string
  x1: number
  y1: number
  x2: number
  y2: number
  strokeWidth?: number
  dashed?: string
  opacity?: number
}

interface RectSpec {
  key: string
  x: number
  y: number
  width: number
  height: number
}

interface CircleSpec {
  key: string
  cx: number
  cy: number
  r: number
}

interface PathSpec {
  key: string
  d: string
}

export interface TankSchematicLevel {
  key: string
  name: 'LL' | 'HLL' | 'LLL' | 'OFL'
  label: string
  color: string
  y: number
  x0: number
  x1: number
  labelOffset: number
  dashed: boolean
}

export interface TankSchematicAnnotation {
  key: string
  label: string
  x1: number
  y1: number
  x2: number
  y2: number
  vertical?: boolean
  labelSide?: LabelSide
}

interface TankClipPath {
  id: string
  path?: string
  circle?: CircleSpec
}

interface TankLegend {
  showLiquid: boolean
  showLegs: boolean
  showGround: boolean
}

export interface TankSchematicModel {
  width: number
  height: number
  tankType: TankType
  clipPath: TankClipPath
  liquidFill?: RectSpec
  outlines: {
    paths: PathSpec[]
    rects: RectSpec[]
    circles: CircleSpec[]
    lines: LineSpec[]
  }
  guideLines: LineSpec[]
  levels: TankSchematicLevel[]
  annotations: TankSchematicAnnotation[]
  legend: TankLegend
  subtitle: string
}

export interface BuildTankSchematicModelOptions {
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

export function buildTankSchematicModel({
  input,
  width,
  height,
  padding,
  zoomOutFactor = 0.88,
}: BuildTankSchematicModelOptions): TankSchematicModel | null {
  const diameter = input.insideDiameter
  const tankType = input.tankType
  const shellHeight = input.shellLength
  const roofType = input.tankRoofType ?? TankRoofType.FLAT
  const roofHeight = input.roofHeight ?? 0
  const bottomHeight = input.bottomHeight ?? 0
  const ll = input.liquidLevel
  const hll = input.hll
  const lll = input.lll
  const ofl = input.ofl

  if (!diameter || diameter <= 0 || !tankType) {
    return null
  }

  const maxW = (width - 2 * padding) * zoomOutFactor
  const maxH = (height - 2 * padding) * zoomOutFactor

  if (tankType === TankType.SPHERICAL) {
    const radiusMm = diameter / 2
    const supportHeightMm = bottomHeight > 0 ? bottomHeight : diameter * 0.25
    const totalH = radiusMm + supportHeightMm
    const scale = Math.min(maxW / diameter, maxH / Math.max(totalH, 1))
    const r = radiusMm * scale
    const cx = width / 2
    const cy = padding + radiusMm * scale
    const groundY = cy + supportHeightMm * scale
    const diameterDimY = cy - r - 22
    const heightDimX = cx - r - 34

    const levelY = (levelMm?: number) => {
      if (levelMm == null || Number.isNaN(levelMm)) return undefined
      const clamped = Math.max(0, Math.min(levelMm, diameter))
      return cy + r - clamped * scale
    }

    const levels = buildLevels({
      levelValues: { ll, hll, lll, ofl },
      levelY,
      x0: cx - r,
      x1: cx + r,
      labelOffset: 20,
    })

    const guideLines: LineSpec[] = [
      { key: 'sphere-height-top', x1: cx - r - 2, y1: cy, x2: heightDimX - 4, y2: cy },
      { key: 'sphere-height-bottom', x1: cx - r - 2, y1: groundY, x2: heightDimX - 4, y2: groundY },
      { key: 'sphere-diameter-left', x1: cx - r, y1: cy - r - 100, x2: cx - r, y2: cy - r * 0.12 - 20 },
      { key: 'sphere-diameter-right', x1: cx + r, y1: cy - r - 100, x2: cx + r, y2: cy - r * 0.12 - 20 },
    ]

    const annotations: TankSchematicAnnotation[] = [
      ...(bottomHeight > 0
        ? [{
            key: 'center-line-level',
            label: `Center line level ${fmtM(bottomHeight)}`,
            x1: heightDimX,
            y1: cy,
            x2: heightDimX,
            y2: groundY,
            vertical: true,
            labelSide: 'start' as const,
          }]
        : []),
      {
        key: 'sphere-diameter',
        label: `D ${fmtM(diameter)}`,
        x1: cx - r,
        y1: diameterDimY,
        x2: cx + r,
        y2: diameterDimY,
      },
    ]

    return {
      width,
      height,
      tankType,
      clipPath: {
        id: 'tankSphereClip',
        circle: { key: 'tankSphereClipCircle', cx, cy, r },
      },
      liquidFill: ll != null && ll > 0
        ? { key: 'sphere-liquid-fill', x: 0, y: levelY(ll) ?? 0, width, height }
        : undefined,
      outlines: {
        paths: [],
        rects: [],
        circles: [{ key: 'sphere-outline', cx, cy, r }],
        lines: [
          { key: 'sphere-leg-left', x1: cx - r, y1: cy, x2: cx - r, y2: groundY, strokeWidth: 2 },
          { key: 'sphere-leg-right', x1: cx + r, y1: cy, x2: cx + r, y2: groundY, strokeWidth: 2 },
          { key: 'sphere-ground', x1: cx - r - 28, y1: groundY, x2: cx + r + 28, y2: groundY, strokeWidth: 1.5, dashed: '4 3', opacity: 0.8 },
        ],
      },
      guideLines,
      levels,
      annotations,
      legend: {
        showLiquid: true,
        showLegs: true,
        showGround: true,
      },
      subtitle: 'Spherical tank',
    }
  }

  if (!shellHeight || shellHeight <= 0) {
    return null
  }

  const roofHeightUsed = roofType === TankRoofType.FLAT ? 0 : roofHeight
  const totalH = shellHeight + roofHeightUsed
  const scale = Math.min(maxW / diameter, maxH / Math.max(totalH, 1))
  const bodyW = diameter * scale
  const bodyH = shellHeight * scale
  const roofH = roofHeightUsed * scale
  const x0 = (width - bodyW) / 2
  const y0 = (height - (bodyH + roofH)) / 2 + roofH
  const tankHeightDimX = x0 - 24
  const tankRoofDimX = tankHeightDimX
  const tankDiameterDimY = y0 + bodyH + 22

  const roofPath = roofType === TankRoofType.CONE
    ? `M ${x0},${y0} L ${x0 + bodyW / 2},${y0 - roofH} L ${x0 + bodyW},${y0}`
    : roofType === TankRoofType.DOME
      ? `M ${x0},${y0} Q ${x0 + bodyW / 2},${y0 - roofH * 1.6} ${x0 + bodyW},${y0}`
      : `M ${x0},${y0} L ${x0 + bodyW},${y0}`

  const maxLevel = shellHeight + roofHeightUsed
  const levelY = (levelMm?: number) => {
    if (levelMm == null || Number.isNaN(levelMm)) return undefined
    const clamped = Math.max(0, Math.min(levelMm, maxLevel))
    return y0 + bodyH - (clamped / Math.max(maxLevel, 1)) * (bodyH + roofH)
  }

  const levels = buildLevels({
    levelValues: { ll, hll, lll, ofl },
    levelY,
    x0,
    x1: x0 + bodyW,
    labelOffset: 22,
  })

  const guideLines: LineSpec[] = [
    { key: 'tank-diameter-left', x1: x0, y1: y0 + bodyH, x2: x0, y2: tankDiameterDimY - 4 },
    { key: 'tank-diameter-right', x1: x0 + bodyW, y1: y0 + bodyH, x2: x0 + bodyW, y2: tankDiameterDimY - 4 },
    { key: 'tank-height-top', x1: x0 - 2, y1: y0, x2: tankHeightDimX - 4, y2: y0 },
    { key: 'tank-height-bottom', x1: x0 - 2, y1: y0 + bodyH, x2: tankHeightDimX - 4, y2: y0 + bodyH },
    ...(roofH > 0
      ? [
          { key: 'tank-roof-top', x1: x0 - 2, y1: y0 - roofH, x2: tankRoofDimX - 4, y2: y0 - roofH },
          { key: 'tank-roof-bottom', x1: x0 - 2, y1: y0, x2: tankRoofDimX - 4, y2: y0 },
        ]
      : []),
  ]

  const annotations: TankSchematicAnnotation[] = [
    {
      key: 'tank-diameter',
      label: `D ${fmtM(diameter)}`,
      x1: x0,
      y1: tankDiameterDimY,
      x2: x0 + bodyW,
      y2: tankDiameterDimY,
    },
    {
      key: 'tank-height',
      label: `H ${fmtM(shellHeight)}`,
      x1: tankHeightDimX,
      y1: y0,
      x2: tankHeightDimX,
      y2: y0 + bodyH,
      vertical: true,
      labelSide: 'start',
    },
    ...(roofH > 0
      ? [{
          key: 'tank-roof-height',
          label: `Roof ${fmtM(roofHeightUsed)}`,
          x1: tankRoofDimX,
          y1: y0 - roofH,
          x2: tankRoofDimX,
          y2: y0,
          vertical: true,
          labelSide: 'start' as const,
        }]
      : []),
  ]

  return {
    width,
    height,
    tankType,
    clipPath: {
      id: 'tankTopRoofClip',
      path: `${roofPath} L ${x0 + bodyW},${y0 + bodyH} L ${x0},${y0 + bodyH} Z`,
    },
    liquidFill: ll != null && ll > 0
      ? { key: 'tank-liquid-fill', x: 0, y: levelY(ll) ?? 0, width, height }
      : undefined,
    outlines: {
      paths: [{ key: 'tank-roof-outline', d: roofPath }],
      rects: [{ key: 'tank-body-outline', x: x0, y: y0, width: bodyW, height: bodyH }],
      circles: [],
      lines: [{ key: 'tank-bottom-outline', x1: x0, y1: y0 + bodyH, x2: x0 + bodyW, y2: y0 + bodyH, strokeWidth: 2 }],
    },
    guideLines,
    levels,
    annotations,
    legend: {
      showLiquid: false,
      showLegs: false,
      showGround: false,
    },
    subtitle: `Top roof tank · ${roofType}`,
  }
}

function buildLevels({
  levelValues,
  levelY,
  x0,
  x1,
  labelOffset,
}: {
  levelValues: {
    ll?: number
    hll?: number
    lll?: number
    ofl?: number
  }
  levelY: (levelMm?: number) => number | undefined
  x0: number
  x1: number
  labelOffset: number
}): TankSchematicLevel[] {
  const entries = [
    { key: 'll', name: 'LL' as const, value: levelValues.ll, color: '#38bdf8', dashed: false },
    { key: 'hll', name: 'HLL' as const, value: levelValues.hll, color: '#22c55e', dashed: true },
    { key: 'lll', name: 'LLL' as const, value: levelValues.lll, color: '#f59e0b', dashed: true },
    { key: 'ofl', name: 'OFL' as const, value: levelValues.ofl, color: '#ef4444', dashed: true },
  ]

  return entries
    .map((entry) => {
      const y = levelY(entry.value)
      if (y === undefined) return null
      return {
        key: entry.key,
        name: entry.name,
        label: `${entry.name} ${fmtM(entry.value)}`,
        color: entry.color,
        y,
        x0,
        x1,
        labelOffset,
        dashed: entry.dashed,
      }
    })
    .filter((level): level is TankSchematicLevel => level !== null)
}
