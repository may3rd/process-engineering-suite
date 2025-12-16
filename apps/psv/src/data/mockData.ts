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
    MockCredential,
    ProjectNote,
} from './types';

// Users - Synced with Database (engsuite)
// All these users exist in the DB and can be used as owners.
export const users: User[] = [
    { id: 'f6c289ac-fabe-4d2e-a635-127e5b9045ad', name: 'Maetee', initials: 'MTL', email: 'maetee@eng-suite.com', role: 'admin', status: 'active' },
    { id: 'c34f5c40-8193-4e39-a628-e684361c2b67', name: 'Sarah Johnson', initials: 'SJ', email: 'sarah.johnson@acme.com', role: 'lead', status: 'active' },
    { id: '22ee3f22-898a-461b-85ec-83f84d250810', name: 'Mike Chen', initials: 'MC', email: 'mike.chen@acme.com', role: 'approver', status: 'active' },
    { id: '890a53e4-85d9-4399-85bb-68af0aa179d1', name: 'Emily Davis', initials: 'ED', email: 'emily.davis@gep.com', role: 'engineer', status: 'active' },
    { id: 'ab20b042-c519-423b-82e0-1dadf6f29fe0', name: 'John Smith', initials: 'JS', email: 'john.smith@acme.com', role: 'engineer', status: 'active' },
    { id: '1b9de640-0851-4ed5-941c-411efa30585c', name: 'Test Lead', initials: 'TL', email: 'lead@eng-suite.com', role: 'lead', status: 'active' },
    { id: 'f97ba14f-1fe6-4ad8-8c6e-241c12efcc27', name: 'Test Approver', initials: 'TA', email: 'approver@eng-suite.com', role: 'approver', status: 'active' },
    { id: '2252f300-f2f3-4911-863d-40a5baa25346', name: 'Test Engineer', initials: 'TE', email: 'engineer@eng-suite.com', role: 'engineer', status: 'active' },
];

export const validOwnersForDb = users; // All users are valid now

// Mock credentials for authentication - Updated IDs
export const credentials: MockCredential[] = [
    { userId: 'f6c289ac-fabe-4d2e-a635-127e5b9045ad', username: 'maetee', password: 'linkinpark' },
    { userId: 'c34f5c40-8193-4e39-a628-e684361c2b67', username: 'lead', password: 'lead' },
    { userId: '2252f300-f2f3-4911-863d-40a5baa25346', username: 'engineer', password: 'engineer' },
];

// Customers
export const customers: Customer[] = [
    {
        id: '5654fc8f-f576-4cba-a9d0-fe2ac1eb1e2c',
        name: 'Acme Petrochemical',
        code: 'ACME',
        status: 'active',
        ownerId: '22ee3f22-898a-461b-85ec-83f84d250810',
        createdAt: '2024-01-15T08:00:00Z',
    },
    {
        id: 'bc479980-8e75-4bec-ae36-f8437e1471d5',
        name: 'Global Energy Partners',
        code: 'GEP',
        status: 'active',
        ownerId: '22ee3f22-898a-461b-85ec-83f84d250810',
        createdAt: '2024-02-20T10:30:00Z',
    },
];

// Plants
export const plants: Plant[] = [
    {
        id: '427a7965-13bc-48a3-96a1-b8f882c7ff62',
        customerId: '5654fc8f-f576-4cba-a9d0-fe2ac1eb1e2c',
        name: 'Houston Refinery',
        code: 'HOU-REF',
        location: 'Houston, TX, USA',
        status: 'active',
        ownerId: '22ee3f22-898a-461b-85ec-83f84d250810',
        createdAt: '2024-01-20T09:00:00Z',
    },
    {
        id: 'be0fa93c-c3f8-4c81-842f-e2af54fbee75',
        customerId: '5654fc8f-f576-4cba-a9d0-fe2ac1eb1e2c',
        name: 'Baytown Chemical Complex',
        code: 'BAY-CHEM',
        location: 'Baytown, TX, USA',
        status: 'active',
        ownerId: '22ee3f22-898a-461b-85ec-83f84d250810',
        createdAt: '2024-01-25T11:00:00Z',
    },
    {
        id: 'c3b4d5e6-f7a8-49c0-b1c2-d3e4f5a6b7c8',
        customerId: 'bc479980-8e75-4bec-ae36-f8437e1471d5',
        name: 'Singapore LNG Terminal',
        code: 'SG-LNG',
        location: 'Jurong Island, Singapore',
        status: 'active',
        ownerId: '890a53e4-85d9-4399-85bb-68af0aa179d1',
        createdAt: '2024-03-01T08:00:00Z',
    },
    {
        id: 'd4c5e6f7-a8b9-40c1-d2e3-f4a5b6c7d8e9',
        customerId: 'bc479980-8e75-4bec-ae36-f8437e1471d5',
        name: 'Rotterdam Storage Facility',
        code: 'RTM-STOR',
        location: 'Rotterdam, Netherlands',
        status: 'active',
        ownerId: '890a53e4-85d9-4399-85bb-68af0aa179d1',
        createdAt: '2024-03-15T14:00:00Z',
    },
];

