import {
    Customer,
    Plant,
    Unit,
    Area,
    Project,
    ProtectiveSystem,
    OverpressureScenario,
    SizingCase,
    Equipment,
    EquipmentLink,
    Attachment,
    Comment,
    TodoItem,
    User,
} from './types';

// Users
export const users: User[] = [
    { id: 'user-1', name: 'John Smith', email: 'john.smith@acme.com', role: 'engineer', status: 'active' },
    { id: 'user-2', name: 'Sarah Johnson', email: 'sarah.johnson@acme.com', role: 'lead', status: 'active' },
    { id: 'user-3', name: 'Mike Chen', email: 'mike.chen@acme.com', role: 'approver', status: 'active' },
    { id: 'user-4', name: 'Emily Davis', email: 'emily.davis@gep.com', role: 'engineer', status: 'active' },
];

// Customers
export const customers: Customer[] = [
    {
        id: 'cust-1',
        name: 'Acme Petrochemical',
        code: 'ACME',
        status: 'active',
        ownerId: 'user-2',
        createdAt: '2024-01-15T08:00:00Z',
    },
    {
        id: 'cust-2',
        name: 'Global Energy Partners',
        code: 'GEP',
        status: 'active',
        ownerId: 'user-3',
        createdAt: '2024-02-20T10:30:00Z',
    },
];

// Plants
export const plants: Plant[] = [
    {
        id: 'plant-1',
        customerId: 'cust-1',
        name: 'Houston Refinery',
        code: 'HOU-REF',
        location: 'Houston, TX, USA',
        status: 'active',
        ownerId: 'user-2',
        createdAt: '2024-01-20T09:00:00Z',
    },
    {
        id: 'plant-2',
        customerId: 'cust-1',
        name: 'Baytown Chemical Complex',
        code: 'BAY-CHEM',
        location: 'Baytown, TX, USA',
        status: 'active',
        ownerId: 'user-2',
        createdAt: '2024-01-25T11:00:00Z',
    },
    {
        id: 'plant-3',
        customerId: 'cust-2',
        name: 'Singapore LNG Terminal',
        code: 'SG-LNG',
        location: 'Jurong Island, Singapore',
        status: 'active',
        ownerId: 'user-4',
        createdAt: '2024-03-01T08:00:00Z',
    },
    {
        id: 'plant-4',
        customerId: 'cust-2',
        name: 'Rotterdam Storage Facility',
        code: 'RTM-STOR',
        location: 'Rotterdam, Netherlands',
        status: 'active',
        ownerId: 'user-4',
        createdAt: '2024-03-15T14:00:00Z',
    },
];

// Units
export const units: Unit[] = [
    {
        id: 'unit-1',
        plantId: 'plant-1',
        name: 'Crude Distillation Unit',
        code: 'CDU-100',
        service: 'Crude Oil Processing',
        status: 'active',
        ownerId: 'user-1',
        createdAt: '2024-02-01T10:00:00Z',
    },
    {
        id: 'unit-2',
        plantId: 'plant-1',
        name: 'Vacuum Distillation Unit',
        code: 'VDU-200',
        service: 'Vacuum Distillation',
        status: 'active',
        ownerId: 'user-1',
        createdAt: '2024-02-05T10:00:00Z',
    },
    {
        id: 'unit-3',
        plantId: 'plant-2',
        name: 'Ethylene Cracker',
        code: 'ETH-100',
        service: 'Ethylene Production',
        status: 'active',
        ownerId: 'user-1',
        createdAt: '2024-02-10T10:00:00Z',
    },
    {
        id: 'unit-4',
        plantId: 'plant-3',
        name: 'LNG Receiving Terminal',
        code: 'LNG-REC',
        service: 'LNG Regasification',
        status: 'active',
        ownerId: 'user-4',
        createdAt: '2024-03-20T10:00:00Z',
    },
];

