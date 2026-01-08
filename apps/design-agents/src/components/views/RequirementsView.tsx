"use client";

import { Box, Typography, Paper, useTheme } from "@mui/material";
import { useDesignStore } from "@/store/useDesignStore";
import { MarkdownEditor } from "../common/MarkdownEditor";
import { OutputStatusBadge } from "../common/OutputStatusBadge";
import { RunAgentButton } from "../common/RunAgentButton";

export function RequirementsView() {
  const theme = useTheme();
  const {
    problemStatement,
    processRequirements,
    setProblemStatement,
    setStepOutput,
    stepStatuses,
    triggerNextStep,
    getOutputMetadata,
    markOutputEdited,
    setOutputStatus,
    setStepStatus,
    setCurrentStep,
    setActiveTab,
    llmQuickModel,
    llmQuickApiKey,
  } = useDesignStore();

  const canRunAnalyst = true; // Allow analysis anytime if settings are configured
  const outputStatus = getOutputMetadata("processRequirements");

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
        Process Requirements Analysis
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Define your design problem and let the AI extract structured
        requirements
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Input: Problem Statement */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            backgroundColor:
              theme.palette.mode === "dark"
                ? "rgba(0, 0, 0, 0.2)"
                : "rgba(255, 255, 255, 0.5)",
            backdropFilter: "blur(4px)",
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Problem Statement (Input)
          </Typography>
          <Box sx={{ mt: 2, mb: 2 }}>
            <MarkdownEditor
              value={problemStatement}
              onChange={setProblemStatement}
              minHeight={300}
            />
          </Box>
          <RunAgentButton
            label="Analyze Requirements"
            onClick={triggerNextStep}
            disabled={
              !canRunAnalyst ||
              !problemStatement.trim() ||
              !llmQuickModel ||
              !llmQuickApiKey
            }
            isRerun={!!processRequirements.trim()}
            loading={stepStatuses[0] === "running"}
          />
        </Paper>

        {/* Output: Process Requirements */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            backgroundColor:
              theme.palette.mode === "dark"
                ? "rgba(0, 0, 0, 0.2)"
                : "rgba(255, 255, 255, 0.5)",
            backdropFilter: "blur(4px)",
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Process Requirements (Output)
            </Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              {(outputStatus?.status === "needs_review" ||
                outputStatus?.status === "draft") && (
                  <RunAgentButton
                    label="Confirm & Approve"
                    onClick={() => {
                      setOutputStatus("processRequirements", "approved");
                      setStepStatus(0, "complete");
                      setCurrentStep(1);
                      setActiveTab("research");
                    }}
                    variant="outlined"
                    size="small"
                  />
                )}
              {outputStatus && (
                <OutputStatusBadge status={outputStatus.status} />
              )}
            </Box>
          </Box>
          <Box sx={{ mt: 2 }}>
            <MarkdownEditor
              value={processRequirements}
              onChange={(val) => {
                setStepOutput("processRequirements", val);
                markOutputEdited("processRequirements");
              }}
              minHeight={300}
            />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