// Units
export const units: Unit[] = [
    {
        id: '5a7f3ab0-f7c6-4cdc-bb0a-a4b62318f4ac',
        plantId: '427a7965-13bc-48a3-96a1-b8f882c7ff62',
        name: 'Crude Distillation Unit',
        code: 'CDU-100',
        service: 'Crude Oil Processing',
        status: 'active',
        ownerId: 'c34f5c40-8193-4e39-a628-e684361c2b67',
        createdAt: '2024-02-01T10:00:00Z',
    },
    {
        id: '6a6dceb5-71c9-43a8-bc1e-4691f8d1e896',
        plantId: '427a7965-13bc-48a3-96a1-b8f882c7ff62',
        name: 'Vacuum Distillation Unit',
        code: 'VDU-200',
        service: 'Vacuum Distillation',
        status: 'active',
        ownerId: 'c34f5c40-8193-4e39-a628-e684361c2b67',
        createdAt: '2024-02-05T10:00:00Z',
    },
    {
        id: 'e5d6f7a8-b9c0-41d2-e3f4-a5b6c7d8e9f0',
        plantId: 'be0fa93c-c3f8-4c81-842f-e2af54fbee75',
        name: 'Ethylene Cracker',
        code: 'ETH-100',
        service: 'Ethylene Production',
        status: 'active',
        ownerId: 'c34f5c40-8193-4e39-a628-e684361c2b67',
        createdAt: '2024-02-10T10:00:00Z',
    },
    {
        id: 'f6e7a8b9-c0d1-42e3-f4a5-b6c7d8e9f0a1',
        plantId: 'c3b4d5e6-f7a8-49c0-b1c2-d3e4f5a6b7c8',
        name: 'LNG Receiving Terminal',
        code: 'LNG-REC',
        service: 'LNG Regasification',
        status: 'active',
        ownerId: '890a53e4-85d9-4399-85bb-68af0aa179d1',
        createdAt: '2024-03-20T10:00:00Z',
    },
];

// Areas
export const areas: Area[] = [
    {
        id: '503b8fcf-43f7-4ca4-a512-b561fcb78617',
        unitId: '5a7f3ab0-f7c6-4cdc-bb0a-a4b62318f4ac',
        name: 'Atmospheric Section',
        code: 'CDU-100-ATM',
        status: 'active',
        createdAt: '2024-02-10T10:00:00Z',
    },
    {
        id: '52519920-7f49-44a1-b601-62a891d1f41d',
        unitId: '5a7f3ab0-f7c6-4cdc-bb0a-a4b62318f4ac',
        name: 'Preheat Train',
        code: 'CDU-100-PHT',
        status: 'active',
        createdAt: '2024-02-10T10:00:00Z',
    },
    {
        id: 'a7b8c9d0-e1f2-43a4-b5c6-d7e8f9a0b1c2',
        unitId: '6a6dceb5-71c9-43a8-bc1e-4691f8d1e896',
        name: 'Vacuum Column',
        code: 'VDU-200-COL',
        status: 'active',
        createdAt: '2024-02-15T10:00:00Z',
    },
    {
        id: 'b8c9d0e1-f2a3-44b5-c6d7-e8f9a0b1c2d3',
        unitId: 'e5d6f7a8-b9c0-41d2-e3f4-a5b6c7d8e9f0',
        name: 'Furnace Area',
        code: 'ETH-100-FUR',
        status: 'active',
        createdAt: '2024-02-20T10:00:00Z',
    },
    {
        id: 'c9d0e1f2-a3b4-45c6-d7e8-f9a0b1c2d3e4',
        unitId: 'f6e7a8b9-c0d1-42e3-f4a5-b6c7d8e9f0a1',
        name: 'Vaporizer Section',
        code: 'LNG-REC-VAP',
        status: 'active',
        createdAt: '2024-03-25T10:00:00Z',
    },
];

