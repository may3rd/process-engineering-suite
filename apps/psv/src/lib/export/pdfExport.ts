import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    ProtectiveSystem,
    Project,
    Customer,
    Plant,
    Unit,
    Area,
    User,
    OverpressureScenario,
    SizingCase,
    UnitSystem,
    Equipment,
    ProjectNote,
    Attachment
} from '@/data/types';
import {
    formatPressureGauge,
    formatTemperatureC,
    formatMassFlowKgH,
    formatPressureDrop,
    formatNumber,
    convertValue,
    getProjectUnits
} from '../projectUnits';

export interface PipelineSegmentRow {
    id: string;
    label: string;
    p1Barg?: number;
    p2Barg?: number;
    lengthMeters: number;
    diameterMm: number;
    sectionType: string;
    fluid: string;
    fittings?: string;
    pressureDrop?: number;
}

// Define the interface for the PDF generator input
export interface PsvSummaryData {
    psv: ProtectiveSystem;
    project?: Project;
    customer?: Customer;
    plant?: Plant;
    unit?: Unit;
    area?: Area;
    owner?: User;
    scenarios: OverpressureScenario[];
    sizingCases: SizingCase[];
    unitSystem?: UnitSystem; // Optional, defaults to 'metric'
    linkedEquipment?: Equipment[];
    projectNotes?: ProjectNote[];
    attachments?: Attachment[];
    inletSegments?: PipelineSegmentRow[];
    outletSegments?: PipelineSegmentRow[];
}

