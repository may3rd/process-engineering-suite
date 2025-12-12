"use client";

import { useMemo, useState } from "react";
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
import { Add, Edit, Delete, Settings, Search } from "@mui/icons-material";
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
    const { addEquipment, updateEquipment, deleteEquipment } = usePsvStore();
    const equipment = usePsvStore((state) => state.equipment);

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
                return equip.designPressure;
            case 'mawp':
                return equip.mawp;
            case 'designTemp':
                return equip.designTemperature;
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
                                                {equip.designPressure.toFixed(1)} barg
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                MAWP
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {equip.mawp.toFixed(1)} barg
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Design Temp
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {equip.designTemperature.toFixed(0)} °C
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
