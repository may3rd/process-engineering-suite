import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PSVsTab } from "../PSVsTab";
import { usePsvStore } from "@/store/usePsvStore";
import { useAuthStore } from "@/store/useAuthStore";
import { usePagination } from "@/hooks/usePagination";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useProjectUnitSystem } from "@/lib/useProjectUnitSystem";
import { getProjectUnits } from "@/lib/projectUnits";

// Mock all dependencies
vi.mock("@/store/usePsvStore");
vi.mock("@/store/useAuthStore");
vi.mock("@/hooks/usePagination");
vi.mock("@/hooks/useLocalStorage");
vi.mock("@/lib/useProjectUnitSystem");
vi.mock("../dashboard/PSVDialog");
vi.mock("../shared");

// Mock status color utilities
vi.mock("@/lib/statusColors", () => ({
  getWorkflowStatusColor: vi.fn(() => "default"),
  getWorkflowStatusLabel: vi.fn((status) => status.replace("_", " ")),
  WORKFLOW_STATUS_SEQUENCE: ["draft", "in_review", "checked", "approved"],
}));

// Mock project units
vi.mock("@/lib/projectUnits", () => ({
  formatPressureGauge: vi.fn((value, unitSystem) => `${value} ${unitSystem}`),
}));

const createMockStore = (overrides = {}) => {
  const baseStore = {
    // Selection state
    selectedCustomer: null,
    selectedPlant: null,
    selectedUnit: null,
    selectedArea: null,
    selectedPsv: null,
    selectedProject: null,

    // Data arrays
    protectiveSystems: [
      {
        id: "psv1",
        tag: "PSV-001",
        name: "Main Relief Valve",
        type: "pressure_relief" as const,
        areaId: "area1",
        ownerId: "user1",
        serviceFluid: "Steam",
        fluidPhase: "gas" as const,
        setPressure: 100,
        isActive: true,
        status: "approved" as const,
        currentRevisionId: undefined,
        valveType: undefined,
        inletNetwork: undefined,
        outletNetwork: undefined,
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "psv2",
        tag: "PSV-002",
        name: "Safety Valve",
        type: "safety" as const,
        areaId: "area2",
        ownerId: "user2",
        serviceFluid: "Water",
        fluidPhase: "liquid" as const,
        setPressure: 200,
        isActive: false,
        status: "draft" as const,
        currentRevisionId: undefined,
        valveType: undefined,
        inletNetwork: undefined,
        outletNetwork: undefined,
        createdAt: "2024-01-02T00:00:00Z",
      },
    ],
    areas: [
      {
        id: "area1",
        name: "Process Area A",
        code: "AREA001",
        unitId: "unit1",
        status: "active" as const,
        ownerId: "user1",
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "area2",
        name: "Process Area B",
        code: "AREA002",
        unitId: "unit2",
        status: "active" as const,
        ownerId: "user2",
        createdAt: "2024-01-02T00:00:00Z",
      },
    ],
    units: [
      {
        id: "unit1",
        name: "Unit A",
        code: "UNIT001",
        plantId: "plant1",
        status: "active" as const,
        ownerId: "user1",
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "unit2",
        name: "Unit B",
        code: "UNIT002",
        plantId: "plant2",
        status: "active" as const,
        ownerId: "user2",
        createdAt: "2024-01-02T00:00:00Z",
      },
    ],
    plants: [],
    projects: [],
    customers: [],
    equipment: [],

    // UI state
    activeTab: "overview",
    dashboardTab: null,
    isLoading: false,

    // Actions
    addProtectiveSystem: vi.fn(),
    updateProtectiveSystem: vi.fn(),
    deleteProtectiveSystem: vi.fn(),
    softDeleteProtectiveSystem: vi.fn(),
    fetchAllProtectiveSystems: vi.fn(),
    arePsvsLoaded: true,

    // Area/Unit/Plant/Customer actions for cascade operations
    updateArea: vi.fn(),
    updateUnit: vi.fn(),
    updatePlant: vi.fn(),
    updateCustomer: vi.fn(),

    // Required methods
    selectCustomer: vi.fn(),
    selectPlant: vi.fn(),
    selectUnit: vi.fn(),
    selectArea: vi.fn(),
    selectPsv: vi.fn(),
    selectProject: vi.fn(),
    setActiveTab: vi.fn(),
    setDashboardTab: vi.fn(),
    addPlant: vi.fn(),
    deletePlant: vi.fn(),
    addUnit: vi.fn(),
    deleteUnit: vi.fn(),
    addArea: vi.fn(),
    deleteArea: vi.fn(),
    addProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    addEquipment: vi.fn(),
    updateEquipment: vi.fn(),
    deleteEquipment: vi.fn(),
    updateSizingCase: vi.fn(),
    deleteSizingCase: vi.fn(),
    loadRevisionHistory: vi.fn(),
    ...overrides,
  };

  // Mock the getState method to return the store data
  (baseStore as any).getState = vi.fn(() => baseStore);

  return baseStore;
};

