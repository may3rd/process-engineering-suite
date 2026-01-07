import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AreasTab } from "../AreasTab";

// Mock all dependencies to avoid complex setup
vi.mock("@/store/usePsvStore");
vi.mock("@/store/useAuthStore");
vi.mock("@/hooks/usePagination");
vi.mock("@/hooks/useLocalStorage");
vi.mock("../dashboard/AreaDialog");
vi.mock("../shared");

describe("AreasTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock minimal store returns
    const { usePsvStore } = vi.mocked(require("@/store/usePsvStore"));
    const { useAuthStore } = vi.mocked(require("@/store/useAuthStore"));
    const { usePagination } = vi.mocked(require("@/hooks/usePagination"));
    const { useLocalStorage } = vi.mocked(require("@/hooks/useLocalStorage"));

    usePsvStore.mockReturnValue({
      areas: [],
      units: [],
      projects: [],
      protectiveSystems: [],
      equipment: [],
      selectedUnit: null,
      addArea: vi.fn(),
      updateArea: vi.fn(),
      deleteArea: vi.fn(),
      softDeleteArea: vi.fn(),
      fetchAllAreas: vi.fn(),
      areAreasLoaded: true,
      fetchAllProjects: vi.fn(),
      areProjectsLoaded: true,
      fetchAllProtectiveSystems: vi.fn(),
      arePsvsLoaded: true,
      fetchAllEquipment: vi.fn(),
      areEquipmentLoaded: true,
      fetchSummaryCounts: vi.fn(),
      summaryCounts: { areas: 0, projects: 0, psvs: 0, equipment: 0 },
    });

    useAuthStore.mockReturnValue({
      canEdit: vi.fn(() => true),
      canApprove: vi.fn(() => true),
    });

    usePagination.mockReturnValue({
      currentPage: 1,
      totalPages: 1,
      startIndex: 0,
      endIndex: 0,
      goToPage: vi.fn(),
      nextPage: vi.fn(),
      prevPage: vi.fn(),
      paginatedItems: [],
    });

    useLocalStorage.mockReturnValue([15, vi.fn()]);
  });

  it("renders without crashing", () => {
    expect(() => render(<AreasTab />)).not.toThrow();
  });

  it("renders basic structure", () => {
    render(<AreasTab />);

    // Should render some basic elements - check for common text
    expect(screen.getByText(/Areas/)).toBeInTheDocument();
  });
});
