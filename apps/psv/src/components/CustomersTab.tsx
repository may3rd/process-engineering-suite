"use client";

import { useEffect, useMemo, useState } from "react";
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
  Grid,
  Stack,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Business,
  Search,
  People,
  Factory,
} from "@mui/icons-material";
import { users } from "@/data/mockData";
import { Customer } from "@/data/types";
import { glassCardStyles } from "./styles";
import { DeleteConfirmDialog, TableSortButton, PaginationControls, ItemsPerPageSelector } from "./shared";
import { CustomerDialog } from "./dashboard/CustomerDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";
import { SortConfig, sortByGetter, toggleSortConfig } from "@/lib/sortUtils";
import { usePagination } from "@/hooks/usePagination";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export function CustomersTab() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const canEdit = useAuthStore((state) => state.canEdit());
  const canApprove = useAuthStore((state) => state.canApprove());
  const {
    addCustomer,
    updateCustomer,
    deleteCustomer,
    softDeleteCustomer,
    fetchAllPlants,
    arePlantsLoaded,
  } = usePsvStore();
  const plants = usePsvStore((state) => state.plants);
  const projects = usePsvStore((state) => state.projects);
  const customers = usePsvStore((state) => state.customers);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null,
  );
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  type SortKey = "code" | "owner" | "plants" | "status" | "created";
  const [sortConfig, setSortConfig] = useState<SortConfig<SortKey> | null>(
    null,
  );

  // Load plants if not already loaded (needed for plant count display)
  useEffect(() => {
    if (!arePlantsLoaded) {
      fetchAllPlants();
    }
  }, [arePlantsLoaded, fetchAllPlants]);

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

  const handleConfirmDelete = async () => {
    if (customerToDelete) {
      try {
        // Use soft delete (cascade deactivation)
        const result = await softDeleteCustomer(customerToDelete.id);
        setDeleteDialogOpen(false);
        setCustomerToDelete(null);
        // Success message is shown in the store action
      } catch (error) {
        // Error is shown in dialog via child count
        console.error(error);
      }
    }
  };

  const handleForceDelete = async () => {
    if (customerToDelete) {
      try {
        // Get child entities to delete
        const { plants, units, areas, projects, protectiveSystems, equipment,
          deleteEquipment, deleteProtectiveSystem, deleteProject, deleteArea,
          deleteUnit, deletePlant, deleteCustomer } = usePsvStore.getState();

        // Find all child entities to delete
        const plantsToDelete = plants.filter(p => p.customerId === customerToDelete.id);
        const plantIds = plantsToDelete.map(p => p.id);
        const unitsToDelete = units.filter(u => plantIds.includes(u.plantId));
        const unitIds = unitsToDelete.map(u => u.id);
        const areasToDelete = areas.filter(a => unitIds.includes(a.unitId));
        const areaIds = areasToDelete.map(a => a.id);
        const projectsToDelete = projects.filter(p => areaIds.includes(p.areaId));
        const psvsToDelete = protectiveSystems.filter(p => areaIds.includes(p.areaId));
        const equipmentToDeleteList = equipment.filter(e => areaIds.includes(e.areaId));

        // Delete all entities from bottom-up (children first)
        for (const e of equipmentToDeleteList) {
          await deleteEquipment(e.id);
        }
        for (const psv of psvsToDelete) {
          await deleteProtectiveSystem(psv.id);
        }
        for (const project of projectsToDelete) {
          await deleteProject(project.id);
        }
        for (const area of areasToDelete) {
          await deleteArea(area.id);
        }
        for (const unit of unitsToDelete) {
          await deleteUnit(unit.id);
        }
        for (const plant of plantsToDelete) {
          await deletePlant(plant.id);
        }

        // Finally delete the customer
        await deleteCustomer(customerToDelete.id);

        setDeleteDialogOpen(false);
        setCustomerToDelete(null);
        // Success toast is shown by deleteCustomer action
      } catch (error) {
        console.error('Force delete failed:', error);
      }
    }
  };

  const handleSave = (data: Partial<Omit<Customer, "id" | "createdAt" | "updatedAt">>) => {
    if (selectedCustomer) {
      updateCustomer(selectedCustomer.id, data);
    } else {
      addCustomer(data as Omit<Customer, "id" | "createdAt" | "updatedAt">);
    }
    setDialogOpen(false);
  };

  const handleToggleStatus = async (customer: Customer) => {
    if (!canEdit) return;
    const newStatus = customer.status === 'active' ? 'inactive' : 'active';

    if (newStatus === 'inactive') {
      // Cascade DOWN: deactivate customer and all children
      await softDeleteCustomer(customer.id);
    } else {
      // Just activate the customer (no cascade up needed for top-level)
      await updateCustomer(customer.id, { status: 'active' });
    }
  };

  // Count plants for each customer
  const getPlantCount = (customerId: string) => {
    const plants = usePsvStore.getState().plants;
    return plants.filter((p) => p.customerId === customerId).length;
  };

  // Filter customers based on search text and status
  const filteredCustomers = customers.filter((customer) => {
    // Status filter
    if (statusFilter !== 'all' && customer.status !== statusFilter) return false;

    // Search filter
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    const owner = users.find((u) => u.id === customer.ownerId);
    return (
      customer.code.toLowerCase().includes(search) ||
      customer.name.toLowerCase().includes(search) ||
      owner?.name.toLowerCase().includes(search)
    );
  });

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => toggleSortConfig(prev, key));
  };

  const getSortValue = (customer: Customer, key: SortKey): string | number => {
    switch (key) {
      case "code":
        return customer.code.toLowerCase();
      case "owner": {
        const owner = users.find((u) => u.id === customer.ownerId);
        return (owner?.name || "").toLowerCase();
      }
      case "plants":
        return getPlantCount(customer.id);
      case "status":
        return customer.status;
      case "created":
        return new Date(customer.createdAt).getTime();
      default:
        return "";
    }
  };

  const sortedCustomers = useMemo(
    () => sortByGetter(filteredCustomers, sortConfig, getSortValue),
    [filteredCustomers, sortConfig],
  );

  // Pagination
  const [itemsPerPage, setItemsPerPage] = useLocalStorage('dashboard_items_per_page', 15);
  const pagination = usePagination(sortedCustomers, {
    totalItems: sortedCustomers.length,
    itemsPerPage: itemsPerPage,
  });

  const renderHeader = (label: string, key: SortKey) => (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      {label}
      <TableSortButton
        label={label}
        active={sortConfig?.key === key}
        direction={sortConfig?.direction ?? "asc"}
        onClick={() => handleSort(key)}
      />
    </Box>
  );

  const summaryCards = useMemo(() => {
    const activeCustomers = customers.filter(
      (customer) => customer.status === "active",
    ).length;
    const inactiveCustomers = customers.filter(
      (customer) => customer.status === "inactive",
    ).length;
    return [
      {
        label: "Customers",
        value: customers.length,
        helper: "Across all markets",
        icon: <Business color="primary" />,
      },
      {
        label: "Active Accounts",
        value: activeCustomers,
        helper: "Licensed clients",
        icon: <People color="success" />,
      },
      {
        label: "Plants",
        value: plants.length,
        helper: `${projects.length} projects underway`,
        icon: <Factory color="secondary" />,
      },
    ];
  }, [customers, plants.length, projects.length]);

  const activeCustomers = customers.filter(
    (customer) => customer.status === "active",
  ).length;
  const inactiveCustomers = customers.filter(
    (customer) => customer.status === "inactive",
  ).length;

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
          <Business color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h5" fontWeight={600}>
            Customers
          </Typography>
        </Box>
        {canEdit && (
          <>
            {/* Desktop: Full button with text */}
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAdd}
              sx={{ display: { xs: "none", sm: "flex" } }}
            >
              Add New Customer
            </Button>
            {/* Mobile: Icon only */}
            <Tooltip title="Add New Customer">
              <IconButton
                onClick={handleAdd}
                sx={{
                  display: { xs: "flex", sm: "none" },
                  bgcolor: "primary.main",
                  color: "white",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                <Add />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: 3 }}>
        {summaryCards.map((card) => (
          <Grid size={{ xs: 4, md: 4 }} key={card.label}>
            <Paper
              sx={{
                ...glassCardStyles,
                p: { xs: 1.5, sm: 2 },
                display: "flex",
                flexDirection: "column",
                gap: { xs: 0.25, sm: 0.5 },
                minHeight: { xs: "auto", sm: 100 },
              }}
            >
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box
                  sx={{
                    "& .MuiSvgIcon-root": {
                      fontSize: { xs: "1rem", sm: "1.25rem" },
                    },
                  }}
                >
                  {card.icon}
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: { xs: "0.7rem", sm: "0.875rem" },
                    lineHeight: 1.2,
                  }}
                >
                  {card.label}
                </Typography>
              </Stack>
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{
                  fontSize: { xs: "1.5rem", sm: "2rem" },
                  lineHeight: 1,
                }}
              >
                {card.value}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: { xs: "0.65rem", sm: "0.75rem" },
                  display: { xs: "none", sm: "block" },
                }}
              >
                {card.helper}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Search Bar */}
      <Paper sx={{ ...glassCardStyles, p: 2, mb: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <TextField
            placeholder="Search by code, name, or owner..."
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
          {/* Status Filter */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              displayEmpty
            >
              <MenuItem value="all">All ({customers.length})</MenuItem>
              <MenuItem value="active">Active ({activeCustomers})</MenuItem>
              <MenuItem value="inactive">Inactive ({inactiveCustomers})</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Mobile Card View */}
      {isMobile ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {pagination.pageItems.map((customer) => {
            const owner = users.find((u) => u.id === customer.ownerId);
            const plantCount = getPlantCount(customer.id);

            return (
              <Card key={customer.id} sx={{
                ...glassCardStyles,
                opacity: customer.status === 'inactive' ? 0.6 : 1,
              }}>
                <CardContent sx={{ pb: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      mb: 1,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
                      <Typography
                        variant="h6"
                        fontWeight={600}
                        sx={{ fontSize: "1.1rem" }}
                      >
                        {customer.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {customer.code}
                      </Typography>
                    </Box>
                    <Chip
                      label={customer.status}
                      size="small"
                      color={
                        customer.status === "active" ? "success" : "default"
                      }
                      variant={customer.status === 'active' ? 'filled' : 'outlined'}
                      onClick={() => handleToggleStatus(customer)}
                      sx={{
                        textTransform: 'capitalize',
                        cursor: canEdit ? 'pointer' : 'default',
                        '&:hover': canEdit ? { opacity: 0.8 } : {},
                      }}
                    />
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 2,
                      mt: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        Owner
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {owner?.name || "N/A"}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        Plants
                      </Typography>
                      <Chip
                        label={`${plantCount} Plant${plantCount !== 1 ? "s" : ""}`}
                        size="small"
                        color={plantCount > 0 ? "primary" : "default"}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        Created
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
                {canEdit && (
                  <CardActions
                    sx={{ justifyContent: "flex-end", pt: 0, px: 2, pb: 1.5 }}
                  >
                    <Tooltip title="Edit">
                      <IconButton
                        size="medium"
                        onClick={() => handleEdit(customer)}
                        sx={{ color: "primary.main" }}
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


          {pagination.pageItems.length === 0 && (
            <Paper sx={{ ...glassCardStyles, p: 4, textAlign: "center" }}>
              <Typography color="text.secondary">
                {searchText
                  ? "No customers match your search."
                  : 'No customers found. Click "Add Customer" to create one.'}
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
                  <TableCell>{renderHeader("Code", "code")}</TableCell>
                  <TableCell>{renderHeader("Owner", "owner")}</TableCell>
                  <TableCell>{renderHeader("Plants", "plants")}</TableCell>
                  <TableCell>{renderHeader("Status", "status")}</TableCell>
                  <TableCell>{renderHeader("Created", "created")}</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagination.pageItems.map((customer) => {
                  const owner = users.find((u) => u.id === customer.ownerId);
                  const plantCount = getPlantCount(customer.id);

                  return (
                    <TableRow
                      key={customer.id}
                      hover
                      sx={{
                        opacity: customer.status === 'inactive' ? 0.5 : 1,
                        bgcolor: customer.status === 'inactive' ? 'action.disabledBackground' : 'transparent',
                        "&:last-child td": {
                          borderBottom: 0,
                        },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {customer.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {customer.code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {owner?.name || "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${plantCount} plant${plantCount !== 1 ? "s" : ""}`}
                          size="small"
                          color={plantCount > 0 ? "primary" : "default"}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={customer.status}
                          size="small"
                          color={customer.status === 'active' ? 'success' : 'default'}
                          variant={customer.status === 'active' ? 'filled' : 'outlined'}
                          onClick={() => handleToggleStatus(customer)}
                          sx={{
                            textTransform: 'capitalize',
                            cursor: canEdit ? 'pointer' : 'default',
                            '&:hover': canEdit ? { opacity: 0.8 } : {},
                          }}
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
                {pagination.pageItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {searchText
                          ? "No customers match your search."
                          : 'No customers found. Click "Add Customer" to create one.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>


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
          allowForceDelete={canApprove} // Only admins can force delete
          title="Delete Customer"
          itemName={customerToDelete.name}
          children={[
            { label: "Plant", count: getPlantCount(customerToDelete.id) },
          ]}
        />
      )}
    </Box>
  );
}