// Areas
export const areas: Area[] = [
    {
        id: 'area-1',
        unitId: 'unit-1',
        name: 'Atmospheric Section',
        code: 'CDU-100-ATM',
        status: 'active',
        createdAt: '2024-02-10T10:00:00Z',
    },
    {
        id: 'area-2',
        unitId: 'unit-1',
        name: 'Preheat Train',
        code: 'CDU-100-PHT',
        status: 'active',
        createdAt: '2024-02-10T10:00:00Z',
    },
    {
        id: 'area-3',
        unitId: 'unit-2',
        name: 'Vacuum Column',
        code: 'VDU-200-COL',
        status: 'active',
        createdAt: '2024-02-15T10:00:00Z',
    },
    {
        id: 'area-4',
        unitId: 'unit-3',
        name: 'Furnace Area',
        code: 'ETH-100-FUR',
        status: 'active',
        createdAt: '2024-02-20T10:00:00Z',
    },
    {
        id: 'area-5',
        unitId: 'unit-4',
        name: 'Vaporizer Section',
        code: 'LNG-REC-VAP',
        status: 'active',
        createdAt: '2024-03-25T10:00:00Z',
    },
];

// Projects
export const projects: Project[] = [
    {
        id: 'proj-1',
        areaId: 'area-1',
        name: 'CDU Atmospheric Tower Relief Study',
        code: 'ACME-2024-001',
        phase: 'design',
        status: 'in_review',
        startDate: '2024-06-01',
        leadId: 'user-2',
        createdAt: '2024-06-01T08:00:00Z',
    },
    {
        id: 'proj-2',
        areaId: 'area-2',
        name: 'Preheat Exchanger PSV Review',
        code: 'ACME-2024-002',
        phase: 'design',
        status: 'draft',
        startDate: '2024-07-15',
        leadId: 'user-1',
        createdAt: '2024-07-15T08:00:00Z',
    },
    {
        id: 'proj-3',
        areaId: 'area-3',
        name: 'Vacuum Column Fire Case Analysis',
        code: 'ACME-2024-003',
        phase: 'design',
        status: 'approved',
        startDate: '2024-05-01',
        endDate: '2024-08-30',
        leadId: 'user-2',
        createdAt: '2024-05-01T08:00:00Z',
    },
    {
        id: 'proj-4',
        areaId: 'area-4',
        name: 'Cracker Furnace Relief Upgrade',
        code: 'ACME-2024-004',
        phase: 'construction',
        status: 'issued',
        startDate: '2024-03-01',
        leadId: 'user-1',
        createdAt: '2024-03-01T08:00:00Z',
    },
    {
        id: 'proj-5',
        areaId: 'area-5',
        name: 'LNG Vaporizer PSV Sizing',
        code: 'GEP-2024-001',
        phase: 'design',
        status: 'in_review',
        startDate: '2024-08-01',
        leadId: 'user-4',
        createdAt: '2024-08-01T08:00:00Z',
    },
];

// Equipment
export const equipment: Equipment[] = [
    {
        id: 'equip-1',
        projectId: 'proj-1',
        type: 'column',
        tag: 'T-101',
        description: 'Atmospheric Crude Tower',
        designPressure: 3.5,
        designTemp: 400,
        locationRef: 'Plot Plan A-12',
        createdAt: '2024-06-05T10:00:00Z',
    },
    {
        id: 'equip-2',
        projectId: 'proj-1',
        type: 'vessel',
        tag: 'V-102',
        description: 'Overhead Accumulator',
        designPressure: 5.0,
        designTemp: 150,
        locationRef: 'Plot Plan A-12',
        createdAt: '2024-06-05T10:00:00Z',
    },
    {
        id: 'equip-3',
        projectId: 'proj-2',
        type: 'heat_exchanger',
        tag: 'E-101A/B',
        description: 'Crude Preheat Exchanger',
        designPressure: 25.0,
        designTemp: 300,
        locationRef: 'Plot Plan B-08',
        createdAt: '2024-07-20T10:00:00Z',
    },
    {
        id: 'equip-4',
        projectId: 'proj-3',
        type: 'column',
        tag: 'T-201',
        description: 'Vacuum Column',
        designPressure: 1.0,
        designTemp: 420,
        locationRef: 'Plot Plan C-15',
        createdAt: '2024-05-10T10:00:00Z',
    },
    {
        id: 'equip-5',
        projectId: 'proj-5',
        type: 'heat_exchanger',
        tag: 'E-501',
        description: 'LNG Vaporizer',
        designPressure: 85.0,
        designTemp: -165,
        locationRef: 'Plot Plan LNG-02',
        createdAt: '2024-08-10T10:00:00Z',
    },
];

