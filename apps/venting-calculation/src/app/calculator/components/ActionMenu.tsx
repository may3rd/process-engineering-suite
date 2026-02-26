"use client"

import { useMemo, useState } from "react"
import { useFormContext } from "react-hook-form"
import {
  Menu,
  Link2,
  FolderOpen,
  Save,
  Upload,
  Eraser,
  Download,
  Loader2,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCalculatorStore } from "@/lib/store/calculatorStore"
import { apiClient } from "@/lib/apiClient"
import { convertUnit } from "@eng-suite/physics"
import { TankConfiguration, type CalculationInput, type CalculationMetadata, type RevisionRecord } from "@/types"
import { LinkTankButton } from "./LinkTankButton"
import { LoadCalculationButton } from "./LoadCalculationButton"
import { SaveCalculationButton } from "./SaveCalculationButton"

interface ActionMenuProps {
  onTankLinked: (equipmentId: string | null, tankTag?: string | null) => void
  linkedTag: string | null
  linkedEquipmentId: string | null
  clearToken: number
  onClear: () => void
  calculationMetadata: CalculationMetadata
  revisionHistory: RevisionRecord[]
  onCalculationLoaded: (metadata: CalculationMetadata, revisionHistory: RevisionRecord[]) => void
}

function fromKPag(value: number, unit: string | null | undefined): number | null {
  const targetUnit = unit ?? "barg"
  const converted = convertUnit(value, "kPag", targetUnit)
  return Number.isFinite(converted) ? converted : null
}

