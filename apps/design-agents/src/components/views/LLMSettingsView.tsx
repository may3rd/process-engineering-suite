"use client";

import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Slider,
  Paper,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Chip,
  FormControlLabel,
  Switch,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import PsychologyIcon from "@mui/icons-material/Psychology";
import { useDesignStore } from "@/store/useDesignStore";
import { useState } from "react";

const PROVIDERS = [
  { value: "openrouter", label: "OpenRouter" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google AI" },
];

// Models organized by provider
const MODELS_BY_PROVIDER: Record<
  string,
  {
    quick: { value: string; label: string }[];
    deep: { value: string; label: string }[];
  }
> = {
  openrouter: {
    quick: [
      { value: "google/gemini-2.0-flash-exp", label: "Gemini 2.0 Flash" },
      { value: "google/gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      { value: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku" },
      { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
    ],
    deep: [
      { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
      { value: "anthropic/claude-3-opus", label: "Claude 3 Opus" },
      { value: "openai/o1", label: "OpenAI o1" },
      { value: "openai/o1-pro", label: "OpenAI o1-pro" },
      {
        value: "google/gemini-2.0-flash-thinking-exp",
        label: "Gemini 2.0 Thinking",
      },
    ],
  },
  openai: {
    quick: [
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ],
    deep: [
      { value: "o1", label: "o1" },
      { value: "o1-pro", label: "o1-pro" },
      { value: "o1-preview", label: "o1 Preview" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    ],
  },
  anthropic: {
    quick: [
      { value: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku" },
      { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
    ],
    deep: [
      { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
      { value: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
      { value: "claude-3-opus-latest", label: "Claude 3 Opus" },
    ],
  },
  google: {
    quick: [
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      { value: "gemini-1.5-flash-8b", label: "Gemini 1.5 Flash 8B" },
    ],
    deep: [
      { value: "gemini-2.5-pro-preview-06-05", label: "Gemini 2.5 Pro" },
      { value: "gemini-2.0-flash-thinking-exp", label: "Gemini 2.0 Thinking" },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    ],
  },
};

export function LLMSettingsView() {
  const theme = useTheme();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const {
    llmQuickProvider,
    llmQuickModel,
    llmQuickTemperature,
    llmQuickApiKey,
    llmDeepProvider,
    llmDeepModel,
    llmDeepTemperature,
    llmDeepApiKey,
    llmQuickUseStructured,
    llmDeepUseStructured,
    workflowStatus,
    streamError,
    currentWorkflowId,
    initializeWorkflow,
    reinitializeWorkflowWithNewSettings,
    setLLMQuickProvider,
    setLLMQuickModel,
    setLLMQuickTemperature,
    setLLMQuickApiKey,
    setLLMQuickUseStructured,
    setLLMDeepProvider,
    setLLMDeepModel,
    setLLMDeepTemperature,
    setLLMDeepApiKey,
    setLLMDeepUseStructured,
  } = useDesignStore();

  // Get models for selected provider
  const quickModels = MODELS_BY_PROVIDER[llmQuickProvider]?.quick || [];
  const deepModels = MODELS_BY_PROVIDER[llmDeepProvider]?.deep || [];

  // Reset model when provider changes (if current model not in new list)
  const handleQuickProviderChange = (provider: string) => {
    setLLMQuickProvider(provider);
    const newModels = MODELS_BY_PROVIDER[provider]?.quick || [];
    if (
      !newModels.find((m) => m.value === llmQuickModel) &&
      newModels.length > 0
    ) {
      setLLMQuickModel(newModels[0].value);
    }
  };

  const handleDeepProviderChange = (provider: string) => {
    setLLMDeepProvider(provider);
    const newModels = MODELS_BY_PROVIDER[provider]?.deep || [];
    if (
      !newModels.find((m) => m.value === llmDeepModel) &&
      newModels.length > 0
    ) {
      setLLMDeepModel(newModels[0].value);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      setIsUpdating(true);

      if (currentWorkflowId) {
        // Re-initialize with new settings but preserve existing results
        await reinitializeWorkflowWithNewSettings();
      } else {
        // First time initialization
        await initializeWorkflow();
      }

      setShowSuccessToast(true);
    } catch (error) {
      console.error("Failed to update LLM settings:", error);
      // Error handling would go here
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 4,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 0 }}>
            LLM Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure the AI models for fast responses and complex reasoning
            tasks.
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={handleUpdateSettings}
          disabled={isUpdating}
          startIcon={isUpdating ? <CircularProgress size={16} /> : null}
          sx={{
            minWidth: 120,
            background:
              theme.palette.mode === "dark"
                ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 2px 8px rgba(0, 0, 0, 0.2)`,
            "&:hover": {
              background:
                theme.palette.mode === "dark"
                  ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`
                  : `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
              boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.3)`,
            },
            "&:disabled": {
              opacity: 0.7,
            },
          }}
        >
          {isUpdating ? "Updating..." : "Update"}
        </Button>
      </Box>

      {/* Status Messages */}
      {workflowStatus === "updating" && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Updating workflow with new LLM settings...
        </Alert>
      )}

      {workflowStatus === "error" && streamError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to update LLM settings: {streamError}
        </Alert>
      )}

      {/* Success Toast */}
      <Snackbar
        open={showSuccessToast}
        autoHideDuration={4000}
        onClose={() => setShowSuccessToast(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setShowSuccessToast(false)}>
          LLM settings updated successfully! You can now run agents with the new
          configuration.
        </Alert>
      </Snackbar>

      <Grid container spacing={3}>
        {/* Quick Model Configuration */}
        <Grid size={{ xs: 12, md: 6 }}>
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <FlashOnIcon sx={{ color: theme.palette.warning.main }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Quick Model
              </Typography>
              <Chip
                label="Fast"
                size="small"
                sx={{
                  backgroundColor: `${theme.palette.warning.main}20`,
                  color: theme.palette.warning.main,
                  fontWeight: 600,
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Used for simple tasks, summaries, and fast iterations.
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Provider</InputLabel>
                <Select
                  value={llmQuickProvider}
                  label="Provider"
                  onChange={(e) => handleQuickProviderChange(e.target.value)}
                >
                  {PROVIDERS.map((p) => (
                    <MenuItem key={p.value} value={p.value}>
                      {p.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Model</InputLabel>
                <Select
                  value={llmQuickModel}
                  label="Model"
                  onChange={(e) => setLLMQuickModel(e.target.value)}
                >
                  {quickModels.map((m) => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="API Key"
                type="password"
                fullWidth
                value={llmQuickApiKey}
                onChange={(e) => setLLMQuickApiKey(e.target.value)}
                placeholder="Enter API key..."
                size="small"
              />

              <Box sx={{ px: 1 }}>
                <Typography
                  variant="caption"
                  gutterBottom
                  sx={{ display: "block" }}
                >
                  Temperature: {llmQuickTemperature}
                </Typography>
                <Slider
                  value={llmQuickTemperature}
                  min={0}
                  max={1.5}
                  step={0.1}
                  onChange={(_, value) =>
                    setLLMQuickTemperature(value as number)
                  }
                  valueLabelDisplay="auto"
                  size="small"
                  marks={[
                    { value: 0, label: "0" },
                    { value: 0.7, label: "0.7" },
                    { value: 1.5, label: "1.5" },
                  ]}
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={llmQuickUseStructured}
                    onChange={(e) => setLLMQuickUseStructured(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" color="text.secondary">
                    Use structured output (JSON mode)
                  </Typography>
                }
              />
            </Box>
          </Paper>
        </Grid>

        {/* Deep Thinking Model Configuration */}
        <Grid size={{ xs: 12, md: 6 }}>
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <PsychologyIcon sx={{ color: theme.palette.primary.main }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Deep Thinking Model
              </Typography>
              <Chip
                label="Complex"
                size="small"
                sx={{
                  backgroundColor: `${theme.palette.primary.main}20`,
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Used for critical analysis, safety reviews, and design decisions.
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Provider</InputLabel>
                <Select
                  value={llmDeepProvider}
                  label="Provider"
                  onChange={(e) => handleDeepProviderChange(e.target.value)}
                >
                  {PROVIDERS.map((p) => (
                    <MenuItem key={p.value} value={p.value}>
                      {p.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Model</InputLabel>
                <Select
                  value={llmDeepModel}
                  label="Model"
                  onChange={(e) => setLLMDeepModel(e.target.value)}
                >
                  {deepModels.map((m) => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="API Key"
                type="password"
                fullWidth
                value={llmDeepApiKey}
                onChange={(e) => setLLMDeepApiKey(e.target.value)}
                placeholder="Enter API key..."
                size="small"
              />

              <Box sx={{ px: 1 }}>
                <Typography
                  variant="caption"
                  gutterBottom
                  sx={{ display: "block" }}
                >
                  Temperature: {llmDeepTemperature}
                </Typography>
                <Slider
                  value={llmDeepTemperature}
                  min={0}
                  max={1.5}
                  step={0.1}
                  onChange={(_, value) =>
                    setLLMDeepTemperature(value as number)
                  }
                  valueLabelDisplay="auto"
                  size="small"
                  marks={[
                    { value: 0, label: "0" },
                    { value: 0.7, label: "0.7" },
                    { value: 1.5, label: "1.5" },
                  ]}
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={llmDeepUseStructured}
                    onChange={(e) => setLLMDeepUseStructured(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" color="text.secondary">
                    Use structured output (JSON mode)
                  </Typography>
                }
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