// Protective Systems
export const protectiveSystems: ProtectiveSystem[] = [
    {
        id: 'psv-1',
        projectId: 'proj-1',
        name: 'Atmospheric Tower Overhead PSV',
        tag: 'PSV-101A',
        type: 'psv',
        designCode: 'API-520',
        serviceFluid: 'Light Ends (C1-C4)',
        fluidPhase: 'gas',
        setPressure: 2.8,
        mawp: 3.5,
        ownerId: 'user-1',
        status: 'in_review',
        tags: ['critical', 'fire-case'],
        inletNetwork: {
            nodes: [
                { id: 'n1', label: 'Source', position: { x: 0, y: 0 }, pressure: 3.5, temperature: 180, fluid: { id: 'fl1', phase: 'gas' } },
                { id: 'n2', label: 'PSV Inlet', position: { x: 100, y: 0 }, pressure: 2.8, temperature: 180, fluid: { id: 'fl1', phase: 'gas' } }
            ],
            pipes: [
                {
                    id: 'p1', name: 'Inlet Pipe', startNodeId: 'n1', endNodeId: 'n2', length: 5, lengthUnit: 'm', diameter: 150, diameterUnit: 'mm', elevation: 0,
                    fittings: [{ type: 'Elbow 90', count: 2, k_each: 0.3, k_total: 0.6 }]
                }
            ]
        },
        outletNetwork: {
            nodes: [
                { id: 'on1', label: 'PSV Outlet', position: { x: 0, y: 0 }, pressure: 0.5, temperature: 150, fluid: { id: 'fl1', phase: 'gas' } },
                { id: 'on2', label: 'Discharge', position: { x: 200, y: 0 }, pressure: 0, temperature: 140, fluid: { id: 'fl1', phase: 'gas' } }
            ],
            pipes: [
                {
                    id: 'op1', name: 'Discharge Pipe', startNodeId: 'on1', endNodeId: 'on2', length: 20, lengthUnit: 'm', diameter: 150, diameterUnit: 'mm', elevation: 5,
                    fittings: [{ type: 'Elbow 45', count: 1, k_each: 0.2, k_total: 0.2 }]
                }
            ]
        },
        createdAt: '2024-06-10T08:00:00Z',
        updatedAt: '2024-09-15T14:30:00Z',
    },
    {
        id: 'psv-2',
        projectId: 'proj-1',
        name: 'Atmospheric Tower Overhead PSV (Spare)',
        tag: 'PSV-101B',
        type: 'psv',
        designCode: 'API-520',
        serviceFluid: 'Light Ends (C1-C4)',
        fluidPhase: 'gas',
        setPressure: 2.9,
        mawp: 3.5,
        ownerId: 'user-1',
        status: 'draft',
        tags: ['spare'],
        createdAt: '2024-06-10T08:00:00Z',
        updatedAt: '2024-09-10T10:00:00Z',
    },
    {
        id: 'psv-3',
        projectId: 'proj-1',
        name: 'Overhead Accumulator PSV',
        tag: 'PSV-102',
        type: 'psv',
        designCode: 'API-520',
        serviceFluid: 'Naphtha',
        fluidPhase: 'liquid',
        setPressure: 4.0,
        mawp: 5.0,
        ownerId: 'user-1',
        status: 'approved',
        tags: ['blocked-outlet'],
        createdAt: '2024-06-15T08:00:00Z',
        updatedAt: '2024-08-20T16:00:00Z',
    },
    {
        id: 'psv-4',
        projectId: 'proj-2',
        name: 'Preheat Exchanger Tube Rupture PSV',
        tag: 'PSV-103',
        type: 'psv',
        designCode: 'API-520',
        serviceFluid: 'Crude Oil',
        fluidPhase: 'liquid',
        setPressure: 20.0,
        mawp: 25.0,
        ownerId: 'user-1',
        status: 'draft',
        tags: ['tube-rupture'],
        createdAt: '2024-07-25T08:00:00Z',
        updatedAt: '2024-07-25T08:00:00Z',
    },
    {
        id: 'psv-5',
        projectId: 'proj-3',
        name: 'Vacuum Column Fire Case RD',
        tag: 'RD-201',
        type: 'rupture_disc',
        designCode: 'API-520',
        serviceFluid: 'Vacuum Residue',
        fluidPhase: 'liquid',
        setPressure: 0.8,
        mawp: 1.0,
        ownerId: 'user-2',
        status: 'issued',
        tags: ['fire-case', 'rupture-disc'],
        createdAt: '2024-05-20T08:00:00Z',
        updatedAt: '2024-08-25T10:00:00Z',
    },
    {
        id: 'psv-6',
        projectId: 'proj-5',
        name: 'LNG Vaporizer PSV',
        tag: 'PSV-501',
        type: 'psv',
        designCode: 'API-520',
        serviceFluid: 'Natural Gas (Methane)',
        fluidPhase: 'gas',
        setPressure: 75.0,
        mawp: 85.0,
        ownerId: 'user-4',
        status: 'in_review',
        tags: ['high-pressure', 'cryogenic'],
        createdAt: '2024-08-15T08:00:00Z',
        updatedAt: '2024-09-20T12:00:00Z',
    },
];

