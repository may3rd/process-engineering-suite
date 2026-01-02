import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  generatePsvSummaryPdf,
  PsvSummaryData,
  PipelineSegmentRow,
  HydraulicSummary,
} from "../pdfExport";
import {
  ProtectiveSystem,
  OverpressureScenario,
  SizingCase,
  UnitSystem,
  Equipment,
  ProjectNote,
  Attachment,
} from "@/data/types";

// Mock jsPDF
vi.mock("jspdf", () => ({
  default: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    text: vi.fn(),
    setTextColor: vi.fn(),
    setFillColor: vi.fn(),
    setDrawColor: vi.fn(),
    roundedRect: vi.fn(),
    addPage: vi.fn(),
    save: vi.fn(),
    internal: {
      pageSize: {
        getWidth: vi.fn().mockReturnValue(210),
        getHeight: vi.fn().mockReturnValue(297),
      },
    },
    lastAutoTable: {
      finalY: 100,
    },
  })),
}));

// Mock autoTable
vi.mock("jspdf-autotable", () => ({
  default: vi.fn(),
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
  formatPressureGauge: vi.fn().mockReturnValue("10.0 barg"),
  formatMassFlowKgH: vi.fn().mockReturnValue("1000 kg/h"),
  formatNumber: vi.fn().mockReturnValue("10.00"),
  convertValue: vi.fn().mockReturnValue(10),
  formatWithUnit: vi.fn().mockReturnValue("10.00 m"),
}));

// Mock Date
const mockDate = new Date("2024-01-15T10:30:00Z");
vi.useFakeTimers();
vi.setSystemTime(mockDate);

// Mock Date methods
global.Date.prototype.toISOString = vi
  .fn()
  .mockReturnValue("2024-01-15T10:30:00.000Z");
global.Date.prototype.toTimeString = vi
  .fn()
  .mockReturnValue("10:30:00 GMT+0000 (Coordinated Universal Time)");

