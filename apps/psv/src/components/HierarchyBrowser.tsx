"use client";

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
} from "@mui/material";
import {
    Business,
    Factory,
    Apartment,
    Domain,
    FolderSpecial,
    ChevronRight,
} from "@mui/icons-material";
import { usePsvStore } from "@/store/usePsvStore";

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
    } = usePsvStore();

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
        switch (status) {
            case 'active':
            case 'approved':
            case 'issued':
                return 'success';
            case 'in_review':
            case 'construction':
                return 'warning';
            case 'draft':
            case 'design':
                return 'info';
            case 'inactive':
                return 'error';
            default:
                return 'default';
        }
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
                }}
            >
                <Typography variant="h6" fontWeight={600}>
                    {currentLevel.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {currentLevel.items.length} item{currentLevel.items.length !== 1 ? 's' : ''}
                </Typography>
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
                            {'status' in item && (
                                <Chip
                                    label={String(item.status).replace('_', ' ')}
                                    size="small"
                                    color={getStatusColor(String(item.status))}
                                    sx={{ textTransform: 'capitalize' }}
                                />
                            )}
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
    );
}
