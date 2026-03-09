'use client';

import { useState } from 'react';
import { Search, Loader2, RefreshCw, Link2, Unlink2 } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiClient } from '@/lib/apiClient';
import {
  EquipmentMode,
  VesselOrientation,
  HeadType,
  TankType,
  TankRoofType,
  VesselMaterial,
} from '@/types';
import type { CalculationInput } from '@/types';

interface EquipmentItem {
  id: string;
  tag: string;
  name: string;
  description?: string | null;
  type: string;
  details: Record<string, unknown>;
}

interface Props {
  controlledOpen: boolean;
  onControlledOpenChange: (open: boolean) => void;
  linkedEquipmentId: string | null;
  linkedEquipmentTag: string | null;
  onEquipmentLinked: (equipmentId: string | null, equipmentTag?: string | null) => void;
}

export function EquipmentLinkButton({
  controlledOpen,
  onControlledOpenChange,
  linkedEquipmentId,
  linkedEquipmentTag,
  onEquipmentLinked,
}: Props) {
  const { setValue } = useFormContext<CalculationInput>();
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEquipment = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tanks, vessels] = await Promise.all([
        apiClient.engineeringObjects.list({ objectType: 'TANK' }),
        apiClient.engineeringObjects.list({ objectType: 'VESSEL' }),
      ]);
      const map = new Map<string, EquipmentItem>();
      for (const obj of [...tanks, ...vessels]) {
        if (!obj.id) {
          continue;
        }
        const props = obj.properties as Record<string, unknown>;
        const meta = (props.meta as Record<string, unknown> | undefined) ?? {};
        const inputs = (props.inputs as Record<string, unknown> | undefined) ?? {};
        const name = typeof meta.name === 'string'
          ? meta.name
          : typeof inputs.tag === 'string'
            ? inputs.tag
            : obj.tag;
        const description = typeof meta.description === 'string'
          ? meta.description
          : typeof inputs.description === 'string'
            ? inputs.description
            : null;

        const details = (props.details as Record<string, unknown> | undefined) ?? {};
        map.set(obj.id, {
          id: obj.id,
          tag: obj.tag,
          name,
          description,
          type: obj.object_type.toLowerCase(),
          details,
        });
      }
      setItems(Array.from(map.values()));
    } catch {
      setError('Could not load equipment list.');
    } finally {
      setLoading(false);
    }
  };

  const populateFormFromDetails = (details: Record<string, unknown>) => {
    const toNum = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : undefined);
    const d = details;

    const mode = Object.values(EquipmentMode).includes(d.equipmentMode as EquipmentMode)
      ? (d.equipmentMode as EquipmentMode) : undefined;
    if (mode) setValue('equipmentMode', mode);

    const orientation = Object.values(VesselOrientation).includes(d.orientation as VesselOrientation)
      ? (d.orientation as VesselOrientation) : undefined;
    if (orientation) setValue('orientation', orientation);

    const headType = Object.values(HeadType).includes(d.headType as HeadType)
      ? (d.headType as HeadType) : undefined;
    if (headType) setValue('headType', headType);

    const tankType = Object.values(TankType).includes(d.tankType as TankType)
      ? (d.tankType as TankType) : undefined;
    if (tankType) setValue('tankType', tankType);

    const tankRoofType = Object.values(TankRoofType).includes(d.tankRoofType as TankRoofType)
      ? (d.tankRoofType as TankRoofType) : undefined;
    if (tankRoofType) setValue('tankRoofType', tankRoofType);

    const material = Object.values(VesselMaterial).includes(d.material as VesselMaterial)
      ? (d.material as VesselMaterial) : undefined;
    if (material) setValue('material', material);

    const id = toNum(d.insideDiameter) ?? toNum(d.innerDiameter);
    if (id != null) setValue('insideDiameter', id);
    const sl = toNum(d.shellLength) ?? toNum(d.height);
    if (sl != null) setValue('shellLength', sl);
    const wt = toNum(d.wallThickness);
    if (wt != null) setValue('wallThickness', wt);
    const hd = toNum(d.headDepth);
    if (hd != null) setValue('headDepth', hd);
    const rh = toNum(d.roofHeight);
    if (rh != null) setValue('roofHeight', rh);
  };

  const handleOpen = async (open: boolean) => {
    onControlledOpenChange(open);
    if (open) {
      await fetchEquipment();
      setSearch('');
    }
  };

  const query = search.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (!query) return true;
    const hay = `${item.tag} ${item.name} ${item.description ?? ''} ${item.type}`.toLowerCase();
    return hay.includes(query);
  });

  return (
    <Dialog open={controlledOpen} onOpenChange={(v) => { void handleOpen(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link Equipment</DialogTitle>
          <DialogDescription>
            Link this calculation to an equipment object (tank or vessel).
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-muted-foreground absolute left-2 top-2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              placeholder="Search by tag, name, description"
            />
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => { void fetchEquipment(); }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {linkedEquipmentId && (
          <div className="flex items-center justify-between rounded-md border p-2">
            <p className="text-xs text-muted-foreground">
              Currently linked: <span className="text-foreground font-medium">{linkedEquipmentTag ?? linkedEquipmentId}</span>
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEquipmentLinked(null, null)}
              className="gap-1"
            >
              <Unlink2 className="h-3 w-3" />
              Unlink
            </Button>
          </div>
        )}

        <ScrollArea className="h-72 rounded-md border">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No equipment found.
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full rounded-md border px-3 py-2 text-left hover:bg-muted/40"
                  onClick={() => {
                    onEquipmentLinked(item.id, item.tag);
                    if (Object.keys(item.details).length > 0) {
                      populateFormFromDetails(item.details);
                    }
                    onControlledOpenChange(false);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{item.tag}</span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">{item.type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  )}
                  <div className="mt-1 text-[10px] text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    Link this equipment
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
