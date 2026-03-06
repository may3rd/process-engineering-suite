'use client';

import { useState } from 'react';
import { Search, Loader2, RefreshCw, Link2, Unlink2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiClient } from '@/lib/apiClient';

interface EquipmentItem {
  id: string;
  tag: string;
  name: string;
  description?: string | null;
  type: string;
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
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEquipment = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tanks, vessels] = await Promise.all([
        apiClient.equipment.list({ type: 'tank' }),
        apiClient.equipment.list({ type: 'vessel' }),
      ]);
      const map = new Map<string, EquipmentItem>();
      for (const eq of [...tanks, ...vessels]) {
        map.set(eq.id, {
          id: eq.id,
          tag: eq.tag,
          name: eq.name,
          description: eq.description,
          type: eq.type,
        });
      }
      setItems(Array.from(map.values()));
    } catch {
      setError('Could not load equipment list.');
    } finally {
      setLoading(false);
    }
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