export function generatePsvSummaryPdf(data: PsvSummaryData) {
    const {
        psv, project, customer, plant, unit, area, owner,
        scenarios, sizingCases,
        unitSystem = 'metric',
        linkedEquipment = [],
        projectNotes = [],
        attachments = [],
        inletSegments = [],
        outletSegments = []
    } = data;
    const doc = new jsPDF();
    const units = getProjectUnits(unitSystem);

    // -- Header --
    doc.setFontSize(18);
    doc.text('PSV Summary Report', 14, 20);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${dateStr} ${timeStr}`, 14, 26);
    doc.setTextColor(0);

    // -- PSV Info --
    doc.setFontSize(14);
    doc.text(`Tag: ${psv.tag}`, 14, 36);
    doc.setFontSize(11);
    doc.text(`${psv.name}`, 14, 42);

    // Context Table
    const facility = plant
        ? `${plant.name}${unit ? ` / ${unit.name}` : ''}`
        : unit?.name || '—';
    const areaName = area
        ? `${area.code ? `${area.code} – ` : ''}${area.name}`
        : '—';

    autoTable(doc, {
        startY: 50,
        head: [['Attribute', 'Value', 'Attribute', 'Value']],
        body: [
            ['Client', customer?.name || '—', 'Facility', facility],
            ['Area', areaName, 'Project', project?.name || '—'],
            ['Document No.', psv.tag, 'Prepared By', owner?.name || '—'],
            ['Revision Date', new Date(psv.updatedAt).toISOString().split('T')[0], 'Status', psv.status.toUpperCase()],
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
    });

    // -- Service Conditions --
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text('Service Conditions', 14, finalY);

    autoTable(doc, {
        startY: finalY + 4,
        head: [['Property', 'Value', 'Property', 'Value']],
        body: [
            ['Service Fluid', psv.serviceFluid, 'Fluid Phase', psv.fluidPhase],
            ['Set Pressure', formatPressureGauge(psv.setPressure, unitSystem), 'MAWP', formatPressureGauge(psv.mawp, unitSystem)],
            ['Valve Type', psv.type.replace('_', ' '), 'Design Code', psv.designCode || '-'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [52, 73, 94], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
    });

    // -- Protected Equipment --
    if (linkedEquipment.length > 0) {
        finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text('Protected Equipment', 14, finalY);

        const equipmentRows = linkedEquipment.map(eq => [
            eq.tag || '-',
            eq.description || '-',
            eq.type || '-',
            eq.designPressure !== undefined && eq.designPressure !== null ? formatPressureGauge(eq.designPressure, unitSystem) : '-'
        ]);

        autoTable(doc, {
            startY: finalY + 4,
            head: [['Tag', 'Description', 'Type', 'Design Pressure']],
            body: equipmentRows,
            theme: 'striped',
            headStyles: { fillColor: [52, 73, 94], fontSize: 9 },
            bodyStyles: { fontSize: 9 },
        });
    }

    // -- Scenarios --
    finalY = (doc as any).lastAutoTable.finalY + 10;

    // Check page break
    if (finalY > 250) {
        doc.addPage();
        finalY = 20;
    }

    doc.setFontSize(12);
    doc.text('Relief Scenarios', 14, finalY);

    const scenarioRows = scenarios.map(s => [
        s.cause.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        s.description.substring(0, 40) + (s.description.length > 40 ? '...' : ''),
        s.phase,
        formatMassFlowKgH(s.relievingRate, unitSystem),
        formatPressureGauge(s.relievingPressure, unitSystem),
        s.isGoverning ? 'Yes' : '-'
    ]);

    autoTable(doc, {
        startY: finalY + 4,
        head: [['Cause', 'Description', 'Phase', 'Rate', 'Pressure', 'Gov']],
        body: scenarioRows,
        theme: 'striped',
        headStyles: { fillColor: [52, 73, 94], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
    });

    // -- Sizing Cases --
    finalY = (doc as any).lastAutoTable.finalY + 10;

    // Check page break
    if (finalY > 250) {
        doc.addPage();
        finalY = 20;
    }

    doc.setFontSize(12);
    doc.text('Sizing Results', 14, finalY);

    const sizingRows = sizingCases.map(c => {
        const scenario = scenarios.find(s => s.id === c.scenarioId);
        const cause = scenario ? scenario.cause : 'Unknown';
        return [
            cause,
            c.method,
            `${c.outputs?.selectedOrifice || '-'} (${c.outputs?.orificeArea || '-'} mm2)`,
            `${c.outputs?.percentUsed?.toFixed(1) || '-'} %`,
            c.status.toUpperCase()
        ];
    });

    autoTable(doc, {
        startY: finalY + 4,
        head: [['Scenario', 'Method', 'Selected Orifice', 'Capacity Used', 'Status']],
        body: sizingRows,
        theme: 'striped',
        headStyles: { fillColor: [52, 73, 94], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
    });

    // -- Hydraulic Results (Inlet) --
    if (inletSegments.length > 0) {
        finalY = (doc as any).lastAutoTable.finalY + 10;

        if (finalY > 250) {
            doc.addPage();
            finalY = 20;
        }

        doc.setFontSize(12);
        doc.text('Inlet Hydraulic Network', 14, finalY);

        const inletRows = inletSegments.map(seg => [
            seg.label,
            seg.p1Barg !== undefined ? formatNumber(seg.p1Barg, 2) : '-',
            seg.p2Barg !== undefined ? formatNumber(seg.p2Barg, 2) : '-',
            seg.lengthMeters ? formatNumber(convertValue(seg.lengthMeters, 'm', units.length.unit), 2) : '-',
            seg.diameterMm ? formatNumber(convertValue(seg.diameterMm, 'mm', units.diameter.unit), 0) : '-',
            seg.pressureDrop !== undefined ? formatNumber(convertValue(seg.pressureDrop, 'kPa', units.pressureDrop.unit), 3) : '-'
        ]);

        autoTable(doc, {
            startY: finalY + 4,
            head: [[
                'Segment',
                `P1 (${units.pressureGauge.label})`,
                `P2 (${units.pressureGauge.label})`,
                `Len (${units.length.label})`,
                `Dia (${units.diameter.label})`,
                `dP (${units.pressureDrop.label})`
            ]],
            body: inletRows,
            theme: 'grid',
            headStyles: { fillColor: [142, 68, 173], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
        });
    }

    // -- Hydraulic Results (Outlet) --
    if (outletSegments.length > 0) {
        finalY = (doc as any).lastAutoTable.finalY + 10;

        if (finalY > 250) {
            doc.addPage();
            finalY = 20;
        }

        doc.setFontSize(12);
        doc.text('Outlet Hydraulic Network', 14, finalY);

        const outletRows = outletSegments.map(seg => [
            seg.label,
            seg.p1Barg !== undefined ? formatNumber(seg.p1Barg, 2) : '-',
            seg.p2Barg !== undefined ? formatNumber(seg.p2Barg, 2) : '-',
            seg.lengthMeters ? formatNumber(convertValue(seg.lengthMeters, 'm', units.length.unit), 2) : '-',
            seg.diameterMm ? formatNumber(convertValue(seg.diameterMm, 'mm', units.diameter.unit), 0) : '-',
            seg.pressureDrop !== undefined ? formatNumber(convertValue(seg.pressureDrop, 'kPa', units.pressureDrop.unit), 3) : '-'
        ]);

        autoTable(doc, {
            startY: finalY + 4,
            head: [[
                'Segment',
                `P1 (${units.pressureGauge.label})`,
                `P2 (${units.pressureGauge.label})`,
                `Len (${units.length.label})`,
                `Dia (${units.diameter.label})`,
                `dP (${units.pressureDrop.label})`
            ]],
            body: outletRows,
            theme: 'grid',
            headStyles: { fillColor: [142, 68, 173], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
        });
    }

    // -- Notes --
    if (projectNotes.length > 0) {
        finalY = (doc as any).lastAutoTable.finalY + 10;

        if (finalY > 240) {
            doc.addPage();
            finalY = 20;
        }

        doc.setFontSize(12);
        doc.text('Notes', 14, finalY);

        const noteRows = projectNotes.map(n => [
            new Date(n.createdAt).toISOString().split('T')[0],
            n.body
        ]);

        autoTable(doc, {
            startY: finalY + 4,
            head: [['Date', 'Note']],
            body: noteRows,
            theme: 'plain',
            headStyles: { fillColor: [200, 200, 200], textColor: 0, fontSize: 9 },
            bodyStyles: { fontSize: 9 },
            columnStyles: { 0: { cellWidth: 30 } } // Fixed width for date
        });
    }

    // -- Attachments --
    if (attachments.length > 0) {
        finalY = (doc as any).lastAutoTable.finalY + 10;

        if (finalY > 240) {
            doc.addPage();
            finalY = 20;
        }

        doc.setFontSize(12);
        doc.text('Attachments', 14, finalY);

        const attRows = attachments.map(a => [
            a.fileName,
            (a.size / 1024).toFixed(1) + ' KB',
            new Date(a.createdAt).toISOString().split('T')[0]
        ]);

        autoTable(doc, {
            startY: finalY + 4,
            head: [['Filename', 'Size', 'Uploaded']],
            body: attRows,
            theme: 'plain',
            headStyles: { fillColor: [200, 200, 200], textColor: 0, fontSize: 9 },
            bodyStyles: { fontSize: 9 },
        });
    }

    // Save
    const filename = `${psv.tag}_Summary_${dateStr.replace(/-/g, '')}.pdf`;
    doc.save(filename);
}
