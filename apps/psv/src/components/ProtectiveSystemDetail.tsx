"use client";

import React from "react";

import {
  Box,
  Container,
  Typography,
  Paper,
  Divider,
  ListItemIcon,
  ListItemText,
  useTheme,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  MenuItem,
  Fade,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Delete,
  KeyboardArrowDown,
  Drafts,
  RateReview,
  CheckCircleOutline,
  PublishedWithChanges,
  Verified,
  ArrowBack,
} from "@mui/icons-material";
import { usePsvStore } from "@/store/usePsvStore";
import { ProtectiveSystem, RevisionHistory } from "@/data/types";
import { SizingWorkspace } from "./SizingWorkspace";
import { useAuthStore } from "@/store/useAuthStore";
import {
  useState,
  useEffect,
  useRef,
  MouseEvent,
  useMemo,
  useCallback,
} from "react";
import { SummaryTab } from "./SummaryTab";
import { RevisionsTab } from "./RevisionsTab";
import {
  WORKFLOW_STATUS_SEQUENCE,
  getWorkflowStatusColor,
  getWorkflowStatusLabel,
} from "@/lib/statusColors";
import { RevisionBadge } from "./RevisionBadge";
import { NewRevisionDialog } from "./NewRevisionDialog";
import { RevisionHistoryPanel } from "./RevisionHistoryPanel";
import { SnapshotPreviewDialog } from "./SnapshotPreviewDialog";

// Extracted Tab Components
import { OverviewTab } from "./tabs/OverviewTab";
import { ScenariosTab } from "./tabs/ScenariosTab";
import { SizingTab } from "./tabs/SizingTab";
import { NotesTab } from "./tabs/NotesTab";
import { AttachmentsTab } from "./tabs/AttachmentsTab";
import { ActivityPanel } from "./ActivityPanel";
import { ActiveViewers } from "./ActiveViewers";
import { sortRevisionsByOriginatedAtDesc } from "@/lib/revisionSort";

