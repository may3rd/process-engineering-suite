"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Add, Edit, Delete, Settings, Search, Opacity, ThermostatAuto } from "@mui/icons-material";
import { areas, units, users } from "@/data/mockData";
import { Equipment } from "@/data/types";
import { glassCardStyles } from "./styles";
import { DeleteConfirmDialog, TableSortButton } from "./shared";
import { EquipmentDialog } from "./dashboard/EquipmentDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";
import { SortConfig, sortByGetter, toggleSortConfig } from "@/lib/sortUtils";

export function EquipmentTab() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const canEdit = useAuthStore((state) => state.canEdit());
    const canApprove = useAuthStore((state) => state.canApprove());
    const { addEquipment, updateEquipment, deleteEquipment, fetchAllEquipment, areEquipmentLoaded } = usePsvStore();
    const equipment = usePsvStore((state) => state.equipment);

    const [isLoadingInit, setIsLoadingInit] = useState(false);

    useEffect(() => {
        if (!areEquipmentLoaded) {
            setIsLoadingInit(true);
            fetchAllEquipment().finally(() => setIsLoadingInit(false));
        }
    }, [areEquipmentLoaded, fetchAllEquipment]);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(null);
    const [searchText, setSearchText] = useState('');
    type SortKey =
        | 'tag'
        | 'type'
        | 'area'
        | 'designPressure'
        | 'mawp'
        | 'designTemp'
        | 'status'
        | 'owner';
    const [sortConfig, setSortConfig] = useState<SortConfig<SortKey> | null>(null);

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

    const handleSave = async (data: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
        try {
            if (selectedEquipment) {
                await updateEquipment(selectedEquipment.id, data);
            } else {
                await addEquipment(data);
            }
            // Dialog closing is handled by EquipmentDialog on success
        } catch (error) {
            console.error('Failed to save equipment:', error);
            throw error; // Re-throw to let EquipmentDialog know it failed
        }
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

    const handleSort = (key: SortKey) => {
        setSortConfig((prev) => toggleSortConfig(prev, key));
    };

    const getSortValue = (equip: Equipment, key: SortKey): string | number => {
        switch (key) {
            case 'tag':
                return equip.tag.toLowerCase();
            case 'type':
                return getTypeLabel(equip.type).toLowerCase();
            case 'area': {
                const area = areas.find(a => a.id === equip.areaId);
                return (area?.name || '').toLowerCase();
            }
            case 'designPressure':
                return equip.designPressure ?? 0;  // Handle null
            case 'mawp':
                return equip.mawp ?? 0;  // Handle null
            case 'designTemp':
                return equip.designTemperature ?? 0;  // Handle null
            case 'status':
                return equip.status;
            case 'owner': {
                const owner = users.find(u => u.id === equip.ownerId);
                return (owner?.name || '').toLowerCase();
            }
            default:
                return '';
        }
    };

    const sortedEquipment = useMemo(
        () => sortByGetter(filteredEquipment, sortConfig, getSortValue),
        [filteredEquipment, sortConfig]
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

    const getTypeLabel = (type: Equipment['type']) => {
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const summaryCards = useMemo(() => {
        const pressureVessels = equipment.filter(e => e.type.includes('vessel')).length;
        const inactiveCount = equipment.filter(e => e.status === 'inactive').length;
        return [
            {
                label: 'Equipment Items',
                value: equipment.length,
                helper: 'Across all areas',
                icon: <Settings color="primary" />,
            },
            {
                label: 'Pressure Assets',
                value: pressureVessels,
                helper: 'Pressure vessels & tanks',
                icon: <Opacity color="secondary" />,
            },
            {
                label: 'Inactive',
                value: inactiveCount,
                helper: 'Not in service',
                icon: <ThermostatAuto color="warning" />,
            },
        ];
    }, [equipment]);

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
                    <Settings color="primary" sx={{ fontSize: 28 }} />
                    <Typography variant="h5" fontWeight={600}>
                        Equipment
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
                            Add New Equipment
                        </Button>
                        {/* Mobile: Icon only */}
                        <Tooltip title="Add New Equipment">
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
                        placeholder="Search by tag, name, type, area, or owner..."
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
                    {filteredEquipment.map((equip) => {
                        const area = areas.find(a => a.id === equip.areaId);
                        const unit = area ? units.find(u => u.id === area.unitId) : null;
                        const owner = users.find(u => u.id === equip.ownerId);

                        return (
                            <Card key={equip.id} sx={{ ...glassCardStyles }}>
                                <CardContent sx={{ pb: 1 }}>
                                    {/* Tag and Type */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
                                            <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1.1rem' }}>
                                                {equip.tag}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                                {equip.name}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={getTypeLabel(equip.type)}
                                            size="small"
                                            variant="outlined"
                                            color="secondary"
                                            sx={{ flexShrink: 0 }}
                                        />
                                    </Box>

                                    {/* Details Grid */}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Design Pressure
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {equip.designPressure != null ? `${equip.designPressure.toFixed(1)} barg` : 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                MAWP
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {equip.mawp != null ? `${equip.mawp.toFixed(1)} barg` : 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Design Temp
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {equip.designTemperature != null ? `${equip.designTemperature.toFixed(0)} °C` : 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Status
                                            </Typography>
                                            <Chip
                                                label={equip.status}
                                                size="small"
                                                color={equip.status === 'active' ? 'success' : 'default'}
                                                sx={{ textTransform: 'capitalize', mt: 0.5 }}
                                            />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Area
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {area?.name || 'N/A'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {unit?.code || ''}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Owner
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {owner?.name || 'N/A'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                                {canEdit && (
                                    <CardActions sx={{ justifyContent: 'flex-end', pt: 0, px: 2, pb: 1.5 }}>
                                        <Tooltip title="Edit">
                                            <IconButton
                                                size="medium"
                                                onClick={() => handleEdit(equip)}
                                                sx={{ color: 'primary.main' }}
                                            >
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                size="medium"
                                                color="error"
                                                onClick={() => handleDelete(equip)}
                                            >
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </CardActions>
                                )}
                            </Card>
                        );
                    })}
                    {filteredEquipment.length === 0 && (
                        <Paper sx={{ ...glassCardStyles, p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                {searchText ? 'No equipment matches your search.' : 'No equipment found. Click "Add Equipment" to create one.'}
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
                                    <TableCell>{renderHeader('Tag', 'tag')}</TableCell>
                                    <TableCell>{renderHeader('Type', 'type')}</TableCell>
                                    <TableCell>{renderHeader('Area', 'area')}</TableCell>
                                    <TableCell>{renderHeader('Design Pressure', 'designPressure')}</TableCell>
                                    <TableCell>{renderHeader('MAWP', 'mawp')}</TableCell>
                                    <TableCell>{renderHeader('Design Temp', 'designTemp')}</TableCell>
                                    <TableCell>{renderHeader('Status', 'status')}</TableCell>
                                    <TableCell>{renderHeader('Owner', 'owner')}</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedEquipment.map((equip) => {
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
                                                <Typography variant="caption" color="text.secondary">
                                                    {equip.name}
                                                </Typography>
                                            </TableCell>
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
                                                    {equip.designPressure != null ? `${equip.designPressure.toFixed(1)} barg` : 'N/A'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {equip.mawp != null ? `${equip.mawp.toFixed(1)} barg` : 'N/A'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {equip.designTemperature != null ? `${equip.designTemperature.toFixed(0)} °C` : 'N/A'}
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
                                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
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
                                                    </Box>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {sortedEquipment.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
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
            )}

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