// Projects
export const projects: Project[] = [
    {
        id: 'd0e1f2a3-b4c5-46d7-e8f9-a0b1c2d3e4f5',
        areaId: '503b8fcf-43f7-4ca4-a512-b561fcb78617',
        name: 'CDU Atmospheric Tower Relief Study',
        code: 'ACME-2024-001',
        phase: 'design',
        status: 'in_review',
        startDate: '2024-06-01',
        leadId: '22ee3f22-898a-461b-85ec-83f84d250810',
        createdAt: '2024-06-01T08:00:00Z',
    },
    {
        id: 'e1f2a3b4-c5d6-47e8-f9a0-b1c2d3e4f5a6',
        areaId: '52519920-7f49-44a1-b601-62a891d1f41d',
        name: 'Preheat Exchanger PSV Review',
        code: 'ACME-2024-002',
        phase: 'design',
        status: 'draft',
        startDate: '2024-07-15',
        leadId: 'c34f5c40-8193-4e39-a628-e684361c2b67',
        createdAt: '2024-07-15T08:00:00Z',
    },
    {
        id: 'f2a3b4c5-d6e7-48f9-a0b1-c2d3e4f5a6b7',
        areaId: 'a7b8c9d0-e1f2-43a4-b5c6-d7e8f9a0b1c2',
        name: 'Vacuum Column Fire Case Analysis',
        code: 'ACME-2024-003',
        phase: 'design',
        status: 'approved',
        startDate: '2024-05-01',
        endDate: '2024-08-30',
        leadId: '22ee3f22-898a-461b-85ec-83f84d250810',
        createdAt: '2024-05-01T08:00:00Z',
    },
    {
        id: 'a3b4c5d6-e7f8-49a0-b1c2-d3e4f5a6b7c8',
        areaId: 'b8c9d0e1-f2a3-44b5-c6d7-e8f9a0b1c2d3',
        name: 'Cracker Furnace Relief Upgrade',
        code: 'ACME-2024-004',
        phase: 'construction',
        status: 'issued',
        startDate: '2024-03-01',
        leadId: 'c34f5c40-8193-4e39-a628-e684361c2b67',
        createdAt: '2024-03-01T08:00:00Z',
    },
    {
        id: 'b4c5d6e7-f8a9-40b1-c2d3-e4f5a6b7c8d9',
        areaId: 'c9d0e1f2-a3b4-45c6-d7e8-f9a0b1c2d3e4',
        name: 'LNG Vaporizer PSV Sizing',
        code: 'GEP-2024-001',
        phase: 'design',
        status: 'in_review',
        startDate: '2024-08-01',
        leadId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        createdAt: '2024-08-01T08:00:00Z',
    },
];