// Overpressure Scenarios
export const scenarios: OverpressureScenario[] = [
    {
        id: 'scen-1',
        protectiveSystemId: 'psv-1',
        cause: 'blocked_outlet',
        description: 'Overhead vapor line blocked while pumparound continues',
        relievingTemp: 120,
        relievingPressure: 2.8,
        phase: 'gas',
        relievingRate: 45000,
        accumulationPct: 10,
        requiredCapacity: 45000,
        assumptions: [
            'Control valve fails open on pumparound',
            'All overhead vapor blocked',
            'Maximum heat input maintained',
        ],
        codeRefs: ['API-521 Section 4.4.2'],
        isGoverning: false,
        createdAt: '2024-06-12T10:00:00Z',
        updatedAt: '2024-06-12T10:00:00Z',
    },
    {
        id: 'scen-2',
        protectiveSystemId: 'psv-1',
        cause: 'fire_case',
        description: 'External fire engulfing atmospheric column base',
        relievingTemp: 180,
        relievingPressure: 2.8,
        phase: 'gas',
        relievingRate: 85000,
        accumulationPct: 21,
        requiredCapacity: 85000,
        assumptions: [
            'Wetted area from API-521 Table 4',
            'Fire duration 2 hours',
            'Adequate drainage assumed',
            'Environmental factor F = 1.0',
        ],
        codeRefs: ['API-521 Section 5.15', 'API-521 Table 4'],
        isGoverning: true,
        createdAt: '2024-06-15T10:00:00Z',
        updatedAt: '2024-09-10T14:00:00Z',
    },
    {
        id: 'scen-3',
        protectiveSystemId: 'psv-3',
        cause: 'blocked_outlet',
        description: 'Naphtha rundown line blocked with reflux pump running',
        relievingTemp: 85,
        relievingPressure: 4.0,
        phase: 'liquid',
        relievingRate: 120000,
        accumulationPct: 10,
        requiredCapacity: 120000,
        assumptions: [
            'Maximum pump capacity = 150 m³/h',
            'Density at relieving conditions = 720 kg/m³',
        ],
        codeRefs: ['API-521 Section 4.4.1'],
        isGoverning: true,
        createdAt: '2024-06-20T10:00:00Z',
        updatedAt: '2024-08-15T10:00:00Z',
    },
    {
        id: 'scen-4',
        protectiveSystemId: 'psv-4',
        cause: 'tube_rupture',
        description: 'High pressure process fluid enters low pressure shell side',
        relievingTemp: 250,
        relievingPressure: 20.0,
        phase: 'liquid',
        relievingRate: 280000,
        accumulationPct: 10,
        requiredCapacity: 280000,
        assumptions: [
            'Single tube rupture (2 open ends)',
            'Maximum ΔP across tube',
            'Sonic velocity not limiting',
        ],
        codeRefs: ['API-521 Section 4.4.12'],
        isGoverning: true,
        createdAt: '2024-07-28T10:00:00Z',
        updatedAt: '2024-07-28T10:00:00Z',
    },
    {
        id: 'scen-5',
        protectiveSystemId: 'psv-6',
        cause: 'blocked_outlet',
        description: 'Gas export line blocked with vaporizer in operation',
        relievingTemp: -10,
        relievingPressure: 75.0,
        phase: 'gas',
        relievingRate: 150000,
        accumulationPct: 10,
        requiredCapacity: 150000,
        assumptions: [
            'Maximum vaporization rate',
            'LNG sendout at design capacity',
            'Ambient vaporizer heat input',
        ],
        codeRefs: ['API-521 Section 4.4.2'],
        isGoverning: true,
        createdAt: '2024-08-20T10:00:00Z',
        updatedAt: '2024-09-18T10:00:00Z',
    },
    {
        id: 'scen-6',
        protectiveSystemId: 'psv-6',
        cause: 'external_fire',
        description: 'External fire on vaporizer equipment',
        relievingTemp: 50,
        relievingPressure: 75.0,
        phase: 'gas',
        relievingRate: 95000,
        accumulationPct: 21,
        requiredCapacity: 95000,
        assumptions: [
            'Wetted area per API-521',
            'Insulation credit applied (k = 0.9)',
            'Fire duration 2 hours',
        ],
        codeRefs: ['API-521 Section 5.15'],
        isGoverning: false,
        createdAt: '2024-08-22T10:00:00Z',
        updatedAt: '2024-08-22T10:00:00Z',
    },
];

