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
  Shield,
  Search,
  Bolt,
  AssignmentTurnedIn,
  Block,
  CheckCircle,
} from "@mui/icons-material";
import { areas, units, users } from "@/data/mockData";
import { ProtectiveSystem } from "@/data/types";
import { glassCardStyles } from "./styles";
import {
  DeleteConfirmDialog,
  TableSortButton,
  PaginationControls,
  ItemsPerPageSelector,
} from "./shared";
import { PSVDialog } from "./dashboard/PSVDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";
import { SortConfig, sortByGetter, toggleSortConfig } from "@/lib/sortUtils";
import {
  getWorkflowStatusColor,
  getWorkflowStatusLabel,
} from "@/lib/statusColors";
import { useProjectUnitSystem } from "@/lib/useProjectUnitSystem";
import { formatPressureGauge } from "@/lib/projectUnits";
import { usePagination } from "@/hooks/usePagination";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export function PSVsTab() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const canEdit = useAuthStore((state) => state.canEdit());
  const canApprove = useAuthStore((state) => state.canApprove());
  const { unitSystem } = useProjectUnitSystem();
  const selectedArea = usePsvStore((state) => state.selectedArea);
  const {
    addProtectiveSystem,
    updateProtectiveSystem,
    deleteProtectiveSystem,
    softDeleteProtectiveSystem,
    fetchAllProtectiveSystems,
    arePsvsLoaded,
  } = usePsvStore();
  const protectiveSystems = usePsvStore((state) => state.protectiveSystems);
  const [isLoadingInit, setIsLoadingInit] = useState(false);

  useEffect(() => {
    if (!arePsvsLoaded) {
      setIsLoadingInit(true);
      fetchAllProtectiveSystems().finally(() => setIsLoadingInit(false));
    }
  }, [arePsvsLoaded, fetchAllProtectiveSystems]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPSV, setSelectedPSV] = useState<ProtectiveSystem | null>(null);
  const [psvToDelete, setPsvToDelete] = useState<ProtectiveSystem | null>(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const canAddPsv = canEdit && selectedArea?.status !== "inactive";
  type SortKey =
    | "tag"
    | "area"
    | "serviceFluid"
    | "setPressure"
    | "status"
    | "owner"
    | "isActive";
  const [sortConfig, setSortConfig] = useState<SortConfig<SortKey> | null>(
    null,
  );

  const handleAdd = () => {
    if (!canAddPsv) return;
    setSelectedPSV(null);
    setDialogOpen(true);
  };

  const handleEdit = (psv: ProtectiveSystem) => {
    if (!psv.isActive) return;
    setSelectedPSV(psv);
    setDialogOpen(true);
  };

  const handleDelete = (psv: ProtectiveSystem) => {
    setPsvToDelete(psv);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (psvToDelete) {
      try {
        await softDeleteProtectiveSystem(psvToDelete.id);
        setDeleteDialogOpen(false);
        setPsvToDelete(null);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleToggleStatus = async (psv: ProtectiveSystem) => {
    if (!canEdit) return;
    const newStatus = !psv.isActive;
    await updateProtectiveSystem(psv.id, { isActive: newStatus });

    // Cascade UP: if activating, also activate parent Area, Unit, Plant, Customer
    if (newStatus) {
      const {
        areas,
        units,
        plants,
        customers,
        updateArea,
        updateUnit,
        updatePlant,
        updateCustomer,
      } = usePsvStore.getState();
      const area = areas.find((a) => a.id === psv.areaId);
      if (area && area.status === "inactive") {
        await updateArea(area.id, { status: "active" });
        const unit = units.find((u) => u.id === area.unitId);
        if (unit && unit.status === "inactive") {
          await updateUnit(unit.id, { status: "active" });
          const plant = plants.find((p) => p.id === unit.plantId);
          if (plant && plant.status === "inactive") {
            await updatePlant(plant.id, { status: "active" });
            const customer = customers.find((c) => c.id === plant.customerId);
            if (customer && customer.status === "inactive") {
              await updateCustomer(customer.id, { status: "active" });
            }
          }
        }
      }
    }
  };

  const handleForceDelete = () => {
    if (psvToDelete) {
      console.log("Force delete PSV:", psvToDelete.id);
      setDeleteDialogOpen(false);
      setPsvToDelete(null);
    }
  };

  const handleSave = (
    data: Partial<Omit<ProtectiveSystem, "id" | "createdAt" | "updatedAt">>,
  ) => {
    console.log("PSVsTab handleSave called with data:", data);
    console.log("selectedPSV:", selectedPSV);

    if (selectedPSV) {
      // For updates, only send the fields that changed
      console.log(
        "Calling updateProtectiveSystem with id:",
        selectedPSV.id,
        "and data:",
        data,
      );
      updateProtectiveSystem(selectedPSV.id, data);
    } else {
      // For new PSVs, provide defaults for optional fields not in the dialog
      addProtectiveSystem({
        ...data,
        currentRevisionId: undefined,
        valveType: undefined,
        inletNetwork: undefined,
        outletNetwork: undefined,
      } as Omit<ProtectiveSystem, "id" | "createdAt" | "updatedAt">);
    }
    setDialogOpen(false);
  };

  // Filter PSVs based on search text and status
  const filteredPSVs = protectiveSystems.filter((psv) => {
    // Status filter
    if (statusFilter === "active" && !psv.isActive) return false;
    if (statusFilter === "inactive" && psv.isActive) return false;

    if (!searchText) return true;
    const search = searchText.toLowerCase();
    const area = areas.find((a) => a.id === psv.areaId);
    const owner = users.find((u) => u.id === psv.ownerId);
    return (
      psv.tag.toLowerCase().includes(search) ||
      psv.name.toLowerCase().includes(search) ||
      psv.serviceFluid.toLowerCase().includes(search) ||
      area?.name.toLowerCase().includes(search) ||
      owner?.name.toLowerCase().includes(search)
    );
  });

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => toggleSortConfig(prev, key));
  };

  const getSortValue = (
    psv: ProtectiveSystem,
    key: SortKey,
  ): string | number => {
    switch (key) {
      case "tag":
        return psv.tag.toLowerCase();
      case "area": {
        const area = areas.find((a) => a.id === psv.areaId);
        return (area?.name || "").toLowerCase();
      }
      case "serviceFluid":
        return `${psv.serviceFluid} ${psv.fluidPhase}`.toLowerCase();
      case "setPressure":
        return psv.setPressure;
      case "status":
        return psv.status;
      case "owner": {
        const owner = users.find((u) => u.id === psv.ownerId);
        return (owner?.name || "").toLowerCase();
      }
      case "isActive":
        return psv.isActive ? 1 : 0;
      default:
        return "";
    }
  };

  const sortedPSVs = useMemo(
    () => sortByGetter(filteredPSVs, sortConfig, getSortValue),
    [filteredPSVs, sortConfig],
  );

  // Pagination
  const [itemsPerPage, setItemsPerPage] = useLocalStorage(
    "dashboard_items_per_page",
    15,
  );
  const pagination = usePagination(sortedPSVs, {
    totalItems: sortedPSVs.length,
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

  const getTypeLabel = (type: ProtectiveSystem["type"]) => {
    return type.toUpperCase().replace("_", " ");
  };

  const summaryCards = useMemo(() => {
    const draftCount = protectiveSystems.filter(
      (psv) => psv.status === "draft",
    ).length;
    const inReview = protectiveSystems.filter((psv) =>
      ["in_review", "checked"].includes(psv.status),
    ).length;
    return [
      {
        label: "Protective Systems",
        value: protectiveSystems.length,
        helper: "Across all areas",
        icon: <Shield color="primary" />,
      },
      {
        label: "Open Items",
        value: draftCount + inReview,
        helper: `${draftCount} drafts • ${inReview} in review`,
        icon: <Bolt color="warning" />,
      },
      {
        label: "Approved",
        value: protectiveSystems.filter((psv) => psv.status === "approved")
          .length,
        helper: "Ready for execution",
        icon: <AssignmentTurnedIn color="success" />,
      },
    ];
  }, [protectiveSystems]);

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
          <Shield color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h5" fontWeight={600}>
            PSVs & Protective Devices
          </Typography>
          {selectedArea?.status === "inactive" && (
            <Chip label="Inactive" size="small" variant="outlined" />
          )}
        </Box>
        {canEdit &&
          (isMobile ? (
            <Tooltip
              title={
                canAddPsv ? "Add New PSV" : "Activate area to add PSVs"
              }
            >
              <IconButton
                onClick={handleAdd}
                disabled={!canAddPsv}
                sx={{
                  bgcolor: canAddPsv
                    ? "primary.main"
                    : "action.disabledBackground",
                  color: canAddPsv ? "white" : "text.disabled",
                  "&:hover": canAddPsv ? { bgcolor: "primary.dark" } : {},
                }}
              >
                <Add />
              </IconButton>
            </Tooltip>
          ) : (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAdd}
              disabled={!canAddPsv}
            >
              Add New PSV
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
            placeholder="Search by tag, name, fluid, area, or owner..."
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
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "active" | "inactive")
              }
              displayEmpty
            >
              <MenuItem value="all">All ({protectiveSystems.length})</MenuItem>
              <MenuItem value="active">
                Active ({protectiveSystems.filter((p) => p.isActive).length})
              </MenuItem>
              <MenuItem value="inactive">
                Inactive ({protectiveSystems.filter((p) => !p.isActive).length})
              </MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Mobile Card View */}
      {isMobile ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {pagination.pageItems.map((psv) => {
            const area = areas.find((a) => a.id === psv.areaId);
            const unit = area ? units.find((u) => u.id === area.unitId) : null;
            const owner = users.find((u) => u.id === psv.ownerId);

            return (
              <Card
                key={psv.id}
                sx={{
                  ...glassCardStyles,
                  opacity: psv.isActive ? 1 : 0.55,
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  {/* Tag and Status */}
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
                        {psv.tag}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                      >
                        {psv.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getTypeLabel(psv.type)}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                        alignItems: "flex-end",
                      }}
                    >
                      <Chip
                        label={psv.isActive ? "Active" : "Inactive"}
                        size="small"
                        color={psv.isActive ? "success" : "warning"}
                        variant={psv.isActive ? "filled" : "outlined"}
                        onClick={() => handleToggleStatus(psv)}
                        sx={{
                          cursor: canEdit ? "pointer" : "default",
                          "&:hover": canEdit ? { opacity: 0.8 } : {},
                        }}
                      />
                      <Chip
                        label={getWorkflowStatusLabel(psv.status)}
                        size="small"
                        color={getWorkflowStatusColor(psv.status)}
                        sx={{ textTransform: "capitalize", flexShrink: 0 }}
                      />
                    </Box>
                  </Box>

                  {/* Details Grid */}
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
                        Set Pressure
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {formatPressureGauge(psv.setPressure, unitSystem, 1)}
                      </Typography>
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
                        Area
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {area?.name || "N/A"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {unit?.code || ""}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        Service Fluid
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {psv.serviceFluid}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {psv.fluidPhase.toUpperCase()}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
                {canEdit && (
                  <CardActions
                    sx={{ justifyContent: "flex-end", pt: 0, px: 2, pb: 1.5 }}
                  >
                    <Tooltip title={psv.isActive ? "Edit" : "Activate to edit"}>
                      <IconButton
                        size="medium"
                        onClick={() => handleEdit(psv)}
                        disabled={!psv.isActive}
                        sx={{ color: "primary.main" }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={psv.isActive ? "Deactivate" : "Activate"}>
                      <IconButton
                        size="medium"
                        color={psv.isActive ? "error" : "success"}
                        onClick={() => handleToggleStatus(psv)}
                      >
                        {psv.isActive ? <Delete fontSize="small" /> : <CheckCircle fontSize="small" />}
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
                  ? "No PSVs match your search."
                  : 'No PSVs found. Click "Add PSV" to create one.'}
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
                  <TableCell>{renderHeader("Tag", "tag")}</TableCell>
                  <TableCell>{renderHeader("Area", "area")}</TableCell>
                  <TableCell>
                    {renderHeader("Service Fluid", "serviceFluid")}
                  </TableCell>
                  <TableCell>
                    {renderHeader("Set Pressure", "setPressure")}
                  </TableCell>
                  <TableCell>{renderHeader("Status", "status")}</TableCell>
                  <TableCell>{renderHeader("Active", "isActive")}</TableCell>
                  <TableCell>{renderHeader("Owner", "owner")}</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagination.pageItems.map((psv) => {
                  const area = areas.find((a) => a.id === psv.areaId);
                  const unit = area
                    ? units.find((u) => u.id === area.unitId)
                    : null;
                  const owner = users.find((u) => u.id === psv.ownerId);

                  return (
                    <TableRow
                      key={psv.id}
                      hover
                      sx={{
                        opacity: psv.isActive ? 1 : 0.5,
                        "&:last-child td": {
                          borderBottom: 0,
                        },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {psv.tag}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {psv.name} • {getTypeLabel(psv.type)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {area?.name || "N/A"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {unit?.code || ""}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {psv.serviceFluid}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {psv.fluidPhase.toUpperCase()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatPressureGauge(psv.setPressure, unitSystem, 1)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getWorkflowStatusLabel(psv.status)}
                          size="small"
                          color={getWorkflowStatusColor(psv.status)}
                          sx={{ textTransform: "capitalize" }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={psv.isActive ? "Active" : "Inactive"}
                          size="small"
                          color={psv.isActive ? "success" : "warning"}
                          variant={psv.isActive ? "filled" : "outlined"}
                          onClick={() => handleToggleStatus(psv)}
                          sx={{
                            cursor: canEdit ? "pointer" : "default",
                            "&:hover": canEdit ? { opacity: 0.8 } : {},
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {owner?.name || "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {canEdit && (
                          <>
                            <Tooltip title={psv.isActive ? "Edit" : "Activate to edit"}>
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(psv)}
                                disabled={!psv.isActive}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={psv.isActive ? "Deactivate" : "Activate"}>
                              <IconButton
                                size="small"
                                color={psv.isActive ? "error" : "success"}
                                onClick={() => handleToggleStatus(psv)}
                              >
                                {psv.isActive ? <Delete fontSize="small" /> : <CheckCircle fontSize="small" />}
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
                          ? "No PSVs match your search."
                          : 'No PSVs found. Click "Add PSV" to create one.'}
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
        <PSVDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleSave}
          psv={selectedPSV}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {psvToDelete && (
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setPsvToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          onForceDelete={handleForceDelete}
          allowForceDelete={canApprove}
          title="Deactivate PSV?"
          itemName={psvToDelete.tag}
          showSoftDelete={true}
        />
      )}
    </Box>
  );
}