// Equipment
export const equipment: Equipment[] = [
    {
        id: 'e0000001-0001-0001-0001-000000000001',
        areaId: '503b8fcf-43f7-4ca4-a512-b561fcb78617',
        type: 'column',
        tag: 'T-101',
        name: 'Atmospheric Crude Tower',
        description: 'Atmospheric Crude Tower',
        designPressure: 3.5,
        mawp: 4.0,
        designTemperature: 400,
        ownerId: 'f6c289ac-fabe-4d2e-a635-127e5b9045ad',
        status: 'active',
        details: {
            innerDiameter: 4000, // mm
            tangentToTangentLength: 45000, // mm
            orientation: 'vertical',
            headType: 'elliptical',
            insulated: false,
        },
        createdAt: '2024-06-05T10:00:00Z',
        updatedAt: '2024-06-05T10:00:00Z',
    },
    {
        id: 'e0000002-0002-0002-0002-000000000002',
        areaId: '503b8fcf-43f7-4ca4-a512-b561fcb78617',
        type: 'vessel',
        tag: 'V-102',
        name: 'Overhead Accumulator',
        description: 'Overhead Accumulator',
        designPressure: 5.0,
        mawp: 6.0,
        designTemperature: 150,
        ownerId: 'f6c289ac-fabe-4d2e-a635-127e5b9045ad',
        status: 'active',
        details: {
            innerDiameter: 3000, // mm
            tangentToTangentLength: 8000, // mm
            orientation: 'horizontal',
            headType: 'torispherical',
            insulated: true,
        },
        createdAt: '2024-06-05T10:00:00Z',
        updatedAt: '2024-06-05T10:00:00Z',
    },
    {
        id: 'e0000003-0003-0003-0003-000000000003',
        areaId: '52519920-7f49-44a1-b601-62a891d1f41d',
        type: 'heat_exchanger',
        tag: 'E-101A/B',
        name: 'Crude Preheat Exchanger',
        description: 'Crude Preheat Exchanger',
        designPressure: 25.0,
        mawp: 28.0,
        designTemperature: 300,
        ownerId: 'f6c289ac-fabe-4d2e-a635-127e5b9045ad',
        status: 'active',
        createdAt: '2024-07-20T10:00:00Z',
        updatedAt: '2024-07-20T10:00:00Z',
    },
    {
        id: 'e0000004-0004-0004-0004-000000000004',
        areaId: 'a7b8c9d0-e1f2-43a4-b5c6-d7e8f9a0b1c2',
        type: 'column',
        tag: 'T-201',
        name: 'Vacuum Column',
        description: 'Vacuum Column',
        designPressure: 1.0,
        mawp: 1.5,
        designTemperature: 420,
        ownerId: 'f6c289ac-fabe-4d2e-a635-127e5b9045ad',
        status: 'active',
        createdAt: '2024-05-10T10:00:00Z',
        updatedAt: '2024-05-10T10:00:00Z',
    },
    {
        id: 'e0000005-0005-0005-0005-000000000005',
        areaId: 'c9d0e1f2-a3b4-45c6-d7e8-f9a0b1c2d3e4',
        type: 'heat_exchanger',
        tag: 'E-501',
        name: 'LNG Vaporizer',
        description: 'LNG Vaporizer',
        designPressure: 85.0,
        mawp: 90.0,
        designTemperature: -165,
        ownerId: '890a53e4-85d9-4399-85bb-68af0aa179d1',
        status: 'active',
        createdAt: '2024-08-10T10:00:00Z',
        updatedAt: '2024-08-10T10:00:00Z',
    },
];

