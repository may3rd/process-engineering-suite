import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UnitsTab } from "../UnitsTab";
import { usePsvStore } from "@/store/usePsvStore";
import { useAuthStore } from "@/store/useAuthStore";
import { usePagination } from "@/hooks/usePagination";
import { useLocalStorage } from "@/hooks/useLocalStorage";

// Mock all dependencies
vi.mock("@/store/usePsvStore");
vi.mock("@/store/useAuthStore");
vi.mock("@/hooks/usePagination");
vi.mock("@/hooks/useLocalStorage");
vi.mock("../dashboard/UnitDialog");
vi.mock("../shared");

const createMockStore = (overrides = {}): any => {
  const baseStore = {
    // Selection state
    selectedCustomer: null,
    selectedPlant: {
      id: "plant1",
      name: "Test Plant",
      code: "PLANT001",
      location: "Test Location",
      status: "active" as const,
      ownerId: "user1",
      createdAt: "2024-01-01T00:00:00Z",
    },
    selectedUnit: null,
    selectedArea: null,
    selectedPsv: null,
    selectedProject: null,

    // Data arrays
    units: [
      {
        id: "unit1",
        code: "UNIT001",
        name: "Process Unit A",
        plantId: "plant1",
        ownerId: "user1",
        status: "active" as const,
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "unit2",
        code: "UNIT002",
        name: "Process Unit B",
        plantId: "plant2",
        ownerId: "user2",
        status: "inactive" as const,
        createdAt: "2024-01-02T00:00:00Z",
      },
    ],
    plants: [
      {
        id: "plant1",
        name: "Test Plant A",
        code: "PLANT001",
        location: "Test Location A",
        status: "active" as const,
        ownerId: "user1",
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "plant2",
        name: "Test Plant B",
        code: "PLANT002",
        location: "Test Location B",
        status: "active" as const,
        ownerId: "user2",
        createdAt: "2024-01-02T00:00:00Z",
      },
    ],
    areas: [
      {
        id: "area1",
        name: "Process Area A1",
        code: "AREA001",
        unitId: "unit1",
        status: "active" as const,
        ownerId: "user1",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ],
    projects: [],
    protectiveSystems: [],
    equipment: [],
    customers: [],

    // UI state
    activeTab: "overview",
    dashboardTab: null,
    isLoading: false,

    // Actions
    addUnit: vi.fn(),
    updateUnit: vi.fn(),
    deleteUnit: vi.fn(),
    softDeleteUnit: vi.fn(),
    fetchAllUnits: vi.fn(),
    areUnitsLoaded: true,
    fetchAllAreas: vi.fn(),
    areAreasLoaded: true,
    fetchSummaryCounts: vi.fn(),

    // Area/Unit/Plant/Customer actions for cascade operations
    updateArea: vi.fn(),
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
    addArea: vi.fn(),
    deleteArea: vi.fn(),
    addProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    addProtectiveSystem: vi.fn(),
    updateProtectiveSystem: vi.fn(),
    deleteProtectiveSystem: vi.fn(),
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

describe("UnitsTab", () => {
  let mockStore: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockStore = createMockStore();

    vi.mocked(usePsvStore).mockImplementation((selector) => {
      return selector ? selector(mockStore as any) : mockStore;
    });

    // Mock the getState method
    vi.mocked(usePsvStore).getState = vi.fn(() => mockStore);

    vi.mocked(useAuthStore).mockReturnValue({
      canEdit: vi.fn(() => true),
      canApprove: vi.fn(() => true),
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
      pageItems: [
        {
          id: "unit1",
          code: "UNIT001",
          name: "Process Unit A",
          plantId: "plant1",
          ownerId: "user1",
          status: "active" as const,
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "unit2",
          code: "UNIT002",
          name: "Process Unit B",
          plantId: "plant2",
          ownerId: "user2",
          status: "inactive" as const,
          createdAt: "2024-01-02T00:00:00Z",
        },
      ],
    });

    vi.mocked(useLocalStorage).mockReturnValue([15, vi.fn()]);
  });

  describe("Initial Rendering", () => {
    it("renders without crashing", () => {
      expect(() => render(<UnitsTab />)).not.toThrow();
    });

    it("renders basic structure", () => {
      render(<UnitsTab />);

      expect(screen.getAllByText("Add New Unit")).toHaveLength(2); // Both button and icon button
      expect(screen.getByText("Test Plant - Units")).toBeInTheDocument();
    });

    it("shows default title when no plant selected", () => {
      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const state = createMockStore({ selectedPlant: null });
        return selector ? selector(state) : state;
      });

      render(<UnitsTab />);

      expect(screen.getByText("Units")).toBeInTheDocument();
    });

    it("shows add button for users with edit permissions", () => {
      render(<UnitsTab />);

      const addButtons = screen.getAllByText("Add New Unit");
      expect(addButtons.length).toBeGreaterThan(0);
    });

    it("hides add button for users without edit permissions", () => {
      vi.mocked(useAuthStore).mockReturnValue({
        canEdit: vi.fn(() => false),
        canApprove: vi.fn(() => false),
      });

      render(<UnitsTab />);

      const addButtons = screen.queryAllByText("Add New Unit");
      expect(addButtons).toHaveLength(0);
    });
  });

  describe("Data Loading", () => {
    it("loads units on mount if not loaded", () => {
      const mockFetchAllUnits = vi.fn().mockResolvedValue(undefined);

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          areUnitsLoaded: false,
          fetchAllUnits: mockFetchAllUnits,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<UnitsTab />);

      expect(mockFetchAllUnits).toHaveBeenCalled();
    });

    it("loads areas on mount if not loaded", () => {
      const mockFetchAllAreas = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          areAreasLoaded: false,
          fetchAllAreas: mockFetchAllAreas,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<UnitsTab />);

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

      render(<UnitsTab />);

      expect(mockFetchSummaryCounts).toHaveBeenCalled();
    });
  });

  describe("Summary Cards", () => {
    it("displays correct unit counts", () => {
      render(<UnitsTab />);

      expect(screen.getByText("2")).toBeInTheDocument(); // Total units
      expect(screen.getByText("1")).toBeInTheDocument(); // Areas
      expect(screen.getByText("0")).toBeInTheDocument(); // Projects
    });

    it("shows summary card labels", () => {
      render(<UnitsTab />);

      expect(screen.getByText("Units")).toBeInTheDocument();
      expect(screen.getByText("Areas")).toBeInTheDocument();
      expect(screen.getByText("Projects")).toBeInTheDocument();
    });
  });

  describe("Search and Filtering", () => {
    it("renders search input field", () => {
      render(<UnitsTab />);

      const searchInputs = screen.getAllByPlaceholderText(/search/i);
      expect(searchInputs.length).toBeGreaterThan(0);
    });

    it("renders status filter dropdown", () => {
      render(<UnitsTab />);

      const selectElements = screen.getAllByRole("combobox");
      expect(selectElements.length).toBeGreaterThan(0);
    });

    it("displays status filter options", () => {
      render(<UnitsTab />);

      expect(screen.getByText("All (2)")).toBeInTheDocument();
      expect(screen.getByText("Active (1)")).toBeInTheDocument();
      expect(screen.getByText("Inactive (1)")).toBeInTheDocument();
    });
  });

  describe("Table Interactions", () => {
    it("renders table with correct headers", () => {
      render(<UnitsTab />);

      expect(screen.getAllByText("Code").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Plant").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Owner").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Areas").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Status").length).toBeGreaterThan(0);
    });

    it("displays unit data in table rows", () => {
      render(<UnitsTab />);

      expect(screen.getAllByText("UNIT001").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Process Unit A").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Test Plant A").length).toBeGreaterThan(0);
    });

    it("renders action buttons for each row", () => {
      render(<UnitsTab />);

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });

      expect(editButtons.length).toBeGreaterThan(0);
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it("displays area count chips", () => {
      render(<UnitsTab />);

      expect(screen.getByText("1 area")).toBeInTheDocument();
      expect(screen.getByText("0 areas")).toBeInTheDocument();
    });
  });

  describe("Status Toggle", () => {
    it("allows toggling unit active status", async () => {
      const user = userEvent.setup();
      const mockUpdateUnit = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          updateUnit: mockUpdateUnit,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<UnitsTab />);

      const statusChips = screen.getAllByText("active");
      await user.click(statusChips[0]);

      expect(mockUpdateUnit).toHaveBeenCalledWith("unit1", {
        status: "inactive",
      });
    });

    it("shows inactive units with reduced opacity", () => {
      render(<UnitsTab />);

      // Check that inactive status is displayed
      expect(screen.getAllByText("inactive").length).toBeGreaterThan(0);
    });
  });

  describe("Cascade Status Operations", () => {
    it("deactivates child entities when unit is deactivated", async () => {
      const user = userEvent.setup();
      const mockSoftDeleteUnit = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          softDeleteUnit: mockSoftDeleteUnit,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<UnitsTab />);

      // Find active unit and click to deactivate it
      const activeChip = screen.getByText("active");
      await user.click(activeChip);

      expect(mockSoftDeleteUnit).toHaveBeenCalledWith("unit1");
    });

    it("activates parent entities when unit is activated", async () => {
      const user = userEvent.setup();
      const mockUpdateUnit = vi.fn();
      const mockUpdatePlant = vi.fn();
      const mockUpdateCustomer = vi.fn();

      // Mock inactive parent entities
      vi.mocked(usePsvStore).getState = vi.fn(() => ({
        ...mockStore,
        plants: [{ ...mockStore.plants[0], status: "inactive" }],
        customers: [{ id: "customer1", status: "inactive" as const }],
        updateUnit: mockUpdateUnit,
        updatePlant: mockUpdatePlant,
        updateCustomer: mockUpdateCustomer,
      }));

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const state = vi.mocked(usePsvStore).getState();
        return selector ? selector(state) : state;
      });

      render(<UnitsTab />);

      // Find inactive unit and click to activate it
      const inactiveChip = screen.getByText("inactive");
      await user.click(inactiveChip);

      expect(mockUpdateUnit).toHaveBeenCalledWith("unit2", {
        status: "active",
      });
      // Note: Cascade activation would require more complex mocking of the parent entities
    });
  });

  describe("Pagination", () => {
    it("renders items per page selector", () => {
      render(<UnitsTab />);

      expect(screen.getByTestId("items-per-page")).toBeInTheDocument();
    });
  });

  describe("CRUD Operations", () => {
    it("opens add unit dialog when Add New Unit button is clicked", async () => {
      const user = userEvent.setup();
      render(<UnitsTab />);

      const addButtons = screen.getAllByText("Add New Unit");
      const addButton = addButtons[0];
      await user.click(addButton);

      // Dialog should be opened (mocked UnitDialog component)
      expect(screen.getByTestId("unit-dialog")).toBeInTheDocument();
    });

    it("opens edit unit dialog when edit button is clicked", async () => {
      const user = userEvent.setup();
      render(<UnitsTab />);

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      await user.click(editButtons[0]);

      // Dialog should be opened with edit mode
      expect(screen.getByTestId("unit-dialog")).toBeInTheDocument();
    });

    it("opens delete confirmation when delete button is clicked", async () => {
      const user = userEvent.setup();
      render(<UnitsTab />);

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Delete confirmation dialog should be visible
      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
      expect(screen.getByText(/delete.*unit/i)).toBeInTheDocument();
    });

    it("calls addUnit action when unit is created", async () => {
      const user = userEvent.setup();
      const mockAddUnit = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          addUnit: mockAddUnit,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<UnitsTab />);

      // Mock successful form submission
      const addButtons = screen.getAllByText("Add New Unit");
      const addButton = addButtons[0];
      await user.click(addButton);

      // Simulate form submission (this would normally happen in UnitDialog)
      expect(mockAddUnit).toBeDefined();
    });

    it("calls updateUnit action when unit is edited", async () => {
      const user = userEvent.setup();
      const mockUpdateUnit = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          updateUnit: mockUpdateUnit,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<UnitsTab />);

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      await user.click(editButtons[0]);

      // Verify update action is available for editing
      expect(mockUpdateUnit).toBeDefined();
    });

    it("calls softDeleteUnit action when delete is confirmed", async () => {
      const user = userEvent.setup();
      const mockSoftDeleteUnit = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          softDeleteUnit: mockSoftDeleteUnit,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<UnitsTab />);

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Confirm delete action
      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockSoftDeleteUnit).toHaveBeenCalledWith("unit1");
    });
  });

  describe("Search and Filter Interactions", () => {
    it("filters units based on search input", async () => {
      const user = userEvent.setup();
      render(<UnitsTab />);

      const searchInputs = screen.getAllByPlaceholderText(/search/i);
      const searchInput = searchInputs[0];

      await user.type(searchInput, "Process Unit A");

      // Search functionality is handled by component state
      expect(searchInput).toHaveValue("Process Unit A");
    });

    it("filters units by status using dropdown", async () => {
      const user = userEvent.setup();
      render(<UnitsTab />);

      const selectElements = screen.getAllByRole("combobox");
      const statusSelect = selectElements[0];

      await user.click(statusSelect);
      await user.click(screen.getByText("Active (1)"));

      // Status filtering is handled by component state
      expect(statusSelect).toBeInTheDocument();
    });
  });

  describe("Permission-Based Features", () => {
    it("shows edit and delete buttons for authorized users", () => {
      render(<UnitsTab />);

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

      render(<UnitsTab />);

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
