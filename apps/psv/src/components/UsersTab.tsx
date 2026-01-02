"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Avatar,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    Chip,
    Divider,
    FormControl,
    Grid,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import {
    Add,
    Delete,
    Edit,
    People,
    Search,
    Shield,
    CheckCircle,
    Groups,
    Key,
    KeyOff,
} from "@mui/icons-material";
import { v4 as uuidv4 } from "uuid";

import { User } from "@/data/types";
import { users as mockUsers, credentials } from "@/data/mockData";
import { glassCardStyles } from "./styles";
import { DeleteConfirmDialog, TableSortButton, PaginationControls, ItemsPerPageSelector } from "./shared";
import { UserDialog } from "./dashboard/UserDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";
import { SortConfig, sortByGetter, toggleSortConfig } from "@/lib/sortUtils";
import { usePagination } from "@/hooks/usePagination";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const USERS_STORAGE_KEY = "psv_demo_users_v2";

type SortKey = "name" | "role" | "status" | "impact";

interface OwnershipCounts {
    customers: number;
    plants: number;
    units: number;
    projects: number;
    systems: number;
}

const emptyOwnership: OwnershipCounts = {
    customers: 0,
    plants: 0,
    units: 0,
    projects: 0,
    systems: 0,
};

const roleLabels: Record<User["role"], string> = {
    admin: "Admin",
    division_manager: "Division Manager",
    approver: "Approver",
    lead: "Lead",
    engineer: "Engineer",
    viewer: "Viewer",
};

const ROLE_COLORS_LIGHT: Record<User["role"], string> = {
    "admin": "#22c55e", // Green 500
    "division_manager": "#f97316",   // Orange 500
    "approver": "#ef4444", // Red 500
    "engineer": "#94a3b8", // Slate 400
    "lead": "#3b82f6", // Blue 500,
    "viewer": "#94a3b8", // Slate 400
};

const ROLE_COLORS_DARK: Record<User["role"], string> = {
    "admin": "#4ade80", // Green 400
    "division_manager": "#fb923c",   // Orange 400
    "approver": "#ef4444", // Red 400
    "engineer": "#64748b", // Slate 500
    "lead": "#60a5fa", // Blue 400
    "viewer": "#64748b", // Slate 500
};