// Sizing Cases
export const sizingCases: SizingCase[] = [
    {
        id: 'sizing-1',
        protectiveSystemId: 'psv-1',
        scenarioId: 'scen-2',
        standard: 'API-520',
        method: 'gas',
        inputs: {
            massFlowRate: 85000, // kg/h
            molecularWeight: 44, // g/mol (Propane typically ~44)
            temperature: 180, // C
            pressure: 2.8, // barg
            compressibilityZ: 0.92,
            specificHeatRatio: 1.15,
            backpressure: 0.5, // barg
            backpressureType: 'superimposed',
            gasViscosity: 0.01, // cP
        },
        outputs: {
            requiredArea: 1250, // mm2
            requiredAreaIn2: 1.94,
            selectedOrifice: 'J',
            orificeArea: 1290, // mm2
            percentUsed: 96.9,
            ratedCapacity: 87650,
            dischargeCoefficient: 0.975,
            backpressureCorrectionFactor: 1.0,
            isCriticalFlow: false,
            numberOfValves: 1,
            messages: ['Subcritical flow conditions detected'],
        },
        unitPreferences: {
            pressure: 'barg',
            temperature: 'C',
            flow: 'kg/h',
            length: 'm',
            area: 'mm²',
            density: 'kg/m³',
            viscosity: 'cP',
        },
        revisionNo: 1,
        status: 'verified',
        createdBy: 'user-1',
        approvedBy: 'user-3',
        createdAt: '2024-06-20T10:00:00Z',
        updatedAt: '2024-09-12T14:00:00Z',
    },
    {
        id: 'sizing-2',
        protectiveSystemId: 'psv-3',
        scenarioId: 'scen-3',
        standard: 'API-520',
        method: 'liquid',
        inputs: {
            massFlowRate: 120000, // kg/h
            molecularWeight: 100, // g/mol
            temperature: 45, // C
            pressure: 5.5, // barg
            density: 850, // kg/m3
            liquidViscosity: 1.2, // cP
            compressibilityZ: 1.0, // Liquid
            specificHeatRatio: 1.0, // Liquid
            backpressure: 1.5, // barg
            backpressureType: 'built_up',
        },
        outputs: {
            requiredArea: 850,
            requiredAreaIn2: 1.32,
            selectedOrifice: 'H',
            orificeArea: 1025,
            percentUsed: 82.9,
            ratedCapacity: 144500,
            dischargeCoefficient: 0.65,
            backpressureCorrectionFactor: 1.0,
            isCriticalFlow: false,
            numberOfValves: 1,
            messages: [],
        },
        unitPreferences: {
            pressure: 'barg',
            temperature: 'C',
            flow: 'kg/h',
            length: 'm',
            area: 'mm²',
            density: 'kg/m³',
            viscosity: 'cP',
        },
        revisionNo: 0,
        status: 'approved',
        createdBy: 'user-1',
        approvedBy: 'user-2',
        createdAt: '2024-06-25T10:00:00Z',
        updatedAt: '2024-08-18T16:00:00Z',
    },
    {
        id: 'sizing-3',
        protectiveSystemId: 'psv-6',
        scenarioId: 'scen-5',
        standard: 'API-520',
        method: 'gas',
        inputs: {
            massFlowRate: 150000,
            molecularWeight: 16.04,
            temperature: -10,
            pressure: 75.0,
            compressibilityZ: 0.88,
            specificHeatRatio: 1.31,
            backpressure: 5.0,
            backpressureType: 'superimposed',
            gasViscosity: 0.011, // cP
        },
        outputs: {
            requiredArea: 120, // mm2
            requiredAreaIn2: 0.186,
            selectedOrifice: 'D',
            orificeArea: 1841,
            percentUsed: 85.8,
            ratedCapacity: 175000,
            dischargeCoefficient: 0.975,
            backpressureCorrectionFactor: 0.95,
            isCriticalFlow: true,
            numberOfValves: 1,
            messages: [
                'Critical flow confirmed (P1/P2 > critical ratio)',
                'Balanced bellows recommended for high backpressure',
            ],
        },
        revisionNo: 3,
        unitPreferences: {
            pressure: 'barg',
            temperature: 'C',
            flow: 'kg/h',
            length: 'm',
            area: 'mm²',
            density: 'kg/m³',
            viscosity: 'cP',
        },
        status: 'calculated',
        createdBy: 'user-4',
        createdAt: '2024-08-25T10:00:00Z',
        updatedAt: '2024-09-20T11:00:00Z',
    },
];

