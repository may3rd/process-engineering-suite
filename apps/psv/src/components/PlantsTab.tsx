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
    Card,
    CardContent,
    CardActions,
    useTheme,
    useMediaQuery,
} from "@mui/material";
import { Add, Edit, Delete, Apartment, Search } from "@mui/icons-material";
import { customers, users } from "@/data/mockData";
import { Plant } from "@/data/types";
import { glassCardStyles } from "./styles";
import { DeleteConfirmDialog } from "./shared";
import { PlantDialog } from "./dashboard/PlantDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";

export function PlantsTab() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const canEdit = useAuthStore((state) => state.canEdit());
    const canApprove = useAuthStore((state) => state.canApprove());
    const { addPlant, updatePlant, deletePlant } = usePsvStore();
    const plants = usePsvStore((state) => state.plants);
    const units = usePsvStore((state) => state.units);

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
            // Cascade delete: delete plant and all units, areas, projects, PSVs, equipment
            const { units, areas, projects, protectiveSystems, equipment } = usePsvStore.getState();

            const unitsToDelete = units.filter(u => u.plantId === plantToDelete.id);
            const unitIds = unitsToDelete.map(u => u.id);

            const areasToDelete = areas.filter(a => unitIds.includes(a.unitId));
            const areaIds = areasToDelete.map(a => a.id);

            // Delete all entities from bottom-up
            usePsvStore.setState((state) => ({
                equipment: state.equipment.filter(e => !areaIds.includes(e.areaId)),
                protectiveSystems: state.protectiveSystems.filter(p => !areaIds.includes(p.areaId)),
                projects: state.projects.filter(p => !areaIds.includes(p.areaId)),
                areas: state.areas.filter(a => !unitIds.includes(a.unitId)),
                units: state.units.filter(u => u.plantId !== plantToDelete.id),
                plants: state.plants.filter(p => p.id !== plantToDelete.id),
            }));

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
        return units.filter(u => u.plantId === plantId).length;
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

            {/* Mobile Card View */}
            {isMobile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {filteredPlants.map((plant) => {
                        const customer = customers.find(c => c.id === plant.customerId);
                        const owner = users.find(u => u.id === plant.ownerId);
                        const unitCount = getUnitCount(plant.id);

                        return (
                            <Card key={plant.id} sx={{ ...glassCardStyles }}>
                                <CardContent sx={{ pb: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
                                            <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1.1rem' }}>
                                                {plant.code}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {plant.name}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={plant.status}
                                            size="small"
                                            color={plant.status === 'active' ? 'success' : 'default'}
                                            sx={{ textTransform: 'capitalize' }}
                                        />
                                    </Box>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Customer
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {customer?.name || 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Units
                                            </Typography>
                                            <Chip
                                                label={`${unitCount} Unit${unitCount !== 1 ? 's' : ''}`}
                                                size="small"
                                                color={unitCount > 0 ? 'primary' : 'default'}
                                                sx={{ mt: 0.5 }}
                                            />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Owner
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {owner?.name || 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Created
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {new Date(plant.createdAt).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                                {canEdit && (
                                    <CardActions sx={{ justifyContent: 'flex-end', pt: 0, px: 2, pb: 1.5 }}>
                                        <Tooltip title="Edit">
                                            <IconButton
                                                size="medium"
                                                onClick={() => handleEdit(plant)}
                                                sx={{ color: 'primary.main' }}
                                            >
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                size="medium"
                                                color="error"
                                                onClick={() => handleDelete(plant)}
                                            >
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </CardActions>
                                )}
                            </Card>
                        );
                    })}
                    {filteredPlants.length === 0 && (
                        <Paper sx={{ ...glassCardStyles, p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                {searchText ? 'No plants match your search.' : 'No plants found. Click "Add Plant" to create one.'}
                            </Typography>
                        </Paper>
                    )}
                </Box>
            ) : (
                /* Desktop Table View */
                <Paper sx={{ ...glassCardStyles, p: 0 }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Code</TableCell>
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
                                                <Typography variant="caption" color="text.secondary">
                                                    {plant.name}
                                                </Typography>
                                            </TableCell>
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
                                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
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
            )}

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
