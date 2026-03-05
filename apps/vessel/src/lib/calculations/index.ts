import {
  EquipmentMode,
  HeadType,
  TankRoofType,
  TankType,
  VesselOrientation,
} from '@/types'
import type { CalculationInput, CalculationResult } from '@/types'
import {
  autoHeadDepth,
  shellVolume,
  shellSurfaceArea,
  singleHeadVolume,
  singleHeadSurfaceArea,
} from './vesselGeometry'
import { partialVolume, headPartialVolume, circularSegmentArea } from './partialVolume'
import {
  torisphericalHeadPartialWettedAreaMm2,
  torisphericalHorizontalHeadPartialVolumeMm3,
  torisphericalHorizontalHeadPartialWettedAreaMm2,
} from './torispherical'
import { STEEL_DENSITY_KG_M3, WETTED_AREA_HEIGHT_CAP_MM } from '@/lib/constants'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

function sphereCapVolume(radiusMm: number, levelMm: number): number {
  const h = clamp(levelMm, 0, 2 * radiusMm)
  return (Math.PI * h * h * (3 * radiusMm - h)) / 3 / 1e9
}

function sphereCapArea(radiusMm: number, levelMm: number): number {
  const h = clamp(levelMm, 0, 2 * radiusMm)
  return (2 * Math.PI * radiusMm * h) / 1e6
}

function domeSphereRadius(baseRadiusMm: number, capHeightMm: number): number {
  return (baseRadiusMm * baseRadiusMm + capHeightMm * capHeightMm) / (2 * capHeightMm)
}

function tankTopRoofRoofVolume(
  roofType: TankRoofType,
  radiusMm: number,
  roofHeightMm: number,
): number {
  if (roofType === TankRoofType.FLAT) return 0
  if (roofType === TankRoofType.CONE) {
    return (Math.PI * radiusMm * radiusMm * roofHeightMm) / 3 / 1e9
  }
  const R = domeSphereRadius(radiusMm, roofHeightMm)
  return (Math.PI * roofHeightMm * roofHeightMm * (3 * R - roofHeightMm)) / 3 / 1e9
}

function tankTopRoofRoofArea(
  roofType: TankRoofType,
  radiusMm: number,
  roofHeightMm: number,
): number {
  if (roofType === TankRoofType.FLAT) return (Math.PI * radiusMm * radiusMm) / 1e6
  if (roofType === TankRoofType.CONE) {
    return (Math.PI * radiusMm * Math.sqrt(radiusMm * radiusMm + roofHeightMm * roofHeightMm)) / 1e6
  }
  const R = domeSphereRadius(radiusMm, roofHeightMm)
  return (2 * Math.PI * R * roofHeightMm) / 1e6
}

function tankTopRoofPartialRoofVolume(
  roofType: TankRoofType,
  radiusMm: number,
  roofHeightMm: number,
  roofFillMm: number,
): number {
  const x = clamp(roofFillMm, 0, roofHeightMm)
  if (x <= 0) return 0
  if (roofType === TankRoofType.FLAT) return 0
  if (roofType === TankRoofType.CONE) {
    return (
      Math.PI *
      radiusMm *
      radiusMm *
      (x - (x * x) / roofHeightMm + (x * x * x) / (3 * roofHeightMm * roofHeightMm))
    ) / 1e9
  }
  const R = domeSphereRadius(radiusMm, roofHeightMm)
  return (Math.PI * x * x * (3 * R - x)) / 3 / 1e9
}

function tankTopRoofPartialRoofWettedArea(
  roofType: TankRoofType,
  radiusMm: number,
  roofHeightMm: number,
  roofFillMm: number,
): number {
  const x = clamp(roofFillMm, 0, roofHeightMm)
  if (x <= 0) return 0
  if (roofType === TankRoofType.FLAT) return (Math.PI * radiusMm * radiusMm) / 1e6
  if (roofType === TankRoofType.CONE) {
    const s = Math.sqrt(radiusMm * radiusMm + roofHeightMm * roofHeightMm)
    const rx = radiusMm * (1 - x / roofHeightMm)
    const lx = (x / roofHeightMm) * s
    return (Math.PI * (radiusMm + rx) * lx) / 1e6
  }
  const R = domeSphereRadius(radiusMm, roofHeightMm)
  return (2 * Math.PI * R * x) / 1e6
}

