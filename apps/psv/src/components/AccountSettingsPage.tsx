"use client";

import { ReactNode, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Avatar,
    IconButton,
    Stack,
    Alert,
    MenuItem,
} from "@mui/material";
import {
    Close,
    PhotoCamera,
    Save,
    Person,
    Email,
    Lock,
    Settings,
} from "@mui/icons-material";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";
import { glassCardStyles } from "./styles";
import { DEFAULT_DISPLAY_SETTINGS } from "@/hooks/useDisplaySettings";

interface TabPanelProps {
    children?: ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index } = props;
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

const DECIMAL_OPTIONS = [0, 1, 2, 3, 4];

function SystemSettingsPanel() {
    const { currentUser, updateUserProfile } = useAuthStore();
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Initialize from user settings or defaults
    const [pressureDecimals, setPressureDecimals] = useState(
        currentUser?.displaySettings?.decimalPlaces?.pressure ?? DEFAULT_DISPLAY_SETTINGS.decimalPlaces.pressure
    );
    const [temperatureDecimals, setTemperatureDecimals] = useState(
        currentUser?.displaySettings?.decimalPlaces?.temperature ?? DEFAULT_DISPLAY_SETTINGS.decimalPlaces.temperature
    );
    const [flowDecimals, setFlowDecimals] = useState(
        currentUser?.displaySettings?.decimalPlaces?.flow ?? DEFAULT_DISPLAY_SETTINGS.decimalPlaces.flow
    );
    const [generalDecimals, setGeneralDecimals] = useState(
        currentUser?.displaySettings?.decimalPlaces?.general ?? DEFAULT_DISPLAY_SETTINGS.decimalPlaces.general
    );

    const handleSave = () => {
        updateUserProfile({
            displaySettings: {
                decimalPlaces: {
                    pressure: pressureDecimals,
                    temperature: temperatureDecimals,
                    flow: flowDecimals,
                    length: generalDecimals,
                    general: generalDecimals,
                },
            },
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    return (
        <Stack spacing={3}>
            {saveSuccess && (
                <Alert severity="success">Display settings saved!</Alert>
            )}

            <Typography variant="subtitle1" fontWeight={600}>
                Display Precision
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: -2 }}>
                Set the number of decimal places for different value types.
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                    select
                    label="Pressure"
                    value={pressureDecimals}
                    onChange={(e) => setPressureDecimals(Number(e.target.value))}
                    helperText="e.g. 10.25 barg"
                >
                    {DECIMAL_OPTIONS.map((n) => (
                        <MenuItem key={n} value={n}>{n} decimal{n !== 1 ? 's' : ''}</MenuItem>
                    ))}
                </TextField>

                <TextField
                    select
                    label="Temperature"
                    value={temperatureDecimals}
                    onChange={(e) => setTemperatureDecimals(Number(e.target.value))}
                    helperText="e.g. 120.5 °C"
                >
                    {DECIMAL_OPTIONS.map((n) => (
                        <MenuItem key={n} value={n}>{n} decimal{n !== 1 ? 's' : ''}</MenuItem>
                    ))}
                </TextField>

                <TextField
                    select
                    label="Flow Rate"
                    value={flowDecimals}
                    onChange={(e) => setFlowDecimals(Number(e.target.value))}
                    helperText="e.g. 45,000 kg/h"
                >
                    {DECIMAL_OPTIONS.map((n) => (
                        <MenuItem key={n} value={n}>{n} decimal{n !== 1 ? 's' : ''}</MenuItem>
                    ))}
                </TextField>

                <TextField
                    select
                    label="General / Other"
                    value={generalDecimals}
                    onChange={(e) => setGeneralDecimals(Number(e.target.value))}
                    helperText="Fallback for other values"
                >
                    {DECIMAL_OPTIONS.map((n) => (
                        <MenuItem key={n} value={n}>{n} decimal{n !== 1 ? 's' : ''}</MenuItem>
                    ))}
                </TextField>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
                    Save Settings
                </Button>
            </Box>
        </Stack>
    );
}

export function AccountSettingsPage() {
    const { currentUser, updateUserProfile, changePassword } = useAuthStore();
    const { setCurrentPage } = usePsvStore();

    const [name, setName] = useState(currentUser?.name || "");
    const [initials, setInitials] = useState(currentUser?.initials || "");
    const [email, setEmail] = useState(currentUser?.email || "");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState(0);

    const handleClose = () => {
        setCurrentPage(null);
    };

    const handleSaveProfile = () => {
        if (currentUser) {
            updateUserProfile({ name, initials: initials.trim() || undefined, email });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        }
    };

    const handleChangePassword = async () => {
        setPasswordMessage(null);
        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: "error", text: "New passwords do not match" });
            return;
        }
        const result = await changePassword(currentPassword, newPassword);
        setPasswordMessage({ type: result.success ? "success" : "error", text: result.message });
        if (result.success) {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        }
    };

    const handleAvatarClick = () => {
        // Mock avatar upload
        alert("Avatar upload feature - Coming soon");
    };

    // Menu items for sidebar
    const menuItems = [
        { label: 'Profile', icon: <Person /> },
        { label: 'Security', icon: <Lock /> },
        { label: 'System', icon: <Settings /> },
    ];

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            {/* Content */}
            <Box sx={{ flex: 1, overflow: "auto", p: { xs: 2, sm: 3 } }}>
                <Box sx={{ maxWidth: 1000, mx: "auto" }}>
                    {/* Header */}
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 3,
                    }}>
                        <Typography variant="h5" fontWeight={700}>
                            Account Settings
                        </Typography>
                        <IconButton onClick={handleClose}>
                            <Close />
                        </IconButton>
                    </Box>

                    {/* Sidebar + Content Layout */}
                    <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                        {/* Left Sidebar */}
                        <Paper
                            sx={{
                                ...glassCardStyles,
                                borderRadius: "12px",
                                p: 1,
                                width: { xs: '100%', md: 200 },
                                flexShrink: 0,
                                alignSelf: 'flex-start',
                            }}
                        >
                            <Stack spacing={0.5}>
                                {menuItems.map((item, index) => (
                                    <Button
                                        key={item.label}
                                        variant={activeTab === index ? 'contained' : 'text'}
                                        onClick={() => setActiveTab(index)}
                                        startIcon={item.icon}
                                        sx={{
                                            justifyContent: 'flex-start',
                                            px: 2,
                                            py: 1,
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            fontWeight: activeTab === index ? 600 : 400,
                                            color: activeTab === index ? undefined : 'text.primary',
                                            bgcolor: activeTab === index ? 'primary.main' : 'transparent',
                                            '&:hover': {
                                                bgcolor: activeTab === index ? 'primary.dark' : 'action.hover',
                                            },
                                        }}
                                    >
                                        {item.label}
                                    </Button>
                                ))}
                            </Stack>
                        </Paper>

                        {/* Right Content Area */}
                        <Paper
                            sx={{
                                ...glassCardStyles,
                                borderRadius: "12px",
                                p: { xs: 2, sm: 3 },
                                flex: 1,
                                minWidth: 0,
                            }}
                        >
                            {/* Profile Tab */}
                            <TabPanel value={activeTab} index={0}>
                                <Stack spacing={3}>
                                    <Typography variant="h6" fontWeight={600}>Profile</Typography>
                                    {saveSuccess && (
                                        <Alert severity="success">
                                            Profile updated successfully!
                                        </Alert>
                                    )}

                                    {/* Avatar */}
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 2,
                                        }}
                                    >
                                        <Box sx={{ position: "relative" }}>
                                            <Avatar
                                                sx={{
                                                    width: 80,
                                                    height: 80,
                                                    fontSize: 32,
                                                    bgcolor: "primary.main",
                                                }}
                                            >
                                                {(
                                                    currentUser?.initials?.trim() ||
                                                    currentUser?.name
                                                        ?.charAt(0)
                                                        .toUpperCase()
                                                ) ?? "?"}
                                            </Avatar>
                                            <IconButton
                                                sx={{
                                                    position: "absolute",
                                                    bottom: -8,
                                                    right: -8,
                                                    bgcolor: "background.paper",
                                                    border: 2,
                                                    borderColor: "divider",
                                                    "&:hover": {
                                                        bgcolor: "background.paper",
                                                    },
                                                }}
                                                size="small"
                                                onClick={handleAvatarClick}
                                            >
                                                <PhotoCamera fontSize="small" />
                                            </IconButton>
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="subtitle1"
                                                fontWeight={600}
                                            >
                                                {currentUser?.name || "User"}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Update your profile information
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Name */}
                                    <TextField
                                        fullWidth
                                        label="Full Name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <Person
                                                        sx={{
                                                            mr: 1,
                                                            color: "text.secondary",
                                                        }}
                                                    />
                                                ),
                                            }
                                        }}
                                    />

                                    {/* Initials */}
                                    <TextField
                                        fullWidth
                                        label="Initials"
                                        value={initials}
                                        onChange={(e) =>
                                            setInitials(
                                                e.target.value.toUpperCase()
                                            )
                                        }
                                        helperText="Used in revision history, maximum 8 characters (e.g. JS, JSR, JSR2)"
                                        slotProps={{
                                            htmlInput: {
                                                maxLength: 8,
                                            },
                                        }}
                                    />

                                    {/* Email */}
                                    <TextField
                                        fullWidth
                                        label="Email Address"
                                        type="email"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <Email
                                                        sx={{
                                                            mr: 1,
                                                            color: "text.secondary",
                                                        }}
                                                    />
                                                ),
                                            }
                                        }}
                                    />

                                    {/* Role (Read-only) */}
                                    <TextField
                                        fullWidth
                                        label="Role"
                                        value={
                                            currentUser?.role
                                                ? currentUser.role
                                                    .split("_")
                                                    .map(
                                                        (part) =>
                                                            part
                                                                .charAt(0)
                                                                .toUpperCase() +
                                                            part.slice(1)
                                                    )
                                                    .join(" ")
                                                : "Guest"
                                        }
                                        disabled
                                        helperText="Contact admin to change your role"
                                    />

                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "flex-end",
                                        }}
                                    >
                                        <Button
                                            variant="contained"
                                            startIcon={<Save />}
                                            onClick={handleSaveProfile}
                                        >
                                            Save Profile
                                        </Button>
                                    </Box>
                                </Stack>
                            </TabPanel>

                            {/* Security Tab */}
                            <TabPanel value={activeTab} index={1}>
                                <Stack spacing={3}>
                                    <Typography variant="h6" fontWeight={600}>Security</Typography>
                                    {passwordMessage && (
                                        <Alert severity={passwordMessage.type}>
                                            {passwordMessage.text}
                                        </Alert>
                                    )}
                                    <TextField
                                        fullWidth
                                        label="Current Password"
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) =>
                                            setCurrentPassword(e.target.value)
                                        }
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <Lock
                                                        sx={{
                                                            mr: 1,
                                                            color: "text.secondary",
                                                        }}
                                                    />
                                                ),
                                            }
                                        }}
                                    />

                                    <TextField
                                        fullWidth
                                        label="New Password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) =>
                                            setNewPassword(e.target.value)
                                        }
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <Lock
                                                        sx={{
                                                            mr: 1,
                                                            color: "text.secondary",
                                                        }}
                                                    />
                                                ),
                                            }
                                        }}
                                        helperText="Minimum 6 characters"
                                    />

                                    <TextField
                                        fullWidth
                                        label="Confirm New Password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) =>
                                            setConfirmPassword(e.target.value)
                                        }
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <Lock
                                                        sx={{
                                                            mr: 1,
                                                            color: "text.secondary",
                                                        }}
                                                    />
                                                ),
                                            }
                                        }}
                                    />

                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "flex-start",
                                        }}
                                    >
                                        <Button
                                            variant="contained"
                                            onClick={handleChangePassword}
                                            disabled={
                                                !currentPassword ||
                                                !newPassword ||
                                                !confirmPassword
                                            }
                                        >
                                            Change Password
                                        </Button>
                                    </Box>
                                </Stack>
                            </TabPanel>

                            {/* System Tab */}
                            <TabPanel value={activeTab} index={2}>
                                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>System</Typography>
                                <SystemSettingsPanel />
                            </TabPanel>
                        </Paper>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