// Protective Systems
export const protectiveSystems: ProtectiveSystem[] = [
    {
        id: '11111111-1111-1111-1111-111111111111',
        areaId: '503b8fcf-43f7-4ca4-a512-b561fcb78617',
        projectIds: ['d0e1f2a3-b4c5-46d7-e8f9-a0b1c2d3e4f5'],
        name: 'Atmospheric Tower Overhead PSV',
        tag: 'PSV-101A',
        type: 'psv',
        designCode: 'API-520',
        serviceFluid: 'Light Ends (C1-C4)',
        fluidPhase: 'gas',
        setPressure: 2.8,
        mawp: 3.5,
        ownerId: 'c34f5c40-8193-4e39-a628-e684361c2b67',
        status: 'in_review',
        tags: ['critical', 'fire-case'],
        inletNetwork: {
            nodes: [
                { id: 'n1', label: 'Source', position: { x: 0, y: 0 }, pressure: 3.5, temperature: 180, fluid: { id: 'fl1', phase: 'gas' } },
                { id: 'n2', label: 'PSV Inlet', position: { x: 100, y: 0 }, pressure: 2.8, temperature: 180, fluid: { id: 'fl1', phase: 'gas' } }
            ],
            pipes: [
                {
                    id: 'p1', name: 'Inlet Pipe', startNodeId: 'n1', endNodeId: 'n2', length: 5, lengthUnit: 'm', diameter: 400, diameterUnit: 'mm', elevation: 0,
                    fittings: []
                },
                {
                    id: 'p2', name: 'Inlet Pipe', startNodeId: 'n2', endNodeId: 'n1', length: 5, lengthUnit: 'm', diameter: 400, diameterUnit: 'mm', elevation: 0,
                    fittings: []
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
                    id: 'op1', name: 'Discharge Pipe', startNodeId: 'on1', endNodeId: 'on2', length: 20, lengthUnit: 'm', diameter: 600, diameterUnit: 'mm', elevation: 5,
                    fittings: []
                },
                {
                    id: 'op2', name: 'Discharge Pipe', startNodeId: 'on2', endNodeId: 'on1', length: 20, lengthUnit: 'm', diameter: 600, diameterUnit: 'mm', elevation: 5,
                    fittings: []
                }
            ]
        },
        createdAt: '2024-06-10T08:00:00Z',
        updatedAt: '2024-09-15T14:30:00Z',
    },
    {
        id: '22222222-2222-2222-2222-222222222222',
        areaId: '503b8fcf-43f7-4ca4-a512-b561fcb78617',
        projectIds: ['d0e1f2a3-b4c5-46d7-e8f9-a0b1c2d3e4f5'],
        name: 'Atmospheric Tower Overhead PSV (Spare)',
        tag: 'PSV-101B',
        type: 'psv',
        designCode: 'API-520',
        serviceFluid: 'Light Ends (C1-C4)',
        fluidPhase: 'gas',
        setPressure: 2.9,
        mawp: 3.5,
        ownerId: 'c34f5c40-8193-4e39-a628-e684361c2b67',
        status: 'draft',
        tags: ['spare'],
        createdAt: '2024-06-10T08:00:00Z',
        updatedAt: '2024-09-10T10:00:00Z',
    },
    {
        id: '33333333-3333-3333-3333-333333333333',
        areaId: '503b8fcf-43f7-4ca4-a512-b561fcb78617',
        projectIds: ['d0e1f2a3-b4c5-46d7-e8f9-a0b1c2d3e4f5'],
        name: 'Overhead Accumulator PSV',
        tag: 'PSV-102',
        type: 'psv',
        designCode: 'API-520',
        serviceFluid: 'Naphtha',
        fluidPhase: 'liquid',
        setPressure: 4.0,
        mawp: 5.0,
        ownerId: 'c34f5c40-8193-4e39-a628-e684361c2b67',
        status: 'approved',
        tags: ['blocked-outlet'],
        createdAt: '2024-06-15T08:00:00Z',
        updatedAt: '2024-08-20T16:00:00Z',
    },
    {
        id: '44444444-4444-4444-4444-444444444444',
        areaId: '52519920-7f49-44a1-b601-62a891d1f41d',
        projectIds: ['e1f2a3b4-c5d6-47e8-f9a0-b1c2d3e4f5a6'],
        name: 'Preheat Exchanger Tube Rupture PSV',
        tag: 'PSV-103',
        type: 'psv',
        designCode: 'API-520',
        serviceFluid: 'Crude Oil',
        fluidPhase: 'liquid',
        setPressure: 20.0,
        mawp: 25.0,
        ownerId: 'c34f5c40-8193-4e39-a628-e684361c2b67',
        status: 'draft',
        tags: ['tube-rupture'],
        createdAt: '2024-07-25T08:00:00Z',
        updatedAt: '2024-07-25T08:00:00Z',
    },
    {
        id: '55555555-5555-5555-5555-555555555555',
        areaId: 'a7b8c9d0-e1f2-43a4-b5c6-d7e8f9a0b1c2',
        projectIds: ['f2a3b4c5-d6e7-48f9-a0b1-c2d3e4f5a6b7'],
        name: 'Vacuum Column Fire Case RD',
        tag: 'RD-201',
        type: 'rupture_disc',
        designCode: 'API-520',
        serviceFluid: 'Vacuum Residue',
        fluidPhase: 'liquid',
        setPressure: 0.8,
        mawp: 1.0,
        ownerId: '22ee3f22-898a-461b-85ec-83f84d250810',
        status: 'issued',
        tags: ['fire-case', 'rupture-disc'],
        createdAt: '2024-05-20T08:00:00Z',
        updatedAt: '2024-08-25T10:00:00Z',
    },
    {
        id: '66666666-6666-6666-6666-666666666666',
        areaId: 'c9d0e1f2-a3b4-45c6-d7e8-f9a0b1c2d3e4',
        projectIds: ['b4c5d6e7-f8a9-40b1-c2d3-e4f5a6b7c8d9'],
        name: 'LNG Vaporizer PSV',
        tag: 'PSV-501',
        type: 'psv',
        designCode: 'API-520',
        serviceFluid: 'Natural Gas (Methane)',
        fluidPhase: 'gas',
        setPressure: 75.0,
        mawp: 85.0,
        ownerId: '890a53e4-85d9-4399-85bb-68af0aa179d1',
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
        protectiveSystemId: '11111111-1111-1111-1111-111111111111',
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
        protectiveSystemId: '11111111-1111-1111-1111-111111111111',
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
        protectiveSystemId: '33333333-3333-3333-3333-333333333333',
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
        protectiveSystemId: '44444444-4444-4444-4444-444444444444',
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
        protectiveSystemId: '66666666-6666-6666-6666-666666666666',
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
        protectiveSystemId: '66666666-6666-6666-6666-666666666666',
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
        id: 'z0000001-0001-0001-0001-000000000001',
        protectiveSystemId: '11111111-1111-1111-1111-111111111111',
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
        status: 'verified',
        createdBy: 'c34f5c40-8193-4e39-a628-e684361c2b67',
        approvedBy: 'f7b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d',
        createdAt: '2024-06-20T10:00:00Z',
        updatedAt: '2024-09-12T14:00:00Z',
    },
    {
        id: 'z0000002-0002-0002-0002-000000000002',
        protectiveSystemId: '33333333-3333-3333-3333-333333333333',
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
        status: 'approved',
        createdBy: 'c34f5c40-8193-4e39-a628-e684361c2b67',
        approvedBy: '22ee3f22-898a-461b-85ec-83f84d250810',
        createdAt: '2024-06-25T10:00:00Z',
        updatedAt: '2024-08-18T16:00:00Z',
    },
    {
        id: 'z0000003-0003-0003-0003-000000000003',
        protectiveSystemId: '66666666-6666-6666-6666-666666666666',
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
        createdBy: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        createdAt: '2024-08-25T10:00:00Z',
        updatedAt: '2024-09-20T11:00:00Z',
    },
];

