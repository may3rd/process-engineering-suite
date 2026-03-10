'use client'

import { useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Loader2, RefreshCw, Trash2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSavedCalculations } from '@/lib/hooks/useSavedCalculations'
import type { CalculationInput, CalculationMetadata, RevisionRecord } from '@/types'
import { PumpType } from '@/types'

const EMPTY_METADATA: CalculationMetadata = {
  projectNumber: '',
  documentNumber: '',
  title: '',
  projectName: '',
  client: '',
}

function toNum(v: unknown): number | undefined {
  const n = Number(v)
  return isNaN(n) ? undefined : n
}

function normalizeInput(raw: Record<string, unknown>): Partial<CalculationInput> {
  return {
    tag: (raw.tag as string) ?? '',
    description: (raw.description as string) ?? '',
    fluidName: (raw.fluidName as string) ?? '',
    flowDesign: toNum(raw.flowDesign),
    temperature: toNum(raw.temperature) ?? 20,
    sg: toNum(raw.sg),
    vapourPressure: toNum(raw.vapourPressure) ?? 0,
    viscosity: toNum(raw.viscosity) ?? 1,
    suctionSourcePressure: toNum(raw.suctionSourcePressure) ?? 101.325,
    suctionElevation: toNum(raw.suctionElevation) ?? 0,
    suctionLineLoss: toNum(raw.suctionLineLoss) ?? 0,
    suctionStrainerLoss: toNum(raw.suctionStrainerLoss) ?? 0,
    suctionOtherLoss: toNum(raw.suctionOtherLoss) ?? 0,
    dischargeDestPressure: toNum(raw.dischargeDestPressure) ?? 101.325,
    dischargeElevation: toNum(raw.dischargeElevation) ?? 0,
    dischargeEquipmentDp: toNum(raw.dischargeEquipmentDp) ?? 0,
    dischargeLineLoss: toNum(raw.dischargeLineLoss) ?? 0,
    dischargeFlowElementDp: toNum(raw.dischargeFlowElementDp) ?? 0,
    dischargeDesignMargin: toNum(raw.dischargeDesignMargin) ?? 0,
    pumpType: Object.values(PumpType).includes(raw.pumpType as PumpType)
      ? (raw.pumpType as PumpType)
      : PumpType.CENTRIFUGAL,
    wearMarginPct: toNum(raw.wearMarginPct) ?? 5,
    efficiency: toNum(raw.efficiency) ?? 75,
    calculateAccelHead: Boolean(raw.calculateAccelHead),
    showOrifice: Boolean(raw.showOrifice),
    showControlValve: Boolean(raw.showControlValve),
    showMinFlow: Boolean(raw.showMinFlow),
    showShutoff: Boolean(raw.showShutoff),
    metadata: raw.metadata as CalculationMetadata | undefined,
  } as Partial<CalculationInput>
}

interface Props {
  controlledOpen?: boolean
  onControlledOpenChange?: (open: boolean) => void
  onCalculationLoaded: (metadata: CalculationMetadata, revisions: RevisionRecord[], equipmentId?: string | null, equipmentTag?: string | null) => void
}

export function LoadCalculationButton({
  controlledOpen,
  onControlledOpenChange,
  onCalculationLoaded,
}: Props) {
  const { reset } = useFormContext<CalculationInput>()
  const {
    fetchList,
    softDelete,
    restore,
    savedItems,
    isLoading,
    isDeleting,
    isRestoring,
    error,
  } = useSavedCalculations()

  const open = controlledOpen ?? false
  const setOpen = (v: boolean) => onControlledOpenChange?.(v)

  const [search, setSearch] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)

  const loadItems = async (nextShowDeleted = showDeleted) => {
    await fetchList({ includeInactive: nextShowDeleted, q: search.trim() || undefined })
  }

  const handleOpen = async (v: boolean) => {
    setOpen(v)
    if (v) {
      await loadItems()
    } else {
      setSearch('')
      setShowDeleted(false)
    }
  }

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    const base = showDeleted ? savedItems : savedItems.filter((item) => item.isActive)
    if (!query) return base
    return base.filter((item) => {
      const tag = String(item.inputs.tag ?? '').toLowerCase()
      return (
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.tag.toLowerCase().includes(query) ||
        tag.includes(query)
      )
    })
  }, [savedItems, search, showDeleted])

  const handleSelect = (item: (typeof filteredItems)[number]) => {
    const normalized = normalizeInput(item.inputs)
    reset(normalized as CalculationInput, { keepDefaultValues: false })
    const metadata = item.calculationMetadata ?? EMPTY_METADATA
    const revisions = item.revisionHistory ?? []
    onCalculationLoaded(metadata, revisions, item.equipmentId, item.equipmentTag)
    setOpen(false)
  }

  const handleDelete = async (tag: string) => {
    if (!window.confirm('Soft delete this saved calculation?')) return
    await softDelete(tag)
    await loadItems(showDeleted)
  }

  const handleRestore = async (tag: string) => {
    await restore(tag)
    await loadItems(showDeleted)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { void handleOpen(v) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Load Saved Calculation</DialogTitle>
          <DialogDescription>Select a calculation to restore its inputs.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 -mt-1 mb-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, description, tag"
            className="h-8 text-xs"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { void loadItems(showDeleted) }}
            disabled={isLoading}
            className="gap-1 text-xs"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="flex justify-between items-center mb-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const next = !showDeleted
              setShowDeleted(next)
              void loadItems(next)
            }}
            className="text-xs"
          >
            {showDeleted ? 'Hide deleted' : 'Show deleted'}
          </Button>
        </div>

        {error && <p className="text-xs text-destructive mb-2">{error}</p>}

        <ScrollArea className="h-72 rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No saved calculations found.
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredItems.map((item) => (
                <div key={item.tag} className="w-full px-2 py-1 rounded-md hover:bg-accent/60 transition-colors">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      className="flex-1 text-left px-1 py-1"
                      onClick={() => handleSelect(item)}
                      disabled={!item.isActive}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{item.name}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded">
                          {item.tag}
                        </span>
                        {!item.isActive && (
                          <span className="text-[10px] uppercase tracking-wide text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                            deleted
                          </span>
                        )}
                      </div>
                    </button>

                    {item.isActive ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-1 text-muted-foreground hover:text-destructive h-7 w-7"
                        onClick={() => { void handleDelete(item.tag) }}
                        disabled={isDeleting}
                        aria-label={`Delete ${item.name}`}
                      >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-1 text-muted-foreground hover:text-foreground h-7 w-7"
                        onClick={() => { void handleRestore(item.tag) }}
                        disabled={isRestoring}
                        aria-label={`Restore ${item.name}`}
                      >
                        {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