describe("generatePsvSummaryPdf", () => {
  let mockDoc: any;
  let mockAutoTable: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDoc = {
      setFontSize: vi.fn(),
      text: vi.fn(),
      setTextColor: vi.fn(),
      setFillColor: vi.fn(),
      setDrawColor: vi.fn(),
      roundedRect: vi.fn(),
      addPage: vi.fn(),
      save: vi.fn(),
      internal: {
        pageSize: {
          getWidth: vi.fn().mockReturnValue(210),
          getHeight: vi.fn().mockReturnValue(297),
        },
      },
      lastAutoTable: {
        finalY: 100,
      },
    };

    (jsPDF as any).mockReturnValue(mockDoc);
    mockAutoTable = vi.fn();
    (autoTable as any).mockImplementation(mockAutoTable);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  const createMockData = (): PsvSummaryData => ({
    psv: {
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
      tags: [],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-15T00:00:00Z",
      isActive: true,
    } as ProtectiveSystem,
    scenarios: [
      {
        id: "scenario-1",
        protectiveSystemId: "psv-1",
        cause: "fire_case",
        description: "Fire case scenario",
        relievingTemp: 150,
        relievingPressure: 12,
        phase: "steam",
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
    ] as OverpressureScenario[],
    sizingCases: [
      {
        id: "sizing-1",
        protectiveSystemId: "psv-1",
        scenarioId: "scenario-1",
        standard: "API-520",
        method: "steam",
        inputs: {} as any,
        outputs: {
          requiredArea: 50,
          orificeArea: 100,
          selectedOrifice: "D",
          numberOfValves: 1,
          isCriticalFlow: false,
        } as any,
        unitPreferences: {} as any,
        status: "calculated",
        createdBy: "user-1",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        isActive: true,
      },
    ] as SizingCase[],
    unitSystem: "metric",
    linkedEquipment: [
      {
        id: "equip-1",
        tag: "V-101",
        description: "Test Vessel",
        type: "vessel",
        designPressure: 20,
      },
    ] as Equipment[],
    projectNotes: [
      {
        id: "note-1",
        body: "Test note",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ] as ProjectNote[],
    attachments: [
      {
        id: "attach-1",
        protectiveSystemId: "psv-1",
        fileUri: "test.pdf",
        fileName: "test.pdf",
        mimeType: "application/pdf",
        size: 1024000,
        uploadedBy: "user-1",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ] as Attachment[],
    inletSegments: [
      {
        id: "seg-1",
        label: "Inlet Pipe 1",
        lengthMeters: 5,
        diameterMm: 100,
        p1Barg: 10,
        p2Barg: 9.8,
        pressureDrop: 0.2,
        sectionType: "pipe",
        fluid: "steam",
      },
    ] as PipelineSegmentRow[],
    outletSegments: [
      {
        id: "seg-2",
        label: "Outlet Pipe 1",
        lengthMeters: 3,
        diameterMm: 80,
        p1Barg: 9.8,
        p2Barg: 9.5,
        pressureDrop: 0.3,
        sectionType: "pipe",
        fluid: "steam",
      },
    ] as PipelineSegmentRow[],
    revisions: [
      {
        id: "rev-1",
        rev: "A",
        desc: "Initial revision",
        by: "user-1",
        date: "2024-01-01",
        chk: "user-2",
        chkDate: "2024-01-02",
        app: "user-3",
        appDate: "2024-01-03",
      },
    ],
    inletSummary: {
      totalLength: 5,
      avgDiameter: 100,
      velocity: 10,
      pressureDrop: 0.2,
      percent: 5,
      limit: 10,
      segmentCount: 1,
      status: {
        label: "OK",
        color: "success",
        message: "Within limits",
      },
    } as HydraulicSummary,
    outletSummary: {
      totalLength: 3,
      avgDiameter: 80,
      velocity: 8,
      pressureDrop: 0.3,
      percent: 3,
      limit: 10,
      segmentCount: 1,
      status: {
        label: "OK",
        color: "success",
        message: "Within limits",
      },
    } as HydraulicSummary,
  });

  it("should create PDF document with correct initialization", () => {
    const data = createMockData();

    generatePsvSummaryPdf(data);

    expect(jsPDF).toHaveBeenCalledWith();
    expect(mockDoc.setFontSize).toHaveBeenCalledWith(18);
    expect(mockDoc.text).toHaveBeenCalledWith("PSV Summary Report", 14, 20);
  });

  it("should add header with generation timestamp", () => {
    const data = createMockData();

    generatePsvSummaryPdf(data);

    expect(mockDoc.setFontSize).toHaveBeenCalledWith(10);
    expect(mockDoc.setTextColor).toHaveBeenCalledWith(100);
    expect(mockDoc.text).toHaveBeenCalledWith(
      expect.stringMatching(/^Generated: \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/),
      14,
      26,
    );
  });

  it("should render PSV information section", () => {
    const data = createMockData();

    generatePsvSummaryPdf(data);

    expect(mockDoc.setFontSize).toHaveBeenCalledWith(14);
    expect(mockDoc.text).toHaveBeenCalledWith("Tag: PSV-001", 14, 36);
    expect(mockDoc.text).toHaveBeenCalledWith("Test PSV", 14, 42);
  });

  it("should render various sections", () => {
    const data = createMockData();

    generatePsvSummaryPdf(data);

    expect(mockDoc.text).toHaveBeenCalledWith("PSV Summary Report", 14, 20);
    expect(mockDoc.text).toHaveBeenCalledWith("Tag: PSV-001", 14, 36);
    expect(mockDoc.text).toHaveBeenCalledWith(
      "Revision History",
      14,
      expect.any(Number),
    );
    expect(mockDoc.text).toHaveBeenCalledWith(
      "Service Conditions",
      14,
      expect.any(Number),
    );
    expect(mockDoc.text).toHaveBeenCalledWith(
      "Protected Equipment",
      14,
      expect.any(Number),
    );
    expect(mockDoc.text).toHaveBeenCalledWith(
      "Relief Scenarios",
      14,
      expect.any(Number),
    );
    expect(mockDoc.text).toHaveBeenCalledWith(
      "Sizing Results",
      14,
      expect.any(Number),
    );
    expect(mockDoc.text).toHaveBeenCalledWith(
      "Hydraulic Summary",
      14,
      expect.any(Number),
    );
    expect(mockDoc.text).toHaveBeenCalledWith(
      "Inlet Hydraulic Network Details",
      14,
      expect.any(Number),
    );
    expect(mockDoc.text).toHaveBeenCalledWith(
      "Outlet Hydraulic Network Details",
      14,
      expect.any(Number),
    );
    expect(mockDoc.text).toHaveBeenCalledWith("Notes", 14, expect.any(Number));
    expect(mockDoc.text).toHaveBeenCalledWith(
      "Attachments",
      14,
      expect.any(Number),
    );
  });

  it("should save PDF with correct filename", () => {
    const data = createMockData();

    generatePsvSummaryPdf(data);

    expect(mockDoc.save).toHaveBeenCalledWith(
      expect.stringMatching(/^PSV-001_Summary_\d{8}\.pdf$/),
    );
  });

  it("should handle empty optional data gracefully", () => {
    const minimalData: PsvSummaryData = {
      psv: createMockData().psv,
      scenarios: [],
      sizingCases: [],
      unitSystem: "metric",
    };

    expect(() => generatePsvSummaryPdf(minimalData)).not.toThrow();
  });

  it("should add pages when content exceeds page height", () => {
    // Mock lastAutoTable.finalY to exceed page height
    mockDoc.lastAutoTable.finalY = 280;

    const data = createMockData();

    generatePsvSummaryPdf(data);

    expect(mockDoc.addPage).toHaveBeenCalled();
  });

  it("should handle missing hydraulic summaries", () => {
    const data = {
      ...createMockData(),
      inletSummary: null,
      outletSummary: null,
    };

    generatePsvSummaryPdf(data);

    // Should still render but without summary cards
    expect(mockDoc.text).not.toHaveBeenCalledWith(
      "Hydraulic Summary",
      14,
      expect.any(Number),
    );
  });
});
