"use client"

import { useState, useEffect } from "react"
import { useFormContext } from "react-hook-form"
import { FolderOpen, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { CalculationInput, CalculationMetadata, RevisionRecord } from "@/types"
import { EquipmentMode, VesselOrientation, HeadType, TankType, TankRoofType, VesselMaterial } from "@/types"

const STORAGE_KEY = "vessel-calculations"

interface SavedCalculation {
  id: string
  name: string
  inputs: CalculationInput
  metadata: CalculationMetadata
  revisions: RevisionRecord[]
  savedAt: string
}

function loadAll(): SavedCalculation[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
  } catch { return [] }
}

function deleteItem(id: string) {
  const items = loadAll().filter((i) => i.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function normalizeInput(raw: any): Partial<CalculationInput> {
  const toNum = (v: any) => {
    const n = Number(v)
    return isNaN(n) ? undefined : n
  }
  return {
    tag: raw.tag ?? "",
    description: raw.description ?? "",
    equipmentMode: Object.values(EquipmentMode).includes(raw.equipmentMode)
      ? raw.equipmentMode : EquipmentMode.VESSEL,
    orientation: Object.values(VesselOrientation).includes(raw.orientation)
      ? raw.orientation : VesselOrientation.VERTICAL,
    headType: Object.values(HeadType).includes(raw.headType)
      ? raw.headType : HeadType.ELLIPSOIDAL_2_1,
    tankType: Object.values(TankType).includes(raw.tankType) ? raw.tankType : undefined,
    tankRoofType: Object.values(TankRoofType).includes(raw.tankRoofType) ? raw.tankRoofType : undefined,
    material: Object.values(VesselMaterial).includes(raw.material) ? raw.material : undefined,
    insideDiameter: toNum(raw.insideDiameter),
    shellLength: toNum(raw.shellLength),
    wallThickness: toNum(raw.wallThickness),
    headDepth: toNum(raw.headDepth),
    roofHeight: toNum(raw.roofHeight),
    bootHeight: toNum(raw.bootHeight),
    liquidLevel: toNum(raw.liquidLevel),
    hll: toNum(raw.hll),
    lll: toNum(raw.lll),
    ofl: toNum(raw.ofl),
    materialDensity: toNum(raw.materialDensity),
    density: toNum(raw.density),
    flowrate: toNum(raw.flowrate),
    metadata: raw.metadata ?? {},
  }
}

interface Props {
  controlledOpen?: boolean
  onControlledOpenChange?: (open: boolean) => void
  onCalculationLoaded: (metadata: CalculationMetadata, revisions: RevisionRecord[]) => void
}

export function LoadCalculationButton({
  controlledOpen,
  onControlledOpenChange,
  onCalculationLoaded,
}: Props) {
  const { reset } = useFormContext<CalculationInput>()
  const [items, setItems] = useState<SavedCalculation[]>([])
  const open = controlledOpen ?? false
  const setOpen = (v: boolean) => onControlledOpenChange?.(v)

  useEffect(() => {
    if (open) setItems(loadAll())
  }, [open])

  const handleLoad = (item: SavedCalculation) => {
    reset(normalizeInput(item.inputs) as any)
    onCalculationLoaded(item.metadata, item.revisions ?? [])
    setOpen(false)
  }

  const handleDelete = (id: string) => {
    deleteItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Load Calculation</DialogTitle>
        </DialogHeader>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No saved calculations found.
          </p>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="space-y-2 pr-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted/40 cursor-pointer"
                  onClick={() => handleLoad(item)}
                >
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.savedAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
