import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSavedCalculations } from '@/lib/hooks/useSavedCalculations';

const { calculations } = vi.hoisted(() => ({
  calculations: {
    create: vi.fn(),
    saveVersion: vi.fn(),
    list: vi.fn(),
    softDelete: vi.fn(),
    get: vi.fn(),
    restoreVersion: vi.fn(),
  },
}));

vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    calculations,
  },
}));

describe('useSavedCalculations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves the full advanced pump payload without dropping optional fields', async () => {
    calculations.create.mockResolvedValue({
      id: 'calc-1',
      tag: 'P-101',
      name: 'P-101 base case',
      description: 'advanced case',
      inputs: {},
      status: 'draft',
      isActive: true,
    });

    const { result } = renderHook(() => useSavedCalculations());
    const inputs = {
      tag: 'P-101',
      showOrifice: true,
      orificePipeId: 50,
      orificeBeta: 0.61,
      showControlValve: true,
      cvFlowRatio: 0.72,
      cvValveType: 'globe',
      dischargeControlValveDp: 18,
      isExistingSystem: true,
      pdSubtype: 'plunger',
      pumpSpeed: 3600,
      specificHeat: 4.2,
      allowedTempRise: 12,
      showShutoff: true,
      shutoffMethod: 'known_head',
      knownShutoffHead: 122,
      shutoffCurveFactor: 1.08,
      shutoffRatio: 1.25,
      suctionSourceType: 'vessel',
      dischargeDestType: 'column',
    };

    await act(async () => {
      await result.current.save({
        name: 'P-101 base case',
        description: 'advanced case',
        inputs,
        results: { differentialHead: 12.3 },
        equipmentId: 'pump-123',
        equipmentTag: 'P-101',
        calculationMetadata: {
          projectNumber: 'P1',
          documentNumber: 'DOC-1',
          title: 'Pump Calc',
          projectName: 'Proj',
          client: 'Client',
        },
        revisionHistory: [{ rev: '0', by: 'EE', checkedBy: '', approvedBy: '' }],
      });
    });

    expect(calculations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        app: 'pump-calculation',
        inputs,
        linkedEquipmentId: 'pump-123',
        linkedEquipmentTag: 'P-101',
      }),
    );
  });

  it('loads the exact saved pump inputs back into savedItems', async () => {
    calculations.list.mockResolvedValue([
      {
        id: 'calc-1',
        tag: 'P-101',
        name: 'P-101 base case',
        description: 'advanced case',
        status: 'draft',
        isActive: true,
        inputs: {
          tag: 'P-101',
          dischargeControlValveDp: 18,
          isExistingSystem: true,
          pdSubtype: 'plunger',
          pumpSpeed: 3600,
          compressibilityFactor: 0.98,
          orificePipeId: 50,
          orificeBeta: 0.61,
          cvFlowRatio: 0.72,
          cvValveType: 'globe',
          specificHeat: 4.2,
          allowedTempRise: 12,
          shutoffMethod: 'known_head',
          knownShutoffHead: 122,
          shutoffCurveFactor: 1.08,
          shutoffRatio: 1.25,
          suctionSourceType: 'vessel',
          dischargeDestType: 'column',
        },
        linkedEquipmentId: 'pump-123',
        linkedEquipmentTag: 'P-101',
        metadata: { title: 'Pump Calc' },
        revisionHistory: [{ rev: '0', by: 'EE', checkedBy: '', approvedBy: '' }],
      },
    ]);

    const { result } = renderHook(() => useSavedCalculations());

    await act(async () => {
      await result.current.fetchList();
    });

    expect(result.current.savedItems[0]?.inputs).toMatchObject({
      dischargeControlValveDp: 18,
      isExistingSystem: true,
      pdSubtype: 'plunger',
      pumpSpeed: 3600,
      compressibilityFactor: 0.98,
      orificePipeId: 50,
      orificeBeta: 0.61,
      cvFlowRatio: 0.72,
      cvValveType: 'globe',
      specificHeat: 4.2,
      allowedTempRise: 12,
      shutoffMethod: 'known_head',
      knownShutoffHead: 122,
      shutoffCurveFactor: 1.08,
      shutoffRatio: 1.25,
      suctionSourceType: 'vessel',
      dischargeDestType: 'column',
    });
  });
});
