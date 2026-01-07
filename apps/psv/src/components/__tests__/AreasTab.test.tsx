import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AreasTab } from "../AreasTab";
import { usePsvStore } from "@/store/usePsvStore";
import { useAuthStore } from "@/store/useAuthStore";
import { usePagination } from "@/hooks/usePagination";
import { useLocalStorage } from "@/hooks/useLocalStorage";

// Mock all dependencies
vi.mock("@/store/usePsvStore");
vi.mock("@/store/useAuthStore");
vi.mock("@/hooks/usePagination");
vi.mock("@/hooks/useLocalStorage");
vi.mock("../dashboard/AreaDialog");
vi.mock("../shared");

const createMockStore = (overrides = {}) => ({
  // Selection state
  selection: {},
  selectedCustomer: null,
  selectedPlant: null,
  selectedUnit: {
    id: "unit1",
    name: "Test Unit",
    plantId: "plant1",
    status: "active" as const,
  },
  selectedArea: null,
  selectedPsv: null,
  selectedProject: null,

  // Data arrays
  customers: [],
  plants: [],
  units: [
    {
      id: "unit1",
      name: "Test Unit",
      plantId: "plant1",
      status: "active" as const,
    },
  ],
  areas: [
    {
      id: "area1",
      code: "AREA001",
      name: "Test Area 1",
      unitId: "unit1",
      status: "active" as const,
      createdAt: "2024-01-01T00:00:00Z",
    },
  ],
  projects: [],
  protectiveSystems: [],
  equipment: [],
  psvRevisions: [],
  sizingCaseList: [],
  scenarioList: [],

  // UI state
  activeTab: "overview",
  dashboardTab: null,
  isLoading: false,

  // Actions
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
  summaryCounts: { areas: 1, projects: 0, psvs: 0, equipment: 0 },

  // Required methods
  selectCustomer: vi.fn(),
  selectPlant: vi.fn(),
  selectUnit: vi.fn(),
  selectArea: vi.fn(),
  selectPsv: vi.fn(),
  selectProject: vi.fn(),
  setActiveTab: vi.fn(),
  setDashboardTab: vi.fn(),
  addCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
  addPlant: vi.fn(),
  updatePlant: vi.fn(),
  deletePlant: vi.fn(),
  addUnit: vi.fn(),
  updateUnit: vi.fn(),
  deleteUnit: vi.fn(),
  addProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  addProtectiveSystem: vi.fn(),
  updatePsv: vi.fn(),
  deleteProtectiveSystem: vi.fn(),
  softDeletePsv: vi.fn(),
  addEquipment: vi.fn(),
  updateEquipment: vi.fn(),
  deleteEquipment: vi.fn(),
  updateSizingCase: vi.fn(),
  deleteSizingCase: vi.fn(),
  loadRevisionHistory: vi.fn(),
  ...overrides,
});

describe("AreasTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePsvStore).mockImplementation((selector) => {
      const mockState = createMockStore() as any;
      return selector ? selector(mockState) : mockState;
    });

    vi.mocked(useAuthStore).mockReturnValue({
      canEdit: vi.fn(() => true),
      canApprove: vi.fn(() => true),
    });

    vi.mocked(usePagination).mockReturnValue({
      currentPage: 1,
      totalPages: 1,
      startIndex: 0,
      endIndex: 1,
      goToPage: vi.fn(),
      nextPage: vi.fn(),
      prevPage: vi.fn(),
      hasNextPage: false,
      hasPrevPage: false,
      pageNumbers: [1],
      pageItems: [
        {
          id: "area1",
          code: "AREA001",
          name: "Test Area 1",
          unitId: "unit1",
          status: "active" as const,
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
    });

    vi.mocked(useLocalStorage).mockReturnValue([15, vi.fn()]);
  });

  describe("Initial Rendering", () => {
    it("renders without crashing", () => {
      expect(() => render(<AreasTab />)).not.toThrow();
    });

    it("renders basic structure", () => {
      render(<AreasTab />);

      expect(screen.getByText("Add New Area")).toBeInTheDocument();
      expect(screen.getByText("Code")).toBeInTheDocument();
      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    it("shows add button for users with edit permissions", () => {
      render(<AreasTab />);

      const addButton = screen.getByText("Add New Area");
      expect(addButton).toBeInTheDocument();
    });

    it("hides add button for users without edit permissions", () => {
      vi.mocked(useAuthStore).mockReturnValue({
        canEdit: vi.fn(() => false),
        canApprove: vi.fn(() => false),
      });

      render(<AreasTab />);

      const addButton = screen.queryByText("Add New Area");
      expect(addButton).not.toBeInTheDocument();
    });
  });

  describe("Data Loading", () => {
    it("loads areas on mount if not loaded", () => {
      const mockFetchAllAreas = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          areAreasLoaded: false,
          fetchAllAreas: mockFetchAllAreas,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<AreasTab />);

      expect(mockFetchAllAreas).toHaveBeenCalled();
    });

    it("loads summary counts on mount", () => {
      const mockFetchSummaryCounts = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          fetchSummaryCounts: mockFetchSummaryCounts,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<AreasTab />);

      expect(mockFetchSummaryCounts).toHaveBeenCalled();
    });
  });
});
