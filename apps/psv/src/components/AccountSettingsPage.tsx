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
    Divider,
    Stack,
    Alert,
    Tabs,
    Tab,
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

    const handleChangePassword = () => {
        setPasswordMessage(null);
        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: "error", text: "New passwords do not match" });
            return;
        }
        const result = changePassword(currentPassword, newPassword);
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

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <Paper
                sx={{
                    ...glassCardStyles,
                    p: { xs: 2, sm: 3 },
                    borderRadius: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                    flexWrap: { xs: "wrap", sm: "nowrap" },
                }}
            >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        variant="h4"
                        fontWeight={700}
                        sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
                    >
                        Account Settings
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ display: { xs: "none", sm: "block" } }}
                    >
                        Manage your profile and security
                    </Typography>
                </Box>
                <IconButton onClick={handleClose}>
                    <Close />
                </IconButton>
            </Paper>

            {/* Content */}
            <Box sx={{ flex: 1, overflow: "auto", p: { xs: 2, sm: 3 }, pt: 0 }}>
                <Box sx={{ maxWidth: 900, mx: "auto" }}>
                    <Paper
                        sx={{
                            ...glassCardStyles,
                            borderRadius: "12px",
                            p: { xs: 2, sm: 3 },
                        }}
                    >
                        <Tabs
                            value={activeTab}
                            onChange={(_e, newValue) => setActiveTab(newValue)}
                            sx={{
                                borderBottom: 1,
                                borderColor: "divider",
                                "& .MuiTabs-flexContainer": {
                                    flexWrap: "wrap",
                                },
                                "& .MuiTab-root": {
                                    minHeight: { xs: 44, sm: 56 },
                                    fontSize: { xs: "0.9rem", sm: "1rem" },
                                    minWidth: { xs: 120, sm: 140 },
                                    flex: { xs: "1 1 auto", sm: "0 0 auto" },
                                },
                            }}
                        >
                            <Tab label="Profile" />
                            <Tab label="Security" />
                            <Tab label="System" />
                        </Tabs>

                        {/* Profile Tab */}
                        <TabPanel value={activeTab} index={0}>
                            <Stack spacing={3}>
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
                                            Update your profile information and
                                            initials
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
                                        startAdornment: (
                                            <Person
                                                sx={{
                                                    mr: 1,
                                                    color: "text.secondary",
                                                }}
                                            />
                                        ),
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
                                    helperText="Used in revision history (e.g. MTL, TE)"
                                    inputProps={{ maxLength: 8 }}
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
                                    InputProps={{
                                        startAdornment: (
                                            <Email
                                                sx={{
                                                    mr: 1,
                                                    color: "text.secondary",
                                                }}
                                            />
                                        ),
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
                                    InputProps={{
                                        startAdornment: (
                                            <Lock
                                                sx={{
                                                    mr: 1,
                                                    color: "text.secondary",
                                                }}
                                            />
                                        ),
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
                                    InputProps={{
                                        startAdornment: (
                                            <Lock
                                                sx={{
                                                    mr: 1,
                                                    color: "text.secondary",
                                                }}
                                            />
                                        ),
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
                                    InputProps={{
                                        startAdornment: (
                                            <Lock
                                                sx={{
                                                    mr: 1,
                                                    color: "text.secondary",
                                                }}
                                            />
                                        ),
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
                            <Typography variant="body2" color="text.secondary">
                                System settings for your account will be
                                available in a future update.
                            </Typography>
                        </TabPanel>
                    </Paper>
                </Box>
            </Box>
        </Box>
    );
}

