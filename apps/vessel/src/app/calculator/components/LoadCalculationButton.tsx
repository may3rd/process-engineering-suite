'use client';

import { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Loader2, RefreshCw, Trash2, RotateCcw, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSavedCalculations } from '@/lib/hooks/useSavedCalculations';
import type { CalculationInput, CalculationMetadata, RevisionRecord } from '@/types';
import {
  EquipmentMode,
  VesselOrientation,
  HeadType,
  TankType,
  TankRoofType,
  VesselMaterial,
} from '@/types';

const EMPTY_METADATA: CalculationMetadata = {
  projectNumber: '',
  documentNumber: '',
  title: '',
  projectName: '',
  client: '',
};

function toNum(v: unknown): number | undefined {
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

function normalizeInput(raw: Record<string, unknown>): Partial<CalculationInput> {
  return {
    tag: (raw.tag as string) ?? '',
    description: (raw.description as string) ?? '',
    equipmentMode: Object.values(EquipmentMode).includes(raw.equipmentMode as EquipmentMode)
      ? (raw.equipmentMode as EquipmentMode)
      : EquipmentMode.VESSEL,
    orientation: Object.values(VesselOrientation).includes(raw.orientation as VesselOrientation)
      ? (raw.orientation as VesselOrientation)
      : VesselOrientation.VERTICAL,
    headType: Object.values(HeadType).includes(raw.headType as HeadType)
      ? (raw.headType as HeadType)
      : HeadType.ELLIPSOIDAL_2_1,
    tankType: Object.values(TankType).includes(raw.tankType as TankType) ? (raw.tankType as TankType) : undefined,
    tankRoofType: Object.values(TankRoofType).includes(raw.tankRoofType as TankRoofType)
      ? (raw.tankRoofType as TankRoofType)
      : undefined,
    material: Object.values(VesselMaterial).includes(raw.material as VesselMaterial)
      ? (raw.material as VesselMaterial)
      : undefined,
    insideDiameter: toNum(raw.insideDiameter),
    shellLength: toNum(raw.shellLength),
    wallThickness: toNum(raw.wallThickness),
    materialDensity: toNum(raw.materialDensity),
    headDepth: toNum(raw.headDepth),
    roofHeight: toNum(raw.roofHeight),
    bootHeight: toNum(raw.bootHeight),
    liquidLevel: toNum(raw.liquidLevel),
    hll: toNum(raw.hll),
    lll: toNum(raw.lll),
    ofl: toNum(raw.ofl),
    density: toNum(raw.density),
    flowrate: toNum(raw.flowrate),
    metadata: raw.metadata as CalculationMetadata | undefined,
  };
}

interface Props {
  controlledOpen?: boolean;
  onControlledOpenChange?: (open: boolean) => void;
  onCalculationLoaded: (metadata: CalculationMetadata, revisions: RevisionRecord[]) => void;
  onEquipmentLinked?: (equipmentId: string | null, equipmentTag?: string | null) => void;
}

export function LoadCalculationButton({
  controlledOpen,
  onControlledOpenChange,
  onCalculationLoaded,
  onEquipmentLinked,
}: Props) {
  const { reset } = useFormContext<CalculationInput>();
  const {
    fetchList,
    softDelete,
    restore,
    savedItems,
    isLoading,
    isDeleting,
    isRestoring,
    error,
  } = useSavedCalculations();

  const open = controlledOpen ?? false;
  const setOpen = (v: boolean) => onControlledOpenChange?.(v);

  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  const loadItems = async (nextShowDeleted = showDeleted) => {
    await fetchList({ includeInactive: nextShowDeleted, q: search.trim() || undefined });
  };

  const handleOpen = async (v: boolean) => {
    setOpen(v);
    if (v) {
      await loadItems();
    } else {
      setSearch('');
      setShowDeleted(false);
    }
  };

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base = showDeleted ? savedItems : savedItems.filter((item) => item.isActive);
    if (!query) return base;
    return base.filter((item) => {
      const tag = String(item.inputs.tag ?? '').toLowerCase();
      return (
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.tag.toLowerCase().includes(query) ||
        tag.includes(query)
      );
    });
  }, [savedItems, search, showDeleted]);

  const handleSelect = (item: (typeof filteredItems)[number]) => {
    const normalized = normalizeInput(item.inputs);
    reset(normalized as CalculationInput, { keepDefaultValues: false });

    const metadata = item.calculationMetadata ?? EMPTY_METADATA;
    const revisions = item.revisionHistory ?? [];
    onCalculationLoaded(metadata, revisions);
    if (onEquipmentLinked) {
      onEquipmentLinked(item.equipmentId ?? null, item.equipmentTag ?? null);
    }

    setOpen(false);
  };

  const handleDelete = async (tag: string) => {
    if (!window.confirm('Soft delete this saved calculation?')) return;
    await softDelete(tag);
    await loadItems(showDeleted);
  };

  const handleRestore = async (tag: string) => {
    await restore(tag);
    await loadItems(showDeleted);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { void handleOpen(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Load Saved Calculation</DialogTitle>
          <DialogDescription>
            Select a calculation to restore its inputs.
          </DialogDescription>
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
            onClick={() => { void loadItems(showDeleted); }}
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
              const next = !showDeleted;
              setShowDeleted(next);
              void loadItems(next);
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
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''}</span>
                      </div>
                      {item.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded">
                          {item.tag}
                        </span>
                        {!item.isActive && (
                          <span className="text-[10px] uppercase tracking-wide text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">deleted</span>
                        )}
                        {item.equipmentId && (
                          <span className="text-[10px] flex items-center gap-0.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                            <Link2 className="h-2.5 w-2.5" />
                            linked equipment
                          </span>
                        )}
                      </div>
                    </button>

                    {item.isActive ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="mt-1 text-muted-foreground hover:text-destructive"
                        onClick={() => { void handleDelete(item.tag); }}
                        disabled={isDeleting}
                        aria-label={`Delete ${item.name}`}
                      >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="mt-1 text-muted-foreground hover:text-foreground"
                        onClick={() => { void handleRestore(item.tag); }}
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
  );
}
