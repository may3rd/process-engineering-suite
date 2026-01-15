"use client";

import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Typography,
    Chip,
    Button,
} from "@mui/material";
import { Edit, Delete, Add } from "@mui/icons-material";
import { PipeProps } from "@/data/types";
import { FittingType } from "@eng-suite/physics";

interface PipelineDataGridProps {
    pipes: PipeProps[];
    onAddPipe: () => void;
    onEditPipe: (id: string) => void;
    onDeletePipe: (id: string) => void;
    readOnly?: boolean;
}

export function PipelineDataGrid({
    pipes,
    onAddPipe,
    onEditPipe,
    onDeletePipe,
    readOnly = false,
}: PipelineDataGridProps) {

    // Calculate total length and elevation change
    const totalLength = pipes.reduce((acc, pipe) => acc + (pipe.length || 0), 0);
    const totalElevation = pipes.reduce((acc, pipe) => acc + (pipe.elevation || 0), 0);

    return (
        <Box>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Segment Name</TableCell>
                            <TableCell>Size</TableCell>
                            <TableCell align="right">Length (m)</TableCell>
                            <TableCell align="right">Elevation (m)</TableCell>
                            <TableCell>Fittings</TableCell>
                            {!readOnly && <TableCell align="right" width={100}>Actions</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {pipes.length > 0 ? (
                            pipes.map((pipe) => (
                                <TableRow key={pipe.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>
                                            {pipe.name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        {pipe.diameter ? `${pipe.diameter} ${pipe.diameterUnit || 'mm'}` : '-'}
                                    </TableCell>
                                    <TableCell align="right">
                                        {pipe.length?.toFixed(2) || '-'}
                                    </TableCell>
                                    <TableCell align="right">
                                        {pipe.elevation?.toFixed(2) || '-'}
                                    </TableCell>
                                    <TableCell>
                                        {pipe.fittings && pipe.fittings.length > 0 ? (
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                {pipe.fittings.map((f: FittingType) => (
                                                    <Chip
                                                        key={f.type}
                                                        label={`${f.count}x ${f.type}`}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                                    />
                                                ))}
                                            </Box>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">-</Typography>
                                        )}
                                    </TableCell>
                                    {!readOnly && (
                                        <TableCell align="right">
                                            <IconButton size="small" onClick={() => onEditPipe(pipe.id)}>
                                                <Edit fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" color="error" onClick={() => onDeletePipe(pipe.id)}>
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">No pipeline segments defined</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {/* Summary Row */}
                        {pipes.length > 0 && (
                            <TableRow sx={{ backgroundColor: 'action.hover' }}>
                                <TableCell colSpan={2} sx={{ fontWeight: 600 }}>Total</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>{totalLength.toFixed(2)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>{totalElevation.toFixed(2)}</TableCell>
                                <TableCell colSpan={2} />
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {!readOnly && (
                <Button variant="outlined" startIcon={<Add />} onClick={onAddPipe} size="small">
                    Add Pipe Segment
                </Button>
            )}
        </Box>
    );
}
