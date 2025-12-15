"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Chip,
    Typography,
    Alert,
    Dialog as ConfirmDialog,
    DialogTitle as ConfirmDialogTitle,
    DialogContent as ConfirmDialogContent,
    DialogActions as ConfirmDialogActions,
    IconButton,
    InputAdornment,
} from "@mui/material";
import { ContentCopy, LockReset } from "@mui/icons-material";
import { User } from "@/data/types";
import { useAuthStore } from "@/store/useAuthStore";

interface UserDialogProps {
    open: boolean;
    user?: User | null;
    onSave: (values: Omit<User, "id">) => void;
    onClose: () => void;
}

const roleOptions: { value: User["role"]; label: string; description: string }[] = [
    { value: "admin", label: "Administrator", description: "Full access across the suite" },
    { value: "approver", label: "Approver", description: "Can approve PSVs and manage customers" },
    { value: "lead", label: "Lead Engineer", description: "Manages hierarchy and projects" },
    { value: "engineer", label: "Engineer", description: "Creates and edits PSVs" },
    { value: "viewer", label: "Viewer", description: "Read-only access" },
];

const statusOptions: { value: User["status"]; label: string }[] = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
];

export function UserDialog({ open, user, onSave, onClose }: UserDialogProps) {
    const [name, setName] = useState("");
    const [initials, setInitials] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<User["role"]>("engineer");
    const [status, setStatus] = useState<User["status"]>("active");
    const [avatarUrl, setAvatarUrl] = useState("");
    const canManageUsers = useAuthStore((state) => state.canManageUsers());
    const resetUserPassword = useAuthStore((state) => state.resetUserPassword);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [resetResult, setResetResult] = useState<{ username: string; temporaryPassword: string } | null>(null);
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

    useEffect(() => {
        setResetResult(null);
        setCopyFeedback(null);
        if (user) {
            setName(user.name);
            setInitials(user.initials || "");
            setEmail(user.email);
            setRole(user.role);
            setStatus(user.status);
            setAvatarUrl(user.avatarUrl || "");
        } else {
            setName("");
            setInitials("");
            setEmail("");
            setRole("engineer");
            setStatus("active");
            setAvatarUrl("");
        }
    }, [user, open]);

    const isValid = useMemo(() => {
        if (!name.trim() || !email.trim()) return false;
        return /\S+@\S+\.\S+/.test(email.trim());
    }, [name, email]);

    const handleSubmit = () => {
        if (!isValid) return;
        onSave({
            name: name.trim(),
            initials: initials.trim().toUpperCase() || undefined,
            email: email.trim().toLowerCase(),
            role,
            status,
            avatarUrl: avatarUrl.trim() || undefined,
        });
    };

    const handleResetPassword = async () => {
        if (!user || !canManageUsers) return;
        const result = resetUserPassword(user.id);
        if (!result.success || !result.username || !result.temporaryPassword) {
            setCopyFeedback(result.message || "Failed to reset password");
            return;
        }
        setResetResult({ username: result.username, temporaryPassword: result.temporaryPassword });
        setCopyFeedback(null);
        setResetDialogOpen(false);
    };

    const copyToClipboard = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopyFeedback("Copied to clipboard");
            window.setTimeout(() => setCopyFeedback(null), 2000);
        } catch {
            setCopyFeedback("Copy failed");
            window.setTimeout(() => setCopyFeedback(null), 2000);
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{user ? "Edit User" : "Invite User"}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {copyFeedback && (
                        <Alert severity={copyFeedback === "Copied to clipboard" ? "success" : "info"}>
                            {copyFeedback}
                        </Alert>
                    )}

                    {resetResult && (
                        <Alert
                            severity="warning"
                            sx={{ '& .MuiAlert-message': { width: '100%' } }}
                        >
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Temporary password created
                            </Typography>
                            <Stack spacing={1}>
                                <TextField
                                    size="small"
                                    label="Username"
                                    value={resetResult.username}
                                    InputProps={{
                                        readOnly: true,
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    size="small"
                                                    aria-label="Copy username"
                                                    onClick={() => copyToClipboard(resetResult.username)}
                                                >
                                                    <ContentCopy fontSize="small" />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                <TextField
                                    size="small"
                                    label="Temporary Password"
                                    value={resetResult.temporaryPassword}
                                    InputProps={{
                                        readOnly: true,
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    size="small"
                                                    aria-label="Copy password"
                                                    onClick={() => copyToClipboard(resetResult.temporaryPassword)}
                                                >
                                                    <ContentCopy fontSize="small" />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                <Typography variant="body2" color="text.secondary">
                                    Share this password securely. The user should change it after signing in.
                                </Typography>
                            </Stack>
                        </Alert>
                    )}
                    <TextField
                        label="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                        fullWidth
                        required
                    />
                    <TextField
                        label="Initials"
                        value={initials}
                        onChange={(e) => setInitials(e.target.value.toUpperCase())}
                        fullWidth
                        helperText="Used in revision history (e.g. MTL, TE)"
                        inputProps={{ maxLength: 16 }}
                    />
                    <TextField
                        label="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        fullWidth
                        required
                        type="email"
                    />
                    <FormControl fullWidth size="small">
                        <InputLabel>Role</InputLabel>
                        <Select
                            value={role}
                            label="Role"
                            onChange={(e) => setRole(e.target.value as User["role"])}
                            renderValue={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                        >
                            {roleOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Chip
                                            size="small"
                                            label={option.label}
                                            sx={{ textTransform: "capitalize" }}
                                        />
                                        <Typography variant="body2" color="text.secondary">
                                            {option.description}
                                        </Typography>
                                    </Stack>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={status}
                            label="Status"
                            onChange={(e) => setStatus(e.target.value as User["status"])}
                        >
                            {statusOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Avatar URL (optional)"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        fullWidth
                        placeholder="https://"
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose}>Cancel</Button>
                {user && canManageUsers && (
                    <Button
                        variant="outlined"
                        color="warning"
                        startIcon={<LockReset />}
                        onClick={() => setResetDialogOpen(true)}
                    >
                        Reset Password
                    </Button>
                )}
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={!isValid}
                >
                    {user ? "Save Changes" : "Send Invite"}
                </Button>
            </DialogActions>
            </Dialog>

            <ConfirmDialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)} maxWidth="xs" fullWidth>
                <ConfirmDialogTitle>Reset password?</ConfirmDialogTitle>
                <ConfirmDialogContent>
                    <Typography variant="body2" color="text.secondary">
                        {user
                            ? `This generates a new temporary password for ${user.name}.`
                            : "This generates a new temporary password."}
                    </Typography>
                </ConfirmDialogContent>
                <ConfirmDialogActions>
                    <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="warning" onClick={handleResetPassword} disabled={!user || !canManageUsers}>
                        Reset
                    </Button>
                </ConfirmDialogActions>
            </ConfirmDialog>
        </>
    );
}
