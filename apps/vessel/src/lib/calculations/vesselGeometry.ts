import { HeadType } from '@/types'
import {
  torisphericalHeadDepthMm,
  torisphericalHeadVolumeMm3,
  torisphericalHeadWettedAreaMm2,
} from './torispherical'

export function autoHeadDepth(headType: HeadType, insideDiameterMm: number): number {
  switch (headType) {
    case HeadType.FLAT:
      return 0
    case HeadType.ELLIPSOIDAL_2_1:
      return insideDiameterMm / 4
    case HeadType.HEMISPHERICAL:
      return insideDiameterMm / 2
    case HeadType.TORISPHERICAL_80_10:
      return torisphericalHeadDepthMm(insideDiameterMm)
    case HeadType.CONICAL:
      return NaN
  }
}

export function shellVolume(insideDiameterMm: number, shellLengthMm: number): number {
  const r = insideDiameterMm / 2
  return (Math.PI * r * r * shellLengthMm) / 1e9
}

export function shellSurfaceArea(insideDiameterMm: number, shellLengthMm: number): number {
  return (Math.PI * insideDiameterMm * shellLengthMm) / 1e6
}

export function singleHeadVolume(
  headType: HeadType,
  insideDiameterMm: number,
  headDepthMm: number,
): number {
  const r = insideDiameterMm / 2

  switch (headType) {
    case HeadType.FLAT:
      return 0

    case HeadType.HEMISPHERICAL:
      return (2 / 3) * Math.PI * (r ** 3) / 1e9

    case HeadType.ELLIPSOIDAL_2_1: {
      const h = insideDiameterMm / 4
      return (Math.PI / 6) * (insideDiameterMm ** 2) * h / 1e9
    }

    case HeadType.TORISPHERICAL_80_10:
      return torisphericalHeadVolumeMm3(insideDiameterMm) / 1e9

    case HeadType.CONICAL:
      return (Math.PI / 3) * (r ** 2) * headDepthMm / 1e9
  }
}

export function singleHeadSurfaceArea(
  headType: HeadType,
  insideDiameterMm: number,
  headDepthMm: number,
): number {
  const r = insideDiameterMm / 2

  switch (headType) {
    case HeadType.FLAT:
      return Math.PI * (r ** 2) / 1e6

    case HeadType.HEMISPHERICAL:
      return 2 * Math.PI * (r ** 2) / 1e6

    case HeadType.ELLIPSOIDAL_2_1: {
      const a = r
      const b = insideDiameterMm / 4
      const e = Math.sqrt(1 - (b / a) ** 2)
      const A = 2 * Math.PI * a * a * (1 + ((b * b) / (a * a * e)) * Math.asin(e)) / 2
      return A / 1e6
    }

    case HeadType.TORISPHERICAL_80_10:
      return torisphericalHeadWettedAreaMm2(insideDiameterMm) / 1e6

    case HeadType.CONICAL: {
      const slant = Math.sqrt((r ** 2) + (headDepthMm ** 2))
      return Math.PI * r * slant / 1e6
    }
  }
}
