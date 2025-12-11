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
import { Add, Edit, Delete, Settings, Search } from "@mui/icons-material";
import { equipment, areas, units, users } from "@/data/mockData";
import { Equipment } from "@/data/types";
import { glassCardStyles } from "./styles";
import { DeleteConfirmDialog } from "./shared";
import { EquipmentDialog } from "./dashboard/EquipmentDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";

export function EquipmentTab() {
    const canEdit = useAuthStore((state) => state.canEdit());
    const canApprove = useAuthStore((state) => state.canApprove());
    const { addEquipment, updateEquipment, deleteEquipment } = usePsvStore();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(null);
    const [searchText, setSearchText] = useState('');

    const handleAdd = () => {
        setSelectedEquipment(null);
        setDialogOpen(true);
    };

    const handleEdit = (equip: Equipment) => {
        setSelectedEquipment(equip);
        setDialogOpen(true);
    };

    const handleDelete = (equip: Equipment) => {
        setEquipmentToDelete(equip);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (equipmentToDelete) {
            try {
                deleteEquipment(equipmentToDelete.id);
                setDeleteDialogOpen(false);
                setEquipmentToDelete(null);
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleForceDelete = () => {
        if (equipmentToDelete) {
            console.log('Force delete equipment:', equipmentToDelete.id);
            setDeleteDialogOpen(false);
            setEquipmentToDelete(null);
        }
    };

    const handleSave = (data: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (selectedEquipment) {
            updateEquipment(selectedEquipment.id, data);
        } else {
            addEquipment(data);
        }
        setDialogOpen(false);
    };

    // Filter equipment based on search text
    const filteredEquipment = equipment.filter(equip => {
        if (!searchText) return true;
        const search = searchText.toLowerCase();
        const area = areas.find(a => a.id === equip.areaId);
        const owner = users.find(u => u.id === equip.ownerId);
        return (
            equip.tag.toLowerCase().includes(search) ||
            equip.name.toLowerCase().includes(search) ||
            equip.type.toLowerCase().includes(search) ||
            area?.name.toLowerCase().includes(search) ||
            owner?.name.toLowerCase().includes(search)
        );
    });

    const getTypeLabel = (type: Equipment['type']) => {
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Settings color="primary" sx={{ fontSize: 28 }} />
                    <Typography variant="h5" fontWeight={600}>
                        Equipment
                    </Typography>
                </Box>
                {canEdit && (
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleAdd}
                    >
                        Add Equipment
                    </Button>
                )}
            </Box>

            {/* Search Bar */}
            <TextField
                placeholder="Search by tag, name, type, area, or owner..."
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
                                <TableCell>Design Pressure</TableCell>
                                <TableCell>MAWP</TableCell>
                                <TableCell>Design Temp</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Owner</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredEquipment.map((equip) => {
                                const area = areas.find(a => a.id === equip.areaId);
                                const unit = area ? units.find(u => u.id === area.unitId) : null;
                                const owner = users.find(u => u.id === equip.ownerId);

                                return (
                                    <TableRow
                                        key={equip.id}
                                        hover
                                        sx={{
                                            '&:last-child td': {
                                                borderBottom: 0
                                            }
                                        }}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>
                                                {equip.tag}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{equip.name}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={getTypeLabel(equip.type)}
                                                size="small"
                                                variant="outlined"
                                                color="secondary"
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
                                                {equip.designPressure.toFixed(1)} barg
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {equip.mawp.toFixed(1)} barg
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {equip.designTemperature.toFixed(0)} °C
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={equip.status}
                                                size="small"
                                                color={equip.status === 'active' ? 'success' : 'default'}
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
                                                            onClick={() => handleEdit(equip)}
                                                        >
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDelete(equip)}
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
                            {filteredEquipment.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            {searchText ? 'No equipment matches your search.' : 'No equipment found. Click "Add Equipment" to create one.'}
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
                <EquipmentDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    onSave={handleSave}
                    equipment={selectedEquipment}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {equipmentToDelete && (
                <DeleteConfirmDialog
                    open={deleteDialogOpen}
                    onClose={() => {
                        setDeleteDialogOpen(false);
                        setEquipmentToDelete(null);
                    }}
                    onConfirm={handleConfirmDelete}
                    onForceDelete={handleForceDelete}
                    allowForceDelete={canApprove}
                    title="Delete Equipment"
                    itemName={equipmentToDelete.tag}
                    children={[
                        { label: 'PSV Link', count: 0 } // TODO: Get from store
                    ]}
                />
            )}
        </Box>
    );
}
