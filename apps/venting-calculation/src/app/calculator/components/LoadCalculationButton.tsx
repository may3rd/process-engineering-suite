"use client"

import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { FolderOpen, Loader2, RefreshCw, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSavedCalculations } from "@/lib/hooks/useSavedCalculations"
import type { CalculationInput } from "@/types"

interface Props {
  /**
   * Called when the user loads a calculation.
   * Passes the equipmentId of the linked tank (or null if not linked).
   * Use this in page.tsx to restore the `linkedEquipmentId` state so re-saves preserve the link.
   */
  onTankLinked?: (equipmentId: string | null) => void
}

/**
 * Button that lists saved calculations and lets the user load one into the form.
 */
export function LoadCalculationButton({ onTankLinked }: Props) {
  const { reset } = useFormContext<CalculationInput>()
  const { fetchList, savedItems, isLoading, error } = useSavedCalculations()
  const [open, setOpen] = useState(false)

  const handleOpen = async (willOpen: boolean) => {
    setOpen(willOpen)
    if (willOpen) {
      await fetchList()
    }
  }

  const handleSelect = (item: (typeof savedItems)[number]) => {
    // Load the persisted inputs back into the form
    reset(item.inputs as unknown as CalculationInput)
    // Restore the equipment link in the parent page so re-saves preserve the link
    if (onTankLinked) {
      onTankLinked((item.equipmentId as string | null | undefined) ?? null)
    }
    setOpen(false)
  }

  const formatDate = (iso?: string | null) => {
    if (!iso) return ""
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <FolderOpen className="h-4 w-4" />
          Load
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Load Saved Calculation</DialogTitle>
          <DialogDescription>
            Select a calculation to restore its inputs.
          </DialogDescription>
        </DialogHeader>

        {/* Refresh button */}
        <div className="flex justify-end -mt-1 mb-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={fetchList}
            disabled={isLoading}
            className="gap-1 text-xs"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <p className="text-xs text-destructive mb-2">{error}</p>
        )}

        <ScrollArea className="h-72 rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : savedItems.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No saved calculations yet.
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {savedItems
                .filter((item) => item.isActive !== false)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={() => handleSelect(item)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{item.name}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded">
                        {item.apiEdition ?? "7TH"}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded">
                        {item.status ?? "draft"}
                      </span>
                      {/* Linked-to-tank badge */}
                      {item.equipmentId && (
                        <span className="text-[10px] flex items-center gap-0.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                          <Link2 className="h-2.5 w-2.5" />
                          linked to tank
                        </span>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
