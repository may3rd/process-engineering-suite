import { z } from 'zod'
import { TankRoofType } from '@/types'

/**
 * Zod schema for heat transfer calculation input validation.
 * All numeric fields validated in base units.
 *
 * Base units:
 *   length: mm, temperature: °C, velocity: m/s,
 *   thermalConductivity: W/(m·K), density: kg/m³,
 *   specificHeat: J/(kg·K), viscosity: Pa·s,
 *   expansionCoeff: 1/K, area: m², power: W
 */

export const calculationInputSchema = z.object({
  // Identification
  tag: z.string().min(1, "Tag is required"),
  description: z.string().optional(),

  // Tank geometry (mm)
  tankDiameter: z.number().positive("Tank diameter must be positive"),
  tankHeight: z.number().positive("Tank height must be positive"),
  liquidLevel: z.number().min(0, "Liquid level cannot be negative"),

  // Tank roof
  tankRoofType: z.nativeEnum(TankRoofType).optional(),
  roofHeight: z.number().min(0).optional(),

  // Operating conditions
  fluidTemp: z.number({ error: "Fluid temperature is required" }),
  ambientTemp: z.number({ error: "Ambient temperature is required" }),
  windSpeed: z.number().min(0, "Wind speed cannot be negative"),

  // Wall construction
  wallThickness: z.number().positive("Wall thickness must be positive"),
  wallConductivity: z.number().positive("Wall conductivity must be positive"),
  insulationThickness: z.number().min(0, "Insulation thickness cannot be negative"),
  insulationConductivity: z.number().min(0, "Insulation conductivity cannot be negative"),

  // Fluid properties
  fluidDensity: z.number().positive("Fluid density must be positive"),
  fluidSpecificHeat: z.number().positive("Specific heat must be positive"),
  fluidViscosity: z.number().positive("Fluid viscosity must be positive"),
  fluidThermalConductivity: z.number().positive("Fluid thermal conductivity must be positive"),
  fluidExpansionCoeff: z.number().positive("Expansion coefficient must be positive"),

  // Vapor/gas properties (optional — falls back to air properties)
  vaporDensity: z.number().positive().optional(),
  vaporSpecificHeat: z.number().positive().optional(),
  vaporViscosity: z.number().positive().optional(),
  vaporThermalConductivity: z.number().positive().optional(),
  vaporExpansionCoeff: z.number().positive().optional(),

  // Ground
  groundTemp: z.number().optional(),
  groundConductivity: z.number().positive().optional(),

  // Fouling (optional — high defaults = negligible)
  foulingDryWall: z.number().positive().optional(),
  foulingWetWall: z.number().positive().optional(),
  foulingRoof: z.number().positive().optional(),
  foulingFloor: z.number().positive().optional(),

  // Wind enhancement
  windEnhancement: z.number().positive().optional(),

  // Surface
  surfaceEmissivity: z.number().min(0).max(1, "Emissivity must be 0–1"),
  roofEmissivity: z.number().min(0).max(1).optional(),

  // Metadata
  metadata: z.object({
    projectNumber: z.string(),
    documentNumber: z.string(),
    title: z.string(),
    projectName: z.string(),
    client: z.string(),
  }),
}).superRefine((data, ctx) => {
  // Liquid level cannot exceed tank height
  if (data.liquidLevel > data.tankHeight) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Liquid level cannot exceed tank height",
      path: ["liquidLevel"],
    })
  }

  // Fluid temperature must be greater than ambient (or we get zero/negative heat loss)
  if (data.fluidTemp <= data.ambientTemp) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Fluid temperature must be greater than ambient",
      path: ["fluidTemp"],
    })
  }

  // Insulation conductivity > 0 if insulation thickness > 0
  if (data.insulationThickness > 0 && data.insulationConductivity <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Insulation conductivity required when insulation is present",
      path: ["insulationConductivity"],
    })
  }

  // Roof height required for cone/dome roofs
  if (
    data.tankRoofType &&
    data.tankRoofType !== TankRoofType.FLAT &&
    (!data.roofHeight || data.roofHeight <= 0)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Roof height required for ${data.tankRoofType}`,
      path: ["roofHeight"],
    })
  }
})

export type ValidatedCalculationInput = z.infer<typeof calculationInputSchema>
