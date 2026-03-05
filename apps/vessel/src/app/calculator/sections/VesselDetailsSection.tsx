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
import { VesselOrientation, HeadType } from "@/types"

export function VesselDetailsSection() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<CalculationInput>()
  const tag = watch("tag")
  const orientation = watch("orientation")
  const headType = watch("headType")

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
    </SectionCard>
  )
}
