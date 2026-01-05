"use client";

import { Box, Typography, Tabs, Tab, useTheme } from "@mui/material";
import { useState } from "react";
import { useDesignStore } from "@/store/useDesignStore";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { EquipmentItem, StreamItem } from "@/data/types";
import { OutputStatusBadge } from "../common/OutputStatusBadge";
import { RunAgentButton } from "../common/RunAgentButton";

export function SpreadsheetView() {
    const theme = useTheme();
    const {
        equipmentListResults,
        streamListResults,
        stepStatuses,
        triggerNextStep,
        getOutputMetadata,
    } = useDesignStore();
    const [activeTab, setActiveTab] = useState<'equipment' | 'streams'>('equipment');

    const equipmentStatus = getOutputMetadata('equipmentListResults');
    const streamStatus = getOutputMetadata('streamListResults');

    // Step 7: Catalog generation, Step 8: Stream estimation, Step 9: Equipment sizing
    const canRunCatalog = stepStatuses[7] === 'pending' || stepStatuses[7] === 'edited';
    const canRunStreamEstimation = stepStatuses[8] === 'pending' || stepStatuses[8] === 'edited';
    const canRunSizing = stepStatuses[9] === 'pending' || stepStatuses[9] === 'edited';

    let equipment: EquipmentItem[] = [];
    let streams: StreamItem[] = [];

    try {
        if (equipmentListResults) equipment = JSON.parse(equipmentListResults);
        if (streamListResults) streams = JSON.parse(streamListResults);
    } catch (e) {
        // Invalid JSON
    }

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

    return (
        <Box>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Equipment & Stream Tables
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Editable spreadsheet view with Excel copy-paste support
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Tabs
                        value={activeTab}
                        onChange={(_, newValue) => setActiveTab(newValue)}
                    >
                        <Tab label={`Equipment (${equipment.length})`} value="equipment" />
                        <Tab label={`Streams (${streams.length})`} value="streams" />
                    </Tabs>
                    {activeTab === 'equipment' && equipmentStatus && (
                        <OutputStatusBadge status={equipmentStatus.status} />
                    )}
                    {activeTab === 'streams' && streamStatus && (
                        <OutputStatusBadge status={streamStatus.status} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <RunAgentButton
                        label={stepStatuses[7] === 'pending' ? 'Generate Catalogs' : 'Regenerate'}
                        onClick={triggerNextStep}
                        disabled={!canRunCatalog}
                        isRerun={stepStatuses[7] !== 'pending'}
                        loading={stepStatuses[7] === 'running'}
                        size="small"
                    />
                    <RunAgentButton
                        label="Estimate Streams"
                        onClick={triggerNextStep}
                        disabled={!canRunStreamEstimation}
                        isRerun={stepStatuses[8] !== 'pending'}
                        loading={stepStatuses[8] === 'running'}
                        size="small"
                    />
                    <RunAgentButton
                        label="Size Equipment"
                        onClick={triggerNextStep}
                        disabled={!canRunSizing}
                        isRerun={stepStatuses[9] !== 'pending'}
                        loading={stepStatuses[9] === 'running'}
                        size="small"
                    />
                </Box>
            </Box>

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
            >
                {activeTab === 'equipment' ? (
                    <DataGrid
                        rows={equipment.map((item, idx) => ({ id: idx, ...item }))}
                        columns={equipmentColumns}
                        pageSizeOptions={[10, 25, 50]}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 25 } },
                        }}
                        sx={{
                            '& .MuiDataGrid-cell': {
                                fontSize: '0.85rem',
                            },
                        }}
                    />
                ) : (
                    <DataGrid
                        rows={streams.map((item, idx) => ({ id: idx, ...item }))}
                        columns={streamColumns}
                        pageSizeOptions={[10, 25, 50]}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 25 } },
                        }}
                        sx={{
                            '& .MuiDataGrid-cell': {
                                fontSize: '0.85rem',
                            },
                        }}
                    />
                )}
            </Box>
        </Box>
    );
}
