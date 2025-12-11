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
import { Add, Edit, Delete, Apartment, Search } from "@mui/icons-material";
import { plants, customers, users, getUnitsByPlant } from "@/data/mockData";
import { Plant } from "@/data/types";
import { glassCardStyles } from "./styles";
import { DeleteConfirmDialog } from "./shared";
import { PlantDialog } from "./dashboard/PlantDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";

export function PlantsTab() {
    const canEdit = useAuthStore((state) => state.canEdit());
    const canApprove = useAuthStore((state) => state.canApprove());
    const { addPlant, updatePlant, deletePlant } = usePsvStore();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
    const [plantToDelete, setPlantToDelete] = useState<Plant | null>(null);
    const [searchText, setSearchText] = useState('');

    const handleAdd = () => {
        setSelectedPlant(null);
        setDialogOpen(true);
    };

    const handleEdit = (plant: Plant) => {
        setSelectedPlant(plant);
        setDialogOpen(true);
    };

    const handleDelete = (plant: Plant) => {
        setPlantToDelete(plant);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (plantToDelete) {
            try {
                deletePlant(plantToDelete.id);
                setDeleteDialogOpen(false);
                setPlantToDelete(null);
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleForceDelete = () => {
        if (plantToDelete) {
            console.log('Force delete plant and all children:', plantToDelete.id);
            setDeleteDialogOpen(false);
            setPlantToDelete(null);
        }
    };

    const handleSave = (data: Omit<Plant, 'id' | 'createdAt'>) => {
        if (selectedPlant) {
            updatePlant(selectedPlant.id, data);
        } else {
            addPlant(data);
        }
        setDialogOpen(false);
    };

    const getUnitCount = (plantId: string) => {
        return getUnitsByPlant(plantId).length;
    };

    // Filter plants based on search text
    const filteredPlants = plants.filter(plant => {
        if (!searchText) return true;
        const search = searchText.toLowerCase();
        const customer = customers.find(c => c.id === plant.customerId);
        const owner = users.find(u => u.id === plant.ownerId);
        return (
            plant.code.toLowerCase().includes(search) ||
            plant.name.toLowerCase().includes(search) ||
            customer?.name.toLowerCase().includes(search) ||
            owner?.name.toLowerCase().includes(search)
        );
    });

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Apartment color="primary" sx={{ fontSize: 28 }} />
                    <Typography variant="h5" fontWeight={600}>
                        Plants
                    </Typography>
                </Box>
                {canEdit && (
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleAdd}
                    >
                        Add Plant
                    </Button>
                )}
            </Box>

            {/* Search Bar */}
            <TextField
                placeholder="Search by code, name, customer, or owner..."
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
                                <TableCell>Code</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Owner</TableCell>
                                <TableCell>Units</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Created</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredPlants.map((plant) => {
                                const customer = customers.find(c => c.id === plant.customerId);
                                const owner = users.find(u => u.id === plant.ownerId);
                                const unitCount = getUnitCount(plant.id);

                                return (
                                    <TableRow
                                        key={plant.id}
                                        hover
                                        sx={{
                                            '&:last-child td': {
                                                borderBottom: 0
                                            }
                                        }}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>
                                                {plant.code}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{plant.name}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {customer?.name || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {owner?.name || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${unitCount} unit${unitCount !== 1 ? 's' : ''}`}
                                                size="small"
                                                color={unitCount > 0 ? 'primary' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={plant.status}
                                                size="small"
                                                color={plant.status === 'active' ? 'success' : 'default'}
                                                sx={{ textTransform: 'capitalize' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {new Date(plant.createdAt).toLocaleDateString()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            {canEdit && (
                                                <>
                                                    <Tooltip title="Edit">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleEdit(plant)}
                                                        >
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDelete(plant)}
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
                            {filteredPlants.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            {searchText ? 'No plants match your search.' : 'No plants found. Click "Add Plant" to create one.'}
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
                <PlantDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    onSave={handleSave}
                    plant={selectedPlant}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {plantToDelete && (
                <DeleteConfirmDialog
                    open={deleteDialogOpen}
                    onClose={() => {
                        setDeleteDialogOpen(false);
                        setPlantToDelete(null);
                    }}
                    onConfirm={handleConfirmDelete}
                    onForceDelete={handleForceDelete}
                    allowForceDelete={canApprove}
                    title="Delete Plant"
                    itemName={plantToDelete.name}
                    children={[
                        { label: 'Unit', count: getUnitCount(plantToDelete.id) }
                    ]}
                />
            )}
        </Box>
    );
}