// Equipment Links
export const equipmentLinks: EquipmentLink[] = [
    { id: 'link-1', protectiveSystemId: 'psv-1', equipmentId: 'equip-1', relationship: 'protects', notes: 'Overhead vapor relief' },
    { id: 'link-2', protectiveSystemId: 'psv-2', equipmentId: 'equip-1', relationship: 'protects', notes: 'Spare overhead PSV' },
    { id: 'link-3', protectiveSystemId: 'psv-3', equipmentId: 'equip-2', relationship: 'protects', notes: 'Accumulator liquid relief' },
    { id: 'link-4', protectiveSystemId: 'psv-4', equipmentId: 'equip-3', relationship: 'protects', notes: 'Shell side protection' },
    { id: 'link-5', protectiveSystemId: 'psv-6', equipmentId: 'equip-5', relationship: 'protects', notes: 'Vaporizer outlet relief' },
];

// Attachments
export const attachments: Attachment[] = [
    {
        id: 'att-1',
        protectiveSystemId: 'psv-1',
        fileUri: '/documents/PSV-101A_datasheet.pdf',
        fileName: 'PSV-101A_Vendor_Datasheet.pdf',
        mimeType: 'application/pdf',
        size: 245000,
        uploadedBy: 'user-1',
        createdAt: '2024-07-10T10:00:00Z',
    },
    {
        id: 'att-2',
        protectiveSystemId: 'psv-1',
        fileUri: '/documents/T-101_fire_calc.xlsx',
        fileName: 'T-101_Fire_Case_Calculation.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 156000,
        uploadedBy: 'user-1',
        createdAt: '2024-07-15T10:00:00Z',
    },
    {
        id: 'att-3',
        protectiveSystemId: 'psv-6',
        fileUri: '/documents/LNG_vaporizer_PID.pdf',
        fileName: 'LNG_Vaporizer_P&ID.pdf',
        mimeType: 'application/pdf',
        size: 1250000,
        uploadedBy: 'user-4',
        createdAt: '2024-08-18T10:00:00Z',
    },
];

// Comments (replaces notes)
export const comments: Comment[] = [
    {
        id: 'comment-1',
        protectiveSystemId: 'psv-1',
        body: 'Verified fire case wetted area calculation with operations. Confirmed liquid level at HLL during relief.',
        createdBy: 'user-2',
        createdAt: '2024-09-05T14:30:00Z',
    },
    {
        id: 'comment-2',
        protectiveSystemId: 'psv-1',
        body: 'PSV vendor confirmed 2" x 3" size available for quoted delivery. Lead time 12 weeks.',
        createdBy: 'user-1',
        createdAt: '2024-09-10T09:00:00Z',
    },
    {
        id: 'comment-3',
        protectiveSystemId: 'psv-6',
        body: 'Need to confirm cryogenic material requirements with metallurgy team. SS316L minimum.',
        createdBy: 'user-4',
        createdAt: '2024-09-18T11:00:00Z',
    },
];

