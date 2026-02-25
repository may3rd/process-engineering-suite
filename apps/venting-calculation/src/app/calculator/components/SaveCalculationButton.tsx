"use client"

import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { Save, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCalculatorStore } from "@/lib/store/calculatorStore"
import { useSavedCalculations } from "@/lib/hooks/useSavedCalculations"
import type { CalculationInput } from "@/types"

interface Props {
  /** ID of the linked equipment tank, if the user selected one via LinkTankButton. */
  equipmentId?: string | null
}

/**
 * Button that opens a dialog to name and save the current calculation to the DB.
 */
export function SaveCalculationButton({ equipmentId }: Props) {
  const { getValues } = useFormContext<CalculationInput>()
  const { calculationResult } = useCalculatorStore()
  const { save, isSaving } = useSavedCalculations()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaveError(null)
    try {
      const inputs = getValues() as unknown as Record<string, unknown>
      const results = calculationResult
        ? (calculationResult as unknown as Record<string, unknown>)
        : undefined
      await save(name.trim(), inputs, results, equipmentId)
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setOpen(false)
        setName("")
      }, 1200)
    } catch {
      setSaveError("Could not save — is the API running?")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setName(""); setSaved(false); setSaveError(null) } }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <Save className="h-4 w-4" />
          Save
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Calculation</DialogTitle>
          <DialogDescription>
            Give this calculation a name so you can reload it later.
            {equipmentId && (
              <span className="block mt-1 text-xs text-blue-600 dark:text-blue-400">
                Linked to equipment tank — the link will be saved.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Label htmlFor="calc-name">Name</Label>
          <Input
            id="calc-name"
            placeholder={getValues("tankNumber") || "e.g. T-101 Normal Venting Rev 0"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
            autoFocus
          />
          {saveError && <p className="text-xs text-destructive">{saveError}</p>}
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || isSaving || saved}
            className="gap-2"
          >
            {isSaving ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
            ) : saved ? (
              <><Check className="h-4 w-4" />Saved!</>
            ) : (
              <><Save className="h-4 w-4" />Save</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
