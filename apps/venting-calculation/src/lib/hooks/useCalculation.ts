"use client"

import { useEffect, useRef } from "react"
import { useWatch } from "react-hook-form"
import type { Control } from "react-hook-form"
import { z } from "zod"
import { calculationInputSchema } from "@/lib/validation/inputSchema"
import { computeDerivedGeometry } from "@/lib/calculations/geometry"
import { useCalculatorStore } from "@/lib/store/calculatorStore"
import { TankConfiguration } from "@/types"
import type { CalculationInput, CalculationResult } from "@/types"

// Minimal schema covering only the fields needed for client-side geometry.
// This allows the Derived Geometry panel to update as soon as tank dimensions
// are valid, without waiting for fluid properties to be filled in.
// NaN-tolerant optional number: treats NaN (from valueAsNumber on empty inputs) as absent.
const nanOptionalPositive = z
  .number()
  .positive()
  .optional()
  .or(z.nan().transform(() => undefined))

const nanOptionalNonneg = z
  .number()
  .nonnegative()
  .optional()
  .or(z.nan().transform(() => undefined))

const geometrySchema = z
  .object({
    diameter: z.number().positive(),
    height: z.number().positive(),
    latitude: z.number().gt(0).lte(90),
    designPressure: z.number().positive(),
    tankConfiguration: z.nativeEnum(TankConfiguration),
    insulationThickness: nanOptionalPositive,
    insulationConductivity: nanOptionalPositive,
    insideHeatTransferCoeff: nanOptionalPositive,
    insulatedSurfaceArea: nanOptionalNonneg,
  })
  .passthrough()

/** Milliseconds of inactivity before the API call fires. */
const DEBOUNCE_MS = 300

/**
 * Convert empty-string sentinels back to `undefined` before schema parsing.
 *
 * React Hook Form's `valueAsNumber: true` turns an empty `<input type="number">`
 * into `NaN` at runtime, which `nanOptionalPositive` handles. However, on
 * `form.reset()` the `NUMERIC = "" as unknown as number` sentinel stores a real
 * `""` string in the form state (not `NaN`). Both `z.number()` and `z.nan()`
 * reject `""`, so `safeParse` fails silently until the user types a value.
 *
 * This helper converts any `""` leaf values to `undefined` so the Zod schemas
 * work correctly with the sentinel immediately after a reset.
 */
function normalizeNumericSentinels(values: Record<string, unknown>): Record<string, unknown> {
  const numericKeys = new Set([
    "diameter",
    "height",
    "latitude",
    "designPressure",
    "insulationThickness",
    "insulationConductivity",
    "insideHeatTransferCoeff",
    "insulatedSurfaceArea",
    "avgStorageTemp",
    "vapourPressure",
    "flashBoilingPoint",
    "latentHeat",
    "relievingTemperature",
    "molecularMass",
    "drainLineSize",
    "maxHeightAboveDrain",
    "flowrate",
  ])

  const normalizeValue = (key: string, value: unknown): unknown => {
    if (value === "" || value === null) return undefined
    if (typeof value === "string" && numericKeys.has(key)) {
      const trimmed = value.trim()
      if (trimmed.length === 0) return undefined
      const parsed = Number(trimmed)
      return Number.isFinite(parsed) ? parsed : value
    }
    if (Array.isArray(value)) {
      const mapped = value
        .map((item) => normalizeValue(key, item))
        .filter((item) => item !== undefined)
      if (key === "incomingStreams" || key === "outgoingStreams") {
        return mapped.filter((row) => {
          if (typeof row !== "object" || row === null) return false
          const record = row as Record<string, unknown>
          const streamNo = typeof record.streamNo === "string" ? record.streamNo.trim() : ""
          const description = typeof record.description === "string" ? record.description.trim() : ""
          const hasFlowrate = typeof record.flowrate === "number" && Number.isFinite(record.flowrate)
          return streamNo.length > 0 || description.length > 0 || hasFlowrate
        })
      }
      return mapped
    }
    if (typeof value === "object") {
      const mapped: Record<string, unknown> = {}
      for (const [subKey, subVal] of Object.entries(value as Record<string, unknown>)) {
        mapped[subKey] = normalizeValue(subKey, subVal)
      }
      return mapped
    }
    return value
  }

  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(values)) {
    out[key] = normalizeValue(key, val)
  }
  return out
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * `useCalculation` wires a React Hook Form control to the Zustand calculator
 * store, providing two layers of reactivity:
 *
 * 1. **Immediate** — derived geometry (volume, surface areas, reduction factor)
 *    is recomputed client-side on every valid keystroke, so the "Derived
 *    Geometry" panel stays in sync without waiting for the API.
 *
 * 2. **Debounced (300 ms)** — once the form has been idle for 300 ms and all
 *    fields are valid, a POST to /api/vent/calculate is made.  In-flight
 *    requests are cancelled when a newer change arrives (via AbortController).
 *
 * Usage:
 * ```tsx
 * const form = useForm<CalculationInput>({ ... })
 * useCalculation(form.control)
 * ```
 */
