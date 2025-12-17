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
    UnitSystem
} from '@/data/types';
import {
    formatPressureGauge,
    formatTemperatureC,
    formatMassFlowKgH,
    formatPressureDrop
} from '../projectUnits';

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
}

export function generatePsvSummaryPdf(data: PsvSummaryData) {
    const { psv, project, customer, plant, unit, area, owner, scenarios, sizingCases, unitSystem = 'metric' } = data;
    const doc = new jsPDF();

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

    // -- Scenarios --
    finalY = (doc as any).lastAutoTable.finalY + 10;
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

    // Save
    const filename = `${psv.tag}_Summary_${dateStr.replace(/-/g, '')}.pdf`;
    doc.save(filename);
}
