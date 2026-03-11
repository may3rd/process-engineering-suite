'use client';

import { useMemo, useState } from 'react';
import { Menu, RotateCcw, FileDown, Loader2, LinkIcon, Upload, Check } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { pdf } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SaveCalculationButton } from './SaveCalculationButton';
import { LoadCalculationButton } from './LoadCalculationButton';
import { EquipmentLinkButton } from './EquipmentLinkButton';
import { VesselReport } from '../pdf/VesselReport';
import { useUomStore } from '@/lib/store/uomStore';
import type { VesselUomCategory } from '@/lib/uom';
import { apiClient } from '@/lib/apiClient';
import {
  EquipmentMode,
} from '@/types';
import type {
  CalculationInput,
  CalculationMetadata,
  RevisionRecord,
  CalculationResult,
} from '@/types';

interface ActionMenuProps {
  onClear: () => void;
  calculationMetadata: CalculationMetadata;
  revisionHistory: RevisionRecord[];
  onCalculationLoaded: (metadata: CalculationMetadata, revisions: RevisionRecord[]) => void;
  calculationResult: CalculationResult | null;
  linkedEquipmentId: string | null;
  linkedEquipmentTag: string | null;
  onEquipmentLinked: (equipmentId: string | null, equipmentTag?: string | null) => void;
}

export function ActionMenu({
  onClear,
  calculationMetadata,
  revisionHistory,
  onCalculationLoaded,
  calculationResult,
  linkedEquipmentId,
  linkedEquipmentTag,
  onEquipmentLinked,
}: ActionMenuProps) {
  const { getValues } = useFormContext<CalculationInput>();
  const { units } = useUomStore();

  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const handleExportPdf = async () => {
    if (!calculationResult) return;
    setPdfLoading(true);
    try {
      const input = getValues();
      const blob = await pdf(
        <VesselReport
          input={input}
          result={calculationResult}
          metadata={calculationMetadata}
          revisions={revisionHistory}
          units={units as Record<VesselUomCategory, string>}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vessel-${(input.tag || 'calc').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  };

  const resolveLinkedTag = async (): Promise<string | null> => {
    if (linkedEquipmentTag) {
      return linkedEquipmentTag;
    }
    if (!linkedEquipmentId) {
      return null;
    }

    const [tanks, vessels] = await Promise.all([
      apiClient.engineeringObjects.list({ objectType: 'TANK', includeInactive: true }),
      apiClient.engineeringObjects.list({ objectType: 'VESSEL', includeInactive: true }),
    ]);
    const found = [...tanks, ...vessels].find((obj) => obj.id === linkedEquipmentId);
    return found?.tag ?? null;
  };

  const handleUpdateEquipment = async () => {
    if (!linkedEquipmentId) return;
    setUpdateError(null);
    setUpdated(false);
    setIsUpdating(true);
    try {
      const resolvedTag = await resolveLinkedTag();
      if (!resolvedTag) {
        throw new Error('Linked engineering object tag could not be resolved');
      }

      const current = await apiClient.engineeringObjects.get(resolvedTag);
      const currentProperties = (current.properties ?? {}) as Record<string, unknown>;
      const values = getValues();
      const existingDetails = (currentProperties.details ?? {}) as Record<string, unknown>;
      const isVessel = values.equipmentMode !== EquipmentMode.TANK;
      const totalHeight = values.shellLength ?? 0;
      const pctOf = (level: number | undefined): number | null =>
        totalHeight > 0 && level != null ? Math.round((level / totalHeight) * 10000) / 100 : null;

      const details: Record<string, unknown> = {
        ...existingDetails,
        // DB-aligned keys (equipment_vessel / equipment_tank column names → camelCase)
        equipmentMode: values.equipmentMode,
        orientation: values.orientation,
        material: values.material ?? null,
        innerDiameterMm: values.insideDiameter ?? null,
        // Vessel-specific columns
        ...(isVessel && {
          tangentToTangentLengthMm: values.shellLength ?? null,
          wallThicknessMm: values.wallThickness ?? null,
          headType: values.headType ?? null,
          totalSurfaceAreaM2: calculationResult?.surfaceAreas.totalSurfaceArea ?? null,
        }),
        // Tank-specific columns
        ...(!isVessel && {
          heightMm: values.shellLength ?? null,
          tankType: values.tankType ?? null,
          roofType: values.tankRoofType ?? null,
        }),
        // Shared computed columns
        wettedAreaM2: calculationResult?.surfaceAreas.wettedSurfaceArea ?? null,
        volumeM3: calculationResult?.volumes.totalVolume ?? null,
        normalLiquidLevelPct: pctOf(values.liquidLevel),
        highLiquidLevelPct: pctOf(values.hll),
        lowLiquidLevelPct: pctOf(values.lll),
        // Full calculation snapshot
        vesselCalculation: {
          inputs: values,
          result: calculationResult ?? null,
          calculationMetadata,
          revisionHistory,
          syncedAt: new Date().toISOString(),
        },
      };

      await apiClient.engineeringObjects.upsert(resolvedTag, {
        object_type: current.object_type,
        status: current.status ?? undefined,
        properties: {
          ...currentProperties,
          details,
        },
      });

      setUpdated(true);
      setTimeout(() => setUpdated(false), 1600);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update equipment');
      setTimeout(() => setUpdateError(null), 4000);
    } finally {
      setIsUpdating(false);
    }
  };

  const updateLabel = useMemo(() => {
    if (isUpdating) return 'Updating...';
    if (updated) return 'Updated';
    return 'Update Equipment';
  }, [isUpdating, updated]);

  const UpdateIcon = isUpdating ? Loader2 : updated ? Check : Upload;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Menu className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setSaveOpen(true)}>
            Save calculation…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLoadOpen(true)}>
            Load calculation…
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleExportPdf}
            disabled={!calculationResult || pdfLoading}
            className="gap-2"
          >
            {pdfLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <FileDown className="h-4 w-4" />
            }
            {pdfLoading ? 'Generating PDF…' : 'Export PDF…'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLinkOpen(true)} className="gap-2">
            <LinkIcon className={`h-4 w-4 ${linkedEquipmentId ? 'text-green-600' : ''}`} />
            {linkedEquipmentTag ? `Linked: ${linkedEquipmentTag}` : linkedEquipmentId ? `Linked: ${linkedEquipmentId}` : 'Link equipment…'}
          </DropdownMenuItem>
          {linkedEquipmentId && (
            <DropdownMenuItem onClick={() => { void handleUpdateEquipment(); }} className="gap-2" disabled={isUpdating}>
              <UpdateIcon className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
              {updateLabel}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onClear} className="text-destructive focus:text-destructive">
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear all inputs
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {updateError && <p className="text-xs text-destructive">{updateError}</p>}

      <SaveCalculationButton
        controlledOpen={saveOpen}
        onControlledOpenChange={setSaveOpen}
        equipmentId={linkedEquipmentId}
        equipmentTag={linkedEquipmentTag}
        calculationMetadata={calculationMetadata}
        revisionHistory={revisionHistory}
        calculationResult={calculationResult}
      />
      <LoadCalculationButton
        controlledOpen={loadOpen}
        onControlledOpenChange={setLoadOpen}
        onCalculationLoaded={onCalculationLoaded}
        onEquipmentLinked={onEquipmentLinked}
      />
      <EquipmentLinkButton
        controlledOpen={linkOpen}
        onControlledOpenChange={setLinkOpen}
        linkedEquipmentId={linkedEquipmentId}
        linkedEquipmentTag={linkedEquipmentTag}
        onEquipmentLinked={onEquipmentLinked}
      />
    </>
  );
}
