export interface CalculationMetadata {
  projectNumber: string
  documentNumber: string
  title: string
  projectName: string
  client: string
}

export interface RevisionRecord {
  rev: string
  by: string
  byDate?: string
  checkedBy: string
  checkedDate?: string
  approvedBy: string
  approvedDate?: string
}

export enum PumpType {
  CENTRIFUGAL = 'Centrifugal',
  POSITIVE_DISPLACEMENT = 'Positive Displacement',
}

export enum PdSubtype {
  SINGLE_SIMPLEX = 'Single-acting Simplex',
  DOUBLE_SIMPLEX = 'Double-acting Simplex',
  TRIPLEX = 'Triplex',
  QUINTUPLEX = 'Quintuplex',
  GEAR = 'Gear',
  SCREW = 'Screw',
  DIAPHRAGM = 'Diaphragm',
}

export enum ShutoffMethod {
  CURVE_FACTOR = 'A – Curve factor (1.1–1.25 × design head)',
  HEAD_RATIO = 'B – Head ratio (known ratio)',
  KNOWN_HEAD = 'C – Known shut-off head',
}

export enum ValveType {
  SINGLE_PLUG = 'Single Plug',
  DOUBLE_PLUG = 'Double Plug',
  CAGED = 'Caged',
  BUTTERFLY = 'Butterfly',
  V_BALL = 'V-ball',
}

export interface CalculationInput {
  tag: string
  description?: string
  metadata: CalculationMetadata

  // Fluid — base units stored: m3/h, C, kPa(abs), cP
  fluidName?: string
  flowDesign: number
  temperature: number
  sg: number
  vapourPressure: number   // kPaa
  viscosity: number        // cP

  // Suction — pressures in kPa(abs); elevation in m; losses in kPa
  suctionSourcePressure: number
  suctionElevation: number
  suctionLineLoss: number
  suctionStrainerLoss: number
  suctionOtherLoss: number

  // Discharge — kPa(abs) and kPa losses; elevation in m
  dischargeDestPressure: number
  dischargeElevation: number
  dischargeEquipmentDp: number
  dischargeLineLoss: number
  dischargeFlowElementDp: number
  dischargeControlValveDp?: number
  dischargeDesignMargin: number
  isExistingSystem?: boolean

  // Pump configuration
  pumpType: PumpType
  pdSubtype?: PdSubtype
  pumpSpeed?: number
  compressibilityFactor?: number

  // Motor & efficiency
  wearMarginPct: number       // default 5
  efficiency: number          // % pump hydraulic efficiency, default 75

  // NPSH
  calculateAccelHead: boolean

  // Orifice section
  showOrifice: boolean
  orificePipeId?: number      // mm
  orificeBeta?: number

  // Control valve recommendation
  showControlValve: boolean
  cvFlowRatio?: number
  cvValveType?: ValveType

  // Minimum flow by temperature rise
  showMinFlow: boolean
  specificHeat?: number       // kJ/(kg·°C)
  allowedTempRise?: number    // °C

  // Shut-off pressure & power
  showShutoff: boolean
  shutoffMethod?: ShutoffMethod
  knownShutoffHead?: number   // m
  shutoffCurveFactor?: number // e.g. 1.15
  shutoffRatio?: number       // e.g. 1.2
}

export interface PumpCalculationResult {
  suctionPressureKpa: number
  dischargePressureKpa: number
  differentialPressureKpa: number
  differentialHead: number     // m
  staticHead: number           // m
  frictionHead: number         // m
  npsha: number                // m
  accelHead?: number           // m (PD only)
  hydraulicPowerKw: number
  shaftPowerKw: number
  apiMinMotorKw: number
  recommendedMotorKw: number
  orificeDeltaPKpa?: number
  recommendedCvDeltaPKpa?: number
  minFlowM3h?: number
  shutoffPressureKpa?: number
  shutoffHead?: number         // m
  shutoffPowerKw?: number
}
