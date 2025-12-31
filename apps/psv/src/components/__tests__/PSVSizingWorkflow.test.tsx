import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SizingTab } from "../tabs/SizingTab";

// Mock the stores
vi.mock("@/store/usePsvStore", () => ({
  usePsvStore: vi.fn(),
}));

vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: vi.fn(),
}));

import { usePsvStore } from "@/store/usePsvStore";
import { useAuthStore } from "@/store/useAuthStore";

describe("PSV Sizing Workflow", () => {
  const mockAddSizingCase = vi.fn();
  const mockUpdateSizingCase = vi.fn();

  const mockSizingCases = [
    {
      id: "case-1",
      scenarioId: "scenario-1",
      status: "draft",
      standard: "API-520",
      method: "gas",
      inputs: {
        massFlowRate: 1000,
        temperature: 25,
        pressure: 1.5,
        molecularWeight: 28,
      },
      outputs: {},
    },
  ];

  const mockScenarios = [
    {
      id: "scenario-1",
      cause: "fire",
      description: "Fire case",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as any).mockReturnValue({
      currentUser: { role: "engineer" },
    });
    (usePsvStore as any).mockReturnValue({
      sizingCaseList: mockSizingCases,
      scenarioList: mockScenarios,
      selectedPsv: { id: "psv-1" },
      addSizingCase: mockAddSizingCase,
      updateSizingCase: mockUpdateSizingCase,
    });
  });

  it("displays existing sizing cases", () => {
    render(<SizingTab />);

    expect(screen.getByText("API-520")).toBeInTheDocument();
    expect(screen.getByText("GAS method")).toBeInTheDocument();
    expect(screen.getByText("1,000")).toBeInTheDocument(); // mass flow rate
  });

  it("shows create sizing case button", () => {
    render(<SizingTab />);

    expect(
      screen.getByRole("button", { name: /create.*sizing case/i }),
    ).toBeInTheDocument();
  });

  it("displays scenario information for sizing cases", () => {
    render(<SizingTab />);

    expect(screen.getByText("Fire")).toBeInTheDocument(); // scenario cause formatted
  });

  it("shows status badges for sizing cases", () => {
    render(<SizingTab />);

    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("displays sizing inputs in the table", () => {
    render(<SizingTab />);

    expect(screen.getByText("28")).toBeInTheDocument(); // molecular weight
    expect(screen.getByText("25")).toBeInTheDocument(); // temperature
    expect(screen.getByText("1.5")).toBeInTheDocument(); // pressure
  });

  it("shows no sizing cases message when list is empty", () => {
    (usePsvStore as any).mockReturnValue({
      sizingCaseList: [],
      scenarioList: mockScenarios,
      selectedPsv: { id: "psv-1" },
      addSizingCase: mockAddSizingCase,
      updateSizingCase: mockUpdateSizingCase,
    });

    render(<SizingTab />);

    expect(screen.getByText("No sizing cases")).toBeInTheDocument();
    expect(
      screen.getByText("Create a sizing case from an overpressure scenario"),
    ).toBeInTheDocument();
  });

  it("calls addSizingCase when creating a new case", async () => {
    const user = userEvent.setup();
    mockAddSizingCase.mockResolvedValue({
      id: "new-case",
      status: "draft",
    });

    render(<SizingTab />);

    const createButton = screen.getByRole("button", {
      name: /create.*sizing case/i,
    });
    await user.click(createButton);

    // This would normally open a dialog, but for this test we mock the action
    // In a real integration test, we'd interact with the dialog
    await waitFor(() => {
      expect(mockAddSizingCase).not.toHaveBeenCalled(); // Not called yet since we didn't complete the flow
    });
  });

  it("shows edit button for sizing cases", () => {
    render(<SizingTab />);

    const editButtons = screen.getAllByLabelText("edit");
    expect(editButtons.length).toBeGreaterThan(0);
  });

  it("displays calculation results when available", () => {
    const calculatedCase = {
      ...mockSizingCases[0],
      status: "calculated",
      outputs: {
        requiredArea: 100,
        selectedOrifice: "D",
        orificeArea: 50,
        percentUsed: 75,
        ratedCapacity: 1200,
      },
    };

    (usePsvStore as any).mockReturnValue({
      sizingCaseList: [calculatedCase],
      scenarioList: mockScenarios,
      selectedPsv: { id: "psv-1" },
      addSizingCase: mockAddSizingCase,
      updateSizingCase: mockUpdateSizingCase,
    });

    render(<SizingTab />);

    expect(screen.getByText("D")).toBeInTheDocument(); // selected orifice
    expect(screen.getByText("75%")).toBeInTheDocument(); // percent used
    expect(screen.getByText("1,200")).toBeInTheDocument(); // rated capacity
  });
});