function computeTankResult(input: CalculationInput): CalculationResult {
  const tankType = input.tankType ?? TankType.TOP_ROOF
  const D = input.insideDiameter
  const r = D / 2
  const shellH = input.shellLength ?? 0
  const roofType = input.tankRoofType ?? TankRoofType.FLAT
  const roofHeight = roofType === TankRoofType.FLAT ? 0 : (input.roofHeight ?? 0)
  const wallThickness = input.wallThickness
  const liquidLevel = input.liquidLevel
  const hll = input.hll
  const lll = input.lll
  const ofl = input.ofl
  const density = input.density
  const flowrate = input.flowrate

  let headVolume = 0
  let shellVol = 0
  let totalVol = 0
  let tangentVol = 0
  let headSurfaceArea = 0
  let shellSA = 0
  let totalSA = 0
  let partialAt: (levelMm: number) => number
  let wettedAt: (levelMm: number) => number
  let maxLevel = 0
  let massEmpty: number | null = null
  let headDepthUsed = 0

  if (tankType === TankType.SPHERICAL) {
    totalVol = (4 * Math.PI * r * r * r) / 3 / 1e9
    headVolume = totalVol
    shellVol = 0
    tangentVol = 0
    totalSA = (4 * Math.PI * r * r) / 1e6
    headSurfaceArea = totalSA
    shellSA = 0
    maxLevel = D
    headDepthUsed = r
    partialAt = (levelMm) => sphereCapVolume(r, levelMm)
    wettedAt = (levelMm) => sphereCapArea(r, levelMm)
    if (wallThickness != null && isFinite(wallThickness) && wallThickness > 0) {
      const metalVol = totalSA * 1e6 * wallThickness / 1e9
      massEmpty = metalVol * STEEL_DENSITY_KG_M3
    }
  } else {
    const bottomArea = (Math.PI * r * r) / 1e6
    shellVol = (Math.PI * r * r * shellH) / 1e9
    const roofVol = tankTopRoofRoofVolume(roofType, r, roofHeight)
    totalVol = shellVol + roofVol
    headVolume = roofVol
    tangentVol = shellVol
    shellSA = (Math.PI * D * shellH) / 1e6
    const roofArea = tankTopRoofRoofArea(roofType, r, roofHeight)
    headSurfaceArea = roofArea + bottomArea
    totalSA = shellSA + headSurfaceArea
    maxLevel = shellH + roofHeight
    headDepthUsed = roofHeight

    partialAt = (levelMm) => {
      const level = clamp(levelMm, 0, maxLevel)
      if (level <= shellH) return (Math.PI * r * r * level) / 1e9
      return shellVol + tankTopRoofPartialRoofVolume(roofType, r, roofHeight, level - shellH)
    }

    wettedAt = (levelMm) => {
      const level = clamp(levelMm, 0, maxLevel)
      if (level <= 0) return 0
      if (level < shellH) return bottomArea + (Math.PI * D * level) / 1e6
      const roofWetted = tankTopRoofPartialRoofWettedArea(roofType, r, roofHeight, level - shellH)
      return bottomArea + shellSA + roofWetted
    }

    if (wallThickness != null && isFinite(wallThickness) && wallThickness > 0) {
      const metalVol = totalSA * 1e6 * wallThickness / 1e9
      massEmpty = metalVol * STEEL_DENSITY_KG_M3
    }
  }

  const partialVol =
    liquidLevel != null && isFinite(liquidLevel)
      ? partialAt(liquidLevel)
      : null

  const oflVol =
    ofl != null && isFinite(ofl)
      ? partialAt(ofl)
      : totalVol

  let workingVol = 0
  if (hll != null && lll != null && isFinite(hll) && isFinite(lll)) {
    workingVol = Math.max(0, partialAt(hll) - partialAt(lll))
  }

  const overflowVol = ofl != null && isFinite(ofl) ? Math.max(0, totalVol - oflVol) : 0

  let wettedSA = 0
  if (liquidLevel != null && isFinite(liquidLevel)) {
    const wettedLevel = Math.min(liquidLevel, WETTED_AREA_HEIGHT_CAP_MM)
    wettedSA = clamp(wettedAt(wettedLevel), 0, totalSA)
  }

  const massLiquid =
    density != null && isFinite(density) && partialVol != null
      ? partialVol * density
      : null

  const massFull =
    density != null && isFinite(density)
      ? totalVol * density
      : null

  let surgeTime: number | null = null
  let inventory: number | null = null

  if (
    flowrate != null && isFinite(flowrate) && flowrate > 0 &&
    hll != null && lll != null && isFinite(hll) && isFinite(lll)
  ) {
    const deltaVol = Math.abs(partialAt(hll) - partialAt(lll))
    surgeTime = deltaVol / flowrate
    inventory = deltaVol / flowrate
  }

  return {
    volumes: {
      headVolume,
      shellVolume: shellVol,
      totalVolume: totalVol,
      tangentVolume: tangentVol,
      effectiveVolume: oflVol,
      workingVolume: workingVol,
      overflowVolume: overflowVol,
      partialVolume: partialVol,
    },
    surfaceAreas: {
      headSurfaceArea,
      shellSurfaceArea: shellSA,
      totalSurfaceArea: totalSA,
      wettedSurfaceArea: wettedSA,
    },
    masses: {
      massEmpty,
      massLiquid,
      massFull,
    },
    timing: {
      surgeTime,
      inventory,
    },
    headDepthUsed,
    calculatedAt: new Date().toISOString(),
  }
}

