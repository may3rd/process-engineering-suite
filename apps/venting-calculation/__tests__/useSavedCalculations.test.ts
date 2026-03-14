import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSavedCalculations } from '@/lib/hooks/useSavedCalculations';

const { calculations } = vi.hoisted(() => ({
  calculations: {
    create: vi.fn(),
    saveVersion: vi.fn(),
    list: vi.fn(),
    softDelete: vi.fn(),
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

  it('saves linked equipment and stream arrays into the shared calculations payload', async () => {
    calculations.create.mockResolvedValue({
      id: 'calc-1',
      app: 'venting-calculation',
      name: 'T-100 base case',
      description: 'linked tank',
      status: 'draft',
      isActive: true,
      inputs: {},
    });

    const { result } = renderHook(() => useSavedCalculations());
    const inputs = {
      tankNumber: 'T-100',
      apiEdition: '7TH',
      incomingStreams: [
        { streamNo: '1', description: 'Feed', flowrate: 120 },
        { streamNo: '2', description: 'Recycle', flowrate: 40 },
      ],
      outgoingStreams: [
        { streamNo: '3', description: 'Product', flowrate: 100 },
      ],
    };

    await act(async () => {
      await result.current.save(
        'T-100 base case',
        inputs,
        { summary: { designOutbreathing: 123.4 } },
        'tank-123',
        {
          projectNumber: 'P1',
          documentNumber: 'DOC-1',
          title: 'Venting Calc',
          projectName: 'Proj',
          client: 'Client',
        },
        [{ rev: '0', by: 'EE', checkedBy: '', approvedBy: '' }],
      );
    });

    expect(calculations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        app: 'venting-calculation',
        inputs,
        linkedEquipmentId: 'tank-123',
      }),
    );
  });

  it('maps shared calculation rows back to venting calculation fields without dropping arrays or links', async () => {
    calculations.list.mockResolvedValue([
      {
        id: 'calc-1',
        app: 'venting-calculation',
        name: 'T-100 base case',
        description: 'linked tank',
        status: 'draft',
        isActive: true,
        inputs: {
          tankNumber: 'T-100',
          apiEdition: '7TH',
          incomingStreams: [
            { streamNo: '1', description: 'Feed', flowrate: 120 },
            { streamNo: '2', description: 'Recycle', flowrate: 40 },
          ],
          outgoingStreams: [
            { streamNo: '3', description: 'Product', flowrate: 100 },
          ],
        },
        linkedEquipmentId: 'tank-123',
        linkedEquipmentTag: 'T-100',
        metadata: { title: 'Venting Calc' },
      },
    ]);

    const { result } = renderHook(() => useSavedCalculations());

    await act(async () => {
      await result.current.fetchList();
    });

    expect(result.current.savedItems[0]).toMatchObject({
      equipmentId: 'tank-123',
      equipmentTag: 'T-100',
      apiEdition: '7TH',
    });
    expect(result.current.savedItems[0]?.inputs).toMatchObject({
      incomingStreams: [
        { streamNo: '1', description: 'Feed', flowrate: 120 },
        { streamNo: '2', description: 'Recycle', flowrate: 40 },
      ],
      outgoingStreams: [
        { streamNo: '3', description: 'Product', flowrate: 100 },
      ],
    });
  });
});