export function UsersTab() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const canManageUsers = useAuthStore((state) => state.canManageUsers());
    const currentUser = useAuthStore((state) => state.currentUser);
    const { customers, plants, units, projects, protectiveSystems } = usePsvStore();

    const [userList, setUserList] = useState<User[]>(mockUsers);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [searchText, setSearchText] = useState("");
    const [roleFilter, setRoleFilter] = useState<"all" | User["role"]>("all");
    const [statusFilter, setStatusFilter] = useState<"all" | User["status"]>("all");
    const [sortConfig, setSortConfig] = useState<SortConfig<SortKey> | null>({
        key: "name",
        direction: "asc",
    });

    useEffect(() => {
        if (typeof window === "undefined") return;
        const stored = window.localStorage.getItem(USERS_STORAGE_KEY);
        if (stored) {
            try {
                setUserList(JSON.parse(stored));
                return;
            } catch (error) {
                console.warn("Failed to parse stored users", error);
            }
        }
        window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(mockUsers));
    }, []);

    const persistUsers = (next: User[]) => {
        setUserList(next);
        if (typeof window !== "undefined") {
            window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(next));
        }
    };

    const ownershipMap = useMemo(() => {
        const map = new Map<string, OwnershipCounts>();
        userList.forEach((user) => map.set(user.id, { ...emptyOwnership }));

        customers.forEach((customer) => {
            const entry = map.get(customer.ownerId);
            if (entry) entry.customers += 1;
        });
        plants.forEach((plant) => {
            const entry = map.get(plant.ownerId);
            if (entry) entry.plants += 1;
        });
        units.forEach((unit) => {
            const entry = map.get(unit.ownerId);
            if (entry) entry.units += 1;
        });
        projects.forEach((project) => {
            const entry = map.get(project.leadId);
            if (entry) entry.projects += 1;
        });
        protectiveSystems.forEach((psv) => {
            const entry = map.get(psv.ownerId);
            if (entry) entry.systems += 1;
        });

        return map;
    }, [customers, plants, units, projects, protectiveSystems, userList]);

    const getOwnership = (userId: string) => ownershipMap.get(userId) || emptyOwnership;

    const impactScore = (counts: OwnershipCounts) =>
        counts.customers * 5 +
        counts.plants * 4 +
        counts.units * 3 +
        counts.projects * 2 +
        counts.systems;

    const handleSort = (key: SortKey) => {
        setSortConfig((prev) => toggleSortConfig(prev, key));
    };

    const getSortValue = (user: User, key: SortKey): string | number => {
        switch (key) {
            case "role":
                return roleLabels[user.role];
            case "status":
                return user.status;
            case "impact":
                return impactScore(getOwnership(user.id));
            case "name":
            default:
                return user.name.toLowerCase();
        }
    };

    const hasCredentials = (userId: string) => {
        return credentials.some(cred => cred.userId === userId);
    };

    const getUsernameFromCredentials = (userId: string): string | undefined => {
        const cred = credentials.find(c => c.userId === userId);
        return cred?.username;
    };

    const filteredUsers = useMemo(() => {
        const search = searchText.toLowerCase();
        return userList.filter((user) => {
            const matchesSearch =
                !search ||
                user.name.toLowerCase().includes(search) ||
                user.email.toLowerCase().includes(search);
            const matchesRole = roleFilter === "all" || user.role === roleFilter;
            const matchesStatus = statusFilter === "all" || user.status === statusFilter;
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [searchText, userList, roleFilter, statusFilter]);

    const sortedUsers = useMemo(
        () => sortByGetter(filteredUsers, sortConfig, getSortValue),
        [filteredUsers, sortConfig]
    );

    // Pagination
    const [itemsPerPage, setItemsPerPage] = useLocalStorage('dashboard_items_per_page', 15);
    const pagination = usePagination(sortedUsers, {
        totalItems: sortedUsers.length,
        itemsPerPage: itemsPerPage,
    });

    const totalUsers = userList.length;
    const activeUsers = userList.filter((user) => user.status === "active").length;
    const keyRoleUsers = userList.filter((user) =>
        ["admin", "division_manager", "approver", "lead"].includes(user.role)
    ).length;

    const handleAdd = () => {
        setSelectedUser(null);
        setDialogOpen(true);
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setDialogOpen(true);
    };

    const handleSave = (values: Omit<User, "id">) => {
        if (selectedUser) {
            persistUsers(
                userList.map((user) =>
                    user.id === selectedUser.id ? { ...selectedUser, ...values } : user
                )
            );
        } else {
            const newUser: User = {
                id: uuidv4(),
                ...values,
            };
            persistUsers([newUser, ...userList]);
        }
        setDialogOpen(false);
    };

    const handleDelete = (user: User) => {
        setUserToDelete(user);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!userToDelete) return;
        persistUsers(
            userList.map((user) =>
                user.id === userToDelete.id ? { ...user, status: "inactive" } : user
            )
        );
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        toast.success(`User ${userToDelete.name} deactivated`);
    };

    const handleForceDelete = () => {
        if (!userToDelete) return;
        persistUsers(userList.filter((user) => user.id !== userToDelete.id));
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        toast.success(`User ${userToDelete.name} permanently removed`);
    };

    const handleToggleStatus = (userId: string) => {
        if (!canManageUsers) return;
        persistUsers(
            userList.map((user) =>
                user.id === userId
                    ? { ...user, status: user.status === "active" ? "inactive" : "active" }
                    : user
            )
        );
    };

    const cards = [
        {
            label: "Total Users",
            value: totalUsers,
            helper: "Across all workspaces",
            icon: <People color="primary" />,
        },
        {
            label: "Active Seats",
            value: activeUsers,
            helper:
                totalUsers > 0
                    ? `${Math.round((activeUsers / totalUsers) * 100)}% utilization`
                    : "No active licenses",
            icon: <CheckCircle color="success" />,
        },
        {
            label: "Critical Roles",
            value: keyRoleUsers,
            helper: "Admins, Approvers & Leads",
            icon: <Shield color="warning" />,
        },
    ];

    const childRelationships = (user: User) => {
        const counts = getOwnership(user.id);
        return [
            { label: "customer", count: counts.customers },
            { label: "plant", count: counts.plants },
            { label: "unit", count: counts.units },
            { label: "project", count: counts.projects },
            { label: "protective system", count: counts.systems },
        ];
    };

    // Check if current user can act on target user
    // Division managers cannot edit/delete admins
    const actionDisabled = (user: User) => {
        if (!canManageUsers) return true;
        if (currentUser?.id === user.id) return true;
        // Division manager cannot edit/delete admin
        if (currentUser?.role === 'division_manager' && user.role === 'admin') return true;
        return false;
    };

    return (
        <Box>
            {/* Header */}
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 3,
                    flexWrap: "wrap",
                    gap: 2,
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <People color="primary" sx={{ fontSize: 28 }} />
                    <Typography variant="h5" fontWeight={600}>
                        Users
                    </Typography>
                </Box>
                {canManageUsers && (
                    <>
                        {/* Desktop: Full button with text */}
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={handleAdd}
                            sx={{ display: { xs: 'none', sm: 'flex' } }}
                        >
                            Invite User
                        </Button>
                        {/* Mobile: Icon only */}
                        <Tooltip title="Invite User">
                            <IconButton
                                onClick={handleAdd}
                                sx={{
                                    display: { xs: 'flex', sm: 'none' },
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    '&:hover': { bgcolor: 'primary.dark' },
                                }}
                            >
                                <Add />
                            </IconButton>
                        </Tooltip>
                    </>
                )}
            </Box>

            {/* Overview Cards */}
            <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: 3 }}>
                {cards.map((card) => (
                    <Grid size={{ xs: 4, md: 4 }} key={card.label}>
                        <Paper
                            sx={{
                                ...glassCardStyles,
                                p: { xs: 1.5, sm: 2 },
                                display: "flex",
                                flexDirection: "column",
                                gap: { xs: 0.25, sm: 0.5 },
                                minHeight: { xs: 'auto', sm: 100 },
                            }}
                        >
                            <Stack direction="row" spacing={0.5} alignItems="center">
                                <Box sx={{ '& .MuiSvgIcon-root': { fontSize: { xs: '1rem', sm: '1.25rem' } } }}>
                                    {card.icon}
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' }, lineHeight: 1.2 }}>
                                    {card.label}
                                </Typography>
                            </Stack>
                            <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' }, lineHeight: 1 }}>
                                {card.value}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, display: { xs: 'none', sm: 'block' } }}>
                                {card.helper}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Filters */}
            <Paper
                sx={{
                    ...glassCardStyles,
                    p: 2,
                    mb: 3,
                }}
            >
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    alignItems={{ xs: "stretch", md: "center" }}
                >
                    <TextField
                        placeholder="Search by name or email..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        size="small"
                        fullWidth
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <Select
                            value={roleFilter}
                            onChange={(e) =>
                                setRoleFilter(e.target.value as "all" | User["role"])
                            }
                            displayEmpty
                        >
                            <MenuItem value="all">All Roles</MenuItem>
                            {Object.keys(roleLabels).map((role) => (
                                <MenuItem key={role} value={role}>
                                    {roleLabels[role as User["role"]]}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <Select
                            value={statusFilter}
                            onChange={(e) =>
                                setStatusFilter(e.target.value as "all" | User["status"])
                            }
                            displayEmpty
                        >
                            <MenuItem value="all">All Statuses</MenuItem>
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </Paper>

            {/* Table View */}
            <TableContainer
                component={Paper}
                sx={{
                    ...glassCardStyles,
                    display: { xs: "none", md: "block" },
                }}
            >
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                    User
                                    <TableSortButton
                                        label="User"
                                        active={sortConfig?.key === "name"}
                                        direction={sortConfig?.direction ?? "asc"}
                                        onClick={() => handleSort("name")}
                                    />
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                    Role
                                    <TableSortButton
                                        label="Role"
                                        active={sortConfig?.key === "role"}
                                        direction={sortConfig?.direction ?? "asc"}
                                        onClick={() => handleSort("role")}
                                    />
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                    Status
                                    <TableSortButton
                                        label="Status"
                                        active={sortConfig?.key === "status"}
                                        direction={sortConfig?.direction ?? "asc"}
                                        onClick={() => handleSort("status")}
                                    />
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                    Impact
                                    <TableSortButton
                                        label="Impact"
                                        active={sortConfig?.key === "impact"}
                                        direction={sortConfig?.direction ?? "asc"}
                                        onClick={() => handleSort("impact")}
                                    />
                                </Box>
                            </TableCell>
                            {canManageUsers && <TableCell align="right">Actions</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {pagination.pageItems.map((user) => {
                            const counts = getOwnership(user.id);

                            return (
                                <TableRow key={user.id} hover>
                                    <TableCell>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Avatar src={user.avatarUrl}>
                                                {user.name.charAt(0)}
                                            </Avatar>
                                            <Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Typography fontWeight={600}>
                                                        {user.name} {(user.username || getUsernameFromCredentials(user.id)) && `(${user.username || getUsernameFromCredentials(user.id)})`}
                                                    </Typography>
                                                    {hasCredentials(user.id) ? (
                                                        <Tooltip title="Password set">
                                                            <Key fontSize="small" sx={{ color: 'success.main' }} />
                                                        </Tooltip>
                                                    ) : (
                                                        <Tooltip title="Password not set">
                                                            <KeyOff fontSize="small" sx={{ color: 'text.disabled' }} />
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                >
                                                    {user.email}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={roleLabels[user.role]}
                                            size="small"
                                            variant={
                                                user.role === "viewer" ? "outlined" : "filled"
                                            }
                                            sx={{
                                                textTransform: "capitalize",
                                                backgroundColor: theme.palette.mode === "dark"
                                                    ? ROLE_COLORS_DARK[user.role]
                                                    : ROLE_COLORS_LIGHT[user.role],
                                                color: theme.palette.mode === "dark" ? "#000" : "#fff",
                                                ...(user.role === "viewer" && {
                                                    backgroundColor: "transparent",
                                                    borderColor: theme.palette.mode === "dark"
                                                        ? ROLE_COLORS_DARK[user.role]
                                                        : ROLE_COLORS_LIGHT[user.role],
                                                    color: theme.palette.mode === "dark"
                                                        ? ROLE_COLORS_DARK[user.role]
                                                        : ROLE_COLORS_LIGHT[user.role],
                                                }),
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={user.status}
                                            size="small"
                                            color={user.status === "active" ? "success" : "default"}
                                            variant={
                                                user.status === "active" ? "filled" : "outlined"
                                            }
                                            onClick={
                                                actionDisabled(user)
                                                    ? undefined
                                                    : () => handleToggleStatus(user.id)
                                            }
                                            sx={{
                                                textTransform: "capitalize",
                                                cursor: actionDisabled(user)
                                                    ? "default"
                                                    : "pointer",
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                            {counts.customers > 0 && (
                                                <Chip
                                                    size="small"
                                                    label={`${counts.customers} Cust`}
                                                />
                                            )}
                                            {counts.plants > 0 && (
                                                <Chip size="small" label={`${counts.plants} Plants`} />
                                            )}
                                            {counts.units > 0 && (
                                                <Chip size="small" label={`${counts.units} Units`} />
                                            )}
                                            {counts.projects > 0 && (
                                                <Chip
                                                    size="small"
                                                    label={`${counts.projects} Projects`}
                                                />
                                            )}
                                            {counts.systems > 0 && (
                                                <Chip size="small" label={`${counts.systems} PSVs`} />
                                            )}
                                            {impactScore(counts) === 0 && (
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                >
                                                    —
                                                </Typography>
                                            )}
                                        </Stack>
                                    </TableCell>
                                    {canManageUsers && (
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <Tooltip title="Edit">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleEdit(user)}
                                                            disabled={actionDisabled(user)}
                                                        >
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDelete(user)}
                                                            disabled={
                                                                actionDisabled(user) ||
                                                                impactScore(getOwnership(user.id)) > 0
                                                            }
                                                        >
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                        {pagination.pageItems.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={canManageUsers ? 5 : 4}>
                                    <Box
                                        sx={{
                                            py: 6,
                                            textAlign: "center",
                                            color: "text.secondary",
                                        }}
                                    >
                                        <Groups sx={{ fontSize: 48, mb: 1, color: "divider" }} />
                                        <Typography variant="subtitle1" fontWeight={600}>
                                            No users match your filters
                                        </Typography>
                                        <Typography variant="body2">
                                            Adjust the filters or invite a new teammate.
                                        </Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* Pagination for mobile */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
                    <ItemsPerPageSelector
                        value={itemsPerPage}
                        onChange={setItemsPerPage}
                    />
                    <PaginationControls
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        pageNumbers={pagination.pageNumbers}
                        onPageChange={pagination.goToPage}
                        hasNextPage={pagination.hasNextPage}
                        hasPrevPage={pagination.hasPrevPage}
                    />
                </Box>
            </TableContainer>

            {/* Mobile Cards */}
            <Stack spacing={2} sx={{ display: { xs: "flex", md: "none" } }}>
                {pagination.pageItems.map((user) => {
                    const counts = getOwnership(user.id);
                    return (
                        <Card key={user.id} sx={glassCardStyles}>
                            <CardContent>
                                <Stack direction="row" spacing={2}>
                                    <Avatar src={user.avatarUrl} sx={{ width: 48, height: 48 }}>
                                        {user.name.charAt(0)}
                                    </Avatar>
                                    <Box flex={1}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Typography fontWeight={600}>
                                                {user.name} {(user.username || getUsernameFromCredentials(user.id)) && `(${user.username || getUsernameFromCredentials(user.id)})`}
                                            </Typography>
                                            {hasCredentials(user.id) ? (
                                                <Tooltip title="Password set">
                                                    <Key fontSize="small" sx={{ color: 'success.main' }} />
                                                </Tooltip>
                                            ) : (
                                                <Tooltip title="Password not set">
                                                    <KeyOff fontSize="small" sx={{ color: 'text.disabled' }} />
                                                </Tooltip>
                                            )}
                                        </Box>
                                        <Typography variant="body2" color="text.secondary">
                                            {user.email}
                                        </Typography>
                                        <Stack direction="row" spacing={1} mt={1}>
                                            <Chip
                                                size="small"
                                                label={roleLabels[user.role]}
                                                variant={
                                                    user.role === "viewer" ? "outlined" : "filled"
                                                }
                                                sx={{
                                                    textTransform: "capitalize",
                                                    backgroundColor: theme.palette.mode === "dark"
                                                        ? ROLE_COLORS_DARK[user.role]
                                                        : ROLE_COLORS_LIGHT[user.role],
                                                    color: theme.palette.mode === "dark" ? "#000" : "#fff",
                                                    ...(user.role === "viewer" && {
                                                        backgroundColor: "transparent",
                                                        color: theme.palette.mode === "dark"
                                                            ? ROLE_COLORS_DARK[user.role]
                                                            : ROLE_COLORS_LIGHT[user.role],
                                                    }),
                                                }}
                                            />
                                            <Chip
                                                size="small"
                                                label={user.status}
                                                color={
                                                    user.status === "active" ? "success" : "default"
                                                }
                                                onClick={
                                                    actionDisabled(user)
                                                        ? undefined
                                                        : () => handleToggleStatus(user.id)
                                                }
                                            />
                                        </Stack>
                                        <Divider sx={{ my: 1 }} />
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                            {counts.customers > 0 && (
                                                <Chip
                                                    size="small"
                                                    label={`${counts.customers} Customers`}
                                                />
                                            )}
                                            {counts.plants > 0 && (
                                                <Chip size="small" label={`${counts.plants} Plants`} />
                                            )}
                                            {counts.units > 0 && (
                                                <Chip size="small" label={`${counts.units} Units`} />
                                            )}
                                            {counts.projects > 0 && (
                                                <Chip
                                                    size="small"
                                                    label={`${counts.projects} Projects`}
                                                />
                                            )}
                                            {counts.systems > 0 && (
                                                <Chip size="small" label={`${counts.systems} PSVs`} />
                                            )}
                                            {impactScore(counts) === 0 && (
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                >
                                                    No ownership assignments
                                                </Typography>
                                            )}
                                        </Stack>
                                    </Box>
                                </Stack>
                            </CardContent>
                            {canManageUsers && (
                                <CardActions sx={{ justifyContent: "flex-end" }}>
                                    <Button
                                        startIcon={<Edit />}
                                        onClick={() => handleEdit(user)}
                                        disabled={actionDisabled(user)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        startIcon={<Delete />}
                                        color="error"
                                        onClick={() => handleDelete(user)}
                                        disabled={
                                            actionDisabled(user) ||
                                            impactScore(getOwnership(user.id)) > 0
                                        }
                                    >
                                        Remove
                                    </Button>
                                </CardActions>
                            )}
                        </Card>
                    );
                })}

                {/* Pagination for desktop */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 2, px: 2 }}>
                    <ItemsPerPageSelector
                        value={itemsPerPage}
                        onChange={setItemsPerPage}
                    />
                    <PaginationControls
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        pageNumbers={pagination.pageNumbers}
                        onPageChange={pagination.goToPage}
                        hasNextPage={pagination.hasNextPage}
                        hasPrevPage={pagination.hasPrevPage}
                    />
                </Box>
            </Stack>

            <UserDialog
                open={dialogOpen}
                user={selectedUser}
                onSave={handleSave}
                onClose={() => setDialogOpen(false)}
            />

            <DeleteConfirmDialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                onForceDelete={handleForceDelete}
                allowForceDelete={canManageUsers}
                showSoftDelete={userToDelete?.status === "active"}
                title={userToDelete?.status === "active" ? "Deactivate User" : "Permanently Remove User"}
                itemName={userToDelete?.name || "user"}
                children={userToDelete ? childRelationships(userToDelete) : []}
            />
        </Box>
    );
}
