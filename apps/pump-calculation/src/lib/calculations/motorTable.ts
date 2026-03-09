/**
 * IEC standard motor power ratings (kW).
 * Source: PD.md §6 — motor rounding ladder (37 sizes, 0.37–1000 kW).
 */
export const STANDARD_MOTOR_KW: readonly number[] = [
  0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5,
  11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90,
  110, 132, 150, 185, 200, 220, 250, 280, 315, 355,
  400, 450, 500, 560, 630, 710, 800, 900, 1000,
]

/**
 * Returns the smallest standard motor rating ≥ requiredKw.
 * If requiredKw exceeds all standard sizes, returns the last (largest) size.
 */
export function nextStandardMotor(requiredKw: number): number {
  for (const kw of STANDARD_MOTOR_KW) {
    if (kw >= requiredKw) return kw
  }
  return STANDARD_MOTOR_KW[STANDARD_MOTOR_KW.length - 1]!
}