export function ActionMenu({
  onTankLinked,
  linkedTag,
  linkedEquipmentId,
  clearToken,
  onClear,
  calculationMetadata,
  revisionHistory,
  onCalculationLoaded,
}: ActionMenuProps) {
  const { getValues } = useFormContext<CalculationInput>()
  const { calculationResult, derivedGeometry } = useCalculatorStore()

  // Dialog open states for controlled-mode components
  const [linkOpen, setLinkOpen] = useState(false)
  const [loadOpen, setLoadOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)

  // Export state
  const [isExporting, setIsExporting] = useState(false)

  // Update equipment state
  const [isUpdating, setIsUpdating] = useState(false)
  const [updated, setUpdated] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const canExport = !!calculationResult && !isExporting
  const canUpdate = !!linkedEquipmentId && !isUpdating

  const handleExport = async () => {
    if (!calculationResult) return
    setIsExporting(true)
    try {
      const [{ pdf }, { CalculationReport }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/pdf/CalculationReport"),
      ])
      const input = getValues()
      const blob = await pdf(
        <CalculationReport input={input} result={calculationResult} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `venting-calc-${input.tankNumber || "report"}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("PDF generation failed:", err)
    } finally {
      setIsExporting(false)
    }
  }

  const handleUpdateEquipment = async () => {
    if (!linkedEquipmentId) return
    setUpdateError(null)
    setUpdated(false)
    setIsUpdating(true)
    try {
      const current = await apiClient.equipment.get(linkedEquipmentId)
      if (current.type !== "tank") throw new Error("Linked equipment is not a tank")

      const values = getValues()
      const existingDetails = (current.details ?? {}) as Record<string, unknown>
      const insulated =
        values.tankConfiguration === TankConfiguration.INSULATED_FULL ||
        values.tankConfiguration === TankConfiguration.INSULATED_PARTIAL

      const details: Record<string, unknown> = {
        ...existingDetails,
        innerDiameter: values.diameter,
        height: values.height,
        insulated,
        insulationThickness: insulated ? values.insulationThickness : null,
        insulationConductivity: insulated ? values.insulationConductivity : null,
        insideHeatTransferCoeff: insulated ? values.insideHeatTransferCoeff : null,
        insulatedSurfaceArea:
          values.tankConfiguration === TankConfiguration.INSULATED_PARTIAL
            ? values.insulatedSurfaceArea
            : null,
        latitude: values.latitude,
        workingTemperature: values.avgStorageTemp,
        workingTemperatureUnit: "C",
        fluid:
          (typeof existingDetails.fluid === "string" ? existingDetails.fluid : null) ??
          calculationResult?.emergencyVenting.referenceFluid ??
          null,
        vapourPressure: values.vapourPressure,
        vapourPressureUnit: "kPa",
        flashPoint: values.flashBoilingPointType === "FP" ? values.flashBoilingPoint ?? null : null,
        flashPointUnit: "C",
        boilingPoint: values.flashBoilingPointType === "BP" ? values.flashBoilingPoint ?? null : null,
        boilingPointUnit: "C",
        latentHeat: values.latentHeat ?? null,
        latentHeatUnit: "kJ/kg",
        relievingTemperature: values.relievingTemperature ?? null,
        relievingTemperatureUnit: "C",
        molecularWeight: values.molecularMass ?? null,
        tankConfiguration: values.tankConfiguration,
        volume: derivedGeometry?.maxTankVolume ?? calculationResult?.derived.maxTankVolume ?? null,
        wettedArea: derivedGeometry?.wettedArea ?? calculationResult?.derived.wettedArea ?? null,
        ventingCalculation: {
          inputs: values,
          result: calculationResult ?? null,
          syncedAt: new Date().toISOString(),
        },
      }

      const targetPressureUnit = current.designPressureUnit ?? "barg"
      const convertedDesignPressure = fromKPag(values.designPressure, targetPressureUnit)
      if (convertedDesignPressure === null) {
        throw new Error(`Unsupported pressure unit for update: ${targetPressureUnit}`)
      }

      await apiClient.equipment.update(linkedEquipmentId, {
        designPressure: convertedDesignPressure,
        designPressureUnit: targetPressureUnit,
        details,
      })

      setUpdated(true)
      setTimeout(() => setUpdated(false), 1800)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update equipment"
      setUpdateError(msg)
      setTimeout(() => setUpdateError(null), 4000)
    } finally {
      setIsUpdating(false)
    }
  }

  // Build the Update Equipment label based on state
  const updateLabel = useMemo(() => {
    if (isUpdating) return "Updating..."
    if (updated) return "Updated"
    return "Update Equipment"
  }, [isUpdating, updated])

  const UpdateIcon = isUpdating ? Loader2 : updated ? Check : Upload

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <Menu className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          {/* Equipment group */}
          <DropdownMenuItem onSelect={() => setLinkOpen(true)}>
            <Link2 className="h-4 w-4 mr-2" />
            {linkedTag ? `Linked: ${linkedTag}` : "Link Tank..."}
          </DropdownMenuItem>

          {linkedEquipmentId && (
            <DropdownMenuItem onSelect={handleUpdateEquipment} disabled={!canUpdate}>
              <UpdateIcon className={`h-4 w-4 mr-2 ${isUpdating ? "animate-spin" : ""}`} />
              {updateLabel}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* File group */}
          <DropdownMenuItem onSelect={() => setLoadOpen(true)}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Load...
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => setSaveOpen(true)}>
            <Save className="h-4 w-4 mr-2" />
            Save...
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Utility group */}
          <DropdownMenuItem onSelect={onClear}>
            <Eraser className="h-4 w-4 mr-2" />
            Clear
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={handleExport} disabled={!canExport}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? "Generating..." : "Export PDF"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Update equipment error toast */}
      {updateError && (
        <p className="text-xs text-destructive">{updateError}</p>
      )}

      {/* Dialog-based components rendered outside the dropdown in controlled mode */}
      <LinkTankButton
        onTankLinked={onTankLinked}
        linkedTag={linkedTag}
        clearToken={clearToken}
        controlledOpen={linkOpen}
        onControlledOpenChange={setLinkOpen}
      />

      <LoadCalculationButton
        onTankLinked={onTankLinked}
        onCalculationLoaded={onCalculationLoaded}
        controlledOpen={loadOpen}
        onControlledOpenChange={setLoadOpen}
      />

      <SaveCalculationButton
        equipmentId={linkedEquipmentId}
        calculationMetadata={calculationMetadata}
        revisionHistory={revisionHistory}
        controlledOpen={saveOpen}
        onControlledOpenChange={setSaveOpen}
      />
    </>
  )
}
