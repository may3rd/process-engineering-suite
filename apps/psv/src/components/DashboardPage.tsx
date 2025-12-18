"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Paper,
    Tabs,
    Tab,
    Typography,
    Button,
    TextField,
    IconButton,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Avatar,
    useTheme,
} from "@mui/material";
import {
    Add,
    Edit,
    Delete,
    Business,
    Apartment,
    Category,
    Map,
    Folder,
    People,
    Close,
    Shield,
    Settings,
} from "@mui/icons-material";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";
import { glassCardStyles } from "./styles";
import { CustomersTab } from './CustomersTab';
import { PlantsTab } from './PlantsTab';
import { UnitsTab } from './UnitsTab';
import { AreasTab } from './AreasTab';
import { ProjectsTab } from './ProjectsTab';
import { PSVsTab } from './PSVsTab';
import { EquipmentTab } from './EquipmentTab';
import { UsersTab } from './UsersTab';
import { SystemTab } from './SystemTab';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index } = props;
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
}

export function DashboardPage() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { currentUser, canManageHierarchy, canManageCustomer, canManageUsers } = useAuthStore();
    const { setCurrentPage, dashboardTab, setDashboardTab } = usePsvStore();
    const [activeTab, setActiveTab] = useState(0);

    // Determine visible tabs based on role
    const tabs = useMemo(() => ([
        { label: "Customers", icon: <Business />, visible: canManageCustomer() },
        { label: "Plants", icon: <Apartment />, visible: canManageHierarchy() },
        { label: "Units", icon: <Category />, visible: canManageHierarchy() },
        { label: "Areas", icon: <Map />, visible: canManageHierarchy() },
        { label: "Projects", icon: <Folder />, visible: true },
        { label: "Equipment", icon: <Settings />, visible: true },
        { label: "PSVs", icon: <Shield />, visible: true },
        { label: "Users", icon: <People />, visible: canManageUsers() },
        { label: "System", icon: <Settings />, visible: canManageUsers() },
    ]), [canManageCustomer, canManageHierarchy, canManageUsers]);

    const visibleTabs = useMemo(() => tabs.filter(tab => tab.visible), [tabs]);

    useEffect(() => {
        if (!dashboardTab) return;
        const idx = visibleTabs.findIndex((t) => t.label === dashboardTab);
        if (idx >= 0) setActiveTab(idx);
    }, [dashboardTab, visibleTabs]);

    const handleClose = () => {
        setCurrentPage(null);
        setDashboardTab(null);
    };

    return (
        <Box sx={{ height: '100vh - 1px', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Paper
                sx={{
                    ...glassCardStyles,
                    p: { xs: 2, sm: 3 },
                    borderRadius: '12px 12px 0 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 0,
                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                }}
            >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                        Dashboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        Manage hierarchy and users
                    </Typography>
                </Box>
                <IconButton onClick={handleClose}>
                    <Close />
                </IconButton>
            </Paper>

            {/* Tabs - GitHub Style */}
            <Box
                sx={{
                    borderBottom: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    px: { xs: 2, sm: 3 },
                    pt: 2,
                    pb: 0,
                    display: 'flex',
                    gap: 0.5,
                    flexWrap: 'wrap',
                }}
            >
                {visibleTabs.map((tab, index) => {
                    const isSelected = activeTab === index;
                    return (
                        <Box
                            key={tab.label}
                            onClick={() => {
                                setActiveTab(index);
                                if (dashboardTab) setDashboardTab(null);
                            }}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                                px: 2,
                                py: 1,
                                cursor: 'pointer',
                                borderRadius: '6px',
                                border: '1px solid',
                                borderColor: isSelected
                                    ? 'transparent'
                                    : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                                backgroundColor: isSelected
                                    ? 'transparent'
                                    : 'transparent',
                                position: 'relative',
                                mb: '-1px',
                                transition: 'all 0.15s ease',
                                '&:hover': {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                },
                                // Bottom border indicator for selected tab
                                '&::after': isSelected ? {
                                    content: '""',
                                    position: 'absolute',
                                    bottom: -1,
                                    left: 0,
                                    right: 0,
                                    height: 2,
                                    backgroundColor: '#f78166', // GitHub orange
                                    borderRadius: '2px 2px 0 0',
                                } : {},
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: isSelected
                                        ? (isDark ? '#fff' : '#000')
                                        : (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'),
                                    '& .MuiSvgIcon-root': {
                                        fontSize: '1rem',
                                    },
                                }}
                            >
                                {tab.icon}
                            </Box>
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: isSelected ? 600 : 400,
                                    fontSize: '0.875rem',
                                    color: isSelected
                                        ? (isDark ? '#fff' : '#000')
                                        : (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'),
                                }}
                            >
                                {tab.label}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>

            {/* Tab Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, sm: 3 } }}>
                <TabPanel value={activeTab} index={visibleTabs.findIndex(t => t.label === "Projects")}>
                    <ProjectsTab />
                </TabPanel>
                <TabPanel value={activeTab} index={visibleTabs.findIndex(t => t.label === "PSVs")}>
                    <PSVsTab />
                </TabPanel>
                <TabPanel value={activeTab} index={visibleTabs.findIndex(t => t.label === "Equipment")}>
                    <EquipmentTab />
                </TabPanel>
                {canManageHierarchy() && (
                    <>
                        <TabPanel value={activeTab} index={visibleTabs.findIndex(t => t.label === "Areas")}>
                            <AreasTab />
                        </TabPanel>
                        <TabPanel value={activeTab} index={visibleTabs.findIndex(t => t.label === "Units")}>
                            <UnitsTab />
                        </TabPanel>
                        <TabPanel value={activeTab} index={visibleTabs.findIndex(t => t.label === "Plants")}>
                            <PlantsTab />
                        </TabPanel>
                    </>
                )}
                {canManageCustomer() && (
                    <TabPanel value={activeTab} index={visibleTabs.findIndex(t => t.label === "Customers")}>
                        <CustomersTab />
                    </TabPanel>
                )}
                {canManageUsers() && (
                    <TabPanel value={activeTab} index={visibleTabs.findIndex(t => t.label === "Users")}>
                        <UsersTab />
                    </TabPanel>
                )}
                {canManageUsers() && (
                    <TabPanel value={activeTab} index={visibleTabs.findIndex(t => t.label === "System")}>
                        <SystemTab />
                    </TabPanel>
                )}
            </Box>
        </Box>
    );
}