// Equipment Links
export const equipmentLinks: EquipmentLink[] = [
    { id: 'l1000001-0001-0001-0001-000000000001', psvId: '11111111-1111-1111-1111-111111111111', equipmentId: 'e0000001-0001-0001-0001-000000000001', isPrimary: true, createdAt: '2024-06-10T08:00:00Z' },
    { id: 'l1000002-0002-0002-0002-000000000002', psvId: '22222222-2222-2222-2222-222222222222', equipmentId: 'e0000001-0001-0001-0001-000000000001', isPrimary: false, createdAt: '2024-06-10T08:00:00Z' },
    { id: 'l1000003-0003-0003-0003-000000000003', psvId: '33333333-3333-3333-3333-333333333333', equipmentId: 'e0000002-0002-0002-0002-000000000002', isPrimary: true, createdAt: '2024-06-15T08:00:00Z' },
    { id: 'l1000004-0004-0004-0004-000000000004', psvId: '44444444-4444-4444-4444-444444444444', equipmentId: 'e0000003-0003-0003-0003-000000000003', isPrimary: true, createdAt: '2024-07-25T08:00:00Z' },
    { id: 'link-5', psvId: '55555555-5555-5555-5555-555555555555', equipmentId: 'e0000004-0004-0004-0004-000000000004', isPrimary: true, createdAt: '2024-05-20T08:00:00Z' },
];

// Attachments
export const attachments: Attachment[] = [
    {
        id: 'att-1',
        protectiveSystemId: '11111111-1111-1111-1111-111111111111',
        fileUri: '/documents/PSV-101A_datasheet.pdf',
        fileName: 'PSV-101A_Vendor_Datasheet.pdf',
        mimeType: 'application/pdf',
        size: 245000,
        uploadedBy: 'c34f5c40-8193-4e39-a628-e684361c2b67',
        createdAt: '2024-07-10T10:00:00Z',
    },
    {
        id: 'att-2',
        protectiveSystemId: '11111111-1111-1111-1111-111111111111',
        fileUri: '/documents/T-101_fire_calc.xlsx',
        fileName: 'T-101_Fire_Case_Calculation.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 156000,
        uploadedBy: 'c34f5c40-8193-4e39-a628-e684361c2b67',
        createdAt: '2024-07-15T10:00:00Z',
    },
    {
        id: 'att-3',
        protectiveSystemId: '66666666-6666-6666-6666-666666666666',
        fileUri: '/documents/LNG_vaporizer_PID.pdf',
        fileName: 'LNG_Vaporizer_P&ID.pdf',
        mimeType: 'application/pdf',
        size: 1250000,
        uploadedBy: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        createdAt: '2024-08-18T10:00:00Z',
    },
];

