"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Box,
    Typography,
    Chip,
    useTheme,
    Paper,
    IconButton,
    Tooltip,
    TextField,
    InputAdornment,
    Stack,
    MenuItem,
    Button,
    Menu,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from "@mui/material";
import {
    Business,
    Factory,
    Apartment,
    Domain,
    FolderSpecial,
    ChevronRight,
    ArrowBack,
    Add,
    Search,
    Sort,
    Check,
    ArrowUpward,
    ArrowDownward,
} from "@mui/icons-material";
import { usePsvStore } from "@/store/usePsvStore";
import { useAuthStore } from "@/store/useAuthStore";
import { CustomerDialog } from "./dashboard/CustomerDialog";
import { PlantDialog } from "./dashboard/PlantDialog";
import { UnitDialog } from "./dashboard/UnitDialog";
import { AreaDialog } from "./dashboard/AreaDialog";
import { ProjectDialog } from "./dashboard/ProjectDialog";
import { getWorkflowStatusColor, getWorkflowStatusLabel, isWorkflowStatus } from "@/lib/statusColors";
import type { Customer, Plant, Unit, Area, Project } from "@/data/types";
import { sortByGetter, type SortConfig } from "@/lib/sortUtils";
import { usePagination } from "@/hooks/usePagination";
import { GitHubFooter, PaginationControls } from "./shared";

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
    const canManageCustomer = useAuthStore((state) => state.canManageCustomer());
    const canManageHierarchy = useAuthStore((state) => state.canManageHierarchy());

    // Dialog state
    const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
    const [plantDialogOpen, setPlantDialogOpen] = useState(false);
    const [unitDialogOpen, setUnitDialogOpen] = useState(false);
    const [areaDialogOpen, setAreaDialogOpen] = useState(false);
    const [projectDialogOpen, setProjectDialogOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);

    type Level = 'customer' | 'plant' | 'unit' | 'area' | 'project';
    type SortKey = 'name' | 'code' | 'status' | 'createdAt';
    type HierarchyItem = Customer | Plant | Unit | Area | Project;
    const [sortConfigByLevel, setSortConfigByLevel] = useState<Record<Level, SortConfig<SortKey>>>({
        customer: { key: 'name', direction: 'asc' },
        plant: { key: 'name', direction: 'asc' },
        unit: { key: 'name', direction: 'asc' },
        area: { key: 'name', direction: 'asc' },
        project: { key: 'name', direction: 'asc' },
    });

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Determine current level and items to display
    const getCurrentLevel = () => {
        if (!selection.customerId) {
            return { level: 'customer', items: customerList, title: 'Customers', parent: null };
        }
        if (!selection.plantId) {
            return { level: 'plant', items: plantList, title: 'Plants', parent: selectedCustomer };
        }
        if (!selection.unitId) {
            return { level: 'unit', items: unitList, title: 'Units', parent: selectedPlant };
        }
        if (!selection.areaId) {
            return { level: 'area', items: areaList, title: 'Areas', parent: selectedUnit };
        }
        if (!selection.projectId) {
            return { level: 'project', items: projectList, title: 'Projects', parent: selectedArea };
        }
        return null;
    };

    const currentLevel = getCurrentLevel();
    const level = (currentLevel?.level ?? 'customer') as Level;

    useEffect(() => {
        setSearchText('');
        setStatusFilter('all');
    }, [level]);

    const getIcon = (lvl: string) => {
        switch (lvl) {
            case 'customer': return <Business />;
            case 'plant': return <Factory />;
            case 'unit': return <Apartment />;
            case 'area': return <Domain />;
            case 'project': return <FolderSpecial />;
            default: return <Business />;
        }
    };

    const handleSelect = (id: string) => {
        switch (currentLevel?.level) {
            case 'customer': selectCustomer(id); break;
            case 'plant': selectPlant(id); break;
            case 'unit': selectUnit(id); break;
            case 'area': selectArea(id); break;
            case 'project': selectProject(id); break;
        }
    };

    const getStatusColor = (status: string) => {
        if (isWorkflowStatus(status)) {
            return getWorkflowStatusColor(status);
        }
        switch (status) {
            case 'active': return 'success';
            case 'inactive': return 'error';
            case 'construction': return 'warning';
            case 'design': return 'default';
            default: return 'default';
        }
    };

    const canAddItem = () => {
        if (!isMounted) return false;
        if (!currentLevel) return false;
        switch (currentLevel.level) {
            case 'customer': return canManageCustomer;
            case 'plant':
            case 'unit':
            case 'area':
            case 'project': return canManageHierarchy;
            default: return false;
        }
    };

    const handleOpenDialog = () => {
        if (!currentLevel) return;
        switch (currentLevel.level) {
            case 'customer': setCustomerDialogOpen(true); break;
            case 'plant': setPlantDialogOpen(true); break;
            case 'unit': setUnitDialogOpen(true); break;
            case 'area': setAreaDialogOpen(true); break;
            case 'project': setProjectDialogOpen(true); break;
        }
    };

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

    const handleBack = () => {
        if (!currentLevel) return;
        switch (currentLevel.level) {
            case 'plant': selectCustomer(null); break;
            case 'unit': selectPlant(null); break;
            case 'area': selectUnit(null); break;
            case 'project': selectArea(null); break;
        }
    };

    const getSubtitle = (item: HierarchyItem, lvl: string): string => {
        switch (lvl) {
            case 'customer': return (item as Customer).code;
            case 'plant': return (item as Plant).location;
            case 'unit': return (item as Unit).service;
            case 'area': return (item as Area).code;
            case 'project': return `${(item as Project).phase} • ${(item as Project).code}`;
            default: return '';
        }
    };

    const filterItemFn = (item: HierarchyItem, lvl: Level, query: string): boolean => {
        const q = query.trim().toLowerCase();
        if (!q) return true;

        const base = [
            item.name,
            'status' in item ? String(item.status) : '',
            'code' in item ? String(item.code) : '',
        ];

        const extra =
            lvl === 'plant' ? ['location' in item ? String(item.location) : '']
                : lvl === 'unit' ? ['service' in item ? String(item.service) : '']
                    : lvl === 'project' ? ['phase' in item ? String(item.phase) : '']
                        : [];

        return [...base, ...extra].filter(Boolean).join(' ').toLowerCase().includes(q);
    };

    const getSortValueFn = (item: HierarchyItem, key: SortKey): string | number => {
        switch (key) {
            case 'name': return item.name.toLowerCase();
            case 'code': return ('code' in item ? String(item.code) : '').toLowerCase();
            case 'status': return ('status' in item ? String(item.status) : '').toLowerCase();
            case 'createdAt': {
                const ts = Date.parse((item as { createdAt?: string }).createdAt ?? '');
                return Number.isFinite(ts) ? ts : 0;
            }
            default: return '';
        }
    };

    const filteredItems = useMemo(() => {
        if (!currentLevel) return [];
        const items = currentLevel.items as HierarchyItem[];
        let result = items.filter((item) => filterItemFn(item, level, searchText));

        if (statusFilter !== 'all') {
            result = result.filter((item) =>
                'status' in item && String(item.status) === statusFilter
            );
        }

        return result;
    }, [currentLevel?.items, level, searchText, statusFilter]);

    const sortedItems = useMemo(() => {
        const sortConfig = sortConfigByLevel[level];
        return sortByGetter(filteredItems, sortConfig, getSortValueFn);
    }, [filteredItems, level, sortConfigByLevel]);

    // Pagination
    const pagination = usePagination(sortedItems, { totalItems: sortedItems.length, itemsPerPage: 10 });

    // Status counts
    const activeCount = useMemo(() => {
        if (!currentLevel) return 0;
        return (currentLevel.items as HierarchyItem[]).filter(
            item => 'status' in item && String(item.status) === 'active'
        ).length;
    }, [currentLevel?.items]);

    const inactiveCount = useMemo(() => {
        if (!currentLevel) return 0;
        return (currentLevel.items as HierarchyItem[]).filter(
            item => 'status' in item && String(item.status) === 'inactive'
        ).length;
    }, [currentLevel?.items]);

    if (!currentLevel) {
        return null;
    }

    const sortOptions: { key: SortKey; label: string }[] = [
        { key: 'name', label: 'Name' },
        { key: 'code', label: 'Code' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created' },
    ];

    const handleSortSelect = (key: SortKey) => {
        const currentConfig = sortConfigByLevel[level];
        const newDirection = currentConfig.key === key && currentConfig.direction === 'asc' ? 'desc' : 'asc';
        setSortConfigByLevel(prev => ({
            ...prev,
            [level]: { key, direction: newDirection },
        }));
        setSortMenuAnchor(null);
    };

    return (
        <>
            <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                {/* Context Block Header */}
                {currentLevel.parent && (
                    <Paper
                        sx={{
                            mb: 3,
                            p: 2,
                            borderRadius: '12px',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                            bgcolor: isDark ? 'rgba(56, 189, 248, 0.05)' : 'rgba(2, 132, 199, 0.03)',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <IconButton onClick={handleBack} size="small" sx={{ mr: 2 }}>
                                <ArrowBack />
                            </IconButton>
                            <Box sx={{ flex: 1, textAlign: 'center' }}>
                                <Typography variant="h6" fontWeight={600}>
                                    {currentLevel.parent.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {'code' in currentLevel.parent && currentLevel.parent.code}
                                </Typography>
                            </Box>
                            <Box sx={{ width: 40 }} /> {/* Spacer for symmetry */}
                        </Box>
                    </Paper>
                )}

                {/* Search Bar + New Button */}
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Paper
                        sx={{
                            flex: 1,
                            borderRadius: '6px',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                            overflow: 'hidden',
                        }}
                    >
                        <TextField
                            placeholder={`Search ${currentLevel.title.toLowerCase()}...`}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            size="small"
                            fullWidth
                            sx={{
                                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                '& .MuiInputBase-root': { borderRadius: '6px', height: 40 },
                            }}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search fontSize="small" sx={{ color: 'text.secondary' }} />
                                        </InputAdornment>
                                    ),
                                }
                            }}
                        />
                    </Paper>
                    {canAddItem() && (
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={handleOpenDialog}
                            sx={{ textTransform: 'none', height: 40, whiteSpace: 'nowrap' }}
                        >
                            New {currentLevel.level}
                        </Button>
                    )}
                </Stack>

                {/* Table Container */}
                <Paper
                    sx={{
                        borderRadius: '6px',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                        overflow: 'hidden',
                    }}
                >
                    {/* Table Header Row */}
                    <Box
                        sx={{
                            px: 2,
                            py: 1.5,
                            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                            bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 1,
                        }}
                    >
                        {/* Filter Tabs */}
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Button
                                size="small"
                                variant={statusFilter === 'all' ? 'contained' : 'text'}
                                onClick={() => setStatusFilter('all')}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: statusFilter === 'all' ? 600 : 400,
                                }}
                            >
                                All {currentLevel.items.length}
                            </Button>
                            <Button
                                size="small"
                                variant={statusFilter === 'active' ? 'contained' : 'text'}
                                color={statusFilter === 'active' ? 'success' : 'inherit'}
                                onClick={() => setStatusFilter('active')}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: statusFilter === 'active' ? 600 : 400,
                                }}
                            >
                                Active {activeCount}
                            </Button>
                            <Button
                                size="small"
                                variant={statusFilter === 'inactive' ? 'contained' : 'text'}
                                color={statusFilter === 'inactive' ? 'error' : 'inherit'}
                                onClick={() => setStatusFilter('inactive')}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: statusFilter === 'inactive' ? 600 : 400,
                                }}
                            >
                                Inactive {inactiveCount}
                            </Button>
                        </Stack>

                        {/* Sort & Add */}
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Button
                                size="small"
                                startIcon={<Sort />}
                                onClick={(e) => setSortMenuAnchor(e.currentTarget)}
                                sx={{ textTransform: 'none' }}
                            >
                                {sortOptions.find(o => o.key === sortConfigByLevel[level].key)?.label}
                            </Button>
                            <Menu
                                anchorEl={sortMenuAnchor}
                                open={Boolean(sortMenuAnchor)}
                                onClose={() => setSortMenuAnchor(null)}
                                sx={{ '& .MuiPaper-root': { minWidth: 200 } }}
                            >
                                <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary', fontWeight: 600 }}>
                                    Sort by
                                </Typography>
                                {sortOptions.map((opt) => (
                                    <MenuItem
                                        key={opt.key}
                                        onClick={() => {
                                            setSortConfigByLevel(prev => ({
                                                ...prev,
                                                [level]: { ...prev[level], key: opt.key },
                                            }));
                                            setSortMenuAnchor(null);
                                        }}
                                        sx={{ pl: 2 }}
                                    >
                                        <Box sx={{ width: 24, display: 'flex', alignItems: 'center' }}>
                                            {sortConfigByLevel[level].key === opt.key && (
                                                <Check fontSize="small" />
                                            )}
                                        </Box>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                                <Box sx={{ my: 1, borderTop: 1, borderColor: 'divider' }} />
                                <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary', fontWeight: 600 }}>
                                    Order
                                </Typography>
                                <MenuItem
                                    onClick={() => {
                                        setSortConfigByLevel(prev => ({
                                            ...prev,
                                            [level]: { ...prev[level], direction: 'asc' },
                                        }));
                                        setSortMenuAnchor(null);
                                    }}
                                    sx={{ pl: 2 }}
                                >
                                    <Box sx={{ width: 24, display: 'flex', alignItems: 'center' }}>
                                        {sortConfigByLevel[level].direction === 'asc' && (
                                            <Check fontSize="small" />
                                        )}
                                    </Box>
                                    <ArrowUpward fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                    Ascending
                                </MenuItem>
                                <MenuItem
                                    onClick={() => {
                                        setSortConfigByLevel(prev => ({
                                            ...prev,
                                            [level]: { ...prev[level], direction: 'desc' },
                                        }));
                                        setSortMenuAnchor(null);
                                    }}
                                    sx={{ pl: 2 }}
                                >
                                    <Box sx={{ width: 24, display: 'flex', alignItems: 'center' }}>
                                        {sortConfigByLevel[level].direction === 'desc' && (
                                            <Check fontSize="small" />
                                        )}
                                    </Box>
                                    <ArrowDownward fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                    Descending
                                </MenuItem>
                            </Menu>

                        </Stack>
                    </Box>

                    {/* Table */}
                    <TableContainer>
                        <Table>
                            <TableBody>
                                {pagination.pageItems.map((item) => (
                                    <TableRow
                                        key={item.id}
                                        hover
                                        onClick={() => handleSelect(item.id)}
                                        sx={{
                                            cursor: 'pointer',
                                            '&:hover': {
                                                bgcolor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(2, 132, 199, 0.04)',
                                            },
                                            '&:last-child td': {
                                                borderBottom: 'none',
                                            },
                                        }}
                                    >
                                        <TableCell sx={{ width: 48 }}>
                                            <Box
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '6px',
                                                    bgcolor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'primary.main',
                                                }}
                                            >
                                                {getIcon(currentLevel.level)}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography fontWeight={500}>{item.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {getSubtitle(item, currentLevel.level)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
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
                                                        color={getStatusColor(statusStr)}
                                                        sx={{ textTransform: 'capitalize' }}
                                                    />
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell align="right" sx={{ width: 48 }}>
                                            <ChevronRight sx={{ color: 'text.secondary' }} />
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {pagination.pageItems.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4}>
                                            <Box sx={{ py: 6, textAlign: 'center' }}>
                                                <Typography color="text.secondary">
                                                    {searchText.trim()
                                                        ? `No ${currentLevel.title.toLowerCase()} match your search`
                                                        : `No ${currentLevel.title.toLowerCase()} found`}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Pagination */}
                    <PaginationControls
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        pageNumbers={pagination.pageNumbers}
                        onPageChange={pagination.goToPage}
                        hasNextPage={pagination.hasNextPage}
                        hasPrevPage={pagination.hasPrevPage}
                    />
                </Paper>

                {/* Footer */}
                <GitHubFooter />
            </Box>

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
