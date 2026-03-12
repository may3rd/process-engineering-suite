import { z } from 'zod'
import {
  VesselOrientation,
  HeadType,
  EquipmentMode,
  TankType,
  TankRoofType,
  VesselMaterial,
} from '@/types'
import { MIN_CONICAL_DEPTH_FRACTION } from '@/lib/constants'

/** NaN-tolerant optional positive number */
const nanOptionalPositive = z.number().positive().optional().or(z.nan().transform(() => undefined))
/** NaN-tolerant optional non-negative number */
const nanOptionalNonNeg = z.number().nonnegative().optional().or(z.nan().transform(() => undefined))

export const calculationInputSchema = z.object({
  // Identification
  tag: z.string().min(1, 'Tag / equipment number is required'),
  description: z.string().optional(),

  // Configuration
  equipmentMode: z.nativeEnum(EquipmentMode).default(EquipmentMode.VESSEL),
  orientation: z.nativeEnum(VesselOrientation).default(VesselOrientation.VERTICAL),
  headType: z.nativeEnum(HeadType).default(HeadType.ELLIPSOIDAL_2_1),
  tankType: z.nativeEnum(TankType).optional(),
  tankRoofType: z.nativeEnum(TankRoofType).optional(),
  material: z.nativeEnum(VesselMaterial).optional(),

  // Geometry — base unit: mm
  insideDiameter: z.number().positive('Inside diameter is required and must be positive'),
  shellLength: nanOptionalPositive,
  wallThickness: nanOptionalPositive,
  materialDensity: nanOptionalPositive,
  headDepth: nanOptionalPositive,
  roofHeight: nanOptionalPositive,
  bottomHeight: nanOptionalNonNeg,
  bootInsideDiameter: nanOptionalPositive,
  bootHeight: nanOptionalNonNeg,

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
  if (
    data.equipmentMode === EquipmentMode.VESSEL &&
    (data.shellLength == null || !isFinite(data.shellLength) || data.shellLength <= 0)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['shellLength'],
      message: 'Shell length is required and must be positive',
    })
  }

  if (data.equipmentMode === EquipmentMode.TANK && !data.tankType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tankType'],
      message: 'Tank type is required',
    })
  }

  if (
    data.equipmentMode === EquipmentMode.TANK &&
    data.tankType === TankType.TOP_ROOF &&
    (data.shellLength == null || !isFinite(data.shellLength) || data.shellLength <= 0)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['shellLength'],
      message: 'Shell height is required and must be positive',
    })
  }

  if (
    data.equipmentMode === EquipmentMode.TANK &&
    data.tankType === TankType.TOP_ROOF &&
    !data.tankRoofType
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tankRoofType'],
      message: 'Top roof type is required',
    })
  }

  if (
    data.equipmentMode === EquipmentMode.TANK &&
    data.tankType === TankType.TOP_ROOF &&
    data.tankRoofType != null &&
    data.tankRoofType !== TankRoofType.FLAT &&
    (data.roofHeight == null || !isFinite(data.roofHeight) || data.roofHeight <= 0)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['roofHeight'],
      message: 'Roof height is required for cone/dome roof',
    })
  }

  if (
    data.equipmentMode === EquipmentMode.VESSEL &&
    data.headType === HeadType.CONICAL &&
    !data.headDepth
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['headDepth'],
      message: 'Head depth is required for conical heads',
    })
  }

  if (
    data.equipmentMode === EquipmentMode.VESSEL &&
    data.headType === HeadType.CONICAL &&
    data.headDepth != null &&
    data.insideDiameter > 0 &&
    data.headDepth < (MIN_CONICAL_DEPTH_FRACTION * data.insideDiameter)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['headDepth'],
      message: `Head depth must be at least ${(MIN_CONICAL_DEPTH_FRACTION * 100).toFixed(0)}% of inside diameter`,
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