// Formal Notes (displayed in summary)
export const notes: ProjectNote[] = [
    {
        id: 'n1000001-0001-0001-0001-000000000001',
        protectiveSystemId: '11111111-1111-1111-1111-111111111111',
        body: 'Relief calculations are based on API-520 (2023) with accumulation limited to 10%.',
        createdBy: '22ee3f22-898a-461b-85ec-83f84d250810',
        createdAt: '2024-09-05T14:30:00Z',
    },
    {
        id: 'n1000002-0001-0001-0001-000000000002',
        protectiveSystemId: '66666666-6666-6666-6666-666666666666',
        body: 'Cryogenic service requires SS316L trim and soft seat; vendor spec PSV-CRYO-221 applies.',
        createdBy: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        createdAt: '2024-09-12T11:00:00Z',
    },
];

// Comments (replaces notes)
export const comments: Comment[] = [
    {
        id: 'c1000001-0001-0001-0001-000000000001',
        protectiveSystemId: '11111111-1111-1111-1111-111111111111',
        body: 'Verified fire case wetted area calculation with operations. Confirmed liquid level at HLL during relief.',
        createdBy: '22ee3f22-898a-461b-85ec-83f84d250810',
        createdAt: '2024-09-05T14:30:00Z',
    },
    {
        id: 'c1000002-0002-0002-0002-000000000002',
        protectiveSystemId: '11111111-1111-1111-1111-111111111111',
        body: 'PSV vendor confirmed 2" x 3" size available for quoted delivery. Lead time 12 weeks.',
        createdBy: 'c34f5c40-8193-4e39-a628-e684361c2b67',
        createdAt: '2024-09-10T09:00:00Z',
    },
    {
        id: 'c1000003-0003-0003-0003-000000000003',
        protectiveSystemId: '66666666-6666-6666-6666-666666666666',
        body: 'Need to confirm cryogenic material requirements with metallurgy team. SS316L minimum.',
        createdBy: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        createdAt: '2024-09-18T11:00:00Z',
    },
];

