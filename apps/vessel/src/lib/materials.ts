import { STEEL_DENSITY_KG_M3 } from '@/lib/constants'
import { VesselMaterial } from '@/types'

export interface VesselMaterialOption {
  value: VesselMaterial
  label: string
  densityKgM3: number
}

export const DEFAULT_VESSEL_MATERIAL = VesselMaterial.CS

export const VESSEL_MATERIAL_OPTIONS: VesselMaterialOption[] = [
  { value: VesselMaterial.CS, label: VesselMaterial.CS, densityKgM3: 7850 },
  { value: VesselMaterial.LTCS, label: VesselMaterial.LTCS, densityKgM3: 7850 },
  { value: VesselMaterial.A387_22, label: VesselMaterial.A387_22, densityKgM3: 7800 },
  { value: VesselMaterial.SS304, label: VesselMaterial.SS304, densityKgM3: 7930 },
  { value: VesselMaterial.SS304L, label: VesselMaterial.SS304L, densityKgM3: 7900 },
  { value: VesselMaterial.SS316, label: VesselMaterial.SS316, densityKgM3: 7980 },
  { value: VesselMaterial.SS316L, label: VesselMaterial.SS316L, densityKgM3: 8000 },
  { value: VesselMaterial.DUPLEX_2205, label: VesselMaterial.DUPLEX_2205, densityKgM3: 7800 },
  { value: VesselMaterial.SUPER_DUPLEX_2507, label: VesselMaterial.SUPER_DUPLEX_2507, densityKgM3: 7800 },
  { value: VesselMaterial.AL6061, label: VesselMaterial.AL6061, densityKgM3: 2700 },
  { value: VesselMaterial.MONEL_400, label: VesselMaterial.MONEL_400, densityKgM3: 8800 },
  { value: VesselMaterial.TITANIUM_GR2, label: VesselMaterial.TITANIUM_GR2, densityKgM3: 4510 },
]

const DENSITY_BY_MATERIAL = new Map<VesselMaterial, number>(
  VESSEL_MATERIAL_OPTIONS.map((item) => [item.value, item.densityKgM3]),
)

export function getMaterialDensityKgM3(material?: VesselMaterial, materialDensity?: number): number {
  if (materialDensity != null && isFinite(materialDensity) && materialDensity > 0) {
    return materialDensity
  }
  if (material != null) {
    const selected = DENSITY_BY_MATERIAL.get(material)
    if (selected != null) return selected
  }
  return STEEL_DENSITY_KG_M3
}

export function defaultMaterialDensityKgM3(material?: VesselMaterial): number {
  return getMaterialDensityKgM3(material ?? DEFAULT_VESSEL_MATERIAL)
}
