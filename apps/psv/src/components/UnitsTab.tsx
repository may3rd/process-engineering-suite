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
} from "@mui/material";
import { Add, Edit, Delete, Category } from "@mui/icons-material";
import { units, plants, users, getAreasByUnit } from "@/data/mockData";
import { Unit } from "@/data/types";
import { glassCardStyles } from "./styles";
import { DeleteConfirmDialog } from "./shared";
import { UnitDialog } from "./dashboard/UnitDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";

export function UnitsTab() {
    const canEdit = useAuthStore((state) => state.canEdit());
    const canApprove = useAuthStore((state) => state.canApprove());
    const { addUnit, updateUnit, deleteUnit } = usePsvStore();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
    const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);

    const handleAdd = () => {
        setSelectedUnit(null);
        setDialogOpen(true);
    };

    const handleEdit = (unit: Unit) => {
        setSelectedUnit(unit);
        setDialogOpen(true);
    };

    const handleDelete = (unit: Unit) => {
        setUnitToDelete(unit);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (unitToDelete) {
            try {
                deleteUnit(unitToDelete.id);
                setDeleteDialogOpen(false);
                setUnitToDelete(null);
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleForceDelete = () => {
        if (unitToDelete) {
            console.log('Force delete unit and all children:', unitToDelete.id);
            setDeleteDialogOpen(false);
            setUnitToDelete(null);
        }
    };

    const handleSave = (data: Omit<Unit, 'id' | 'createdAt'>) => {
        if (selectedUnit) {
            updateUnit(selectedUnit.id, data);
        } else {
            addUnit(data);
        }
        setDialogOpen(false);
    };

    const getAreaCount = (unitId: string) => {
        return getAreasByUnit(unitId).length;
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Category color="primary" sx={{ fontSize: 28 }} />
                    <Typography variant="h5" fontWeight={600}>
                        Units
                    </Typography>
                </Box>
                {canEdit && (
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleAdd}
                    >
                        Add Unit
                    </Button>
                )}
            </Box>

            {/* Table */}
            <Paper sx={{ ...glassCardStyles, p: 0 }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Code</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Plant</TableCell>
                                <TableCell>Owner</TableCell>
                                <TableCell>Areas</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Created</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {units.map((unit) => {
                                const plant = plants.find(p => p.id === unit.plantId);
                                const owner = users.find(u => u.id === unit.ownerId);
                                const areaCount = getAreaCount(unit.id);

                                return (
                                    <TableRow
                                        key={unit.id}
                                        hover
                                        sx={{
                                            '&:last-child td': {
                                                borderBottom: 0
                                            }
                                        }}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>
                                                {unit.code}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{unit.name}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {plant?.name || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {owner?.name || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${areaCount} area${areaCount !== 1 ? 's' : ''}`}
                                                size="small"
                                                color={areaCount > 0 ? 'primary' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={unit.status}
                                                size="small"
                                                color={unit.status === 'active' ? 'success' : 'default'}
                                                sx={{ textTransform: 'capitalize' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {new Date(unit.createdAt).toLocaleDateString()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            {canEdit && (
                                                <>
                                                    <Tooltip title="Edit">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleEdit(unit)}
                                                        >
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDelete(unit)}
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
                            {units.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            No units found. Click "Add Unit" to create one.
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
                <UnitDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    onSave={handleSave}
                    unit={selectedUnit}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {unitToDelete && (
                <DeleteConfirmDialog
                    open={deleteDialogOpen}
                    onClose={() => {
                        setDeleteDialogOpen(false);
                        setUnitToDelete(null);
                    }}
                    onConfirm={handleConfirmDelete}
                    onForceDelete={handleForceDelete}
                    allowForceDelete={canApprove}
                    title="Delete Unit"
                    itemName={unitToDelete.name}
                    children={[
                        { label: 'Area', count: getAreaCount(unitToDelete.id) }
                    ]}
                />
            )}
        </Box>
    );
}
