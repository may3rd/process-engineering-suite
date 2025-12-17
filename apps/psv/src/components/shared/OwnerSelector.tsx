"use client";

import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Avatar,
    ListItemAvatar,
    ListItemText,
    Chip,
    FormHelperText,
} from "@mui/material";
import { users } from "@/data/mockData";
import { User } from "@/data/types";

interface OwnerSelectorProps {
    value: string | null;
    onChange: (userId: string | null) => void;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    filterRole?: User['role'][];
    error?: boolean;
    helperText?: string;
}

export function OwnerSelector({
    value,
    onChange,
    label = "Owner",
    required = false,
    disabled = false,
    filterRole,
    error = false,
    helperText,
}: OwnerSelectorProps) {
    // Show all users in dropdown for testing
    const filteredUsers = filterRole
        ? users.filter(u => filterRole.includes(u.role) && u.status === 'active')
        : users.filter(u => u.status === 'active');

    const selectedUser = value ? users.find(u => u.id === value) : null;

    return (
        <FormControl fullWidth size="small" required={required} disabled={disabled} error={error}>
            <InputLabel>{label}</InputLabel>
            <Select
                value={value || ''}
                onChange={(e) => onChange(e.target.value || null)}
                label={label}
                renderValue={(selected) => {
                    if (!selected || !selectedUser) return '';
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar
                                sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
                                src={selectedUser.avatarUrl}
                            >
                                {selectedUser.name.charAt(0)}
                            </Avatar>
                            <span>{selectedUser.name}</span>
                            <Chip
                                label={selectedUser.role}
                                size="small"
                                sx={{ height: 20, fontSize: '0.7rem', textTransform: 'capitalize' }}
                            />
                        </div>
                    );
                }}
            >
                {filteredUsers.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                        <ListItemAvatar>
                            <Avatar
                                sx={{ width: 32, height: 32 }}
                                src={user.avatarUrl}
                            >
                                {user.name.charAt(0)}
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                            primary={user.name}
                            secondary={
                                <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                    {user.email}
                                    <Chip
                                        label={user.role}
                                        size="small"
                                        sx={{ height: 18, fontSize: '0.65rem', ml: 0.5, textTransform: 'capitalize' }}
                                    />
                                </span>
                            }
                            secondaryTypographyProps={{ component: 'div' }}
                        />
                    </MenuItem>
                ))}
            </Select>
            {helperText && <FormHelperText>{helperText}</FormHelperText>}
        </FormControl>
    );
}
