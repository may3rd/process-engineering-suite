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
    Attachment,
    RevisionHistory
} from '@/data/types';
import {
    formatPressureGauge,
    formatTemperatureC,
    formatMassFlowKgH,
    formatPressureDrop,
    formatNumber,
    convertValue,
    getProjectUnits,
    formatWithUnit
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

export interface RevisionRow {
    rev: string;
    desc: string;
    by: string;
    date: string;
    chk: string;
    chkDate: string;
    app: string;
    appDate: string;
}

export interface HydraulicSummary {
    totalLength: number;
    avgDiameter: number;
    minDiameter?: number;
    maxDiameter?: number;
    velocity?: number;
    pressureDrop?: number;
    percent?: number;
    limit: number;
    segmentCount: number;
    status: {
        label: string;
        color: 'success' | 'warning' | 'error' | 'default';
        message: string;
    };
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
    // New fields
    revisions?: RevisionRow[];
    inletSummary?: HydraulicSummary | null;
    outletSummary?: HydraulicSummary | null;
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
        outletSegments = [],
        revisions = [],
        inletSummary,
        outletSummary
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

    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // -- Revision History --
    if (revisions.length > 0) {
        doc.setFontSize(12);
        doc.text('Revision History', 14, finalY);

        const revRows = revisions.map(r => [
            r.rev,
            r.desc,
            r.by,
            r.date,
            r.chk,
            r.chkDate,
            r.app,
            r.appDate
        ]);

        autoTable(doc, {
            startY: finalY + 4,
            head: [['Rev', 'Description', 'By', 'Date', 'Chk', 'Date', 'App', 'Date']],
            body: revRows,
            theme: 'grid',
            headStyles: {
                fillColor: [220, 220, 220],
                textColor: 0,
                fontSize: 8,
                fontStyle: 'bold',
                lineWidth: 0.1,
                lineColor: [180, 180, 180]
            },
            bodyStyles: {
                fontSize: 8,
                textColor: 0,
                lineWidth: 0.1,
                lineColor: [220, 220, 220]
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 15 },
                1: { cellWidth: 'auto' }, // Description
                2: { cellWidth: 15 }, // By
                3: { cellWidth: 20 }, // Date
                4: { cellWidth: 15 }, // Chk
                5: { cellWidth: 20 }, // Date
                6: { cellWidth: 15 }, // App
                7: { cellWidth: 20 }  // Date
            },
            alternateRowStyles: {
                fillColor: [250, 250, 250]
            }
        });

        finalY = (doc as any).lastAutoTable.finalY + 10;
    }

    // -- Service Conditions --
    if (finalY > 250) { doc.addPage(); finalY = 20; }
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
    if (finalY > 250) { doc.addPage(); finalY = 20; }

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

    // -- Sizing Cases Results --
    finalY = (doc as any).lastAutoTable.finalY + 10;
    if (finalY > 250) { doc.addPage(); finalY = 20; }

    doc.setFontSize(12);
    doc.text('Sizing Results', 14, finalY);

    const sizingRows = sizingCases.map(c => {
        const scenario = scenarios.find(s => s.id === c.scenarioId);
        const rawCause = scenario ? scenario.cause : 'Unknown';
        const cause = rawCause.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        // 'inputs' might be unknown, cast to any or check type if strictly defined
        // 'numberOfValves' is stored in outputs
        const numValves = (c.outputs as any)?.numberOfValves ?? 1;

        return [
            cause,
            c.method,
            numValves.toString(), // Valve Count
            `${c.outputs?.selectedOrifice || '-'} (${c.outputs?.orificeArea || '-'} mm2)`,
            `${c.outputs?.percentUsed?.toFixed(1) || '-'} %`,
            c.status.toUpperCase()
        ];
    });

    autoTable(doc, {
        startY: finalY + 4,
        head: [['Scenario', 'Method', 'Qty', 'Selected Orifice', 'Capacity Used', 'Status']],
        body: sizingRows,
        theme: 'striped',
        headStyles: { fillColor: [52, 73, 94], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
    });

    // -- Hydraulic Summary Cards --
    // Render only if we have summaries
    if (inletSummary || outletSummary) {
        finalY = (doc as any).lastAutoTable.finalY + 10;
        if (finalY > 220) { doc.addPage(); finalY = 20; } // Ensure space for cards

        doc.setFontSize(12);
        doc.text('Hydraulic Summary', 14, finalY);
        finalY += 5;

        // Determine spacing
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 14;
        const gap = 10;
        const cardWidth = (pageWidth - (2 * margin) - gap) / 2;
        const cardHeight = 55; // Approx height

        // renderSummaryCard helper
        const renderSummaryCard = (x: number, y: number, title: string, sum: HydraulicSummary | null | undefined) => {
            // Background
            doc.setFillColor(250, 250, 250);
            doc.setDrawColor(220, 220, 220);
            doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

            // Title
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text(title, x + 4, y + 8);

            // Status chip
            if (sum) {
                const statusColor = sum.status.color === 'success' ? [46, 125, 50] :
                    sum.status.color === 'warning' ? [237, 108, 2] :
                        sum.status.color === 'error' ? [211, 47, 47] : [100, 100, 100];
                doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
                doc.roundedRect(x + cardWidth - 25, y + 3, 20, 6, 1, 1, 'F');
                doc.setTextColor(255);
                doc.setFontSize(7);
                doc.text(sum.status.label, x + cardWidth - 15, y + 7, { align: 'center' });
            }

            if (!sum) {
                doc.setTextColor(150);
                doc.setFontSize(9);
                doc.text('No network defined', x + cardWidth / 2, y + cardHeight / 2, { align: 'center' });
                return;
            }

            // Data Grid
            doc.setTextColor(0);
            doc.setFontSize(8);

            const col1X = x + 4;
            const col2X = x + cardWidth / 2 + 2;
            const rowH = 10;
            let curY = y + 16;

            // Row 1
            doc.setTextColor(100); doc.text('Segments', col1X, curY);
            doc.text('Total Length', col2X, curY);
            curY += 4;
            doc.setTextColor(0); doc.text(sum.segmentCount.toString(), col1X, curY);
            doc.text(formatWithUnit(convertValue(sum.totalLength, 'm', units.length.unit), units.length.label, 2), col2X, curY);

            // Row 2
            curY += rowH;
            doc.setTextColor(100); doc.text('Avg Diameter', col1X, curY);
            doc.text('Pressure Drop', col2X, curY);
            curY += 4;
            doc.setTextColor(0); doc.text(formatWithUnit(convertValue(sum.avgDiameter, 'mm', units.diameter.unit), units.diameter.label, 0), col1X, curY);
            doc.text(formatNumber(convertValue(sum.pressureDrop, 'kPa', units.pressureDrop.unit), 3) + ' ' + units.pressureDrop.label, col2X, curY);

            // Row 3
            curY += rowH;
            doc.setTextColor(100); doc.text('Velocity', col1X, curY);
            doc.text('dP / Set Pressure', col2X, curY);
            curY += 4;
            doc.setTextColor(0); doc.text(formatWithUnit(convertValue(sum.velocity, 'm/s', unitSystem === 'imperial' ? 'ft/s' : 'm/s'), unitSystem === 'imperial' ? 'ft/s' : 'm/s', 2), col1X, curY);
            doc.text((sum.percent?.toFixed(1) || '-') + '%', col2X, curY);

            // Limit text
            curY += 6;
            doc.setTextColor(100); doc.setFontSize(7);
            doc.text(sum.status.message, x + 4, curY);
        };

        renderSummaryCard(margin, finalY, 'Inlet Network', inletSummary);
        renderSummaryCard(margin + cardWidth + gap, finalY, 'Outlet Network', outletSummary);

        finalY += cardHeight + 5;
    }


    // -- Hydraulic Results (Inlet) --
    if (inletSegments.length > 0) {
        // finalY set above
        if (finalY > 250) { doc.addPage(); finalY = 20; }
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Inlet Hydraulic Network Details', 14, finalY);

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

        finalY = (doc as any).lastAutoTable.finalY + 10;
    }

    // -- Hydraulic Results (Outlet) --
    if (outletSegments.length > 0) {
        if (finalY > 250) { doc.addPage(); finalY = 20; }
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Outlet Hydraulic Network Details', 14, finalY);

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
    // Recalculate Y
    finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : finalY + 10;
    if (finalY > 240) { doc.addPage(); finalY = 20; }

    doc.setFontSize(12);
    doc.text('Notes', 14, finalY);

    const noteRows = projectNotes.length > 0
        ? projectNotes.map(n => [
            new Date(n.createdAt).toISOString().split('T')[0],
            n.body
        ])
        : [['-', 'No notes recorded']];

    autoTable(doc, {
        startY: finalY + 4,
        head: [['Date', 'Note']],
        body: noteRows,
        theme: 'plain',
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 30 } }
    });

    // -- Attachments --
    finalY = (doc as any).lastAutoTable.finalY + 10;
    if (finalY > 240) { doc.addPage(); finalY = 20; }

    doc.setFontSize(12);
    doc.text('Attachments', 14, finalY);

    const attRows = attachments.length > 0
        ? attachments.map(a => [
            a.fileName,
            (a.size / 1024).toFixed(1) + ' KB',
            new Date(a.createdAt).toISOString().split('T')[0]
        ])
        : [['-', 'No attachments', '-']];

    autoTable(doc, {
        startY: finalY + 4,
        head: [['Filename', 'Size', 'Uploaded']],
        body: attRows,
        theme: 'plain',
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
    });

    // Save
    const filename = `${psv.tag}_Summary_${dateStr.replace(/-/g, '')}.pdf`;
    doc.save(filename);
}

// Helper to get initials
function getUserInitials(userId: string, defaultName?: string): string {
    // In real app, this would verify user ID vs known users.
    // For now, assume userId might be initials or name if not UUID.
    // If UUID, return mock initials or lookup. 
    // The RevisionHistory card has logic for this, we simplify:
    if (userId.length > 10) return 'USR'; // Mock for UUID
    return userId.toUpperCase();
}
