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
import { Add, Edit, Delete, Category, Search, Map, Timeline } from "@mui/icons-material";
import { users } from "@/data/mockData";
import { Unit } from "@/data/types";
import { glassCardStyles } from "./styles";
import { DeleteConfirmDialog, TableSortButton } from "./shared";
import { UnitDialog } from "./dashboard/UnitDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";
import { SortConfig, sortByGetter, toggleSortConfig } from "@/lib/sortUtils";

export function UnitsTab() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const canEdit = useAuthStore((state) => state.canEdit());
    const canApprove = useAuthStore((state) => state.canApprove());
    const { addUnit, updateUnit, deleteUnit, fetchAllUnits, areUnitsLoaded } = usePsvStore();
    const selectedPlant = usePsvStore((state) => state.selectedPlant);

    const [isLoadingInit, setIsLoadingInit] = useState(false);

    useEffect(() => {
        if (!areUnitsLoaded) {
            setIsLoadingInit(true);
            fetchAllUnits().finally(() => setIsLoadingInit(false));
        }
    }, [areUnitsLoaded, fetchAllUnits]);
    const units = usePsvStore((state) => state.units);
    const plants = usePsvStore((state) => state.plants);
    const areas = usePsvStore((state) => state.areas);
    const projects = usePsvStore((state) => state.projects);
    const protectiveSystems = usePsvStore((state) => state.protectiveSystems);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
    const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
    const [searchText, setSearchText] = useState('');
    type SortKey = 'code' | 'plant' | 'owner' | 'areas' | 'status' | 'created';
    const [sortConfig, setSortConfig] = useState<SortConfig<SortKey> | null>(null);

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
            // Cascade delete: delete unit and all areas, projects, PSVs, equipment
            const { areas, projects, protectiveSystems, equipment } = usePsvStore.getState();

            const areasToDelete = areas.filter(a => a.unitId === unitToDelete.id);
            const areaIds = areasToDelete.map(a => a.id);

            // Delete all entities from bottom-up
            usePsvStore.setState((state) => ({
                equipment: state.equipment.filter(e => !areaIds.includes(e.areaId)),
                protectiveSystems: state.protectiveSystems.filter(p => !areaIds.includes(p.areaId)),
                projects: state.projects.filter(p => !areaIds.includes(p.areaId)),
                areas: state.areas.filter(a => a.unitId !== unitToDelete.id),
                units: state.units.filter(u => u.id !== unitToDelete.id),
            }));

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
        return areas.filter(a => a.unitId === unitId).length;
    };

    // Filter units based on search text
    const filteredUnits = units.filter(unit => {
        if (!searchText) return true;
        const search = searchText.toLowerCase();
        const plant = plants.find(p => p.id === unit.plantId);
        const owner = users.find(u => u.id === unit.ownerId);
        return (
            unit.code.toLowerCase().includes(search) ||
            unit.name.toLowerCase().includes(search) ||
            plant?.name.toLowerCase().includes(search) ||
            owner?.name.toLowerCase().includes(search)
        );
    });

    const handleSort = (key: SortKey) => {
        setSortConfig((prev) => toggleSortConfig(prev, key));
    };

    const headingTitle = selectedPlant ? `${selectedPlant.name} - Units` : 'Units';

    const getSortValue = (unit: Unit, key: SortKey): string | number => {
        switch (key) {
            case 'code':
                return unit.code.toLowerCase();
            case 'plant': {
                const plant = plants.find(p => p.id === unit.plantId);
                return (plant?.name || '').toLowerCase();
            }
            case 'owner': {
                const owner = users.find(u => u.id === unit.ownerId);
                return (owner?.name || '').toLowerCase();
            }
            case 'areas':
                return getAreaCount(unit.id);
            case 'status':
                return unit.status;
            case 'created':
                return new Date(unit.createdAt).getTime();
            default:
                return '';
        }
    };

    const sortedUnits = useMemo(
        () => sortByGetter(filteredUnits, sortConfig, getSortValue),
        [filteredUnits, sortConfig]
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
        return [
            {
                label: 'Units',
                value: units.length,
                helper: 'Across all plants',
                icon: <Category color="primary" />,
            },
            {
                label: 'Areas',
                value: areas.length,
                helper: 'Physical subdivisions',
                icon: <Map color="secondary" />,
            },
            {
                label: 'Projects',
                value: projects.length,
                helper: `${protectiveSystems.length} PSVs tracked`,
                icon: <Timeline color="warning" />,
            },
        ];
    }, [areas.length, projects.length, protectiveSystems.length, units.length]);

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
                    <Category color="primary" sx={{ fontSize: 28 }} />
                    <Typography variant="h5" fontWeight={600}>
                        {headingTitle}
                    </Typography>
                </Box>
                {canEdit && (
                    <>
                        {/* Desktop: Full button with text */}
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={handleAdd}
                            sx={{ display: { xs: 'none', sm: 'flex' } }}
                        >
                            Add New Unit
                        </Button>
                        {/* Mobile: Icon only */}
                        <Tooltip title="Add New Unit">
                            <IconButton
                                onClick={handleAdd}
                                sx={{
                                    display: { xs: 'flex', sm: 'none' },
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    '&:hover': { bgcolor: 'primary.dark' },
                                }}
                            >
                                <Add />
                            </IconButton>
                        </Tooltip>
                    </>
                )}
            </Box>

            <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: 3 }}>
                {summaryCards.map(card => (
                    <Grid size={{ xs: 4, md: 4 }} key={card.label}>
                        <Paper sx={{
                            ...glassCardStyles,
                            p: { xs: 1.5, sm: 2 },
                            display: 'flex',
                            flexDirection: 'column',
                            gap: { xs: 0.25, sm: 0.5 },
                            minHeight: { xs: 'auto', sm: 100 },
                        }}>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                                <Box sx={{ '& .MuiSvgIcon-root': { fontSize: { xs: '1rem', sm: '1.25rem' } } }}>
                                    {card.icon}
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' }, lineHeight: 1.2 }}>
                                    {card.label}
                                </Typography>
                            </Stack>
                            <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' }, lineHeight: 1 }}>
                                {card.value}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, display: { xs: 'none', sm: 'block' } }}>
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
                        placeholder="Search by code, name, plant, or owner..."
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
                    {filteredUnits.map((unit) => {
                        const plant = plants.find(p => p.id === unit.plantId);
                        const owner = users.find(u => u.id === unit.ownerId);
                        const areaCount = getAreaCount(unit.id);

                        return (
                            <Card key={unit.id} sx={{ ...glassCardStyles }}>
                                <CardContent sx={{ pb: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
                                            <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1.1rem' }}>
                                                {unit.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {unit.code}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={unit.status}
                                            size="small"
                                            color={unit.status === 'active' ? 'success' : 'default'}
                                            sx={{ textTransform: 'capitalize' }}
                                        />
                                    </Box>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Plant
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {plant?.name || 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Areas
                                            </Typography>
                                            <Chip
                                                label={`${areaCount} Area${areaCount !== 1 ? 's' : ''}`}
                                                size="small"
                                                color={areaCount > 0 ? 'primary' : 'default'}
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
                                                {new Date(unit.createdAt).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                                {canEdit && (
                                    <CardActions sx={{ justifyContent: 'flex-end', pt: 0, px: 2, pb: 1.5 }}>
                                        <Tooltip title="Edit">
                                            <IconButton
                                                size="medium"
                                                onClick={() => handleEdit(unit)}
                                                sx={{ color: 'primary.main' }}
                                            >
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                size="medium"
                                                color="error"
                                                onClick={() => handleDelete(unit)}
                                            >
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </CardActions>
                                )}
                            </Card>
                        );
                    })}
                    {filteredUnits.length === 0 && (
                        <Paper sx={{ ...glassCardStyles, p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                {searchText ? 'No units match your search.' : 'No units found. Click "Add Unit" to create one.'}
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
                                    <TableCell>{renderHeader('Plant', 'plant')}</TableCell>
                                    <TableCell>{renderHeader('Owner', 'owner')}</TableCell>
                                    <TableCell>{renderHeader('Areas', 'areas')}</TableCell>
                                    <TableCell>{renderHeader('Status', 'status')}</TableCell>
                                    <TableCell>{renderHeader('Created', 'created')}</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedUnits.map((unit) => {
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
                                                    {unit.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {unit.code}
                                                </Typography>
                                            </TableCell>
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
                                {sortedUnits.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">
                                                {searchText ? 'No units match your search.' : 'No units found. Click "Add Unit" to create one.'}
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
