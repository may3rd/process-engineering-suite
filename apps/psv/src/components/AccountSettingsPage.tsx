"use client";

import { useState } from "react";
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Avatar,
    IconButton,
    Divider,
    Stack,
    useTheme,
    Alert,
} from "@mui/material";
import {
    Close,
    PhotoCamera,
    Save,
    Person,
    Email,
    Lock,
} from "@mui/icons-material";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";
import { glassCardStyles } from "./styles";

export function AccountSettingsPage() {
    const theme = useTheme();
    const { currentUser, updateUserProfile } = useAuthStore();
    const { setCurrentPage } = usePsvStore();

    const [name, setName] = useState(currentUser?.name || "");
    const [email, setEmail] = useState(currentUser?.email || "");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleClose = () => {
        setCurrentPage(null);
    };

    const handleSaveProfile = () => {
        if (currentUser) {
            updateUserProfile({ name, email });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        }
    };

    const handleChangePassword = () => {
        if (newPassword === confirmPassword && newPassword.length >= 6) {
            // Mock password change
            alert("Password changed successfully");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } else {
            alert("Passwords don't match or are too short (min 6 characters)");
        }
    };

    const handleAvatarClick = () => {
        // Mock avatar upload
        alert("Avatar upload feature - Coming soon");
    };

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>

            {/* Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3, pt: 0 }}>
                <Stack spacing={3} sx={{ maxWidth: 800, mx: 'auto' }}>
                    {saveSuccess && (
                        <Alert severity="success">Profile updated successfully!</Alert>
                    )}

                    {/* Profile Section */}
                    <Paper sx={{ p: 3, ...glassCardStyles }}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                mb: 1,
                            }}
                        >
                            <Typography variant="h6" fontWeight={600}>
                                Profile Information
                            </Typography>
                            <IconButton onClick={handleClose}>
                                <Close />
                            </IconButton>
                        </Box>
                        <Divider sx={{ my: 2 }} />

                        <Stack spacing={3}>
                            {/* Avatar */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ position: 'relative' }}>
                                    <Avatar
                                        sx={{
                                            width: 80,
                                            height: 80,
                                            fontSize: 32,
                                            bgcolor: 'primary.main',
                                        }}
                                    >
                                        {currentUser?.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <IconButton
                                        sx={{
                                            position: 'absolute',
                                            bottom: -8,
                                            right: -8,
                                            bgcolor: 'background.paper',
                                            border: 2,
                                            borderColor: 'divider',
                                            '&:hover': { bgcolor: 'background.paper' },
                                        }}
                                        size="small"
                                        onClick={handleAvatarClick}
                                    >
                                        <PhotoCamera fontSize="small" />
                                    </IconButton>
                                </Box>
                                <Box>
                                    <Typography variant="body1" fontWeight={600}>
                                        {currentUser?.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'Guest'}
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Name */}
                            <TextField
                                fullWidth
                                label="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                InputProps={{
                                    startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                                }}
                            />

                            {/* Email */}
                            <TextField
                                fullWidth
                                label="Email Address"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                InputProps={{
                                    startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                                }}
                            />

                            {/* Role (Read-only) */}
                            <TextField
                                fullWidth
                                label="Role"
                                value={currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'Guest'}
                                disabled
                                helperText="Contact admin to change your role"
                            />

                            <Button
                                variant="contained"
                                startIcon={<Save />}
                                onClick={handleSaveProfile}
                                sx={{ alignSelf: 'flex-end' }}
                            >
                                Save Profile
                            </Button>
                        </Stack>
                    </Paper>

                    {/* Security Section */}
                    <Paper sx={{ p: 3, ...glassCardStyles }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            Security
                        </Typography>
                        <Divider sx={{ my: 2 }} />

                        <Stack spacing={3}>
                            <TextField
                                fullWidth
                                label="Current Password"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                InputProps={{
                                    startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />,
                                }}
                            />

                            <TextField
                                fullWidth
                                label="New Password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                InputProps={{
                                    startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />,
                                }}
                                helperText="Minimum 6 characters"
                            />

                            <TextField
                                fullWidth
                                label="Confirm New Password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                InputProps={{
                                    startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />,
                                }}
                            />

                            <Button
                                variant="contained"
                                onClick={handleChangePassword}
                                disabled={!currentPassword || !newPassword || !confirmPassword}
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                Change Password
                            </Button>
                        </Stack>
                    </Paper>
                </Stack>
            </Box>
        </Box>
    );
}
