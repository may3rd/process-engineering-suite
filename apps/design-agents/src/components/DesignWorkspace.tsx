"use client";

import {
  Box,
  Tabs,
  Tab,
  useTheme,
  Alert,
  LinearProgress,
  Typography,
  Chip,
} from "@mui/material";
import { useDesignStore } from "@/store/useDesignStore";
import CircularProgress from "@mui/material/CircularProgress";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { RequirementsView } from "./views/RequirementsView";
import { ResearchView } from "./views/ResearchView";
import { ComponentListView } from "./views/ComponentListView";
import { DesignBasisView } from "./views/DesignBasisView";
import { SpreadsheetView } from "./views/SpreadsheetView";
import { ApprovalView } from "./views/ApprovalView";
import { LLMSettingsView } from "./views/LLMSettingsView";
import { StorageView } from "./views/StorageView";
import { ExportView } from "./views/ExportView";
import { TranscriptView } from "./views/TranscriptView";
import { ActivityMonitor } from "./common/ActivityMonitor";

type ViewTab =
  | "requirements"
  | "research"
  | "components"
  | "design"
  | "spreadsheet"
  | "approval"
  | "settings"
  | "storage"
  | "export"
  | "transcript";

// Spacer component that consumes MUI Tabs injected props to avoid console warnings
const TabSpacer = () => <Box sx={{ flexGrow: 1 }} />;

export function DesignWorkspace() {
  const theme = useTheme();
  const {
    activeTab,
    setActiveTab,
    workflowStatus,
    isStreaming,
    stepStatuses,
    currentStep,
    currentWorkflowId,
  } = useDesignStore();

  // Calculate workflow progress
  const completedSteps = Object.values(stepStatuses).filter(
    (status: string) => status === "completed",
  ).length;
  const runningSteps = Object.values(stepStatuses).filter(
    (status: string) => status === "running",
  ).length;
  const totalSteps = Object.keys(stepStatuses).length;
  const progressPercentage =
    totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // Check if AI is currently active
  const isAiActive =
    workflowStatus === "running" ||
    runningSteps > 0 ||
    workflowStatus === "initializing" ||
    workflowStatus === "updating";

  // Get current step name for display
  const stepNames = [
    "Process Requirements Analysis",
    "Innovative Research",
    "Conservative Research",
    "Concept Selection",
    "Component List Research",
    "Design Basis Analysis",
    "Flowsheet Design",
    "Equipment & Stream Catalog",
    "Stream Property Estimation",
    "Equipment Sizing",
    "Safety & Risk Analysis",
    "Project Approval",
  ];

  const currentStepName =
    currentStep >= 0 && currentStep < stepNames.length
      ? stepNames[currentStep]
      : "";

  return (
    <>
      {/* AI Activity Indicator */}
      {isAiActive && currentWorkflowId && (
        <Box sx={{ mb: 2 }}>
          <Alert
            severity="info"
            icon={<SmartToyIcon />}
            sx={{
              backgroundColor:
                theme.palette.mode === "dark"
                  ? "rgba(59, 130, 246, 0.1)"
                  : "rgba(59, 130, 246, 0.05)",
              border: `1px solid ${theme.palette.info.main}40`,
              "& .MuiAlert-icon": {
                color: theme.palette.info.main,
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress
                  size={20}
                  sx={{ color: theme.palette.info.main }}
                />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    AI is working on {currentStepName || "workflow"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {workflowStatus === "initializing" &&
                      "Initializing workflow..."}
                    {workflowStatus === "updating" &&
                      "Updating LLM settings..."}
                    {runningSteps > 0 &&
                      `Processing step ${currentStep + 1} of ${totalSteps}`}
                    {isStreaming && "Receiving real-time updates..."}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Chip
                  label={`${completedSteps}/${totalSteps} steps`}
                  size="small"
                  sx={{
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(34, 197, 94, 0.2)"
                        : "rgba(34, 197, 94, 0.1)",
                    color: theme.palette.success.main,
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={progressPercentage}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 3,
                    backgroundColor: theme.palette.info.main,
                  },
                }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: "block" }}
              >
                {Math.round(progressPercentage)}% complete • {completedSteps} of{" "}
                {totalSteps} steps finished
              </Typography>
            </Box>
          </Alert>
        </Box>
      )}

      {/* Main Workspace */}
      <Box
        sx={{
          borderRadius: "20px",
          backgroundColor:
            theme.palette.mode === "dark"
              ? "rgba(30, 41, 59, 0.7)"
              : "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(20px)",
          border:
            theme.palette.mode === "dark"
              ? "1px solid rgba(255, 255, 255, 0.1)"
              : "1px solid rgba(0, 0, 0, 0.05)",
          boxShadow:
            theme.palette.mode === "dark"
              ? "-10px 0 40px rgba(0,0,0,0.7)"
              : "-10px 0 40px rgba(0,0,0,0.2)",
          overflow: "hidden",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          aria-label="Design workspace navigation tabs"
          sx={{
            borderBottom: `1px solid ${theme.palette.divider}`,
            px: 2,
            "& .MuiTab-root": {
              textTransform: "none",
              fontSize: "0.95rem",
              fontWeight: 500,
            },
          }}
        >
          <Tab label="Requirements" value="requirements" />
          <Tab label="Research" value="research" />
          <Tab label="Components" value="components" />
          <Tab label="Design Basis" value="design" />
          <Tab label="Equipment & Streams" value="spreadsheet" />
          <Tab label="Approval" value="approval" />
          <TabSpacer />
          <Tab label="LLM Settings" value="settings" />
          <Tab label="Transcript" value="transcript" />
          <Tab label="Storage" value="storage" />
          <Tab label="Export" value="export" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === "requirements" && <RequirementsView />}
          {activeTab === "research" && <ResearchView />}
          {activeTab === "components" && <ComponentListView />}
          {activeTab === "design" && <DesignBasisView />}
          {activeTab === "spreadsheet" && <SpreadsheetView />}
          {activeTab === "approval" && <ApprovalView />}
          {activeTab === "settings" && <LLMSettingsView />}
          {activeTab === "transcript" && <TranscriptView />}
          {activeTab === "storage" && <StorageView />}
          {activeTab === "export" && <ExportView />}
        </Box>
      </Box>

      {/* Live Activity Monitor */}
      <ActivityMonitor />
    </>
  );
}