// Todos
export const todos: TodoItem[] = [
    {
        id: 't1000001-0001-0001-0001-000000000001',
        protectiveSystemId: '11111111-1111-1111-1111-111111111111',
        text: 'Confirm fire case wetted area with operations team',
        completed: true,
        assignedTo: '22ee3f22-898a-461b-85ec-83f84d250810',
        dueDate: '2024-09-05',
        createdBy: 'c34f5c40-8193-4e39-a628-e684361c2b67',
        createdAt: '2024-09-01T08:00:00Z',
    },
    {
        id: 't1000002-0002-0002-0002-000000000002',
        protectiveSystemId: '11111111-1111-1111-1111-111111111111',
        text: 'Submit PSV data sheet to vendor for quotation',
        completed: true,
        assignedTo: 'c34f5c40-8193-4e39-a628-e684361c2b67',
        dueDate: '2024-09-08',
        createdBy: 'c34f5c40-8193-4e39-a628-e684361c2b67',
        createdAt: '2024-09-02T10:00:00Z',
    },
    {
        id: 't1000003-0003-0003-0003-000000000003',
        protectiveSystemId: '11111111-1111-1111-1111-111111111111',
        text: 'Review inlet piping pressure drop calculation',
        completed: false,
        assignedTo: '22ee3f22-898a-461b-85ec-83f84d250810',
        dueDate: '2024-10-15',
        createdBy: 'c34f5c40-8193-4e39-a628-e684361c2b67',
        createdAt: '2024-09-15T14:00:00Z',
    },
    {
        id: 't1000004-0004-0004-0004-000000000004',
        protectiveSystemId: '66666666-6666-6666-6666-666666666666',
        text: 'Get metallurgy approval for SS316L material',
        completed: false,
        assignedTo: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        dueDate: '2024-09-25',
        createdBy: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
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

export function getProtectiveSystemsByArea(areaId: string): ProtectiveSystem[] {
    return protectiveSystems.filter(ps => ps.areaId === areaId);
}

export function getScenariosByProtectiveSystem(psvId: string): OverpressureScenario[] {
    return scenarios.filter(s => s.protectiveSystemId === psvId);
}

export function getSizingCasesByProtectiveSystem(psvId: string): SizingCase[] {
    return sizingCases.filter(sc => sc.protectiveSystemId === psvId);
}

export function getEquipmentByArea(areaId: string): Equipment[] {
    return equipment.filter(e => e.areaId === areaId);
}

export function getEquipmentLinksByPsv(psvId: string): EquipmentLink[] {
    return equipmentLinks.filter(el => el.psvId === psvId);
}

export function getAttachmentsByPsv(psvId: string): Attachment[] {
    return attachments.filter(a => a.protectiveSystemId === psvId);
}

export function getNotesByPsv(psvId: string): ProjectNote[] {
    return notes.filter(n => n.protectiveSystemId === psvId);
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

    const area = areas.find(a => a.id === psv.areaId);
    if (!area) return null;

    const unit = units.find(u => u.id === area.unitId);
    if (!unit) return null;

    const plant = plants.find(p => p.id === unit.plantId);
    if (!plant) return null;

    const customer = customers.find(c => c.id === plant.customerId);
    if (!customer) return null;

    return { customer, plant, unit, area, psv };
}

// Get PSVs by Project (via projectIds array)
export function getProtectiveSystemsByProject(projectId: string): ProtectiveSystem[] {
    return protectiveSystems.filter(ps => ps.projectIds?.includes(projectId));
}

// Mock revision history for demo
import { RevisionHistory } from './types';

export const revisionHistory: RevisionHistory[] = [
    {
        id: 'rev-001-a1',
        entityType: 'protective_system',
        entityId: '11111111-1111-1111-1111-111111111111', // PSV-101A
        revisionCode: 'A1',
        sequence: 2,
        description: 'Updated design flow based on latest process data',
        originatedBy: '2252f300-f2f3-4911-863d-40a5baa25346', // Test Engineer
        originatedAt: '2025-12-12T09:00:00Z',
        checkedBy: 'c34f5c40-8193-4e39-a628-e684361c2b67', // Sarah Johnson (Lead)
        checkedAt: '2025-12-12T14:30:00Z',
        approvedBy: 'f6c289ac-fabe-4d2e-a635-127e5b9045ad', // Maetee (Admin)
        approvedAt: '2025-12-15T10:00:00Z',
        snapshot: {},
        createdAt: '2025-12-12T09:00:00Z',
    },
    {
        id: 'rev-001-o1',
        entityType: 'protective_system',
        entityId: '11111111-1111-1111-1111-111111111111', // PSV-101A
        revisionCode: 'O1',
        sequence: 1,
        description: 'Original',
        originatedBy: '2252f300-f2f3-4911-863d-40a5baa25346', // Test Engineer
        originatedAt: '2025-12-01T08:00:00Z',
        checkedBy: 'c34f5c40-8193-4e39-a628-e684361c2b67', // Sarah Johnson (Lead)
        checkedAt: '2025-12-02T15:00:00Z',
        approvedBy: 'f6c289ac-fabe-4d2e-a635-127e5b9045ad', // Maetee (Admin)
        approvedAt: '2025-12-05T11:00:00Z',
        snapshot: {},
        createdAt: '2025-12-01T08:00:00Z',
    },
    {
        id: 'rev-002-o1',
        entityType: 'protective_system',
        entityId: '33333333-3333-3333-3333-333333333333', // PSV-102
        revisionCode: 'O1',
        sequence: 1,
        description: 'Original',
        originatedBy: '890a53e4-85d9-4399-85bb-68af0aa179d1', // Emily Davis
        originatedAt: '2025-11-20T10:00:00Z',
        checkedBy: 'c34f5c40-8193-4e39-a628-e684361c2b67',
        checkedAt: '2025-11-21T09:00:00Z',
        approvedBy: '22ee3f22-898a-461b-85ec-83f84d250810', // Mike Chen
        approvedAt: '2025-11-22T16:00:00Z',
        snapshot: {},
        createdAt: '2025-11-20T10:00:00Z',
    },
];
