"use client";

import { useState } from "react";
import {
    Box,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Chip,
    Typography,
    Tooltip,
    TextField,
} from "@mui/material";
import { Add, Edit, Delete, Shield, Search } from "@mui/icons-material";
import { protectiveSystems, areas, units, users } from "@/data/mockData";
import { ProtectiveSystem } from "@/data/types";
import { glassCardStyles } from "./styles";
import { DeleteConfirmDialog } from "./shared";
import { PSVDialog } from "./dashboard/PSVDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";

export function PSVsTab() {
    const canEdit = useAuthStore((state) => state.canEdit());
    const canApprove = useAuthStore((state) => state.canApprove());
    const { addProtectiveSystem, updateProtectiveSystem, deleteProtectiveSystem } = usePsvStore();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedPSV, setSelectedPSV] = useState<ProtectiveSystem | null>(null);
    const [psvToDelete, setPsvToDelete] = useState<ProtectiveSystem | null>(null);
    const [searchText, setSearchText] = useState('');

    const handleAdd = () => {
        setSelectedPSV(null);
        setDialogOpen(true);
    };

    const handleEdit = (psv: ProtectiveSystem) => {
        setSelectedPSV(psv);
        setDialogOpen(true);
    };

    const handleDelete = (psv: ProtectiveSystem) => {
        setPsvToDelete(psv);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (psvToDelete) {
            try {
                deleteProtectiveSystem(psvToDelete.id);
                setDeleteDialogOpen(false);
                setPsvToDelete(null);
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleForceDelete = () => {
        if (psvToDelete) {
            console.log('Force delete PSV:', psvToDelete.id);
            setDeleteDialogOpen(false);
            setPsvToDelete(null);
        }
    };

    const handleSave = (data: Omit<ProtectiveSystem, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (selectedPSV) {
            updateProtectiveSystem(selectedPSV.id, data);
        } else {
            addProtectiveSystem(data);
        }
        setDialogOpen(false);
    };

    // Filter PSVs based on search text
    const filteredPSVs = protectiveSystems.filter(psv => {
        if (!searchText) return true;
        const search = searchText.toLowerCase();
        const area = areas.find(a => a.id === psv.areaId);
        const owner = users.find(u => u.id === psv.ownerId);
        return (
            psv.tag.toLowerCase().includes(search) ||
            psv.name.toLowerCase().includes(search) ||
            psv.serviceFluid.toLowerCase().includes(search) ||
            area?.name.toLowerCase().includes(search) ||
            owner?.name.toLowerCase().includes(search)
        );
    });

    const getStatusColor = (status: ProtectiveSystem['status']) => {
        switch (status) {
            case 'draft': return 'default';
            case 'in_review': return 'info';
            case 'checked': return 'warning';
            case 'approved': return 'success';
            case 'issued': return 'primary';
            default: return 'default';
        }
    };

    const getTypeLabel = (type: ProtectiveSystem['type']) => {
        return type.toUpperCase().replace('_', ' ');
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Shield color="primary" sx={{ fontSize: 28 }} />
                    <Typography variant="h5" fontWeight={600}>
                        PSVs & Protective Devices
                    </Typography>
                </Box>
                {canEdit && (
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleAdd}
                    >
                        Add PSV
                    </Button>
                )}
            </Box>

            {/* Search Bar */}
            <TextField
                placeholder="Search by tag, name, fluid, area, or owner..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
                InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
            />

            {/* Table */}
            <Paper sx={{ ...glassCardStyles, p: 0 }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Tag</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Area</TableCell>
                                <TableCell>Service Fluid</TableCell>
                                <TableCell>Set Pressure</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Owner</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredPSVs.map((psv) => {
                                const area = areas.find(a => a.id === psv.areaId);
                                const unit = area ? units.find(u => u.id === area.unitId) : null;
                                const owner = users.find(u => u.id === psv.ownerId);

                                return (
                                    <TableRow
                                        key={psv.id}
                                        hover
                                        sx={{
                                            '&:last-child td': {
                                                borderBottom: 0
                                            }
                                        }}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>
                                                {psv.tag}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{psv.name}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={getTypeLabel(psv.type)}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {area?.name || 'N/A'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {unit?.code || ''}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {psv.serviceFluid}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {psv.fluidPhase.toUpperCase()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {psv.setPressure.toFixed(1)} barg
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={psv.status.replace('_', ' ')}
                                                size="small"
                                                color={getStatusColor(psv.status)}
                                                sx={{ textTransform: 'capitalize' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {owner?.name || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            {canEdit && (
                                                <>
                                                    <Tooltip title="Edit">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleEdit(psv)}
                                                        >
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDelete(psv)}
                                                        >
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {filteredPSVs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            {searchText ? 'No PSVs match your search.' : 'No PSVs found. Click "Add PSV" to create one.'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Add/Edit Dialog */}
            {dialogOpen && (
                <PSVDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    onSave={handleSave}
                    psv={selectedPSV}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {psvToDelete && (
                <DeleteConfirmDialog
                    open={deleteDialogOpen}
                    onClose={() => {
                        setDeleteDialogOpen(false);
                        setPsvToDelete(null);
                    }}
                    onConfirm={handleConfirmDelete}
                    onForceDelete={handleForceDelete}
                    allowForceDelete={canApprove}
                    title="Delete PSV"
                    itemName={psvToDelete.tag}
                    children={[
                        { label: 'Scenario', count: 0 }, // TODO: Get from store
                        { label: 'Equipment Link', count: 0 } // TODO: Get from store
                    ]}
                />
            )}
        </Box>
    );
}
