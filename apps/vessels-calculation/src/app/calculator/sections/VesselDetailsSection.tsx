"use client"

import { useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { SectionCard } from "../components/SectionCard"
import { FieldRow } from "../components/FieldRow"
import type { CalculationInput } from "@/types"
import {
  EquipmentMode,
  VesselOrientation,
  HeadType,
  TankType,
  TankRoofType,
} from "@/types"

export function VesselDetailsSection() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<CalculationInput>()
  const tag = watch("tag")
  const equipmentMode = watch("equipmentMode") ?? EquipmentMode.VESSEL
  const orientation = watch("orientation")
  const headType = watch("headType")
  const tankType = watch("tankType")
  const tankRoofType = watch("tankRoofType")

  const hasBadge = tag && tag.length > 0

  return (
    <SectionCard
      title="Vessel Details"
      action={
        hasBadge
          ? <Badge variant="secondary" className="text-xs">Live</Badge>
          : <Badge variant="outline" className="text-xs text-muted-foreground">Pending input</Badge>
      }
    >
      <FieldRow label="Tag / Equipment No." htmlFor="tag" required error={errors.tag?.message}>
        <Input
          id="tag"
          placeholder="e.g. V-101"
          {...register("tag")}
        />
      </FieldRow>

      <FieldRow label="Description" htmlFor="description">
        <Input
          id="description"
          placeholder="e.g. Feed Surge Drum"
          {...register("description")}
        />
      </FieldRow>

      <FieldRow label="Equipment Mode" required error={errors.equipmentMode?.message}>
        <Select
          value={equipmentMode}
          onValueChange={(v) => {
            const nextMode = v as EquipmentMode
            setValue("equipmentMode", nextMode)
            if (nextMode === EquipmentMode.VESSEL) {
              setValue("tankType", undefined)
              setValue("tankRoofType", undefined)
              if (!watch("orientation")) setValue("orientation", VesselOrientation.VERTICAL)
              if (!watch("headType")) setValue("headType", HeadType.ELLIPSOIDAL_2_1)
            } else {
              setValue("orientation", VesselOrientation.VERTICAL)
              setValue("headType", HeadType.FLAT)
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(EquipmentMode).map((v) => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>

      {equipmentMode === EquipmentMode.TANK && (
        <FieldRow label="Tank Type" required error={errors.tankType?.message}>
          <Select
            value={tankType}
            onValueChange={(v) => {
              const nextTankType = v as TankType
              setValue("tankType", nextTankType)
              if (nextTankType === TankType.SPHERICAL) {
                setValue("tankRoofType", undefined)
                setValue("shellLength", undefined)
                setValue("roofHeight", undefined)
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tank type" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TankType).map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>
      )}

      {equipmentMode === EquipmentMode.TANK && tankType === TankType.TOP_ROOF && (
        <FieldRow label="Top Roof Type" required error={errors.tankRoofType?.message}>
          <Select
            value={tankRoofType}
            onValueChange={(v) => setValue("tankRoofType", v as TankRoofType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select roof type" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TankRoofType).map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>
      )}

      {equipmentMode === EquipmentMode.VESSEL && (
        <FieldRow label="Orientation" required>
          <Select
            value={orientation}
            onValueChange={(v) => setValue("orientation", v as VesselOrientation)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select orientation" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(VesselOrientation).map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>
      )}

      {equipmentMode === EquipmentMode.VESSEL && (
        <FieldRow label="Head Type" required>
          <Select
            value={headType}
            onValueChange={(v) => setValue("headType", v as HeadType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select head type" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(HeadType).map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>
      )}
    </SectionCard>
  )
}
