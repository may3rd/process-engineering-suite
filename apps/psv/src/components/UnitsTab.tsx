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
import { Add, Edit, Delete, Category, Search } from "@mui/icons-material";
import { units, plants, users, getAreasByUnit } from "@/data/mockData";
import { Unit } from "@/data/types";
import { glassCardStyles } from "./styles";
import { DeleteConfirmDialog } from "./shared";
import { UnitDialog } from "./dashboard/UnitDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";

export function UnitsTab() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const canEdit = useAuthStore((state) => state.canEdit());
    const canApprove = useAuthStore((state) => state.canApprove());
    const { addUnit, updateUnit, deleteUnit } = usePsvStore();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
    const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
    const [searchText, setSearchText] = useState('');

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

            {/* Search Bar */}
            <TextField
                placeholder="Search by code, name, plant, or owner..."
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
                                                {unit.code}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {unit.name}
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
                                    <TableCell>Code</TableCell>
                                    <TableCell>Plant</TableCell>
                                    <TableCell>Owner</TableCell>
                                    <TableCell>Areas</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredUnits.map((unit) => {
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
                                                <Typography variant="caption" color="text.secondary">
                                                    {unit.name}
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
                                {filteredUnits.length === 0 && (
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
