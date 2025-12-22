import { useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { toast } from '@/lib/toast';
import { usePsvStore } from '@/store/usePsvStore';
import { PipelineNetwork } from '@/data/types';

/**
 * Transform PipelineNetwork (frontend format) to the structure expected by the Jinja2 template.
 * Template expects: { segments: [{ description, diameter, length, pressure_drop, mach_number }] }
 * Frontend has: { pipes: [{ name, diameter, length, pressureDropCalculationResults, resultSummary }] }
 */
function transformNetworkForReport(network?: PipelineNetwork) {
    if (!network || !network.pipes || network.pipes.length === 0) return null;

    return {
        segments: network.pipes.map((pipe, index) => ({
            id: pipe.id,
            description: pipe.name || `Segment ${index + 1}`,
            diameter: pipe.diameter ?? pipe.inletDiameter ?? 0,
            length: pipe.length ?? 0,
            // Convert Pa → bar (divide by 100000)
            pressure_drop: (pipe.pressureDropCalculationResults?.totalSegmentPressureDrop ?? 0) / 100000,
            pressureDrop: (pipe.pressureDropCalculationResults?.totalSegmentPressureDrop ?? 0) / 100000,
            // Mach number is stored in inletState or outletState
            mach_number: pipe.resultSummary?.inletState?.machNumber ?? pipe.resultSummary?.outletState?.machNumber ?? 0,
            machNumber: pipe.resultSummary?.inletState?.machNumber ?? pipe.resultSummary?.outletState?.machNumber ?? 0,
        }))
    };
}

export function useReport() {
    const [isGenerating, setIsGenerating] = useState(false);

    const {
        selectedPsv,
        selectedProject,
        selectedCustomer,
        selectedPlant,
        selectedUnit,
        selectedArea,
        scenarioList,
        sizingCaseList,
    } = usePsvStore();

    const downloadPsvReport = async () => {
        if (!selectedPsv) {
            toast.error('No PSV selected');
            return;
        }

        setIsGenerating(true);

        try {
            // 1. Gather Data (Robustly handling camelCase/snake_case via the Pydantic model on backend)
            const governingScenario = scenarioList.find(s => s.isGoverning && s.protectiveSystemId === selectedPsv.id);
            const activeCase = governingScenario
                ? sizingCaseList.find(c => c.scenarioId === governingScenario.id && c.status === 'calculated')
                : null;

            const payload = {
                psv: selectedPsv,
                scenario: governingScenario || {},
                results: activeCase ? {
                    requiredArea: activeCase.outputs?.requiredArea,
                    selectedOrifice: activeCase.outputs?.selectedOrifice,
                    ratedCapacity: activeCase.outputs?.ratedCapacity,
                    sizing_case: activeCase
                } : {},
                hierarchy: {
                    customer: selectedCustomer || {},
                    plant: selectedPlant || {},
                    unit: selectedUnit || {},
                    area: selectedArea || {},
                },
                projectName: selectedProject?.name,
                inletNetwork: transformNetworkForReport(selectedPsv.inletNetwork),
                outletNetwork: transformNetworkForReport(selectedPsv.outletNetwork),
                warnings: []
            };

            console.log('DEBUG: Report Payload:', payload);

            // 2. Send POST Request to the new stateless endpoint
            const url = `${API_BASE_URL}/reports/psv`;
            const token = localStorage.getItem('accessToken');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: response.statusText }));
                throw new Error(errorData.detail || `Failed to generate report (HTTP ${response.status})`);
            }

            const blob = await response.blob();
            if (blob.size === 0) throw new Error('Received empty report');

            // 3. Download
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `PSV_Report_${selectedPsv.tag}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

            toast.success('Report downloaded successfully');
        } catch (error) {
            console.error('Report generation error:', error);
            if (error instanceof Error && error.name === 'AbortError') {
                toast.error('Report generation timed out.');
            } else {
                toast.error(error instanceof Error ? error.message : 'Failed to generate report');
            }
        } finally {
            setIsGenerating(false);
        }
    };

    return { isGenerating, downloadPsvReport };
}