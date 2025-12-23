"use client";

import { useMemo, useState, useEffect } from "react";
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
    Grid,
    Stack,
    InputAdornment,
} from "@mui/material";
import { Add, Edit, Delete, Apartment, Search, Leaderboard, Category } from "@mui/icons-material";
import { customers, users } from "@/data/mockData";
import { Plant } from "@/data/types";
import { glassCardStyles } from "./styles";
import { DeleteConfirmDialog, TableSortButton } from "./shared";
import { PlantDialog } from "./dashboard/PlantDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";
import { SortConfig, sortByGetter, toggleSortConfig } from "@/lib/sortUtils";

export function PlantsTab() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const canEdit = useAuthStore((state) => state.canEdit());
    const canApprove = useAuthStore((state) => state.canApprove());
    const { addPlant, updatePlant, deletePlant, fetchAllPlants, arePlantsLoaded, summaryCounts } = usePsvStore();
    const selectedCustomer = usePsvStore((state) => state.selectedCustomer);

    const [isLoadingInit, setIsLoadingInit] = useState(false);

    useEffect(() => {
        if (!arePlantsLoaded) {
            setIsLoadingInit(true);
            fetchAllPlants().finally(() => setIsLoadingInit(false));
        }
    }, [arePlantsLoaded, fetchAllPlants]);
    const plants = usePsvStore((state) => state.plants);
    const units = usePsvStore((state) => state.units);
    const areas = usePsvStore((state) => state.areas);
    const projects = usePsvStore((state) => state.projects);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
    const [plantToDelete, setPlantToDelete] = useState<Plant | null>(null);
    const [searchText, setSearchText] = useState('');
    type SortKey = 'code' | 'customer' | 'owner' | 'units' | 'status' | 'created';
    const [sortConfig, setSortConfig] = useState<SortConfig<SortKey> | null>(null);

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

    const handleSort = (key: SortKey) => {
        setSortConfig((prev) => toggleSortConfig(prev, key));
    };

    const headingTitle = selectedCustomer ? `${selectedCustomer.name} - Plants` : 'Plants';

    const getSortValue = (plant: Plant, key: SortKey): string | number => {
        switch (key) {
            case 'code':
                return plant.code.toLowerCase();
            case 'customer': {
                const customer = customers.find(c => c.id === plant.customerId);
                return (customer?.name || '').toLowerCase();
            }
            case 'owner': {
                const owner = users.find(u => u.id === plant.ownerId);
                return (owner?.name || '').toLowerCase();
            }
            case 'units':
                return getUnitCount(plant.id);
            case 'status':
                return plant.status;
            case 'created':
                return new Date(plant.createdAt).getTime();
            default:
                return '';
        }
    };

    const sortedPlants = useMemo(
        () => sortByGetter(filteredPlants, sortConfig, getSortValue),
        [filteredPlants, sortConfig]
    );

    const renderHeader = (label: string, key: SortKey) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {label}
            <TableSortButton
                label={label}
                active={sortConfig?.key === key}
                direction={sortConfig?.direction ?? 'asc'}
                onClick={() => handleSort(key)}
            />
        </Box>
    );

    const summaryCards = useMemo(() => {
        const activePlants = plants.filter(plant => plant.status === 'active').length;
        // Use summaryCounts if available (lightweight); fallback to entity counts
        const totalPlants = summaryCounts?.plants ?? plants.length;
        const totalUnits = summaryCounts?.units ?? units.length;
        const totalAreas = summaryCounts?.areas ?? areas.length;
        const totalProjects = summaryCounts?.projects ?? projects.length;
        return [
            {
                label: 'Plants',
                value: totalPlants,
                helper: 'Across all customers',
                icon: <Apartment color="primary" />,
            },
            {
                label: 'Active Sites',
                value: activePlants,
                helper: 'Currently operating',
                icon: <Leaderboard color="success" />,
            },
            {
                label: 'Units',
                value: totalUnits,
                helper: `${totalAreas} areas • ${totalProjects} projects`,
                icon: <Category color="secondary" />,
            },
        ];
    }, [summaryCounts, areas.length, plants, projects.length, units.length]);

    return (
        <Box>
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3,
                    flexWrap: 'wrap',
                    gap: 2,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Apartment color="primary" sx={{ fontSize: 28 }} />
                    <Typography variant="h5" fontWeight={600}>
                        {headingTitle}
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

            <Grid container spacing={2} sx={{ mb: 3 }}>
                {summaryCards.map(card => (
                    <Grid size={{ xs: 12, md: 4 }} key={card.label}>
                        <Paper sx={{ ...glassCardStyles, p: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                {card.icon}
                                <Typography variant="body2" color="text.secondary">
                                    {card.label}
                                </Typography>
                            </Stack>
                            <Typography variant="h4" fontWeight={700}>
                                {card.value}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {card.helper}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Search Bar */}
            <Paper sx={{ ...glassCardStyles, p: 2, mb: 3 }}>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'stretch', md: 'center' }}
                >
                    <TextField
                        placeholder="Search by code, name, customer, or owner..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        size="small"
                        fullWidth
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Stack>
            </Paper>

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
                                                {plant.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {plant.code}
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
                                    <TableCell>{renderHeader('Code', 'code')}</TableCell>
                                    <TableCell>{renderHeader('Customer', 'customer')}</TableCell>
                                    <TableCell>{renderHeader('Owner', 'owner')}</TableCell>
                                    <TableCell>{renderHeader('Units', 'units')}</TableCell>
                                    <TableCell>{renderHeader('Status', 'status')}</TableCell>
                                    <TableCell>{renderHeader('Created', 'created')}</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedPlants.map((plant) => {
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
                                                    {plant.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {plant.code}
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
                                {sortedPlants.length === 0 && (
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
