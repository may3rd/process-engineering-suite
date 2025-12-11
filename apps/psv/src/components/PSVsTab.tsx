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
import { Add, Edit, Delete, Shield, Search } from "@mui/icons-material";
import { protectiveSystems, areas, units, users } from "@/data/mockData";
import { ProtectiveSystem } from "@/data/types";
import { glassCardStyles } from "./styles";
import { DeleteConfirmDialog } from "./shared";
import { PSVDialog } from "./dashboard/PSVDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";

export function PSVsTab() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                mb: 3,
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Shield color="primary" sx={{ fontSize: { xs: 24, sm: 28 } }} />
                    <Typography variant="h5" fontWeight={600} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                        PSVs & Protective Devices
                    </Typography>
                </Box>
                {canEdit && (
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleAdd}
                        sx={{
                            minWidth: { sm: 'auto' },
                            width: { xs: '100%', sm: 'auto' },
                        }}
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

            {/* Mobile Card View */}
            {isMobile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {filteredPSVs.map((psv) => {
                        const area = areas.find(a => a.id === psv.areaId);
                        const unit = area ? units.find(u => u.id === area.unitId) : null;
                        const owner = users.find(u => u.id === psv.ownerId);

                        return (
                            <Card key={psv.id} sx={{ ...glassCardStyles }}>
                                <CardContent sx={{ pb: 1 }}>
                                    {/* Tag and Status */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
                                            <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1.1rem' }}>
                                                {psv.tag}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                                {psv.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {getTypeLabel(psv.type)}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={psv.status.replace('_', ' ')}
                                            size="small"
                                            color={getStatusColor(psv.status)}
                                            sx={{ textTransform: 'capitalize', flexShrink: 0 }}
                                        />
                                    </Box>

                                    {/* Details Grid */}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Set Pressure
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {psv.setPressure.toFixed(1)} barg
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
                                                Service Fluid
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {psv.serviceFluid}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {psv.fluidPhase.toUpperCase()}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                                {canEdit && (
                                    <CardActions sx={{ justifyContent: 'flex-end', pt: 0, px: 2, pb: 1.5 }}>
                                        <Tooltip title="Edit">
                                            <IconButton
                                                size="medium"
                                                onClick={() => handleEdit(psv)}
                                                sx={{ color: 'primary.main' }}
                                            >
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                size="medium"
                                                color="error"
                                                onClick={() => handleDelete(psv)}
                                            >
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </CardActions>
                                )}
                            </Card>
                        );
                    })}
                    {filteredPSVs.length === 0 && (
                        <Paper sx={{ ...glassCardStyles, p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                {searchText ? 'No PSVs match your search.' : 'No PSVs found. Click "Add PSV" to create one.'}
                            </Typography>
                        </Paper>
                    )}
                </Box>
            ) : (
                /* Desktop Table View */
                <Paper sx={{ ...glassCardStyles, p: 0, overflow: 'hidden' }}>
                    <TableContainer sx={{
                        maxHeight: 'calc(100vh - 350px)',
                        overflowX: 'auto',
                        '&::-webkit-scrollbar': {
                            height: 8,
                        },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: 'rgba(0,0,0,0.2)',
                            borderRadius: 4,
                        },
                    }}>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Tag</TableCell>
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
                                                <Typography variant="caption" color="text.secondary">
                                                    {psv.name} • {getTypeLabel(psv.type)}
                                                </Typography>
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
                                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
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
            )}

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