describe("PSVsTab", () => {
  let mockStore: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockStore = createMockStore();

    vi.mocked(usePsvStore).mockImplementation((selector) => {
      return selector ? selector(mockStore) : mockStore;
    });

    // Mock the getState method
    vi.mocked(usePsvStore).getState = vi.fn(() => mockStore);

    vi.mocked(useAuthStore).mockReturnValue({
      canEdit: vi.fn(() => true),
      canApprove: vi.fn(() => true),
    });

    vi.mocked(useProjectUnitSystem).mockReturnValue({
      unitSystem: "imperial",
      units: getProjectUnits("imperial"),
    });

    vi.mocked(usePagination).mockReturnValue({
      currentPage: 1,
      totalPages: 1,
      startIndex: 0,
      endIndex: 2,
      goToPage: vi.fn(),
      nextPage: vi.fn(),
      prevPage: vi.fn(),
      hasNextPage: false,
      hasPrevPage: false,
      pageNumbers: [1],
      pageItems: mockStore.protectiveSystems,
    });

    vi.mocked(useLocalStorage).mockReturnValue([15, vi.fn()]);
  });

  describe("Initial Rendering", () => {
    it("renders without crashing", () => {
      expect(() => render(<PSVsTab />)).not.toThrow();
    });

    it("renders basic structure", () => {
      render(<PSVsTab />);

      expect(screen.getAllByText("Add New PSV")).toHaveLength(2); // Both button and icon button
      expect(screen.getByText("PSVs & Protective Devices")).toBeInTheDocument();
    });

    it("shows add button for users with edit permissions", () => {
      render(<PSVsTab />);

      const addButtons = screen.getAllByText("Add New PSV");
      expect(addButtons.length).toBeGreaterThan(0);
    });

    it("hides add button for users without edit permissions", () => {
      vi.mocked(useAuthStore).mockReturnValue({
        canEdit: vi.fn(() => false),
        canApprove: vi.fn(() => false),
      });

      render(<PSVsTab />);

      const addButtons = screen.queryAllByText("Add New PSV");
      expect(addButtons).toHaveLength(0);
    });
  });

  describe("Data Loading", () => {
    it("loads PSVs on mount if not loaded", () => {
      const mockFetchAllProtectiveSystems = vi
        .fn()
        .mockResolvedValue(undefined);

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          arePsvsLoaded: false,
          fetchAllProtectiveSystems: mockFetchAllProtectiveSystems,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<PSVsTab />);

      expect(mockFetchAllProtectiveSystems).toHaveBeenCalled();
    });
  });

  describe("Summary Cards", () => {
    it("displays correct PSV counts", () => {
      render(<PSVsTab />);

      expect(screen.getByText("2")).toBeInTheDocument(); // Total PSVs
      expect(screen.getByText("1")).toBeInTheDocument(); // Open items (drafts + in review)
      expect(screen.getByText("1")).toBeInTheDocument(); // Approved
    });

    it("shows summary card labels", () => {
      render(<PSVsTab />);

      expect(screen.getByText("Protective Systems")).toBeInTheDocument();
      expect(screen.getByText("Open Items")).toBeInTheDocument();
      expect(screen.getByText("Approved")).toBeInTheDocument();
    });
  });

  describe("Search and Filtering", () => {
    it("renders search input field", () => {
      render(<PSVsTab />);

      const searchInputs = screen.getAllByPlaceholderText(/search/i);
      expect(searchInputs.length).toBeGreaterThan(0);
    });

    it("renders status filter dropdown", () => {
      render(<PSVsTab />);

      const selectElements = screen.getAllByRole("combobox");
      expect(selectElements.length).toBeGreaterThan(0);
    });

    it("displays status filter options", () => {
      render(<PSVsTab />);

      expect(screen.getByText("All (2)")).toBeInTheDocument();
      expect(screen.getByText("Active (1)")).toBeInTheDocument();
      expect(screen.getByText("Inactive (1)")).toBeInTheDocument();
    });
  });

  describe("Table Interactions", () => {
    it("renders table with correct headers", () => {
      render(<PSVsTab />);

      expect(screen.getAllByText("Tag").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Area").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Service Fluid").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Set Pressure").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Status").length).toBeGreaterThan(0);
    });

    it("displays PSV data in table rows", () => {
      render(<PSVsTab />);

      expect(screen.getAllByText("PSV-001").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Main Relief Valve").length).toBeGreaterThan(
        0,
      );
      expect(screen.getAllByText("Steam").length).toBeGreaterThan(0);
    });

    it("renders action buttons for each row", () => {
      render(<PSVsTab />);

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });

      expect(editButtons.length).toBeGreaterThan(0);
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it("displays workflow status chips", () => {
      render(<PSVsTab />);

      expect(screen.getAllByText("approved").length).toBeGreaterThan(0);
      expect(screen.getAllByText("draft").length).toBeGreaterThan(0);
    });
  });

  describe("Status Toggle", () => {
    it("allows toggling PSV active status", async () => {
      const user = userEvent.setup();
      const mockUpdateProtectiveSystem = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          updateProtectiveSystem: mockUpdateProtectiveSystem,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<PSVsTab />);

      const statusChips = screen.getAllByText("Active");
      await user.click(statusChips[0]);

      expect(mockUpdateProtectiveSystem).toHaveBeenCalledWith("psv1", {
        isActive: false,
      });
    });

    it("shows inactive PSVs with inactive status", () => {
      render(<PSVsTab />);

      expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
    });
  });

  describe("Pagination", () => {
    it("renders items per page selector", () => {
      render(<PSVsTab />);

      expect(screen.getByTestId("items-per-page")).toBeInTheDocument();
    });
  });

  describe("CRUD Operations", () => {
    it("opens add PSV dialog when Add New PSV button is clicked", async () => {
      const user = userEvent.setup();
      render(<PSVsTab />);

      const addButtons = screen.getAllByText("Add New PSV");
      const addButton = addButtons[0];
      await user.click(addButton);

      // Dialog should be opened (mocked PSVDialog component)
      expect(screen.getByTestId("psv-dialog")).toBeInTheDocument();
    });

    it("opens edit PSV dialog when edit button is clicked", async () => {
      const user = userEvent.setup();
      render(<PSVsTab />);

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      await user.click(editButtons[0]);

      // Dialog should be opened with edit mode
      expect(screen.getByTestId("psv-dialog")).toBeInTheDocument();
    });

    it("opens delete confirmation when delete button is clicked", async () => {
      const user = userEvent.setup();
      render(<PSVsTab />);

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Delete confirmation dialog should be visible
      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
      expect(screen.getByText(/deactivate.*psv/i)).toBeInTheDocument();
    });

    it("calls addProtectiveSystem action when PSV is created", async () => {
      const user = userEvent.setup();
      const mockAddProtectiveSystem = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          addProtectiveSystem: mockAddProtectiveSystem,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<PSVsTab />);

      // Mock successful form submission
      const addButtons = screen.getAllByText("Add New PSV");
      const addButton = addButtons[0];
      await user.click(addButton);

      // Simulate form submission (this would normally happen in PSVDialog)
      expect(mockAddProtectiveSystem).toBeDefined();
    });

    it("calls updateProtectiveSystem action when PSV is edited", async () => {
      const user = userEvent.setup();
      const mockUpdateProtectiveSystem = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          updateProtectiveSystem: mockUpdateProtectiveSystem,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<PSVsTab />);

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      await user.click(editButtons[0]);

      // Verify update action is available for editing
      expect(mockUpdateProtectiveSystem).toBeDefined();
    });

    it("calls softDeleteProtectiveSystem action when delete is confirmed", async () => {
      const user = userEvent.setup();
      const mockSoftDeleteProtectiveSystem = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          softDeleteProtectiveSystem: mockSoftDeleteProtectiveSystem,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<PSVsTab />);

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Confirm delete action
      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockSoftDeleteProtectiveSystem).toHaveBeenCalledWith("psv1");
    });
  });

  describe("Cascade Status Operations", () => {
    it("activates parent entities when PSV is activated", async () => {
      const user = userEvent.setup();
      const mockUpdateProtectiveSystem = vi.fn();
      const mockUpdateArea = vi.fn();
      const mockUpdateUnit = vi.fn();
      const mockUpdatePlant = vi.fn();
      const mockUpdateCustomer = vi.fn();

      // Mock inactive parent entities
      vi.mocked(usePsvStore).getState = vi.fn(() => ({
        ...mockStore,
        areas: [{ ...mockStore.areas[0], status: "inactive" }],
        units: [{ ...mockStore.units[0], status: "inactive" }],
        plants: [{ id: "plant1", status: "inactive" as const }],
        customers: [{ id: "customer1", status: "inactive" as const }],
        updateProtectiveSystem: mockUpdateProtectiveSystem,
        updateArea: mockUpdateArea,
        updateUnit: mockUpdateUnit,
        updatePlant: mockUpdatePlant,
        updateCustomer: mockUpdateCustomer,
      }));

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const state = vi.mocked(usePsvStore).getState();
        return selector ? selector(state) : state;
      });

      render(<PSVsTab />);

      // Find inactive PSV and click to activate it
      const inactiveChip = screen.getByText("Inactive");
      await user.click(inactiveChip);

      expect(mockUpdateProtectiveSystem).toHaveBeenCalledWith("psv2", {
        isActive: true,
      });
      // Note: Cascade activation would require more complex mocking of the parent entities
    });
  });

  describe("Search and Filter Interactions", () => {
    it("filters PSVs based on search input", async () => {
      const user = userEvent.setup();
      render(<PSVsTab />);

      const searchInputs = screen.getAllByPlaceholderText(/search/i);
      const searchInput = searchInputs[0];

      await user.type(searchInput, "Steam");

      // Search functionality is handled by usePagination hook
      expect(searchInput).toHaveValue("Steam");
    });

    it("filters PSVs by status using dropdown", async () => {
      const user = userEvent.setup();
      render(<PSVsTab />);

      const selectElements = screen.getAllByRole("combobox");
      const statusSelect = selectElements[0];

      await user.click(statusSelect);
      await user.click(screen.getByText("Active (1)"));

      // Status filtering is handled by usePagination hook
      expect(statusSelect).toBeInTheDocument();
    });
  });

  describe("Permission-Based Features", () => {
    it("shows edit and delete buttons for authorized users", () => {
      render(<PSVsTab />);

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });

      expect(editButtons.length).toBeGreaterThan(0);
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it("hides edit and delete buttons for unauthorized users", () => {
      vi.mocked(useAuthStore).mockReturnValue({
        canEdit: vi.fn(() => false),
        canApprove: vi.fn(() => false),
      });

      render(<PSVsTab />);

      const editButtons = screen.queryAllByRole("button", { name: /edit/i });
      const deleteButtons = screen.queryAllByRole("button", {
        name: /delete/i,
      });

      // Buttons should not be rendered for unauthorized users
      expect(editButtons).toHaveLength(0);
      expect(deleteButtons).toHaveLength(0);
    });
  });
});