import { DeleteConfirmDialog } from "./shared";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`psv-tabpanel-${index}`}
      aria-labelledby={`psv-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Main Component
export function ProtectiveSystemDetail() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const selectedTabBg = theme.palette.background.default;
  const fullHeaderRef = useRef<HTMLDivElement | null>(null);
  const [showCompactHeader, setShowCompactHeader] = useState(false);
  const {
    selectedPsv,
    selectPsv,
    updatePsv,
    updateSizingCase,
    scenarioList,
    sizingCaseList,
    deleteSizingCase,
    softDeleteSizingCase,
    softDeleteProtectiveSystem,
    getCurrentRevision,
    loadRevisionHistory,
    selectedProject,
    activeTab,
    setActiveTab,
  } = usePsvStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isPsvActive = selectedPsv?.isActive !== false;
  const isParentInactive = selectedProject?.isActive === false;
  const canEditAuth = useAuthStore((state) => state.canEdit());
  const canEdit = canEditAuth && isPsvActive && !isParentInactive;

  const [psvRevisions, setPsvRevisions] = useState<RevisionHistory[]>([]);
  const [revisionMenuAnchor, setRevisionMenuAnchor] = useState<null | HTMLElement>(null);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);

  const [editTag, setEditTag] = useState("");
  const [editName, setEditName] = useState("");
  const [editPsvOpen, setEditPsvOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [revisionPanelOpen, setRevisionPanelOpen] = useState(false);
  const [newRevisionDialogOpen, setNewRevisionDialogOpen] = useState(false);
  const [snapshotRevision, setSnapshotRevision] = useState<RevisionHistory | null>(null);

  const canApprove = useAuthStore((state) => state.canApprove()) && isPsvActive && !isParentInactive;
  const canCheck = useAuthStore((state) =>
    ["lead", "approver", "admin"].includes(state.currentUser?.role || ""),
  ) && isPsvActive && !isParentInactive;
  // Issue permission also requires active PSV status implicitly via status sequence check, 
  // but explicitly checking isPsvActive for high-level actions is safer.
  const canIssue = (canCheck || canApprove) && isPsvActive && !isParentInactive;

  useEffect(() => {
    if (!selectedPsv) return;
    let cancelled = false;
    (async () => {
      await loadRevisionHistory("protective_system", selectedPsv.id);
      if (cancelled) return;
      const history = usePsvStore
        .getState()
        .revisionHistory.filter(
          (r) =>
            r.entityType === "protective_system" &&
            r.entityId === selectedPsv.id,
        );
      setPsvRevisions(sortRevisionsByOriginatedAtDesc(history));
    })();
    return () => {
      cancelled = true;
    };
  }, [loadRevisionHistory, selectedPsv]);

  const latestPsvRevision = useMemo(
    () => sortRevisionsByOriginatedAtDesc(psvRevisions)[0],
    [psvRevisions],
  );

  const statusSequenceIndex = WORKFLOW_STATUS_SEQUENCE.indexOf(
    selectedPsv!.status,
  );
  const statusEnabledSequentially = useCallback(
    (value: ProtectiveSystem["status"]) => {
      const targetIndex = WORKFLOW_STATUS_SEQUENCE.indexOf(value);
      if (targetIndex === -1 || statusSequenceIndex === -1) return true;
      if (targetIndex <= statusSequenceIndex) return true;
      return targetIndex === statusSequenceIndex + 1;
    },
    [statusSequenceIndex],
  );
  const statusPermissionFor = useCallback(
    (value: ProtectiveSystem["status"]) => {
      let roleAllowed: boolean;
      switch (value) {
        case "checked":
          roleAllowed = canCheck;
          break;
        case "approved":
          roleAllowed = canApprove;
          break;
        case "issued":
          roleAllowed = canIssue;
          break;
        default:
          roleAllowed = canEdit;
      }
      return roleAllowed && statusEnabledSequentially(value) && isPsvActive;
    },
    [canCheck, canApprove, canIssue, canEdit, statusEnabledSequentially, isPsvActive],
  );
  const canOpenStatusMenu =
    Boolean(selectedPsv) &&
    isPsvActive &&
    WORKFLOW_STATUS_SEQUENCE.filter(
      (value) => value !== selectedPsv!.status,
    ).some((value) => statusPermissionFor(value));

  const displayedRevision =
    (selectedPsv?.currentRevisionId
      ? psvRevisions.find((r) => r.id === selectedPsv.currentRevisionId)
      : undefined) ?? latestPsvRevision;

  const displayedRevisionCode =
    displayedRevision?.revisionCode ??
    getCurrentRevision("protective_system", selectedPsv?.id ?? "")
      ?.revisionCode ??
    "O1";

  const revisionMenuCurrentId =
    selectedPsv?.currentRevisionId ?? latestPsvRevision?.id;

  const handleRevisionMenuOpen = useCallback(
    async (event: MouseEvent<HTMLElement>) => {
      if (!selectedPsv) return;
      setRevisionMenuAnchor(event.currentTarget);
      await loadRevisionHistory("protective_system", selectedPsv.id);
      const history = usePsvStore
        .getState()
        .revisionHistory.filter(
          (r) =>
            r.entityType === "protective_system" &&
            r.entityId === selectedPsv.id,
        );
      setPsvRevisions(sortRevisionsByOriginatedAtDesc(history));
    },
    [selectedPsv, setRevisionMenuAnchor, loadRevisionHistory, setPsvRevisions],
  );

  const handleRevisionMenuClose = useCallback(() => {
    setRevisionMenuAnchor(null);
  }, [setRevisionMenuAnchor]);

  const handleRevisionSelect = useCallback(
    async (revisionId: string) => {
      if (!selectedPsv) return;
      if (!isAuthenticated) return;
      await updatePsv({ ...selectedPsv, currentRevisionId: revisionId });
      handleRevisionMenuClose();
    },
    [selectedPsv, isAuthenticated, updatePsv, handleRevisionMenuClose],
  );

  useEffect(() => {
    const toolbarHeightPx = 72;
    const update = () => {
      const header = fullHeaderRef.current;
      if (!header) return;
      const rect = header.getBoundingClientRect();
      // Show compact header only when the full header is completely hidden behind the fixed toolbar.
      setShowCompactHeader(rect.bottom <= toolbarHeightPx + 1);
    };

    update();

    let raf = 0;
    const scheduleUpdate = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  const caseToEdit = editingCaseId
    ? sizingCaseList.find((c) => c.id === editingCaseId)
    : undefined;

  const handleEditClick = useCallback(() => {
    if (selectedPsv) {
      setEditTag(selectedPsv!.tag);
      setEditName(selectedPsv!.name);
      setEditPsvOpen(true);
    }
  }, [selectedPsv, setEditTag, setEditName, setEditPsvOpen]);

  const handleSavePsv = useCallback(() => {
    if (selectedPsv && editTag.trim()) {
      updatePsv({
        ...selectedPsv,
        tag: editTag.trim(),
        name: editName.trim(),
      });
      setEditPsvOpen(false);
    }
  }, [selectedPsv, editTag, editName, updatePsv, setEditPsvOpen]);

  const handleDeletePsv = useCallback(() => {
    setDeleteDialogOpen(true);
  }, [setDeleteDialogOpen]);

  const handleConfirmDelete = useCallback(async () => {
    if (selectedPsv) {
      try {
        await softDeleteProtectiveSystem(selectedPsv.id);
        selectPsv(null);
      } catch (error) {
        console.error("Failed to delete PSV:", error);
      }
      setDeleteDialogOpen(false);
    }
  }, [selectedPsv, selectPsv, setDeleteDialogOpen, softDeleteProtectiveSystem]);

  const handleForceDelete = useCallback(async () => {
    if (selectedPsv && deleteConfirmationInput === selectedPsv.tag) {
      try {
        const { deletePsv } = usePsvStore.getState();
        await deletePsv(selectedPsv.id);
        setDeleteDialogOpen(false);
        selectPsv(null);
      } catch (error) {
        console.error("Failed to force delete PSV:", error);
      }
    }
  }, [selectedPsv, deleteConfirmationInput, setDeleteDialogOpen, selectPsv]);

  const handleStatusClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (!canOpenStatusMenu) return;
      setStatusMenuAnchor(event.currentTarget);
    },
    [canOpenStatusMenu, setStatusMenuAnchor],
  );

  const handleStatusClose = useCallback(() => {
    setStatusMenuAnchor(null);
  }, [setStatusMenuAnchor]);

  const handleStatusChange = useCallback(
    (status: ProtectiveSystem["status"]) => {
      if (selectedPsv && statusPermissionFor(status)) {
        updatePsv({ ...selectedPsv, status });
      }
      handleStatusClose();
    },
    [selectedPsv, statusPermissionFor, updatePsv, handleStatusClose],
  );

  if (!selectedPsv) {
    return null;
  }

  if (editingCaseId && caseToEdit) {
    return (
      <SizingWorkspace
        sizingCase={caseToEdit}
        inletNetwork={selectedPsv.inletNetwork}
        outletNetwork={selectedPsv.outletNetwork}
        psvSetPressure={selectedPsv.setPressure || 0}
        onClose={() => setEditingCaseId(null)}
        onSave={(updated, context) => {
          updateSizingCase(updated);
          if (context?.networkChanged) {
            sizingCaseList
              .filter((c) => c.id !== updated.id && c.status !== "draft")
              .forEach((c) => updateSizingCase({ ...c, status: "draft" }));
          }
          setEditingCaseId(null);
        }}
        onSaveNetworks={(updatedInlet, updatedOutlet) => {
          updatePsv({
            ...selectedPsv,
            inletNetwork: updatedInlet,
            outletNetwork: updatedOutlet,
          });
        }}
        psvTag={selectedPsv.tag}
        onDelete={() => {
          softDeleteSizingCase(caseToEdit.id);
          setEditingCaseId(null);
        }}
      />
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircleOutline fontSize="small" />;
      case "issued":
        return <PublishedWithChanges fontSize="small" />;
      case "checked":
        return <Verified fontSize="small" />;
      case "in_review":
        return <RateReview fontSize="small" />;
      default:
        return <Drafts fontSize="small" />;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Paper
        ref={fullHeaderRef}
        className="print-hide"
        sx={{
          p: { xs: 2, sm: 3 },
          mb: 3,
          backgroundColor: "transparent",
          boxShadow: "none",
          border: "none",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", sm: "flex-start" },
            gap: { xs: 2, sm: 0 },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
            <IconButton onClick={() => selectPsv(null)} edge="start">
              <ArrowBack />
            </IconButton>
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: { xs: 1, sm: 2 },
                  mb: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  variant="h4"
                  fontWeight={700}
                  sx={{ fontSize: { xs: "1.75rem", sm: "2.125rem" } }}
                >
                  {selectedPsv.tag}
                </Typography>
                <RevisionBadge
                  revisionCode={displayedRevisionCode}
                  onClick={handleRevisionMenuOpen}
                />
                <ActiveViewers
                  entityType="protective_system"
                  entityId={selectedPsv.id}
                />

                <Menu
                  anchorEl={revisionMenuAnchor}
                  open={Boolean(revisionMenuAnchor)}
                  onClose={handleRevisionMenuClose}
                  slots={{ transition: Fade }}
                >
                  <MenuItem
                    onClick={() => {
                      setRevisionPanelOpen(true);
                      handleRevisionMenuClose();
                    }}
                  >
                    <ListItemText>Revision History…</ListItemText>
                  </MenuItem>
                  {isAuthenticated
                    ? [
                      <Divider key="revision-divider" />,
                      ...psvRevisions.map((revision) => (
                        <MenuItem
                          key={revision.id}
                          selected={revision.id === revisionMenuCurrentId}
                          onClick={() => handleRevisionSelect(revision.id)}
                        >
                          <ListItemText
                            primary={`Rev. ${revision.revisionCode}`}
                            secondary={revision.description || undefined}
                          />
                        </MenuItem>
                      )),
                    ]
                    : null}
                </Menu>
                <Chip
                  icon={getStatusIcon(selectedPsv.status)}
                  label={getWorkflowStatusLabel(selectedPsv.status)}
                  color={getWorkflowStatusColor(selectedPsv.status) as any}
                  onClick={canOpenStatusMenu ? handleStatusClick : undefined}
                  deleteIcon={
                    canOpenStatusMenu ? <KeyboardArrowDown /> : undefined
                  }
                  onDelete={canOpenStatusMenu ? handleStatusClick : undefined}
                  sx={{
                    textTransform: "capitalize",
                    fontWeight: 600,
                    pl: 0.5,
                    "& .MuiChip-deleteIcon": {
                      color: "inherit",
                      opacity: 0.7,
                    },
                    cursor: canOpenStatusMenu ? "pointer" : "default",
                  }}
                />
                <Menu
                  anchorEl={statusMenuAnchor}
                  open={Boolean(statusMenuAnchor)}
                  onClose={handleStatusClose}
                  slots={{ transition: Fade }}
                >
                  <MenuItem
                    onClick={() => handleStatusChange("draft")}
                    selected={selectedPsv.status === "draft"}
                    disabled={!statusPermissionFor("draft")}
                  >
                    <ListItemIcon>
                      <Drafts fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Draft</ListItemText>
                  </MenuItem>
                  <MenuItem
                    onClick={() => handleStatusChange("in_review")}
                    selected={selectedPsv.status === "in_review"}
                    disabled={!statusPermissionFor("in_review")}
                  >
                    <ListItemIcon>
                      <RateReview
                        fontSize="small"
                        sx={{ color: "warning.main" }}
                      />
                    </ListItemIcon>
                    <ListItemText>In Review</ListItemText>
                  </MenuItem>
                  {statusPermissionFor("checked") && (
                    <MenuItem
                      onClick={() => handleStatusChange("checked")}
                      selected={selectedPsv.status === "checked"}
                    >
                      <ListItemIcon>
                        <Verified
                          fontSize="small"
                          sx={{ color: "info.main" }}
                        />
                      </ListItemIcon>
                      <ListItemText>Checked</ListItemText>
                    </MenuItem>
                  )}
                  {statusPermissionFor("approved") && (
                    <MenuItem
                      onClick={() => handleStatusChange("approved")}
                      selected={selectedPsv.status === "approved"}
                    >
                      <ListItemIcon>
                        <CheckCircleOutline
                          fontSize="small"
                          sx={{ color: "success.main" }}
                        />
                      </ListItemIcon>
                      <ListItemText>Approved</ListItemText>
                    </MenuItem>
                  )}
                  {selectedPsv.status === "approved" &&
                    statusPermissionFor("issued") && (
                      <MenuItem onClick={() => handleStatusChange("issued")}>
                        <ListItemIcon>
                          <PublishedWithChanges
                            fontSize="small"
                            sx={{ color: "info.main" }}
                          />
                        </ListItemIcon>
                        <ListItemText>Issued</ListItemText>
                      </MenuItem>
                    )}
                </Menu>
              </Box>
              <Typography variant="body1" color="text.secondary">
                {selectedPsv.name}
              </Typography>
            </Box>
          </Box>
          {canEdit && (
            <Box
              sx={{
                display: "flex",
                gap: 1,
                flexDirection: { xs: "row", sm: "row" },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={handleDeletePsv}
                sx={{ flex: { xs: 1, sm: "none" } }}
              >
                Delete
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Compact fixed header (no layout shift) */}
      <Box
        className="print-hide"
        sx={{
          position: "fixed",
          top: 72,
          left: 0,
          right: 0,
          zIndex: 999,
          borderRadius: 0,
          pointerEvents: showCompactHeader ? "auto" : "none",
          opacity: showCompactHeader ? 1 : 0,
          transform: showCompactHeader ? "translateY(0)" : "translateY(-8px)",
          transition: theme.transitions.create(["opacity", "transform"], {
            duration: theme.transitions.duration.shortest,
          }),
        }}
      >
        <Paper
          sx={{
            width: "100%",
            border: "none",
            borderRadius: 0,
            boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, isDark ? 0.35 : 0.12)}`,
            backgroundColor: alpha(
              theme.palette.background.default,
              isDark ? 0.85 : 0.92,
            ),
            backdropFilter: "blur(6px)",
            py: { xs: 1.5, sm: 2 },
          }}
        >
          <Container maxWidth="xl">
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                justifyContent: "space-between",
                alignItems: { xs: "stretch", sm: "flex-start" },
                gap: { xs: 1.5, sm: 0 },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: { xs: 1, sm: 2 },
                  flexWrap: "wrap",
                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 1,
                    minWidth: 0,
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    noWrap
                    sx={{ fontSize: { xs: "1.1rem", sm: "1.25rem" } }}
                  >
                    {selectedPsv.tag}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    noWrap
                    sx={{ minWidth: 0, maxWidth: { xs: 240, sm: 520 } }}
                  >
                    {selectedPsv.name}
                  </Typography>
                </Box>
                <RevisionBadge
                  revisionCode={displayedRevisionCode}
                  onClick={handleRevisionMenuOpen}
                />
                <Chip
                  icon={getStatusIcon(selectedPsv.status)}
                  label={getWorkflowStatusLabel(selectedPsv.status)}
                  color={getWorkflowStatusColor(selectedPsv.status) as any}
                  onClick={canOpenStatusMenu ? handleStatusClick : undefined}
                  deleteIcon={
                    canOpenStatusMenu ? <KeyboardArrowDown /> : undefined
                  }
                  onDelete={canOpenStatusMenu ? handleStatusClick : undefined}
                  sx={{
                    textTransform: "capitalize",
                    fontWeight: 600,
                    pl: 0.5,
                    transform: "scale(0.92)",
                    "& .MuiChip-deleteIcon": { color: "inherit", opacity: 0.7 },
                    cursor: canOpenStatusMenu ? "pointer" : "default",
                  }}
                />
              </Box>
            </Box>
          </Container>
        </Paper>
      </Box>

      {/* Edit PSV Dialog */}
      <Dialog
        open={editPsvOpen}
        onClose={() => setEditPsvOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Protective System</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Tag"
            value={editTag}
            onChange={(e) => setEditTag(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Description/Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditPsvOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSavePsv}
            disabled={!editTag.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        onForceDelete={handleForceDelete}
        allowForceDelete={canApprove}
        title="Deactivate Protective System"
        itemName={selectedPsv.tag}
        children={[
          { label: "scenario", count: scenarioList.length },
          { label: "sizing case", count: sizingCaseList.length },
        ]}
      />

      {/* Tabs */}
      <Paper
        className="print-hide"
        sx={{
          mb: 3,
          backgroundColor: "transparent",
          border: "none",
          boxShadow: "none",
        }}
      >
        <Box
          sx={{ px: { xs: 2, sm: 3 }, pt: 2, backgroundColor: "transparent" }}
        >
          <Box
            role="tablist"
            aria-label="Protective system detail tabs"
            sx={{
              display: "flex",
              gap: 0.5,
              flexWrap: "nowrap",
              overflowX: "auto",
              overflowY: "visible",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
              position: "relative",
              "&::after": {
                content: '""',
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: "2px",
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(0,0,0,0.1)",
                pointerEvents: "none",
                zIndex: 0,
              },
            }}
          >
            {[
              "Overview",
              "Scenarios",
              "Sizing Cases",
              "Notes",
              "Attachments",
              "Revisions Control",
              "Activity",
              "Summary",
            ].map((label, index) => {
              const isSelected = activeTab === index;
              return (
                <Box
                  key={label}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveTab(index)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 2,
                    py: 1.2,
                    cursor: "pointer",
                    position: "relative",
                    transition: "all 0.15s ease",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                    borderRadius: "8px 8px 0 0",
                    zIndex: isSelected ? 2 : 1,

                    border: "1px solid transparent",
                    borderBottom: "none",

                    ...(isSelected && {
                      borderColor: isDark
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(0,0,0,0.15)",
                      borderRadius: "8px 8px 0 0",
                      backgroundColor: selectedTabBg,
                    }),

                    "&:hover": !isSelected
                      ? {
                        color: isDark ? "#fff" : "#000",
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.04)",
                        borderRadius: "8px 8px 0 0",
                      }
                      : {},
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: isSelected ? 600 : 500,
                      fontSize: "0.875rem",
                      whiteSpace: "nowrap",
                      color: isSelected
                        ? isDark
                          ? "#fff"
                          : "#000"
                        : isDark
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(0,0,0,0.45)",
                      transition: "color 0.2s",
                    }}
                  >
                    {label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        <OverviewTab />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <ScenariosTab />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <SizingTab
          onEdit={(id) => setEditingCaseId(id)}
          onCreate={(id) => setEditingCaseId(id)}
        />
      </TabPanel>
      <TabPanel value={activeTab} index={3}>
        <NotesTab />
      </TabPanel>
      <TabPanel value={activeTab} index={4}>
        <AttachmentsTab />
      </TabPanel>
      <TabPanel value={activeTab} index={5}>
        <RevisionsTab
          entityId={selectedPsv.id}
          currentRevisionId={selectedPsv.currentRevisionId}
        />
      </TabPanel>
      <TabPanel value={activeTab} index={6}>
        <ActivityPanel
          entityType="protective_system"
          entityId={selectedPsv.id}
          title={`Activity for ${selectedPsv.tag}`}
          maxHeight="calc(100vh - 400px)"
        />
      </TabPanel>
      <TabPanel value={activeTab} index={7}>
        <SummaryTab />
      </TabPanel>

      {/* New Revision Dialog */}
      <NewRevisionDialog
        open={newRevisionDialogOpen}
        onClose={() => setNewRevisionDialogOpen(false)}
        entityType="protective_system"
        entityId={selectedPsv.id}
        currentRevisionCode={
          getCurrentRevision("protective_system", selectedPsv.id)?.revisionCode
        }
      />

      {/* Revision History Panel */}
      <RevisionHistoryPanel
        open={revisionPanelOpen}
        onClose={() => setRevisionPanelOpen(false)}
        entityType="protective_system"
        entityId={selectedPsv.id}
        currentRevisionId={selectedPsv.currentRevisionId}
        onViewSnapshot={(revision) => {
          setSnapshotRevision(revision);
          setRevisionPanelOpen(false);
        }}
      />

      {/* Snapshot Preview Dialog */}
      <SnapshotPreviewDialog
        open={snapshotRevision !== null}
        onClose={() => setSnapshotRevision(null)}
        revision={snapshotRevision}
      />
    </Box>
  );
}
