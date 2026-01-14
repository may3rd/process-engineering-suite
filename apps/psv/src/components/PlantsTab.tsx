"use client";

import { useMemo, useState, useEffect } from "react";
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
  Apartment,
  Search,
  Leaderboard,
  Category,
} from "@mui/icons-material";
import { customers, users } from "@/data/mockData";
import { Plant } from "@/data/types";
import { glassCardStyles } from "./styles";
import {
  DeleteConfirmDialog,
  TableSortButton,
  PaginationControls,
  ItemsPerPageSelector,
} from "./shared";
import { PlantDialog } from "./dashboard/PlantDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";
import { SortConfig, sortByGetter, toggleSortConfig } from "@/lib/sortUtils";
import { usePagination } from "@/hooks/usePagination";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export function PlantsTab() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const canEdit = useAuthStore((state) => state.canEdit());
  const canApprove = useAuthStore((state) => state.canApprove());
  const {
    addPlant,
    updatePlant,
    deletePlant,
    softDeletePlant,
    fetchAllPlants,
    arePlantsLoaded,
    fetchAllUnits,
    areUnitsLoaded,
    fetchSummaryCounts,
    summaryCounts,
  } = usePsvStore();
  const selectedCustomer = usePsvStore((state) => state.selectedCustomer);

  const [isLoadingInit, setIsLoadingInit] = useState(false);

  useEffect(() => {
    if (!arePlantsLoaded) {
      setIsLoadingInit(true);
      fetchAllPlants().finally(() => setIsLoadingInit(false));
    }
  }, [arePlantsLoaded, fetchAllPlants]);

  // Load units if not already loaded (needed for unit count display)
  useEffect(() => {
    if (!areUnitsLoaded) {
      fetchAllUnits();
    }
  }, [areUnitsLoaded, fetchAllUnits]);

  // Load summary counts if not loaded
  useEffect(() => {
    fetchSummaryCounts();
  }, [fetchSummaryCounts]);

  const plants = usePsvStore((state) => state.plants);
  const units = usePsvStore((state) => state.units);
  const areas = usePsvStore((state) => state.areas);
  const projects = usePsvStore((state) => state.projects);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [plantToDelete, setPlantToDelete] = useState<Plant | null>(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  type SortKey = "code" | "customer" | "owner" | "units" | "status" | "created";
  const [sortConfig, setSortConfig] = useState<SortConfig<SortKey> | null>(
    null,
  );
  const isParentInactive = selectedCustomer?.status === "inactive";
  const canAddPlant = canEdit && !isParentInactive;

  const handleAdd = () => {
    if (isParentInactive) return;
    setSelectedPlant(null);
    setDialogOpen(true);
  };

  const handleEdit = (plant: Plant) => {
    if (plant.status !== "active") return;
    setSelectedPlant(plant);
    setDialogOpen(true);
  };

  const handleDelete = (plant: Plant) => {
    if (plant.status !== "active") return;
    setPlantToDelete(plant);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (plantToDelete) {
      try {
        // Use soft delete (cascade deactivation)
        const result = await softDeletePlant(plantToDelete.id);
        setDeleteDialogOpen(false);
        setPlantToDelete(null);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleForceDelete = async () => {
    if (plantToDelete) {
      try {
        const {
          units,
          areas,
          projects,
          protectiveSystems,
          equipment,
          deleteEquipment,
          deleteProtectiveSystem,
          deleteProject,
          deleteArea,
          deleteUnit,
          deletePlant,
        } = usePsvStore.getState();

        const unitsToDelete = units.filter(
          (u) => u.plantId === plantToDelete.id,
        );
        const unitIds = unitsToDelete.map((u) => u.id);
        const areasToDelete = areas.filter((a) => unitIds.includes(a.unitId));
        const areaIds = areasToDelete.map((a) => a.id);
        const projectsToDelete = projects.filter((p) =>
          areaIds.includes(p.areaId),
        );
        const psvsToDelete = protectiveSystems.filter((p) =>
          areaIds.includes(p.areaId),
        );
        const equipmentToDeleteList = equipment.filter((e) =>
          areaIds.includes(e.areaId),
        );

        for (const e of equipmentToDeleteList) await deleteEquipment(e.id);
        for (const psv of psvsToDelete) await deleteProtectiveSystem(psv.id);
        for (const project of projectsToDelete) await deleteProject(project.id);
        for (const area of areasToDelete) await deleteArea(area.id);
        for (const unit of unitsToDelete) await deleteUnit(unit.id);
        await deletePlant(plantToDelete.id);

        setDeleteDialogOpen(false);
        setPlantToDelete(null);
      } catch (error) {
        console.error("Force delete failed:", error);
      }
    }
  };

  const handleSave = (data: Omit<Plant, "id" | "createdAt">) => {
    if (selectedPlant) {
      updatePlant(selectedPlant.id, data);
    } else {
      addPlant(data);
    }
    setDialogOpen(false);
  };

  const handleToggleStatus = async (plant: Plant) => {
    if (!canEdit) return;
    const newStatus = plant.status === "active" ? "inactive" : "active";

    if (newStatus === "inactive") {
      // Cascade DOWN: deactivate plant and all children (Units, Areas, Equipment)
      await softDeletePlant(plant.id);
    } else {
      // Activate the plant
      await updatePlant(plant.id, { status: "active" });
      // Cascade UP: also activate parent Customer
      const { customers, updateCustomer } = usePsvStore.getState();
      const customer = customers.find((c) => c.id === plant.customerId);
      if (customer && customer.status === "inactive") {
        await updateCustomer(customer.id, { status: "active" });
      }
    }
  };

  const getUnitCount = (plantId: string) => {
    return units.filter((u) => u.plantId === plantId).length;
  };

  // Filter plants based on search text
  const filteredPlants = plants.filter((plant) => {
    // Status filter
    if (statusFilter !== "all" && plant.status !== statusFilter) return false;

    if (!searchText) return true;
    const search = searchText.toLowerCase();
    const customer = customers.find((c) => c.id === plant.customerId);
    const owner = users.find((u) => u.id === plant.ownerId);
    return (
      plant.code.toLowerCase().includes(search) ||
      plant.name.toLowerCase().includes(search) ||
      customer?.name.toLowerCase().includes(search) ||
      owner?.name.toLowerCase().includes(search)
    );
  });

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => toggleSortConfig(prev, key));
  };

  const headingTitle = selectedCustomer
    ? `${selectedCustomer.name} - Plants`
    : "Plants";

  const getSortValue = (plant: Plant, key: SortKey): string | number => {
    switch (key) {
      case "code":
        return plant.code.toLowerCase();
      case "customer": {
        const customer = customers.find((c) => c.id === plant.customerId);
        return (customer?.name || "").toLowerCase();
      }
      case "owner": {
        const owner = users.find((u) => u.id === plant.ownerId);
        return (owner?.name || "").toLowerCase();
      }
      case "units":
        return getUnitCount(plant.id);
      case "status":
        return plant.status;
      case "created":
        return new Date(plant.createdAt).getTime();
      default:
        return "";
    }
  };

  const sortedPlants = useMemo(
    () => sortByGetter(filteredPlants, sortConfig, getSortValue),
    [filteredPlants, sortConfig],
  );

  // Pagination
  const [itemsPerPage, setItemsPerPage] = useLocalStorage(
    "dashboard_items_per_page",
    15,
  );
  const pagination = usePagination(sortedPlants, {
    totalItems: sortedPlants.length,
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
    const activePlants = plants.filter(
      (plant) => plant.status === "active",
    ).length;
    // Use loaded entity counts since data is loaded in this tab
    const totalPlants = plants.length;
    const totalUnits = units.length;
    const totalAreas = summaryCounts?.areas ?? areas.length;
    const totalProjects = summaryCounts?.projects ?? projects.length;
    return [
      {
        label: "Plants",
        value: totalPlants,
        helper: "Across all customers",
        icon: <Apartment color="primary" />,
      },
      {
        label: "Active Sites",
        value: activePlants,
        helper: "Currently operating",
        icon: <Leaderboard color="success" />,
      },
      {
        label: "Units",
        value: totalUnits,
        helper: `${totalAreas} areas • ${totalProjects} projects`,
        icon: <Category color="secondary" />,
      },
    ];
  }, [summaryCounts, areas.length, plants, projects.length, units.length]);

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
          <Apartment color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h5" fontWeight={600}>
            {headingTitle}
          </Typography>
          {selectedCustomer?.status === "inactive" && (
            <Chip label="Inactive" size="small" variant="outlined" />
          )}
        </Box>
        {canEdit &&
          (isMobile ? (
            /* Mobile: Icon only */
            <Tooltip
              title={
                canAddPlant
                  ? "Add New Plant"
                  : "Activate customer to add plants"
              }
            >
              <IconButton
                onClick={handleAdd}
                disabled={!canAddPlant}
                sx={{
                  bgcolor: canAddPlant
                    ? "primary.main"
                    : "action.disabledBackground",
                  color: canAddPlant ? "white" : "text.disabled",
                  "&:hover": canAddPlant ? { bgcolor: "primary.dark" } : {},
                }}
              >
                <Add />
              </IconButton>
            </Tooltip>
          ) : (
            /* Desktop: Full button with text */
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAdd}
              disabled={!canAddPlant}
            >
              Add New Plant
            </Button>
          ))}
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
                sx={{ fontSize: { xs: "1.5rem", sm: "2rem" }, lineHeight: 1 }}
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
            placeholder="Search by code, name, customer, or owner..."
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
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "active" | "inactive")
              }
              displayEmpty
            >
              <MenuItem value="all">All ({plants.length})</MenuItem>
              <MenuItem value="active">
                Active ({plants.filter((e) => e.status === "active").length})
              </MenuItem>
              <MenuItem value="inactive">
                Inactive ({plants.filter((e) => e.status === "inactive").length}
                )
              </MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Mobile Card View */}
      {isMobile ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {pagination.pageItems.map((plant) => {
            const customer = customers.find((c) => c.id === plant.customerId);
            const owner = users.find((u) => u.id === plant.ownerId);
            const unitCount = getUnitCount(plant.id);

            return (
              <Card
                key={plant.id}
                sx={{
                  ...glassCardStyles,
                  opacity: plant.status === "inactive" ? 0.6 : 1,
                }}
              >
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
                        {plant.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {plant.code}
                      </Typography>
                    </Box>
                    <Chip
                      label={plant.status}
                      size="small"
                      color={plant.status === "active" ? "success" : "default"}
                      variant={
                        plant.status === "active" ? "filled" : "outlined"
                      }
                      onClick={() => handleToggleStatus(plant)}
                      sx={{
                        textTransform: "capitalize",
                        cursor: canEdit ? "pointer" : "default",
                        "&:hover": canEdit ? { opacity: 0.8 } : {},
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
                        Customer
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {customer?.name || "N/A"}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        Units
                      </Typography>
                      <Chip
                        label={`${unitCount} Unit${unitCount !== 1 ? "s" : ""}`}
                        size="small"
                        color={unitCount > 0 ? "primary" : "default"}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
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
                        Created
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {new Date(plant.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
                {canEdit && (
                  <CardActions
                    sx={{ justifyContent: "flex-end", pt: 0, px: 2, pb: 1.5 }}
                  >
                    <Tooltip
                      title={
                        plant.status === "active"
                          ? "Edit"
                          : "Activate to edit"
                      }
                    >
                      <IconButton
                        size="medium"
                        onClick={() => handleEdit(plant)}
                        disabled={plant.status !== "active"}
                        sx={{ color: "primary.main" }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip
                      title={
                        plant.status === "active"
                          ? "Deactivate"
                          : "Activate to edit"
                      }
                    >
                      <IconButton
                        size="medium"
                        color="error"
                        onClick={() => handleDelete(plant)}
                        disabled={plant.status !== "active"}
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
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              alignItems: "center",
            }}
          >
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
                  ? "No plants match your search."
                  : 'No plants found. Click "Add Plant" to create one.'}
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
                  <TableCell>{renderHeader("Customer", "customer")}</TableCell>
                  <TableCell>{renderHeader("Owner", "owner")}</TableCell>
                  <TableCell>{renderHeader("Units", "units")}</TableCell>
                  <TableCell>{renderHeader("Status", "status")}</TableCell>
                  <TableCell>{renderHeader("Created", "created")}</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagination.pageItems.map((plant) => {
                  const customer = customers.find(
                    (c) => c.id === plant.customerId,
                  );
                  const owner = users.find((u) => u.id === plant.ownerId);
                  const unitCount = getUnitCount(plant.id);

                  return (
                    <TableRow
                      key={plant.id}
                      hover
                      sx={{
                        opacity: plant.status === "inactive" ? 0.5 : 1,
                        bgcolor:
                          plant.status === "inactive"
                            ? "action.disabledBackground"
                            : "transparent",
                        "&:last-child td": {
                          borderBottom: 0,
                        },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {plant.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {plant.code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {customer?.name || "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {owner?.name || "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${unitCount} unit${unitCount !== 1 ? "s" : ""}`}
                          size="small"
                          color={unitCount > 0 ? "primary" : "default"}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={plant.status}
                          size="small"
                          color={
                            plant.status === "active" ? "success" : "default"
                          }
                          variant={
                            plant.status === "active" ? "filled" : "outlined"
                          }
                          onClick={() => handleToggleStatus(plant)}
                          sx={{
                            textTransform: "capitalize",
                            cursor: canEdit ? "pointer" : "default",
                            "&:hover": canEdit ? { opacity: 0.8 } : {},
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(plant.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {canEdit && (
                          <>
                            <Tooltip
                              title={
                                plant.status === "active"
                                  ? "Edit"
                                  : "Activate to edit"
                              }
                            >
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(plant)}
                                disabled={plant.status !== "active"}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip
                              title={
                                plant.status === "active"
                                  ? "Deactivate"
                                  : "Activate to edit"
                              }
                            >
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDelete(plant)}
                                disabled={plant.status !== "active"}
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
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {searchText
                          ? "No plants match your search."
                          : 'No plants found. Click "Add Plant" to create one.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination for desktop */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              pt: 2,
              px: 2,
            }}
          >
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
        <PlantDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleSave}
          plant={selectedPlant}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {plantToDelete && (
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setPlantToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          onForceDelete={handleForceDelete}
          allowForceDelete={canApprove}
          title="Delete Plant"
          itemName={plantToDelete.name}
          children={[{ label: "Unit", count: getUnitCount(plantToDelete.id) }]}
        />
      )}
    </Box>
  );
}
