import { z } from 'zod'
import { VesselOrientation, HeadType } from '@/types'

/** NaN-tolerant optional positive number */
const nanOptionalPositive = z.number().positive().optional().or(z.nan().transform(() => undefined))
/** NaN-tolerant optional non-negative number */
const nanOptionalNonNeg = z.number().nonnegative().optional().or(z.nan().transform(() => undefined))

export const calculationInputSchema = z.object({
  // Identification
  tag: z.string().min(1, 'Tag / equipment number is required'),
  description: z.string().optional(),

  // Configuration
  orientation: z.nativeEnum(VesselOrientation),
  headType: z.nativeEnum(HeadType),

  // Geometry — base unit: mm
  insideDiameter: z.number().positive('Inside diameter is required and must be positive'),
  shellLength: z.number().positive('Shell length is required and must be positive'),
  wallThickness: nanOptionalPositive,
  headDepth: nanOptionalPositive,

  // Levels — base unit: mm
  liquidLevel: nanOptionalNonNeg,
  hll: nanOptionalNonNeg,
  lll: nanOptionalNonNeg,
  ofl: nanOptionalNonNeg,

  // Fluid
  density: nanOptionalPositive,
  flowrate: nanOptionalNonNeg,

  // Metadata
  metadata: z.object({
    projectNumber: z.string().default(''),
    documentNumber: z.string().default(''),
    title: z.string().default(''),
    projectName: z.string().default(''),
    client: z.string().default(''),
  }).default({ projectNumber: '', documentNumber: '', title: '', projectName: '', client: '' }),
}).superRefine((data, ctx) => {
  // Conical head requires headDepth
  if (data.headType === HeadType.CONICAL && !data.headDepth) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['headDepth'],
      message: 'Head depth is required for conical heads',
    })
  }
  // Level ordering: LLL < HLL
  if (data.lll != null && data.hll != null && data.lll >= data.hll) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['lll'],
      message: 'LLL must be below HLL',
    })
  }
})

export type ValidatedInput = z.infer<typeof calculationInputSchema>
