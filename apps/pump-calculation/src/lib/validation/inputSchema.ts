import { z } from 'zod'
import { PumpType, PdSubtype, ShutoffMethod, ValveType } from '@/types'

/** NaN-tolerant optional positive number */
const nanOptionalPositive = z.number().positive().optional().or(z.nan().transform(() => undefined))
/** NaN-tolerant optional non-negative number */
const nanOptionalNonNeg = z.number().nonnegative().optional().or(z.nan().transform(() => undefined))
/** NaN-tolerant number with default — returns default when NaN */
const nanWithDefault = (def: number) => z.number().or(z.nan().transform(() => def)).default(def)

const metadataSchema = z.object({
  projectNumber: z.string().default(''),
  documentNumber: z.string().default(''),
  title: z.string().default(''),
  projectName: z.string().default(''),
  client: z.string().default(''),
}).default({
  projectNumber: '',
  documentNumber: '',
  title: '',
  projectName: '',
  client: '',
})

export const calculationInputSchema = z.object({
  tag: z.string().min(1, 'Equipment tag is required'),
  description: z.string().optional().default(''),
  metadata: metadataSchema,

  // Fluid
  fluidName: z.string().optional().default(''),
  flowDesign: z.number().positive('Flow must be > 0'),
  temperature: nanWithDefault(20),
  sg: z.number().positive('SG must be > 0'),
  vapourPressure: z.number().min(0).or(z.nan().transform(() => 0)).default(0),
  viscosity: z.number().positive().or(z.nan().transform(() => 1)).default(1),

  // Suction
  suctionSourcePressure: nanWithDefault(101.325),
  suctionElevation: nanWithDefault(0),
  suctionLineLoss: z.number().min(0).or(z.nan().transform(() => 0)).default(0),
  suctionStrainerLoss: z.number().min(0).or(z.nan().transform(() => 0)).default(0),
  suctionOtherLoss: z.number().min(0).or(z.nan().transform(() => 0)).default(0),

  // Discharge
  dischargeDestPressure: nanWithDefault(101.325),
  dischargeElevation: nanWithDefault(0),
  dischargeEquipmentDp: z.number().min(0).or(z.nan().transform(() => 0)).default(0),
  dischargeLineLoss: z.number().min(0).or(z.nan().transform(() => 0)).default(0),
  dischargeFlowElementDp: z.number().min(0).or(z.nan().transform(() => 0)).default(0),
  dischargeControlValveDp: nanOptionalNonNeg,
  dischargeDesignMargin: z.number().min(0).or(z.nan().transform(() => 0)).default(0),
  isExistingSystem: z.boolean().default(false),

  // Pump
  pumpType: z.nativeEnum(PumpType).default(PumpType.CENTRIFUGAL),
  pdSubtype: z.nativeEnum(PdSubtype).optional(),
  pumpSpeed: nanOptionalPositive,
  compressibilityFactor: nanOptionalPositive,

  // Motor
  wearMarginPct: z.number().min(0).max(50).or(z.nan().transform(() => 5)).default(5),
  efficiency: z.number().min(1).max(100).or(z.nan().transform(() => 75)).default(75),

  // NPSH
  calculateAccelHead: z.boolean().default(false),

  // Orifice
  showOrifice: z.boolean().default(false),
  orificePipeId: nanOptionalPositive,
  orificeBeta: z.number().min(0.1).max(0.9).optional().or(z.nan().transform(() => undefined)),

  // Control valve
  showControlValve: z.boolean().default(false),
  cvFlowRatio: nanOptionalPositive,
  cvValveType: z.nativeEnum(ValveType).optional(),

  // Minimum flow
  showMinFlow: z.boolean().default(false),
  specificHeat: nanOptionalPositive,
  allowedTempRise: nanOptionalPositive,

  // Shut-off
  showShutoff: z.boolean().default(false),
  shutoffMethod: z.nativeEnum(ShutoffMethod).optional(),
  knownShutoffHead: nanOptionalPositive,
  shutoffCurveFactor: z.number().min(1).max(2).optional().or(z.nan().transform(() => undefined)),
  shutoffRatio: z.number().min(1).max(2).optional().or(z.nan().transform(() => undefined)),
}).superRefine((data, ctx) => {
  if (data.showOrifice) {
    if (!data.orificePipeId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['orificePipeId'], message: 'Pipe ID required for orifice' })
    }
    if (!data.orificeBeta) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['orificeBeta'], message: 'Beta ratio required for orifice' })
    }
  }
  if (data.showMinFlow) {
    if (!data.specificHeat) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['specificHeat'], message: 'Specific heat required for min flow' })
    }
    if (!data.allowedTempRise) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['allowedTempRise'], message: 'Allowed temperature rise required' })
    }
    if (!data.showShutoff) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['showShutoff'], message: 'Shut-off section must be enabled for min flow calculation' })
    }
  }
})

export type ValidatedInput = z.infer<typeof calculationInputSchema>
