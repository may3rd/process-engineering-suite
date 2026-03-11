import { VesselOrientation, HeadType } from '@/types'
import { singleHeadVolume, shellVolume } from './vesselGeometry'
import { torisphericalHeadPartialVolumeMm3 } from './torispherical'

export function circularSegmentArea(rMm: number, hMm: number): number {
  if (hMm <= 0) return 0
  if (hMm >= 2 * rMm) return Math.PI * rMm * rMm
  const ratio = (rMm - hMm) / rMm
  return rMm * rMm * Math.acos(ratio) - (rMm - hMm) * Math.sqrt(2 * rMm * hMm - hMm * hMm)
}

export function headPartialVolume(
  headType: HeadType,
  diameterMm: number,
  headDepthMm: number,
  fillMm: number,
): number {
  const h = Math.max(0, Math.min(fillMm, headDepthMm))
  if (h <= 0 || headDepthMm <= 0) return 0

  const r = diameterMm / 2
  const c = headDepthMm

  switch (headType) {
    case HeadType.FLAT:
      return 0

    case HeadType.ELLIPSOIDAL_2_1:
      return Math.PI * r * r * (h * h / c - h * h * h / (3 * c * c)) / 1e9

    case HeadType.HEMISPHERICAL:
      return Math.PI * h * h * (r - h / 3) / 1e9

    case HeadType.CONICAL:
      return Math.PI * r * r * h * h * h / (3 * c * c) / 1e9

    case HeadType.TORISPHERICAL_80_10:
      return torisphericalHeadPartialVolumeMm3(diameterMm, h) / 1e9

    default:
      return 0
  }
}

export function partialVolume(
  orientation: VesselOrientation,
  headType: HeadType,
  insideDiameterMm: number,
  shellLengthMm: number,
  headDepthMm: number,
  levelMm: number,
): number {
  const r = insideDiameterMm / 2
  const fullShellVol = shellVolume(insideDiameterMm, shellLengthMm)
  const fullHeadVol = singleHeadVolume(headType, insideDiameterMm, headDepthMm)
  const totalVesselHeight = headDepthMm + shellLengthMm + headDepthMm

  if (levelMm <= 0) return 0

  if (orientation === VesselOrientation.VERTICAL) {
    if (levelMm >= totalVesselHeight) {
      return fullShellVol + 2 * fullHeadVol
    }

    if (levelMm <= headDepthMm) {
      return Math.max(0, headPartialVolume(headType, insideDiameterMm, headDepthMm, levelMm))
    }

    if (levelMm <= headDepthMm + shellLengthMm) {
      const shellFill = levelMm - headDepthMm
      const shellPartial = (Math.PI * r * r * shellFill) / 1e9
      return Math.max(0, fullHeadVol + shellPartial)
    }

    const fillFromTopTangent = levelMm - headDepthMm - shellLengthMm
    const topHeadVol = headPartialVolume(headType, insideDiameterMm, headDepthMm, fillFromTopTangent)
    return Math.max(0, fullHeadVol + fullShellVol + topHeadVol)
  }

  if (levelMm >= 2 * r) {
    return fullShellVol + 2 * fullHeadVol
  }

  const A_seg = circularSegmentArea(r, levelMm)
  const shellPartial = (A_seg * shellLengthMm) / 1e9

  const totalCircleArea = Math.PI * r * r
  const headFraction = totalCircleArea > 0 ? A_seg / totalCircleArea : 0
  const headPartial = headFraction * fullHeadVol * 2

  return Math.max(0, shellPartial + headPartial)
}
