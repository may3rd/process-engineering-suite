"use client"

import { useFormContext } from "react-hook-form"
import { SectionCard } from "../components/SectionCard"
import { FieldRow } from "../components/FieldRow"
import { UomInput } from "../components/UomInput"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CalculationInput } from "@/types"
import { EquipmentMode, HeadType, TankType, TankRoofType, VesselOrientation } from "@/types"
import { autoHeadDepth } from "@/lib/calculations"
import { DEFAULT_VESSEL_MATERIAL, VESSEL_MATERIAL_OPTIONS, defaultMaterialDensityKgM3 } from "@/lib/materials"

export function GeometrySection() {
  const { watch, setValue, formState: { errors } } = useFormContext<CalculationInput>()
  const equipmentMode = watch("equipmentMode") ?? EquipmentMode.VESSEL
  const headType = watch("headType") ?? HeadType.ELLIPSOIDAL_2_1
  const tankType = watch("tankType")
  const tankRoofType = watch("tankRoofType")
  const insideDiameter = watch("insideDiameter")
  const material = watch("material") ?? DEFAULT_VESSEL_MATERIAL

  const autoDepth = insideDiameter && isFinite(insideDiameter)
    ? autoHeadDepth(headType, insideDiameter)
    : null

  const showHeadDepthField =
    equipmentMode === EquipmentMode.VESSEL && headType === HeadType.CONICAL
  const showShellLengthField =
    equipmentMode === EquipmentMode.VESSEL ||
    (equipmentMode === EquipmentMode.TANK && tankType === TankType.TOP_ROOF)
  const showRoofHeightField =
    equipmentMode === EquipmentMode.TANK &&
    tankType === TankType.TOP_ROOF &&
    tankRoofType != null &&
    tankRoofType !== TankRoofType.FLAT
  const showBootHeightField =
    equipmentMode === EquipmentMode.VESSEL ||
    (equipmentMode === EquipmentMode.TANK && tankType === TankType.SPHERICAL)

  const bootHeightHint =
    equipmentMode === EquipmentMode.TANK
      ? "Ground to tank centerline"
      : watch("orientation") === VesselOrientation.VERTICAL
        ? "Ground to lower tangent line"
        : "Ground to vessel bottom"

  const headDepthHint = equipmentMode === EquipmentMode.VESSEL && !showHeadDepthField && autoDepth != null && isFinite(autoDepth)
    ? `Auto: ${autoDepth.toFixed(1)} mm`
    : undefined

  return (
    <SectionCard title="Geometry">
      <FieldRow
        label="Inside Diameter"
        htmlFor="insideDiameter"
        required
        error={errors.insideDiameter?.message}
      >
        <UomInput name="insideDiameter" category="length" id="insideDiameter" placeholder="e.g. 1500" />
      </FieldRow>

      {showShellLengthField && (
        <FieldRow
          label={equipmentMode === EquipmentMode.TANK ? "Shell Height" : "Shell Length (TL–TL)"}
          htmlFor="shellLength"
          required
          error={errors.shellLength?.message}
        >
          <UomInput name="shellLength" category="length" id="shellLength" placeholder="e.g. 3000" />
        </FieldRow>
      )}

      <FieldRow
        label="Wall Thickness"
        htmlFor="wallThickness"
        hint="Used for empty mass estimate"
        error={errors.wallThickness?.message}
      >
        <UomInput name="wallThickness" category="length" id="wallThickness" placeholder="e.g. 10" />
      </FieldRow>

      <FieldRow
        label="Vessel Material"
        htmlFor="material"
      >
        <Select
          value={material}
          onValueChange={(v) => {
            const selected = v as CalculationInput["material"]
            setValue("material", selected)
            setValue("materialDensity", defaultMaterialDensityKgM3(selected))
          }}
        >
          <SelectTrigger id="material">
            <SelectValue placeholder="Select material" />
          </SelectTrigger>
          <SelectContent>
            {VESSEL_MATERIAL_OPTIONS.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow
        label="Material Density"
        htmlFor="materialDensity"
        hint="Used for empty mass estimate"
        error={errors.materialDensity?.message}
      >
        <UomInput name="materialDensity" category="density" id="materialDensity" placeholder="e.g. 7850" />
      </FieldRow>

      {showHeadDepthField ? (
        <FieldRow
          label="Head Depth"
          htmlFor="headDepth"
          required
          hint="Required for conical heads"
          error={errors.headDepth?.message}
        >
          <UomInput name="headDepth" category="length" id="headDepth" placeholder="e.g. 400" />
        </FieldRow>
      ) : (
        headDepthHint && (
          <div className="text-xs text-muted-foreground px-1">
            Head depth: {headDepthHint} (auto-calculated for {headType})
          </div>
        )
      )}

      {showRoofHeightField && (
        <FieldRow
          label="Roof Height"
          htmlFor="roofHeight"
          required
          hint="Required for cone/dome roof"
          error={errors.roofHeight?.message}
        >
          <UomInput name="roofHeight" category="length" id="roofHeight" placeholder="e.g. 400" />
        </FieldRow>
      )}

      {showBootHeightField && (
        <FieldRow
          label="Boot Height"
          htmlFor="bootHeight"
          hint={bootHeightHint}
          error={errors.bootHeight?.message}
        >
          <UomInput name="bootHeight" category="length" id="bootHeight" placeholder="e.g. 2000" />
        </FieldRow>
      )}
    </SectionCard>
  )
}
