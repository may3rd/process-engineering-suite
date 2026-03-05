const FD_TORI = 0.8
const FK_TORI = 0.1

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

function clampUnit(value: number): number {
  return clamp(value, -1, 1)
}

function integrateSimpson(func: (x: number) => number, a: number, b: number, n = 400): number {
  if (a === b) return 0
  const steps = n % 2 === 0 ? n : n + 1
  const h = (b - a) / steps
  let sum = func(a) + func(b)
  for (let i = 1; i < steps; i += 1) {
    const x = a + i * h
    sum += (i % 2 === 0 ? 2 : 4) * func(x)
  }
  return (sum * h) / 3
}

function torisphericalGeometry() {
  const a1 = FD_TORI * (
    1 - Math.sqrt(
      1 - ((0.5 - FK_TORI) ** 2) / ((FD_TORI - FK_TORI) ** 2),
    )
  )

  const a2 = FD_TORI - Math.sqrt(
    FD_TORI ** 2 - 2 * FD_TORI * FK_TORI + FK_TORI - 0.25,
  )

  return { a1, a2 }
}

function torisphericalRadiusMm(diameterMm: number, u: number): number {
  const { a1, a2 } = torisphericalGeometry()
  const x = clamp(u, 0, a2)

  if (x <= a1) {
    const value = FD_TORI ** 2 - (x - FD_TORI) ** 2
    return value <= 0 ? 0 : diameterMm * Math.sqrt(value)
  }

  const value = FK_TORI ** 2 - (x - a2) ** 2
  return value <= 0 ? 0 : diameterMm * (0.5 - FK_TORI + Math.sqrt(value))
}

function torisphericalHeadCrossSectionAreaMm2(diameterMm: number, u: number): number {
  const radius = torisphericalRadiusMm(diameterMm, u)
  return Math.PI * radius * radius
}

export function torisphericalHeadDepthMm(diameterMm: number): number {
  return torisphericalGeometry().a2 * diameterMm
}

export function torisphericalHeadVolumeMm3(diameterMm: number): number {
  const { a2 } = torisphericalGeometry()
  return diameterMm * integrateSimpson(
    (u) => torisphericalHeadCrossSectionAreaMm2(diameterMm, u),
    0,
    a2,
  )
}

export function torisphericalHeadPartialVolumeMm3(diameterMm: number, fillFromTipMm: number): number {
  const { a2 } = torisphericalGeometry()
  const limit = clamp(fillFromTipMm / diameterMm, 0, a2)
  return diameterMm * integrateSimpson(
    (u) => torisphericalHeadCrossSectionAreaMm2(diameterMm, u),
    0,
    limit,
  )
}

export function torisphericalHeadWettedAreaMm2(diameterMm: number): number {
  const { a1, a2 } = torisphericalGeometry()
  const s1 = a1 <= 0 ? 0 : 2 * Math.PI * diameterMm * diameterMm * FD_TORI * Math.min(a2, a1)
  const s2 = 2 * Math.PI * diameterMm * diameterMm * FK_TORI * (
    a2 - a1 + (0.5 - FK_TORI) * (
      Math.asin(clampUnit((a2 - a2) / FK_TORI)) -
      Math.asin(clampUnit((a1 - a2) / FK_TORI))
    )
  )
  return Math.max(0, s1 + s2)
}

export function torisphericalHeadPartialWettedAreaMm2(diameterMm: number, fillFromTipMm: number): number {
  const { a1, a2 } = torisphericalGeometry()
  const a = clamp(fillFromTipMm / diameterMm, 0, a2)
  const s1 = a <= 0 ? 0 : 2 * Math.PI * diameterMm * diameterMm * FD_TORI * Math.min(a, a1)
  if (a <= a1) return s1

  const s2 = 2 * Math.PI * diameterMm * diameterMm * FK_TORI * (
    a - a1 + (0.5 - FK_TORI) * (
      Math.asin(clampUnit((a - a2) / FK_TORI)) -
      Math.asin(clampUnit((a1 - a2) / FK_TORI))
    )
  )
  return Math.max(0, s1 + s2)
}
