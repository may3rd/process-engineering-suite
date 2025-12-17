import * as XLSX from 'xlsx';
import { OverpressureScenario, ProtectiveSystem, UnitSystem } from '@/data/types';
import { getProjectUnits, convertValue } from '../projectUnits';

export function exportScenariosToExcel(
    scenarios: OverpressureScenario[],
    psv: ProtectiveSystem,
    unitSystem: UnitSystem = 'metric'
) {
    const units = getProjectUnits(unitSystem);

    // 1. Prepare Scenarios Data
    const scenarioData = scenarios.map(s => {
        const rate = convertValue(s.relievingRate, 'kg/h', units.massFlow.unit) ?? 0;
        const pressure = convertValue(s.relievingPressure, 'barg', units.pressureGauge.unit) ?? 0;
        const temp = convertValue(s.relievingTemp, 'C', units.temperature.unit) ?? 0;

        return {
            ID: s.id,
            Cause: s.cause,
            Description: s.description,
            Phase: s.phase,
            [`Relieving Rate (${units.massFlow.label})`]: rate,
            [`Relieving Pressure (${units.pressureGauge.label})`]: pressure,
            [`Relieving Temp (${units.temperature.label})`]: temp,
            'Governing Case': s.isGoverning ? 'Yes' : 'No',
            'Created At': new Date(s.createdAt).toISOString().replace('T', ' ').substring(0, 16),
        };
    });

    // 2. Prepare PSV Data
    const setPressure = convertValue(psv.setPressure, 'barg', units.pressureGauge.unit) ?? 0;

    const psvData = [{
        Tag: psv.tag,
        Name: psv.name,
        Type: psv.type,
        [`Set Pressure (${units.pressureGauge.label})`]: setPressure,
        'Design Code': psv.designCode,
        'Service Fluid': psv.serviceFluid,
    }];

    // 3. Create Workbook
    const wb = XLSX.utils.book_new();

    // 4. Create Sheets
    const wsScenarios = XLSX.utils.json_to_sheet(scenarioData);
    const wsPsv = XLSX.utils.json_to_sheet(psvData);

    // 5. Append Sheets
    XLSX.utils.book_append_sheet(wb, wsScenarios, "Scenarios");
    XLSX.utils.book_append_sheet(wb, wsPsv, "PSV Data");

    // 6. Generate filename
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `${psv.tag}_Scenarios_${dateStr}.xlsx`;

    // 7. Write/Download
    XLSX.writeFile(wb, filename);
}
