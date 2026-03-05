import { z } from "zod"

/**
 * Common Zod helpers for Nan-tolerant optional numeric fields.
 */
export const nanOptional = z.number().optional().or(z.nan().transform(() => undefined))
export const nanOptionalPositive = z.number().positive().optional().or(z.nan().transform(() => undefined))

/**
 * calculationInputSchema — always validates values in BASE UNITS.
 */
export const calculationInputSchema = z.object({
  tag: z.string().min(1, "Tag is required"),
  description: z.string().optional(),
  
  // Numeric fields in base units
  pressure: z.number({ required_error: "Pressure is required" }),
  temperature: z.number({ required_error: "Temperature is required" }),
  length: z.number().positive("Length must be positive"),
  flowrate: z.number().nonnegative("Flowrate cannot be negative"),

  category: z.enum(["A", "B", "C"]).default("A"),
})
