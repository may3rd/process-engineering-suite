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
  Badge,
  TextField,
  Card,
  CardContent,
  CardActions,
  useTheme,
  useMediaQuery,
  Grid,
  Stack,
  InputAdornment,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Map,
  Search,
  Inventory2,
  Build,
} from "@mui/icons-material";
import { Area } from "@/data/types";
import { glassCardStyles } from "./styles";
import { DeleteConfirmDialog, TableSortButton, PaginationControls, ItemsPerPageSelector } from "./shared";
import { AreaDialog } from "./dashboard/AreaDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";
import { SortConfig, sortByGetter, toggleSortConfig } from "@/lib/sortUtils";
import { usePagination } from "@/hooks/usePagination";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export function AreasTab() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const canEdit = useAuthStore((state) => state.canEdit());
  const canApprove = useAuthStore((state) => state.canApprove());
  const {
    addArea,
    updateArea,
    deleteArea,
    fetchAllAreas,
    areAreasLoaded,
    fetchAllProjects,
    areProjectsLoaded,
    fetchAllProtectiveSystems,
    arePsvsLoaded,
    fetchAllEquipment,
    areEquipmentLoaded,
    fetchSummaryCounts,
    summaryCounts,
  } = usePsvStore();
  const selectedUnit = usePsvStore((state) => state.selectedUnit);

  const [isLoadingInit, setIsLoadingInit] = useState(false);

  useEffect(() => {
    if (!areAreasLoaded) {
      setIsLoadingInit(true);
      fetchAllAreas().finally(() => setIsLoadingInit(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areAreasLoaded]);

  // Load projects if not already loaded (needed for project count display)
  useEffect(() => {
    if (!areProjectsLoaded) {
      fetchAllProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areProjectsLoaded]);

  // Load PSVs if not already loaded (needed for PSV count display per area)
  useEffect(() => {
    if (!arePsvsLoaded) {
      fetchAllProtectiveSystems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arePsvsLoaded]);

  // Load equipment if not already loaded (needed for equipment count display)
  useEffect(() => {
    if (!areEquipmentLoaded) {
      fetchAllEquipment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areEquipmentLoaded]);

  // Load summary counts - only run once on mount
  useEffect(() => {
    fetchSummaryCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const areas = usePsvStore((state) => state.areas);
  const units = usePsvStore((state) => state.units);
  const projects = usePsvStore((state) => state.projects);
  const protectiveSystems = usePsvStore((state) => state.protectiveSystems);
  const equipment = usePsvStore((state) => state.equipment);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [areaToDelete, setAreaToDelete] = useState<Area | null>(null);
  const [searchText, setSearchText] = useState("");
  type SortKey =
    | "code"
    | "unit"
    | "psvs"
    | "equipment"
    | "projects"
    | "status"
    | "created";
  const [sortConfig, setSortConfig] = useState<SortConfig<SortKey> | null>(
    null,
  );

  const handleAdd = () => {
    setSelectedArea(null);
    setDialogOpen(true);
  };

  const handleEdit = (area: Area) => {
    setSelectedArea(area);
    setDialogOpen(true);
  };

  const handleDelete = (area: Area) => {
    setAreaToDelete(area);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (areaToDelete) {
      try {
        deleteArea(areaToDelete.id);
        setDeleteDialogOpen(false);
        setAreaToDelete(null);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleForceDelete = () => {
    if (areaToDelete) {
      // Cascade delete: delete area and all projects, PSVs, equipment
      const areaId = areaToDelete.id;

      usePsvStore.setState((state) => ({
        equipment: state.equipment.filter((e) => e.areaId !== areaId),
        protectiveSystems: state.protectiveSystems.filter(
          (p) => p.areaId !== areaId,
        ),
        projects: state.projects.filter((p) => p.areaId !== areaId),
        areas: state.areas.filter((a) => a.id !== areaId),
      }));

      setDeleteDialogOpen(false);
      setAreaToDelete(null);
    }
  };

  const handleSave = (data: Omit<Area, "id" | "createdAt">) => {
    if (selectedArea) {
      updateArea(selectedArea.id, data);
    } else {
      addArea(data);
    }
    setDialogOpen(false);
  };

  const getAssetCounts = (areaId: string) => {
    return {
      projects: projects.filter((p) => p.areaId === areaId).length,
      psvs: protectiveSystems.filter((ps) => ps.areaId === areaId).length,
      equipment: equipment.filter((e) => e.areaId === areaId).length,
    };
  };

  // Filter areas based on search text
  const filteredAreas = areas.filter((area) => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    const unit = units.find((u) => u.id === area.unitId);
    return (
      area.code.toLowerCase().includes(search) ||
      area.name.toLowerCase().includes(search) ||
      unit?.name.toLowerCase().includes(search)
    );
  });

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => toggleSortConfig(prev, key));
  };

  const headingTitle = selectedUnit ? `${selectedUnit.name} - Areas` : "Areas";

  const getSortValue = (area: Area, key: SortKey): string | number => {
    const counts = getAssetCounts(area.id);
    switch (key) {
      case "code":
        return area.code.toLowerCase();
      case "unit": {
        const unit = units.find((u) => u.id === area.unitId);
        return (unit?.name || "").toLowerCase();
      }
      case "psvs":
        return counts.psvs;
      case "equipment":
        return counts.equipment;
      case "projects":
        return counts.projects;
      case "status":
        return area.status;
      case "created":
        return new Date(area.createdAt).getTime();
      default:
        return "";
    }
  };

  const sortedAreas = useMemo(
    () => sortByGetter(filteredAreas, sortConfig, getSortValue),
    [filteredAreas, sortConfig],
  );

  // Pagination
  const [itemsPerPage, setItemsPerPage] = useLocalStorage('dashboard_items_per_page', 15);
  const pagination = usePagination(sortedAreas, {
    totalItems: sortedAreas.length,
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
    // Use loaded entity counts since data is loaded in this tab
    const totalAreas = areas.length;
    const totalProjects = projects.length;
    const totalPsvs = protectiveSystems.length;
    const totalEquipment = summaryCounts?.equipment ?? equipment.length;
    return [
      {
        label: "Areas",
        value: totalAreas,
        helper: "Across all units",
        icon: <Map color="primary" />,
      },
      {
        label: "Projects",
        value: totalProjects,
        helper: "Active initiatives",
        icon: <Inventory2 color="secondary" />,
      },
      {
        label: "Assets",
        value: totalPsvs + totalEquipment,
        helper: "PSVs + equipment",
        icon: <Build color="warning" />,
      },
    ];
  }, [
    summaryCounts,
    areas.length,
    equipment.length,
    protectiveSystems.length,
    projects.length,
  ]);

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
          <Map color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h5" fontWeight={600}>
            {headingTitle}
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
              Add New Area
            </Button>
            {/* Mobile: Icon only */}
            <Tooltip title="Add New Area">
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
            placeholder="Search by code, name, or unit..."
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
        </Stack>
      </Paper>

      {/* Mobile Card View */}
      {isMobile ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {pagination.pageItems.map((area) => {
            const unit = units.find((u) => u.id === area.unitId);
            const counts = getAssetCounts(area.id);

            return (
              <Card key={area.id} sx={{ ...glassCardStyles }}>
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
                        {area.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {area.code}
                      </Typography>
                    </Box>
                    <Chip
                      label={area.status}
                      size="small"
                      color={area.status === "active" ? "success" : "default"}
                      sx={{ textTransform: "capitalize" }}
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
                        Unit
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {unit?.name || "N/A"}
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
                        {new Date(area.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        PSVs
                      </Typography>
                      <Chip
                        label={`${counts.psvs} PSV${counts.psvs !== 1 ? "s" : ""}`}
                        size="small"
                        color={counts.psvs > 0 ? "primary" : "default"}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        Equipment
                      </Typography>
                      <Chip
                        label={`${counts.equipment} equip.`}
                        size="small"
                        color={counts.equipment > 0 ? "secondary" : "default"}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        Projects
                      </Typography>
                      <Chip
                        label={`${counts.projects} proj.`}
                        size="small"
                        color={counts.projects > 0 ? "info" : "default"}
                        sx={{ mt: 0.5 }}
                      />
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
                        onClick={() => handleEdit(area)}
                        sx={{ color: "primary.main" }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="medium"
                        color="error"
                        onClick={() => handleDelete(area)}
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
                  ? "No areas match your search."
                  : 'No areas found. Click "Add Area" to create one.'}
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
                  <TableCell>{renderHeader("Unit", "unit")}</TableCell>
                  <TableCell>{renderHeader("PSVs", "psvs")}</TableCell>
                  <TableCell>
                    {renderHeader("Equipment", "equipment")}
                  </TableCell>
                  <TableCell>{renderHeader("Projects", "projects")}</TableCell>
                  <TableCell>{renderHeader("Status", "status")}</TableCell>
                  <TableCell>{renderHeader("Created", "created")}</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagination.pageItems.map((area) => {
                  const unit = units.find((u) => u.id === area.unitId);
                  const counts = getAssetCounts(area.id);

                  return (
                    <TableRow
                      key={area.id}
                      hover
                      sx={{
                        "&:last-child td": {
                          borderBottom: 0,
                        },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {area.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {area.code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {unit?.name || "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${counts.psvs} PSV${counts.psvs !== 1 ? "s" : ""}`}
                          size="small"
                          color={counts.psvs > 0 ? "primary" : "default"}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${counts.equipment} equip.`}
                          size="small"
                          color={counts.equipment > 0 ? "secondary" : "default"}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${counts.projects} proj.`}
                          size="small"
                          color={counts.projects > 0 ? "info" : "default"}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={area.status}
                          size="small"
                          color={
                            area.status === "active" ? "success" : "default"
                          }
                          sx={{ textTransform: "capitalize" }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(area.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {canEdit && (
                          <>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(area)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDelete(area)}
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
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {searchText
                          ? "No areas match your search."
                          : 'No areas found. Click "Add Area" to create one.'}
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
        <AreaDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleSave}
          area={selectedArea}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {areaToDelete && (
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setAreaToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          onForceDelete={handleForceDelete}
          allowForceDelete={canApprove}
          title="Delete Area"
          itemName={areaToDelete.name}
          children={[
            {
              label: "Project",
              count: getAssetCounts(areaToDelete.id).projects,
            },
            { label: "PSV", count: getAssetCounts(areaToDelete.id).psvs },
            {
              label: "Equipment",
              count: getAssetCounts(areaToDelete.id).equipment,
            },
          ]}
        />
      )}
    </Box>
  );
}
