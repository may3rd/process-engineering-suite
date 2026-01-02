import { describe, it, expect, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";
import { exportScenariosToExcel } from "../excelExport";
import {
  OverpressureScenario,
  ProtectiveSystem,
  UnitSystem,
} from "@/data/types";

// Mock XLSX
vi.mock("xlsx", () => ({
  utils: {
    book_new: vi.fn(),
    json_to_sheet: vi.fn(),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

// Mock projectUnits functions
vi.mock("../projectUnits", () => ({
  getProjectUnits: vi.fn().mockReturnValue({
    pressureGauge: { unit: "barg", label: "barg" },
    pressureDrop: { unit: "kPa", label: "kPa" },
    length: { unit: "m", label: "m" },
    diameter: { unit: "mm", label: "mm" },
    temperature: { unit: "C", label: "°C" },
    massFlow: { unit: "kg/h", label: "kg/h" },
  }),
  convertValue: vi.fn().mockImplementation((value) => value), // Return the value as-is for simplicity
}));

// Mock Date
const mockDate = new Date("2024-01-15T00:00:00.000Z");
vi.useFakeTimers();
vi.setSystemTime(mockDate);

// Mock Date methods
global.Date.prototype.toISOString = vi
  .fn()
  .mockReturnValue("2024-01-15T00:00:00.000Z");

describe("exportScenariosToExcel", () => {
  let mockBookNew: any;
  let mockJsonToSheet: any;
  let mockBookAppendSheet: any;
  let mockWriteFile: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBookNew = vi.fn().mockReturnValue({});
    mockJsonToSheet = vi.fn().mockReturnValue({});
    mockBookAppendSheet = vi.fn();
    mockWriteFile = vi.fn();

    (XLSX.utils.book_new as any) = mockBookNew;
    (XLSX.utils.json_to_sheet as any) = mockJsonToSheet;
    (XLSX.utils.book_append_sheet as any) = mockBookAppendSheet;
    (XLSX.writeFile as any) = mockWriteFile;
  });

  const createMockScenarios = (): OverpressureScenario[] => [
    {
      id: "scenario-1",
      protectiveSystemId: "psv-1",
      cause: "fire_case",
      description: "Fire case scenario with high pressure",
      relievingTemp: 150,
      relievingPressure: 12,
      phase: "steam",
      relievingRate: 1000,
      accumulationPct: 10,
      requiredCapacity: 1000,
      assumptions: ["Assumption 1", "Assumption 2"],
      codeRefs: ["API-520", "API-521"],
      isGoverning: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      isActive: true,
    },
    {
      id: "scenario-2",
      protectiveSystemId: "psv-1",
      cause: "blocked_outlet",
      description: "Blocked outlet scenario",
      relievingTemp: 120,
      relievingPressure: 11,
      phase: "liquid",
      relievingRate: 500,
      accumulationPct: 5,
      requiredCapacity: 500,
      assumptions: [],
      codeRefs: [],
      isGoverning: false,
      createdAt: "2024-01-02T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
      isActive: true,
    },
  ];

  const createMockPsv = (): ProtectiveSystem => ({
    id: "psv-1",
    areaId: "area-1",
    name: "Test PSV",
    tag: "PSV-001",
    type: "psv",
    designCode: "API-520",
    serviceFluid: "Steam",
    fluidPhase: "steam",
    setPressure: 10,
    mawp: 15,
    ownerId: "user-1",
    status: "approved",
    tags: ["tag1", "tag2"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
    isActive: true,
  });

  it("should create a new workbook", () => {
    const scenarios = createMockScenarios();
    const psv = createMockPsv();

    exportScenariosToExcel(scenarios, psv);

    expect(mockBookNew).toHaveBeenCalled();
  });

  it("should prepare scenario data correctly", () => {
    const scenarios = createMockScenarios();
    const psv = createMockPsv();

    exportScenariosToExcel(scenarios, psv);

    expect(mockJsonToSheet).toHaveBeenCalledWith([
      {
        ID: "scenario-1",
        Cause: "fire_case",
        Description: "Fire case scenario with high pressure",
        Phase: "steam",
        "Relieving Rate (kg/h)": 1000,
        "Relieving Pressure (barg)": 12,
        "Relieving Temp (°C)": 150,
        "Governing Case": "Yes",
        "Created At": "2024-01-15 00:00",
      },
      {
        ID: "scenario-2",
        Cause: "blocked_outlet",
        Description: "Blocked outlet scenario",
        Phase: "liquid",
        "Relieving Rate (kg/h)": 500,
        "Relieving Pressure (barg)": 11,
        "Relieving Temp (°C)": 120,
        "Governing Case": "No",
        "Created At": "2024-01-15 00:00",
      },
    ]);
  });

  it("should prepare PSV data correctly", () => {
    const scenarios = createMockScenarios();
    const psv = createMockPsv();

    exportScenariosToExcel(scenarios, psv);

    expect(mockJsonToSheet).toHaveBeenCalledWith([
      {
        Tag: "PSV-001",
        Name: "Test PSV",
        Type: "psv",
        "Set Pressure (barg)": 10, // mocked convertValue return
        "Design Code": "API-520",
        "Service Fluid": "Steam",
      },
    ]);
  });

  it("should append both sheets to the workbook", () => {
    const scenarios = createMockScenarios();
    const psv = createMockPsv();
    const mockWb = {};
    mockBookNew.mockReturnValue(mockWb);

    exportScenariosToExcel(scenarios, psv);

    expect(mockBookAppendSheet).toHaveBeenCalledTimes(2);
    expect(mockBookAppendSheet).toHaveBeenCalledWith(mockWb, {}, "Scenarios");
    expect(mockBookAppendSheet).toHaveBeenCalledWith(mockWb, {}, "PSV Data");
  });

  it("should generate correct filename", () => {
    const scenarios = createMockScenarios();
    const psv = createMockPsv();

    exportScenariosToExcel(scenarios, psv);

    expect(mockWriteFile).toHaveBeenCalledWith(
      {},
      "PSV-001_Scenarios_20240115.xlsx",
    );
  });

  it("should handle empty scenarios array", () => {
    const scenarios: OverpressureScenario[] = [];
    const psv = createMockPsv();

    exportScenariosToExcel(scenarios, psv);

    expect(mockJsonToSheet).toHaveBeenCalledWith([]);
    expect(mockBookAppendSheet).toHaveBeenCalledWith({}, {}, "Scenarios");
    expect(mockWriteFile).toHaveBeenCalledWith(
      {},
      "PSV-001_Scenarios_20240115.xlsx",
    );
  });

  it("should handle scenarios with undefined values", () => {
    const scenarios: OverpressureScenario[] = [
      {
        id: "scenario-1",
        protectiveSystemId: "psv-1",
        cause: "fire_case",
        description: "Test scenario",
        relievingTemp: 150,
        relievingPressure: 12,
        phase: "gas",
        relievingRate: 1000,
        accumulationPct: 10,
        requiredCapacity: 1000,
        assumptions: [],
        codeRefs: [],
        isGoverning: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        isActive: true,
      },
    ];
    const psv = createMockPsv();

    exportScenariosToExcel(scenarios, psv);

    expect(mockJsonToSheet).toHaveBeenCalledWith([
      {
        ID: "scenario-1",
        Cause: "fire_case",
        Description: "Test scenario",
        Phase: "gas",
        "Relieving Pressure (barg)": 12,
        "Relieving Rate (kg/h)": 1000,
        "Relieving Temp (°C)": 150,
        "Governing Case": "Yes",
        "Created At": "2024-01-15 00:00",
      },
    ]);
  });

  it("should handle PSV with undefined design code", () => {
    const scenarios = createMockScenarios();
    const psv = { ...createMockPsv(), designCode: undefined as any };

    exportScenariosToExcel(scenarios, psv);

    expect(mockJsonToSheet).toHaveBeenCalledWith([
      {
        Tag: "PSV-001",
        Name: "Test PSV",
        Type: "psv",
        "Set Pressure (barg)": 10,
        "Design Code": undefined,
        "Service Fluid": "Steam",
      },
    ]);
  });

  it("should format created date correctly", () => {
    const scenarios = [
      {
        ...createMockScenarios()[0],
        createdAt: "2024-12-31T23:59:59Z",
      },
    ];
    const psv = createMockPsv();

    exportScenariosToExcel(scenarios, psv);

    expect(mockJsonToSheet).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          "Created At": "2024-01-15 00:00", // mocked date
        }),
      ]),
    );
  });

  it("should handle error during workbook creation", () => {
    mockBookNew.mockImplementation(() => {
      throw new Error("Workbook creation failed");
    });

    const scenarios = createMockScenarios();
    const psv = createMockPsv();

    expect(() => exportScenariosToExcel(scenarios, psv)).toThrow(
      "Workbook creation failed",
    );
  });

  it("should handle error during file writing", () => {
    mockWriteFile.mockImplementation(() => {
      throw new Error("File write failed");
    });

    const scenarios = createMockScenarios();
    const psv = createMockPsv();

    expect(() => exportScenariosToExcel(scenarios, psv)).toThrow(
      "File write failed",
    );
  });
});
