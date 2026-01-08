"use client";

import { Box, Typography, Tabs, Tab, useTheme, ToggleButtonGroup, ToggleButton, Alert } from "@mui/material";
import { useState } from "react";
import { useDesignStore } from "@/store/useDesignStore";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { EquipmentItem, StreamItem } from "@/data/types";
import { OutputStatusBadge } from "../common/OutputStatusBadge";
import { RunAgentButton } from "../common/RunAgentButton";
import { JSONParseBoundary } from "../common/JSONParseBoundary";
import DataObjectIcon from '@mui/icons-material/DataObject';
import CalculateIcon from '@mui/icons-material/Calculate';

export function SpreadsheetView() {
    const theme = useTheme();
    const {
        equipmentListTemplate,
        equipmentListResults,
        streamListTemplate,
        streamListResults,
        stepStatuses,
        triggerNextStep,
        getOutputMetadata,
        setOutputStatus,
        setStepStatus,
        setCurrentStep,
        setActiveTab: setGlobalActiveTab,
        setStepOutput,
    } = useDesignStore();
    const [activeTab, setActiveTab] = useState<'equipment' | 'streams'>('equipment');
    const [dataView, setDataView] = useState<'template' | 'calculated'>('calculated');
    const [parseError, setParseError] = useState<Error | null>(null);

    const equipmentStatus = getOutputMetadata('equipmentListResults');
    const streamStatus = getOutputMetadata('streamListResults');

    const canRunCatalog = true; // Allow running freely
    const canRunStreamEstimation = true; // Allow running freely
    const canRunSizing = true; // Allow running freely

    let equipment: EquipmentItem[] = [];
    let streams: StreamItem[] = [];
    let equipmentTemplate: EquipmentItem[] = [];
    let streamsTemplate: StreamItem[] = [];

    try {
        if (equipmentListResults) equipment = JSON.parse(equipmentListResults);
        if (streamListResults) streams = JSON.parse(streamListResults);
        if (equipmentListTemplate) equipmentTemplate = JSON.parse(equipmentListTemplate);
        if (streamListTemplate) streamsTemplate = JSON.parse(streamListTemplate);
    } catch (e) {
        setParseError(e as Error);
    }

    const displayEquipment = dataView === 'template' ? equipmentTemplate : equipment;
    const displayStreams = dataView === 'template' ? streamsTemplate : streams;
    const hasTemplateData = equipmentTemplate.length > 0 || streamsTemplate.length > 0;

    const equipmentColumns: GridColDef[] = [
        { field: 'tag', headerName: 'Tag', width: 120, editable: true },
        { field: 'type', headerName: 'Type', width: 150, editable: true },
        { field: 'description', headerName: 'Description', width: 250, editable: true },
        { field: 'duty', headerName: 'Duty', width: 100, editable: true, type: 'number' },
        { field: 'duty_unit', headerName: 'Unit', width: 80, editable: true },
        { field: 'size', headerName: 'Size', width: 150, editable: true },
        { field: 'notes', headerName: 'Notes', width: 200, editable: true, flex: 1 },
    ];

    const streamColumns: GridColDef[] = [
        { field: 'tag', headerName: 'Tag', width: 100, editable: true },
        { field: 'from', headerName: 'From', width: 120, editable: true },
        { field: 'to', headerName: 'To', width: 120, editable: true },
        { field: 'phase', headerName: 'Phase', width: 100, editable: true },
        { field: 'temperature', headerName: 'Temp', width: 80, editable: true, type: 'number' },
        { field: 'temperature_unit', headerName: 'T Unit', width: 70, editable: true },
        { field: 'pressure', headerName: 'Press', width: 80, editable: true, type: 'number' },
        { field: 'pressure_unit', headerName: 'P Unit', width: 70, editable: true },
        { field: 'mass_flow', headerName: 'Flow', width: 100, editable: true, type: 'number' },
        { field: 'mass_flow_unit', headerName: 'Flow Unit', width: 90, editable: true },
    ];

    const renderDataGrid = () => {
        const rows = activeTab === 'equipment'
            ? displayEquipment.map((item, idx) => ({ id: idx, ...item }))
            : displayStreams.map((item, idx) => ({ id: idx, ...item }));
        const columns = activeTab === 'equipment' ? equipmentColumns : streamColumns;

        return (
            <DataGrid
                rows={rows}
                columns={columns}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                    pagination: { paginationModel: { pageSize: 25 } },
                }}
                aria-label={activeTab === 'equipment' ? 'Equipment list' : 'Stream list'}
                sx={{
                    '& .MuiDataGrid-cell': {
                        fontSize: '0.85rem',
                    },
                }}
            />
        );
    };

    return (
        <Box component="section" aria-labelledby="spreadsheet-title">
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }} id="spreadsheet-title">
                Equipment & Stream Tables
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Editable spreadsheet view with Excel copy-paste support
            </Typography>

            {parseError && (
                <Alert severity="error" sx={{ mb: 3 }} role="alert">
                    Failed to parse equipment or stream data. Please check the input format.
                </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Tabs
                        value={activeTab}
                        onChange={(_, newValue) => setActiveTab(newValue)}
                        aria-label="Equipment and stream data tabs"
                    >
                        <Tab label={`Equipment (${displayEquipment.length})`} value="equipment" aria-label="Equipment tab" />
                        <Tab label={`Streams (${displayStreams.length})`} value="streams" aria-label="Streams tab" />
                    </Tabs>
                    {activeTab === 'equipment' && equipmentStatus && (
                        <OutputStatusBadge status={equipmentStatus.status} />
                    )}
                    {activeTab === 'streams' && streamStatus && (
                        <OutputStatusBadge status={streamStatus.status} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {hasTemplateData && (
                        <ToggleButtonGroup
                            value={dataView}
                            exclusive
                            onChange={(_, newValue) => newValue && setDataView(newValue)}
                            size="small"
                            aria-label="Data view toggle"
                        >
                            <ToggleButton value="template" sx={{ px: 2 }} aria-label="Template view">
                                <DataObjectIcon fontSize="small" sx={{ mr: 0.5 }} />
                                Template
                            </ToggleButton>
                            <ToggleButton value="calculated" sx={{ px: 2 }} aria-label="Calculated view">
                                <CalculateIcon fontSize="small" sx={{ mr: 0.5 }} />
                                Calculated
                            </ToggleButton>
                        </ToggleButtonGroup>
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }} role="group" aria-label="Agent action buttons">
                    {(equipmentStatus?.status === 'needs_review' || equipmentStatus?.status === 'draft') && activeTab === 'equipment' && (
                        <RunAgentButton
                            label="Confirm & Approve"
                            onClick={() => {
                                setOutputStatus('equipmentListResults', 'approved');
                                setStepStatus(7, 'complete'); // Catalog step
                                setCurrentStep(8);
                            }}
                            variant="outlined"
                            size="small"
                        />
                    )}
                    {(streamStatus?.status === 'needs_review' || streamStatus?.status === 'draft') && activeTab === 'streams' && (
                        <RunAgentButton
                            label="Confirm & Approve"
                            onClick={() => {
                                setOutputStatus('streamListResults', 'approved');
                                setStepStatus(8, 'complete'); // Estimation step
                                setCurrentStep(9);
                            }}
                            variant="outlined"
                            size="small"
                        />
                    )}

                    <RunAgentButton
                        label={stepStatuses[7] === 'pending' ? 'Generate Catalogs' : 'Regenerate'}
                        onClick={triggerNextStep}
                        disabled={!canRunCatalog}
                        isRerun={equipment.length > 0}
                        loading={stepStatuses[7] === 'running'}
                        size="small"
                    />
                    <RunAgentButton
                        label="Estimate Streams"
                        onClick={triggerNextStep}
                        disabled={!canRunStreamEstimation}
                        isRerun={streams.length > 0}
                        loading={stepStatuses[8] === 'running'}
                        size="small"
                    />
                    <RunAgentButton
                        label="Size Equipment"
                        onClick={triggerNextStep}
                        disabled={!canRunSizing}
                        isRerun={equipment.length > 0}
                        loading={stepStatuses[9] === 'running'}
                        size="small"
                    />
                </Box>
            </Box>

            <JSONParseBoundary
                onError={(e) => setParseError(e)}
                fallback={<Alert severity="error">Failed to render data grid.</Alert>}
            >
                <Box
                    sx={{
                        height: 600,
                        backgroundColor: theme.palette.mode === 'dark'
                            ? 'rgba(0, 0, 0, 0.2)'
                            : 'rgba(255, 255, 255, 0.5)',
                        backdropFilter: 'blur(4px)',
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        '& .MuiDataGrid-root': {
                            border: 'none',
                        },
                    }}
                    role="region" aria-label={`${activeTab} data table`}
                >
                    {renderDataGrid()}
                </Box>
            </JSONParseBoundary>
        </Box>
    );
}
