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
    Badge,
    TextField,
} from "@mui/material";
import { Add, Edit, Delete, Map, Search } from "@mui/icons-material";
import {
    areas,
    units,
    getProjectsByArea,
    getProtectiveSystemsByArea,
    getEquipmentByArea
} from "@/data/mockData";
import { Area } from "@/data/types";
import { glassCardStyles } from "./styles";
import { DeleteConfirmDialog } from "./shared";
import { AreaDialog } from "./dashboard/AreaDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";

export function AreasTab() {
    const canEdit = useAuthStore((state) => state.canEdit());
    const canApprove = useAuthStore((state) => state.canApprove());
    const { addArea, updateArea, deleteArea } = usePsvStore();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedArea, setSelectedArea] = useState<Area | null>(null);
    const [areaToDelete, setAreaToDelete] = useState<Area | null>(null);
    const [searchText, setSearchText] = useState('');

    const handleAdd = () => {
        setSelectedArea(null);
        setDialogOpen(true);
    };

    const handleEdit = (area: Area) => {
        setSelectedArea(area);
        setDialogOpen(true);
    };

    const handleDelete = (area: Area) => {
        setAreaToDelete(area);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (areaToDelete) {
            try {
                deleteArea(areaToDelete.id);
                setDeleteDialogOpen(false);
                setAreaToDelete(null);
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleForceDelete = () => {
        if (areaToDelete) {
            console.log('Force delete area and all children:', areaToDelete.id);
            setDeleteDialogOpen(false);
            setAreaToDelete(null);
        }
    };

    const handleSave = (data: Omit<Area, 'id' | 'createdAt'>) => {
        if (selectedArea) {
            updateArea(selectedArea.id, data);
        } else {
            addArea(data);
        }
        setDialogOpen(false);
    };

    const getAssetCounts = (areaId: string) => {
        return {
            projects: getProjectsByArea(areaId).length,
            psvs: getProtectiveSystemsByArea(areaId).length,
            equipment: getEquipmentByArea(areaId).length,
        };
    };

    // Filter areas based on search text
    const filteredAreas = areas.filter(area => {
        if (!searchText) return true;
        const search = searchText.toLowerCase();
        const unit = units.find(u => u.id === area.unitId);
        return (
            area.code.toLowerCase().includes(search) ||
            area.name.toLowerCase().includes(search) ||
            unit?.name.toLowerCase().includes(search)
        );
    });

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Map color="primary" sx={{ fontSize: 28 }} />
                    <Typography variant="h5" fontWeight={600}>
                        Areas
                    </Typography>
                </Box>
                {canEdit && (
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleAdd}
                    >
                        Add Area
                    </Button>
                )}
            </Box>

            {/* Search Bar */}
            <TextField
                placeholder="Search by code, name, or unit..."
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
                                <TableCell>Unit</TableCell>
                                <TableCell>PSVs</TableCell>
                                <TableCell>Equipment</TableCell>
                                <TableCell>Projects</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Created</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredAreas.map((area) => {
                                const unit = units.find(u => u.id === area.unitId);
                                const counts = getAssetCounts(area.id);

                                return (
                                    <TableRow
                                        key={area.id}
                                        hover
                                        sx={{
                                            '&:last-child td': {
                                                borderBottom: 0
                                            }
                                        }}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>
                                                {area.code}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {area.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {unit?.name || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${counts.psvs} PSV${counts.psvs !== 1 ? 's' : ''}`}
                                                size="small"
                                                color={counts.psvs > 0 ? 'primary' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${counts.equipment} equip.`}
                                                size="small"
                                                color={counts.equipment > 0 ? 'secondary' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${counts.projects} proj.`}
                                                size="small"
                                                color={counts.projects > 0 ? 'info' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={area.status}
                                                size="small"
                                                color={area.status === 'active' ? 'success' : 'default'}
                                                sx={{ textTransform: 'capitalize' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {new Date(area.createdAt).toLocaleDateString()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            {canEdit && (
                                                <>
                                                    <Tooltip title="Edit">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleEdit(area)}
                                                        >
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDelete(area)}
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
                            {filteredAreas.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            {searchText ? 'No areas match your search.' : 'No areas found. Click "Add Area" to create one.'}
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
                <AreaDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    onSave={handleSave}
                    area={selectedArea}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {areaToDelete && (
                <DeleteConfirmDialog
                    open={deleteDialogOpen}
                    onClose={() => {
                        setDeleteDialogOpen(false);
                        setAreaToDelete(null);
                    }}
                    onConfirm={handleConfirmDelete}
                    onForceDelete={handleForceDelete}
                    allowForceDelete={canApprove}
                    title="Delete Area"
                    itemName={areaToDelete.name}
                    children={[
                        { label: 'Project', count: getAssetCounts(areaToDelete.id).projects },
                        { label: 'PSV', count: getAssetCounts(areaToDelete.id).psvs },
                        { label: 'Equipment', count: getAssetCounts(areaToDelete.id).equipment },
                    ]}
                />
            )}
        </Box>
    );
}