// Todos
export const todos: TodoItem[] = [
    {
        id: 'todo-1',
        protectiveSystemId: 'psv-1',
        text: 'Confirm fire case wetted area with operations team',
        completed: true,
        assignedTo: 'user-2',
        dueDate: '2024-09-05',
        createdBy: 'user-1',
        createdAt: '2024-09-01T08:00:00Z',
    },
    {
        id: 'todo-2',
        protectiveSystemId: 'psv-1',
        text: 'Submit PSV data sheet to vendor for quotation',
        completed: true,
        assignedTo: 'user-1',
        dueDate: '2024-09-08',
        createdBy: 'user-1',
        createdAt: '2024-09-02T10:00:00Z',
    },
    {
        id: 'todo-3',
        protectiveSystemId: 'psv-1',
        text: 'Review inlet piping pressure drop calculation',
        completed: false,
        assignedTo: 'user-2',
        dueDate: '2024-10-15',
        createdBy: 'user-1',
        createdAt: '2024-09-15T14:00:00Z',
    },
    {
        id: 'todo-4',
        protectiveSystemId: 'psv-6',
        text: 'Get metallurgy approval for SS316L material',
        completed: false,
        assignedTo: 'user-4',
        dueDate: '2024-09-25',
        createdBy: 'user-4',
        createdAt: '2024-09-18T11:30:00Z',
    },
];

// Helper functions to query mock data
export function getCustomerById(id: string): Customer | undefined {
    return customers.find(c => c.id === id);
}

export function getPlantsByCustomer(customerId: string): Plant[] {
    return plants.filter(p => p.customerId === customerId);
}

export function getUnitsByPlant(plantId: string): Unit[] {
    return units.filter(u => u.plantId === plantId);
}

export function getAreasByUnit(unitId: string): Area[] {
    return areas.filter(a => a.unitId === unitId);
}

export function getProjectsByArea(areaId: string): Project[] {
    return projects.filter(p => p.areaId === areaId);
}

export function getProtectiveSystemsByProject(projectId: string): ProtectiveSystem[] {
    return protectiveSystems.filter(ps => ps.projectId === projectId);
}

export function getScenariosByProtectiveSystem(psvId: string): OverpressureScenario[] {
    return scenarios.filter(s => s.protectiveSystemId === psvId);
}

export function getSizingCasesByProtectiveSystem(psvId: string): SizingCase[] {
    return sizingCases.filter(sc => sc.protectiveSystemId === psvId);
}

export function getEquipmentByProject(projectId: string): Equipment[] {
    return equipment.filter(e => e.projectId === projectId);
}

export function getEquipmentLinksByPsv(psvId: string): EquipmentLink[] {
    return equipmentLinks.filter(el => el.protectiveSystemId === psvId);
}

export function getAttachmentsByPsv(psvId: string): Attachment[] {
    return attachments.filter(a => a.protectiveSystemId === psvId);
}

export function getCommentsByPsv(psvId: string): Comment[] {
    return comments.filter(c => c.protectiveSystemId === psvId);
}

export function getTodosByPsv(psvId: string): TodoItem[] {
    return todos.filter(t => t.protectiveSystemId === psvId);
}

export function getUserById(id: string): User | undefined {
    return users.find(u => u.id === id);
}

// Get full hierarchy path for a protective system
export function getHierarchyPath(psvId: string) {
    const psv = protectiveSystems.find(p => p.id === psvId);
    if (!psv) return null;

    const project = projects.find(p => p.id === psv.projectId);
    if (!project) return null;

    const area = areas.find(a => a.id === project.areaId);
    if (!area) return null;

    const unit = units.find(u => u.id === area.unitId);
    if (!unit) return null;

    const plant = plants.find(p => p.id === unit.plantId);
    if (!plant) return null;

    const customer = customers.find(c => c.id === plant.customerId);
    if (!customer) return null;

    return { customer, plant, unit, area, project, psv };
}
