"use client";

import { useState, useEffect } from "react";
import {
    Box,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Chip,
    useTheme,
    Paper,
    IconButton,
    Tooltip,
} from "@mui/material";
import {
    Business,
    Factory,
    Apartment,
    Domain,
    FolderSpecial,
    ChevronRight,
    Add,
} from "@mui/icons-material";
import { usePsvStore } from "@/store/usePsvStore";
import { useAuthStore } from "@/store/useAuthStore";
import { CustomerDialog } from "./dashboard/CustomerDialog";
import { PlantDialog } from "./dashboard/PlantDialog";
import { UnitDialog } from "./dashboard/UnitDialog";
import { AreaDialog } from "./dashboard/AreaDialog";
import { ProjectDialog } from "./dashboard/ProjectDialog";
import { getWorkflowStatusColor, getWorkflowStatusLabel, isWorkflowStatus } from "@/lib/statusColors";

export function HierarchyBrowser() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const {
        selection,
        customerList,
        plantList,
        unitList,
        areaList,
        projectList,
        selectCustomer,
        selectPlant,
        selectUnit,
        selectArea,
        selectProject,
        selectedCustomer,
        selectedPlant,
        selectedUnit,
        selectedArea,
        addCustomer,
        addPlant,
        addUnit,
        addArea,
        addProject,
    } = usePsvStore();

    // Auth and permissions
    const canEdit = useAuthStore((state) => state.canEdit());
    const canManageCustomer = useAuthStore((state) => state.canManageCustomer());
    const canManageHierarchy = useAuthStore((state) => state.canManageHierarchy());

    // Dialog state
    const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
    const [plantDialogOpen, setPlantDialogOpen] = useState(false);
    const [unitDialogOpen, setUnitDialogOpen] = useState(false);
    const [areaDialogOpen, setAreaDialogOpen] = useState(false);
    const [projectDialogOpen, setProjectDialogOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Fix hydration mismatch - defer auth-dependent UI until client mount
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Determine current level and items to display
    const getCurrentLevel = () => {
        if (!selection.customerId) {
            return { level: 'customer', items: customerList, title: 'Customers' };
        }
        if (!selection.plantId) {
            return { level: 'plant', items: plantList, title: 'Plants' };
        }
        if (!selection.unitId) {
            return { level: 'unit', items: unitList, title: 'Units' };
        }
        if (!selection.areaId) {
            return { level: 'area', items: areaList, title: 'Areas' };
        }
        if (!selection.projectId) {
            return { level: 'project', items: projectList, title: 'Projects' };
        }
        return null;
    };

    const currentLevel = getCurrentLevel();

    if (!currentLevel) {
        return null;
    }

    const getIcon = (level: string) => {
        switch (level) {
            case 'customer':
                return <Business />;
            case 'plant':
                return <Factory />;
            case 'unit':
                return <Apartment />;
            case 'area':
                return <Domain />;
            case 'project':
                return <FolderSpecial />;
            default:
                return <Business />;
        }
    };

    const handleSelect = (id: string) => {
        switch (currentLevel.level) {
            case 'customer':
                selectCustomer(id);
                break;
            case 'plant':
                selectPlant(id);
                break;
            case 'unit':
                selectUnit(id);
                break;
            case 'area':
                selectArea(id);
                break;
            case 'project':
                selectProject(id);
                break;
        }
    };

    const getStatusColor = (status: string) => {
        if (isWorkflowStatus(status)) {
            return getWorkflowStatusColor(status);
        }
        switch (status) {
            case 'active':
                return 'success';
            case 'inactive':
                return 'error';
            case 'construction':
                return 'warning';
            case 'design':
                return 'default';
            default:
                return 'default';
        }
    };

    // Check if user can add items at current level
    const canAddItem = () => {
        // Don't show until mounted (avoids SSR hydration mismatch)
        if (!isMounted) return false;
        if (!currentLevel) return false;
        switch (currentLevel.level) {
            case 'customer':
                return canManageCustomer;
            case 'plant':
            case 'unit':
            case 'area':
            case 'project':
                return canManageHierarchy;
            default:
                return false;
        }
    };

    // Open appropriate dialog
    const handleOpenDialog = () => {
        if (!currentLevel) return;
        switch (currentLevel.level) {
            case 'customer':
                setCustomerDialogOpen(true);
                break;
            case 'plant':
                setPlantDialogOpen(true);
                break;
            case 'unit':
                setUnitDialogOpen(true);
                break;
            case 'area':
                setAreaDialogOpen(true);
                break;
            case 'project':
                setProjectDialogOpen(true);
                break;
        }
    };

    // Save handlers
    const handleSaveCustomer = (data: Omit<Parameters<typeof addCustomer>[0], 'id'>) => {
        addCustomer(data);
        setCustomerDialogOpen(false);
    };

    const handleSavePlant = (data: Omit<Parameters<typeof addPlant>[0], 'id'>) => {
        if (selectedCustomer) {
            addPlant({ ...data, customerId: selectedCustomer.id });
        }
        setPlantDialogOpen(false);
    };

    const handleSaveUnit = (data: Omit<Parameters<typeof addUnit>[0], 'id'>) => {
        if (selectedPlant) {
            addUnit({ ...data, plantId: selectedPlant.id });
        }
        setUnitDialogOpen(false);
    };

    const handleSaveArea = (data: Omit<Parameters<typeof addArea>[0], 'id'>) => {
        if (selectedUnit) {
            addArea({ ...data, unitId: selectedUnit.id });
        }
        setAreaDialogOpen(false);
    };

    const handleSaveProject = (data: Omit<Parameters<typeof addProject>[0], 'id'>) => {
        if (selectedArea) {
            addProject({ ...data, areaId: selectedArea.id });
        }
        setProjectDialogOpen(false);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getSubtitle = (item: any, level: string): string => {
        switch (level) {
            case 'customer':
                return `Code: ${item.code}`;
            case 'plant':
                return item.location;
            case 'unit':
                return item.service;
            case 'area':
                return `Code: ${item.code}`;
            case 'project':
                return `${item.phase} • ${item.code}`;
            default:
                return '';
        }
    };

    return (
        <>
            <Paper
                sx={{
                    borderRadius: "20px",
                    overflow: 'hidden',
                }}
            >
                <Box
                    sx={{
                        px: 3,
                        py: 2,
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Box>
                        <Typography variant="h6" fontWeight={600}>
                            {currentLevel.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {currentLevel.items.length} item{currentLevel.items.length !== 1 ? 's' : ''}
                        </Typography>
                    </Box>
                    {canAddItem() && (
                        <Tooltip title={`Add ${currentLevel.level}`}>
                            <IconButton
                                onClick={handleOpenDialog}
                                sx={{
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    '&:hover': { bgcolor: 'primary.dark' },
                                }}
                            >
                                <Add />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>

                <List disablePadding>
                    {currentLevel.items.map((item) => (
                        <ListItemButton
                            key={item.id}
                            onClick={() => handleSelect(item.id)}
                            sx={{
                                py: 2,
                                px: 3,
                                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                                '&:hover': {
                                    backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(2, 132, 199, 0.08)',
                                },
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: 48,
                                    color: 'primary.main',
                                }}
                            >
                                {getIcon(currentLevel.level)}
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    <Typography fontWeight={500}>
                                        {item.name}
                                    </Typography>
                                }
                                secondary={getSubtitle(item, currentLevel.level)}
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {'status' in item && (() => {
                                    const statusStr = String(item.status);
                                    return (
                                        <Chip
                                            label={
                                                isWorkflowStatus(statusStr)
                                                    ? getWorkflowStatusLabel(statusStr)
                                                    : statusStr.replace('_', ' ')
                                            }
                                            size="small"
                                            color={getStatusColor(String(item.status))}
                                            sx={{ textTransform: 'capitalize' }}
                                        />
                                    );
                                })()}
                                <ChevronRight sx={{ color: 'text.secondary' }} />
                            </Box>
                        </ListItemButton>
                    ))}

                    {currentLevel.items.length === 0 && (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                No {currentLevel.title.toLowerCase()} found
                            </Typography>
                        </Box>
                    )}
                </List>
            </Paper>

            {/* Dialogs */}
            <CustomerDialog
                open={customerDialogOpen}
                onClose={() => setCustomerDialogOpen(false)}
                onSave={handleSaveCustomer}
            />
            <PlantDialog
                open={plantDialogOpen}
                onClose={() => setPlantDialogOpen(false)}
                onSave={handleSavePlant}
                initialCustomerId={selectedCustomer?.id}
            />
            <UnitDialog
                open={unitDialogOpen}
                onClose={() => setUnitDialogOpen(false)}
                onSave={handleSaveUnit}
                initialPlantId={selectedPlant?.id}
            />
            <AreaDialog
                open={areaDialogOpen}
                onClose={() => setAreaDialogOpen(false)}
                onSave={handleSaveArea}
                initialUnitId={selectedUnit?.id}
            />
            <ProjectDialog
                open={projectDialogOpen}
                onClose={() => setProjectDialogOpen(false)}
                onSave={handleSaveProject}
                initialAreaId={selectedArea?.id}
            />
        </>
    );
}
