"use client";

import { useState } from 'react';
import {
    Box,
    Avatar,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Typography,
    Chip,
    ToggleButtonGroup,
    ToggleButton,
    useTheme,
    Tooltip,
    Dialog,
} from '@mui/material';
import {
    Dashboard,
    Settings,
    Home,
    Logout,
    DarkMode,
    LightMode,
    Computer,
    Person,
    Login,
} from '@mui/icons-material';
import { useAuthStore } from '@/store/useAuthStore';
import { useColorMode } from '@/contexts/ColorModeContext';
import { LoginPage } from '@/components/LoginPage';

export function UserMenu() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { toggleColorMode } = useColorMode();
    const currentUser = useAuthStore((state) => state.currentUser);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const logout = useAuthStore((state) => state.logout);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [showLogin, setShowLogin] = useState(false);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        logout();
        handleClose();
    };

    const getRoleColor = (role?: string) => {
        switch (role) {
            case 'admin':
                return theme.palette.secondary.main; // Amber/Gold
            case 'approver':
                return '#9333ea'; // Purple
            case 'lead':
                return '#059669'; // Green
            case 'engineer':
                return theme.palette.primary.main; // Sky Blue
            default:
                return theme.palette.text.disabled; // Gray for viewer
        }
    };

    const getRoleLabel = (role?: string) => {
        switch (role) {
            case 'admin':
                return 'Admin ⭐';
            case 'approver':
                return 'Approver ✓';
            case 'lead':
                return 'Lead 👤';
            case 'engineer':
                return 'Engineer 🔧';
            default:
                return 'Viewer 👁️';
        }
    };

    const getInitials = (name?: string) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase();
    };

    return (
        <>
            <Tooltip title={isAuthenticated ? currentUser?.name || 'User' : 'Guest (View Only)'}>
                <IconButton onClick={handleClick} size="small">
                    <Avatar
                        src={currentUser?.avatarUrl}
                        sx={{
                            width: 36,
                            height: 36,
                            bgcolor: isAuthenticated ? getRoleColor(currentUser?.role) : theme.palette.grey[500],
                            fontSize: '0.875rem',
                            fontWeight: 600,
                        }}
                    >
                        {isAuthenticated ? getInitials(currentUser?.name) : <Person />}
                    </Avatar>
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                onClick={handleClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                slotProps={{
                    paper: {
                        elevation: 0,
                        sx: {
                            minWidth: 280,
                            mt: 1.5,
                            borderRadius: '14px',
                            background: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)',
                            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                            boxShadow: isDark
                                ? '0 8px 32px 0 rgba(0, 0, 0, 0.4)'
                                : '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
                        },
                    },
                }}
            >
                {/* User Info Header */}
                {isAuthenticated && currentUser && (
                    <Box sx={{ px: 2, py: 1.5, pb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                            <Avatar
                                src={currentUser.avatarUrl}
                                sx={{
                                    width: 42,
                                    height: 42,
                                    bgcolor: getRoleColor(currentUser.role),
                                }}
                            >
                                {getInitials(currentUser.name)}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    {currentUser.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    {currentUser.email}
                                </Typography>
                            </Box>
                        </Box>
                        <Chip
                            label={getRoleLabel(currentUser.role)}
                            size="small"
                            sx={{
                                mt: 0.5,
                                height: 22,
                                fontSize: '0.75rem',
                                bgcolor: `${getRoleColor(currentUser.role)}22`,
                                color: getRoleColor(currentUser.role),
                                fontWeight: 600,
                            }}
                        />
                    </Box>
                )}

                <Divider />

                {/* Quick Links */}
                {isAuthenticated && (
                    <>
                        <MenuItem>
                            <ListItemIcon>
                                <Dashboard fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Dashboard</ListItemText>
                        </MenuItem>
                        <MenuItem>
                            <ListItemIcon>
                                <Settings fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Account Settings</ListItemText>
                        </MenuItem>
                        <Divider />
                    </>
                )}

                {/* Theme Toggle */}
                <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        Theme
                    </Typography>
                    <ToggleButtonGroup
                        value={theme.palette.mode}
                        exclusive
                        onChange={toggleColorMode}
                        size="small"
                        fullWidth
                        sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontSize: '0.75rem' } }}
                    >
                        <ToggleButton value="dark">
                            <DarkMode fontSize="small" sx={{ mr: 0.5 }} />
                            Dark
                        </ToggleButton>
                        <ToggleButton value="light">
                            <LightMode fontSize="small" sx={{ mr: 0.5 }} />
                            Light
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                <Divider />

                {/* Home Page */}
                <MenuItem onClick={() => (window.location.href = '/')}>
                    <ListItemIcon>
                        <Home fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Home Page</ListItemText>
                </MenuItem>

                {/* Login / Logout */}
                {!isAuthenticated ? (
                    <MenuItem onClick={() => { handleClose(); setShowLogin(true); }}>
                        <ListItemIcon>
                            <Login fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Log In</ListItemText>
                    </MenuItem>
                ) : (
                    <MenuItem onClick={handleLogout}>
                        <ListItemIcon>
                            <Logout fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Log Out</ListItemText>
                    </MenuItem>
                )}
            </Menu>

            {/* Login Dialog */}
            <Dialog
                open={showLogin}
                onClose={() => setShowLogin(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        background: 'transparent',
                        boxShadow: 'none',
                        overflow: 'visible',
                    },
                }}
            >
                <LoginPage
                    onSuccess={() => setShowLogin(false)}
                    onContinueAsGuest={() => setShowLogin(false)}
                />
            </Dialog>
        </>
    );
}