export function useCalculation(control: Control<CalculationInput>) {
  const { setDerivedGeometry, setCalculationResult, setLoading, setError, setValidationIssues } =
    useCalculatorStore()

  // useWatch re-renders this hook only when the watched values change.
  // Returning a stable object reference per React Hook Form conventions.
  const formValues = useWatch({ control })

  // Ref for the in-flight AbortController — lives outside the render cycle.
  const abortRef = useRef<AbortController | null>(null)

  // ── Immediate: client-side derived geometry ────────────────────────────────
  useEffect(() => {
    const parsed = geometrySchema.safeParse(normalizeNumericSentinels(formValues as Record<string, unknown>))
    if (!parsed.success) {
      setDerivedGeometry(null)
      return
    }
    try {
      setDerivedGeometry(computeDerivedGeometry(parsed.data as unknown as CalculationInput))
    } catch {
      // e.g. INSULATED_FULL without insulation params — not yet fatal, just clear
      setDerivedGeometry(null)
    }
    // formValues identity changes whenever any field changes — that's the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(formValues)])

  // ── Debounced: API call ────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(async () => {
      const normalized = normalizeNumericSentinels(formValues as Record<string, unknown>)
      const parsed = calculationInputSchema.safeParse(normalized)
      if (!parsed.success) {
        // Form is incomplete or has validation issues — clear stale results.
        abortRef.current?.abort()
        abortRef.current = null
        setLoading(false)
        setError(null)
        setCalculationResult(null)

        // Only surface Zod validation issues when the form has substantial data
        // (basic required fields present). When the form is mostly empty, let the
        // RequirementsChecklist guide the user instead.
        const hasBasicFields =
          typeof normalized.tankNumber === "string" &&
          (normalized.tankNumber as string).trim().length > 0 &&
          typeof normalized.diameter === "number" &&
          Number.isFinite(normalized.diameter as number) &&
          typeof normalized.height === "number" &&
          Number.isFinite(normalized.height as number) &&
          typeof normalized.avgStorageTemp === "number" &&
          Number.isFinite(normalized.avgStorageTemp as number)

        setValidationIssues(
          hasBasicFields
            ? parsed.error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
              }))
            : null
        )
        return
      }

      // Parse succeeded — clear any previous validation issues
      setValidationIssues(null)

      // Cancel any previous in-flight request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      setError(null)

      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
        const response = await fetch(`${basePath}/api/vent/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
          signal: controller.signal,
        })

        if (controller.signal.aborted) return

        if (!response.ok) {
          const body = (await response.json()) as { error?: string }
          setError(body.error ?? "Calculation failed — please check your inputs")
          setCalculationResult(null)
        } else {
          const result = (await response.json()) as CalculationResult
          setCalculationResult(result)
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        setError("Network error — please try again")
        setCalculationResult(null)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(formValues)])

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])
}
