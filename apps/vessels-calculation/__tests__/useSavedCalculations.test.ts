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
    window.localStorage.clear();
  });

  it('saves vessel geometry fields that previously dropped during load', async () => {
    calculations.create.mockResolvedValue({
      id: 'calc-1',
      tag: 'V-201',
      name: 'V-201 base case',
      description: 'booted vessel',
      inputs: {},
      status: 'draft',
      isActive: true,
    });

    const { result } = renderHook(() => useSavedCalculations());
    const inputs = {
      tag: 'V-201',
      bottomHeight: 850,
      bootInsideDiameter: 600,
      outletFittingDiameter: 250,
    };

    await act(async () => {
      await result.current.save({
        name: 'V-201 base case',
        description: 'booted vessel',
        inputs,
        results: { volume: 12.3 },
      });
    });

    expect(calculations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        app: 'vessels-calculation',
        inputs,
      }),
    );
  });

  it('loads vessel geometry fields back from the shared calculations API', async () => {
    calculations.list.mockResolvedValue([
      {
        id: 'calc-1',
        tag: 'V-201',
        name: 'V-201 base case',
        description: 'booted vessel',
        status: 'draft',
        isActive: true,
        inputs: {
          tag: 'V-201',
          bottomHeight: 850,
          bootInsideDiameter: 600,
          outletFittingDiameter: 250,
        },
      },
    ]);

    const { result } = renderHook(() => useSavedCalculations());

    await act(async () => {
      await result.current.fetchList();
    });

    expect(result.current.savedItems[0]?.inputs).toMatchObject({
      bottomHeight: 850,
      bootInsideDiameter: 600,
      outletFittingDiameter: 250,
    });
  });
});