function computeProcessVesselResult(input: CalculationInput): CalculationResult {
  const {
    orientation = VesselOrientation.VERTICAL,
    headType = HeadType.ELLIPSOIDAL_2_1,
    insideDiameter,
    shellLength = 0,
    wallThickness,
    headDepth: headDepthOverride,
    liquidLevel,
    hll,
    lll,
    ofl,
    density,
    flowrate,
  } = input

  const headDepthUsed: number =
    headType === HeadType.CONICAL
      ? (headDepthOverride ?? 0)
      : (autoHeadDepth(headType, insideDiameter))

  const shellVol = shellVolume(insideDiameter, shellLength)
  const headVol2x = singleHeadVolume(headType, insideDiameter, headDepthUsed) * 2
  const totalVol = shellVol + headVol2x

  const partialAtLevel = (levelMm: number): number => {
    if (orientation === VesselOrientation.HORIZONTAL && headType === HeadType.TORISPHERICAL_80_10) {
      const r = insideDiameter / 2
      const level = Math.max(0, Math.min(levelMm, 2 * r))
      const shellPartial = (circularSegmentArea(r, level) * shellLength) / 1e9
      const headPartial = torisphericalHorizontalHeadPartialVolumeMm3(insideDiameter, level) / 1e9 * 2
      return shellPartial + headPartial
    }
    return partialVolume(orientation, headType, insideDiameter, shellLength, headDepthUsed, levelMm)
  }

  const oflVol =
    ofl != null && isFinite(ofl)
      ? partialAtLevel(ofl)
      : totalVol

  let workingVol = 0
  if (hll != null && lll != null && isFinite(hll) && isFinite(lll)) {
    const vHll = partialAtLevel(hll)
    const vLll = partialAtLevel(lll)
    workingVol = Math.max(0, vHll - vLll)
  }

  const overflowVol = ofl != null && isFinite(ofl) ? Math.max(0, totalVol - oflVol) : 0

  const partialVol =
    liquidLevel != null && isFinite(liquidLevel)
      ? partialAtLevel(liquidLevel)
      : null

  const shellSA = shellSurfaceArea(insideDiameter, shellLength)
  const headSA2x = singleHeadSurfaceArea(headType, insideDiameter, headDepthUsed) * 2
  const totalSA = shellSA + headSA2x

  let wettedSA = 0
  if (liquidLevel != null && isFinite(liquidLevel)) {
    const wettedLevel = Math.min(liquidLevel, WETTED_AREA_HEIGHT_CAP_MM)
    const D = insideDiameter
    const c = headDepthUsed
    const singleHeadSA = singleHeadSurfaceArea(headType, D, c)
    const fullSingleHeadVol = singleHeadVolume(headType, D, c)

    if (orientation === VesselOrientation.VERTICAL) {
      const level = Math.max(0, Math.min(wettedLevel, headDepthUsed + shellLength + headDepthUsed))
      const bottomFill = Math.min(level, c)
      const bottomWettedSA =
        headType === HeadType.TORISPHERICAL_80_10
          ? torisphericalHeadPartialWettedAreaMm2(D, bottomFill) / 1e6
          : (() => {
            const bottomHeadFillVol = headPartialVolume(headType, D, c, bottomFill)
            const bottomHeadFrac = fullSingleHeadVol > 0 ? bottomHeadFillVol / fullSingleHeadVol : 0
            return bottomHeadFrac * singleHeadSA
          })()
      const shellFill = Math.max(0, Math.min(level - c, shellLength))
      const shellWetted = Math.PI * D * shellFill / 1e6
      const topFill = Math.max(0, level - c - shellLength)
      const topWettedSA =
        headType === HeadType.TORISPHERICAL_80_10
          ? torisphericalHeadPartialWettedAreaMm2(D, topFill) / 1e6
          : (() => {
            const topHeadFillVol = headPartialVolume(headType, D, c, topFill)
            const topHeadFrac = fullSingleHeadVol > 0 ? topHeadFillVol / fullSingleHeadVol : 0
            return topHeadFrac * singleHeadSA
          })()
      wettedSA = bottomWettedSA + shellWetted + topWettedSA
    } else {
      const r = D / 2
      const level = Math.max(0, Math.min(wettedLevel, 2 * r))
      if (level > 0) {
        const arcAngle = level < 2 * r
          ? 2 * Math.acos((r - level) / r)
          : 2 * Math.PI
        const shellWetted = (arcAngle / (2 * Math.PI)) * shellSA
        if (headType === HeadType.TORISPHERICAL_80_10) {
          const headWetted = torisphericalHorizontalHeadPartialWettedAreaMm2(D, level) / 1e6
          wettedSA = shellWetted + headWetted * 2
        } else {
          const totalCircleArea = Math.PI * r * r
          const segArea = circularSegmentArea(r, level)
          const headFrac = totalCircleArea > 0 ? segArea / totalCircleArea : 0
          wettedSA = shellWetted + headFrac * singleHeadSA * 2
        }
      }
    }

    wettedSA = Math.max(0, Math.min(wettedSA, totalSA))
  }

  let massEmpty: number | null = null
  if (wallThickness != null && isFinite(wallThickness) && wallThickness > 0) {
    const od = insideDiameter + 2 * wallThickness
    const shellVolMetal =
      (Math.PI / 4) * ((od ** 2) - (insideDiameter ** 2)) * shellLength / 1e9
    const headVolMetal = headVol2x * 0.1
    massEmpty = (shellVolMetal + headVolMetal) * STEEL_DENSITY_KG_M3
  }

  const massLiquid =
    density != null && isFinite(density) && partialVol != null
      ? partialVol * density
      : null

  const massFull =
    density != null && isFinite(density)
      ? totalVol * density
      : null

  let surgeTime: number | null = null
  let inventory: number | null = null

  if (
    flowrate != null && isFinite(flowrate) && flowrate > 0 &&
    hll != null && lll != null && isFinite(hll) && isFinite(lll)
  ) {
    const vHll = partialAtLevel(hll)
    const vLll = partialAtLevel(lll)
    const deltaVol = Math.abs(vHll - vLll)
    surgeTime = deltaVol / flowrate
    inventory = deltaVol / flowrate
  }

  return {
    volumes: {
      headVolume: headVol2x,
      shellVolume: shellVol,
      totalVolume: totalVol,
      tangentVolume: shellVol,
      effectiveVolume: oflVol,
      workingVolume: workingVol,
      overflowVolume: overflowVol,
      partialVolume: partialVol,
    },
    surfaceAreas: {
      headSurfaceArea: headSA2x,
      shellSurfaceArea: shellSA,
      totalSurfaceArea: totalSA,
      wettedSurfaceArea: wettedSA,
    },
    masses: {
      massEmpty,
      massLiquid,
      massFull,
    },
    timing: {
      surgeTime,
      inventory,
    },
    headDepthUsed,
    calculatedAt: new Date().toISOString(),
  }
}

export function computeVesselResult(input: CalculationInput): CalculationResult {
  if ((input.equipmentMode ?? EquipmentMode.VESSEL) === EquipmentMode.TANK) {
    return computeTankResult(input)
  }
  return computeProcessVesselResult(input)
}

export { autoHeadDepth, shellVolume, shellSurfaceArea, singleHeadVolume, singleHeadSurfaceArea }
export { partialVolume, headPartialVolume, circularSegmentArea } from './partialVolume'
