"use client";

import { useState } from "react";
import {
    Box,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Chip,
    Typography,
    Tooltip,
    TextField,
    Card,
    CardContent,
    CardActions,
    useTheme,
    useMediaQuery,
} from "@mui/material";
import { Add, Edit, Delete, Business, Search } from "@mui/icons-material";
import { users } from "@/data/mockData";
import { Customer } from "@/data/types";
import { glassCardStyles } from "./styles";
import { DeleteConfirmDialog } from "./shared";
import { CustomerDialog } from "./dashboard/CustomerDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";

export function CustomersTab() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const canEdit = useAuthStore((state) => state.canEdit());
    const canApprove = useAuthStore((state) => state.canApprove());
    const { addCustomer, updateCustomer, deleteCustomer } = usePsvStore();
    const customers = usePsvStore((state) => state.customers);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const [searchText, setSearchText] = useState('');

    const handleAdd = () => {
        setSelectedCustomer(null);
        setDialogOpen(true);
    };

    const handleEdit = (customer: Customer) => {
        setSelectedCustomer(customer);
        setDialogOpen(true);
    };

    const handleDelete = (customer: Customer) => {
        setCustomerToDelete(customer);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (customerToDelete) {
            try {
                deleteCustomer(customerToDelete.id);
                setDeleteDialogOpen(false);
                setCustomerToDelete(null);
                // TODO: Show success message
            } catch (error) {
                // Error is shown in dialog via child count
                console.error(error);
            }
        }
    };

    const handleForceDelete = () => {
        if (customerToDelete) {
            // TODO: Implement cascade delete in store
            console.log('Force delete customer and all children:', customerToDelete.id);
            setDeleteDialogOpen(false);
            setCustomerToDelete(null);
            // TODO: Show success message
        }
    };

    const handleSave = (data: Omit<Customer, 'id' | 'createdAt'>) => {
        if (selectedCustomer) {
            updateCustomer(selectedCustomer.id, data);
        } else {
            addCustomer(data);
        }
        setDialogOpen(false);
    };

    // Count plants for each customer
    const getPlantCount = (customerId: string) => {
        return customers.filter(c => c.id === customerId).length;
    };

    // Filter customers based on search text
    const filteredCustomers = customers.filter(customer => {
        if (!searchText) return true;
        const search = searchText.toLowerCase();
        const owner = users.find(u => u.id === customer.ownerId);
        return (
            customer.code.toLowerCase().includes(search) ||
            customer.name.toLowerCase().includes(search) ||
            owner?.name.toLowerCase().includes(search)
        );
    });

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Business color="primary" sx={{ fontSize: 28 }} />
                    <Typography variant="h5" fontWeight={600}>
                        Customers
                    </Typography>
                </Box>
                {canEdit && (
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleAdd}
                    >
                        Add Customer
                    </Button>
                )}
            </Box>

            {/* Search Bar */}
            <TextField
                placeholder="Search by code, name, or owner..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
                InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
            />

            {/* Mobile Card View */}
            {isMobile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {filteredCustomers.map((customer) => {
                        const owner = users.find(u => u.id === customer.ownerId);
                        const plantCount = getPlantCount(customer.id);

                        return (
                            <Card key={customer.id} sx={{ ...glassCardStyles }}>
                                <CardContent sx={{ pb: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
                                            <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1.1rem' }}>
                                                {customer.code}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {customer.name}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={customer.status}
                                            size="small"
                                            color={customer.status === 'active' ? 'success' : 'default'}
                                            sx={{ textTransform: 'capitalize' }}
                                        />
                                    </Box>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Owner
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {owner?.name || 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Plants
                                            </Typography>
                                            <Chip
                                                label={`${plantCount} Plant${plantCount !== 1 ? 's' : ''}`}
                                                size="small"
                                                color={plantCount > 0 ? 'primary' : 'default'}
                                                sx={{ mt: 0.5 }}
                                            />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Created
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {new Date(customer.createdAt).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                                {canEdit && (
                                    <CardActions sx={{ justifyContent: 'flex-end', pt: 0, px: 2, pb: 1.5 }}>
                                        <Tooltip title="Edit">
                                            <IconButton
                                                size="medium"
                                                onClick={() => handleEdit(customer)}
                                                sx={{ color: 'primary.main' }}
                                            >
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                size="medium"
                                                color="error"
                                                onClick={() => handleDelete(customer)}
                                            >
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </CardActions>
                                )}
                            </Card>
                        );
                    })}
                    {filteredCustomers.length === 0 && (
                        <Paper sx={{ ...glassCardStyles, p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                {searchText ? 'No customers match your search.' : 'No customers found. Click "Add Customer" to create one.'}
                            </Typography>
                        </Paper>
                    )}
                </Box>
            ) : (
                /* Desktop Table View */
                <Paper sx={{ ...glassCardStyles, p: 0 }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Code</TableCell>
                                    <TableCell>Owner</TableCell>
                                    <TableCell>Plants</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredCustomers.map((customer) => {
                                    const owner = users.find(u => u.id === customer.ownerId);
                                    const plantCount = getPlantCount(customer.id);

                                    return (
                                        <TableRow
                                            key={customer.id}
                                            hover
                                            sx={{
                                                '&:last-child td': {
                                                    borderBottom: 0
                                                }
                                            }}
                                        >
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {customer.code}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {customer.name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {owner?.name || 'N/A'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={`${plantCount} plant${plantCount !== 1 ? 's' : ''}`}
                                                    size="small"
                                                    color={plantCount > 0 ? 'primary' : 'default'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={customer.status}
                                                    size="small"
                                                    color={customer.status === 'active' ? 'success' : 'default'}
                                                    sx={{ textTransform: 'capitalize' }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {new Date(customer.createdAt).toLocaleDateString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                {canEdit && (
                                                    <>
                                                        <Tooltip title="Edit">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleEdit(customer)}
                                                            >
                                                                <Edit fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleDelete(customer)}
                                                            >
                                                                <Delete fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {filteredCustomers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">
                                                {searchText ? 'No customers match your search.' : 'No customers found. Click "Add Customer" to create one.'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* Add/Edit Dialog */}
            {dialogOpen && (
                <CustomerDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    onSave={handleSave}
                    customer={selectedCustomer}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {customerToDelete && (
                <DeleteConfirmDialog
                    open={deleteDialogOpen}
                    onClose={() => {
                        setDeleteDialogOpen(false);
                        setCustomerToDelete(null);
                    }}
                    onConfirm={handleConfirmDelete}
                    onForceDelete={handleForceDelete}
                    allowForceDelete={canApprove}  // Only admins can force delete
                    title="Delete Customer"
                    itemName={customerToDelete.name}
                    children={[
                        { label: 'Plant', count: getPlantCount(customerToDelete.id) }
                    ]}
                />
            )}
        </Box>
    );
}
