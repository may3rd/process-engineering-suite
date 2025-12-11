"use client";

import { useState } from "react";
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
} from "@mui/icons-material";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";
import { glassCardStyles } from "./styles";

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
    const { setCurrentPage } = usePsvStore();
    const [activeTab, setActiveTab] = useState(0);

    // Determine visible tabs based on role
    const tabs = [
        { label: "Projects", icon: <Folder />, visible: true },
        { label: "Areas", icon: <Map />, visible: canManageHierarchy() },
        { label: "Units", icon: <Category />, visible: canManageHierarchy() },
        { label: "Plants", icon: <Apartment />, visible: canManageHierarchy() },
        { label: "Customers", icon: <Business />, visible: canManageCustomer() },
        { label: "Users", icon: <People />, visible: canManageUsers() },
    ];

    const visibleTabs = tabs.filter(tab => tab.visible);

    const handleClose = () => {
        setCurrentPage(null);
    };

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Paper
                sx={{
                    ...glassCardStyles,
                    p: 3,
                    borderRadius: 0,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <Box>
                    <Typography variant="h4" fontWeight={700}>
                        Dashboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage hierarchy and users
                    </Typography>
                </Box>
                <IconButton onClick={handleClose}>
                    <Close />
                </IconButton>
            </Paper>

            {/* Tabs */}
            <Paper sx={{ ...glassCardStyles, borderRadius: 0 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {visibleTabs.map((tab, index) => (
                        <Tab
                            key={tab.label}
                            label={tab.label}
                            icon={tab.icon}
                            iconPosition="start"
                        />
                    ))}
                </Tabs>
            </Paper>

            {/* Tab Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                <TabPanel value={activeTab} index={0}>
                    <ProjectsTab />
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
            </Box>
        </Box>
    );
}

// Placeholder tab components
function ProjectsTab() {
    return (
        <Paper sx={{ p: 3, ...glassCardStyles }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">Projects</Typography>
                <Button variant="contained" startIcon={<Add />}>
                    New Project
                </Button>
            </Box>
            <Typography color="text.secondary">
                Project management interface - Coming soon
            </Typography>
        </Paper>
    );
}

function AreasTab() {
    return (
        <Paper sx={{ p: 3, ...glassCardStyles }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">Areas</Typography>
                <Button variant="contained" startIcon={<Add />}>
                    New Area
                </Button>
            </Box>
            <Typography color="text.secondary">
                Area management interface - Coming soon
            </Typography>
        </Paper>
    );
}

function UnitsTab() {
    return (
        <Paper sx={{ p: 3, ...glassCardStyles }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">Units</Typography>
                <Button variant="contained" startIcon={<Add />}>
                    New Unit
                </Button>
            </Box>
            <Typography color="text.secondary">
                Unit management interface - Coming soon
            </Typography>
        </Paper>
    );
}

function PlantsTab() {
    return (
        <Paper sx={{ p: 3, ...glassCardStyles }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">Plants</Typography>
                <Button variant="contained" startIcon={<Add />}>
                    New Plant
                </Button>
            </Box>
            <Typography color="text.secondary">
                Plant management interface - Coming soon
            </Typography>
        </Paper>
    );
}

function CustomersTab() {
    return (
        <Paper sx={{ p: 3, ...glassCardStyles }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">Customers</Typography>
                <Button variant="contained" startIcon={<Add />}>
                    New Customer
                </Button>
            </Box>
            <Typography color="text.secondary">
                Customer management interface - Coming soon
            </Typography>
        </Paper>
    );
}

function UsersTab() {
    return (
        <Paper sx={{ p: 3, ...glassCardStyles }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">Users</Typography>
                <Button variant="contained" startIcon={<Add />}>
                    New User
                </Button>
            </Box>
            <Typography color="text.secondary">
                User management interface - Coming soon
            </Typography>
        </Paper>
    );
}
