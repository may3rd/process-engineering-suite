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
    Grid
} from "@mui/material";
import { useDesignStore } from "@/store/useDesignStore";

const PROVIDERS = [
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
];

const MODELS = [
    { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'openai/gpt-4o', label: 'GPT-4o' },
    { value: 'google/gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash' },
];

export function LLMSettingsView() {
    const theme = useTheme();
    const {
        llmProvider,
        llmModel,
        llmTemperature,
        llmApiKey,
        setLLMProvider,
        setLLMModel,
        setLLMTemperature,
        setLLMApiKey
    } = useDesignStore();

    return (
        <Box>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                LLM Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Configure the AI models and parameters for the design agents.
            </Typography>

            <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            backgroundColor: theme.palette.mode === 'dark'
                                ? 'rgba(0, 0, 0, 0.2)'
                                : 'rgba(255, 255, 255, 0.5)',
                            backdropFilter: 'blur(4px)',
                            borderRadius: 2,
                            border: `1px solid ${theme.palette.divider}`,
                        }}
                    >
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                            Provider & Model
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                            <FormControl fullWidth>
                                <InputLabel>AI Provider</InputLabel>
                                <Select
                                    value={llmProvider}
                                    label="AI Provider"
                                    onChange={(e) => setLLMProvider(e.target.value)}
                                >
                                    {PROVIDERS.map((p) => (
                                        <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth>
                                <InputLabel>Model Selector</InputLabel>
                                <Select
                                    value={llmModel}
                                    label="Model Selector"
                                    onChange={(e) => setLLMModel(e.target.value)}
                                >
                                    {MODELS.map((m) => (
                                        <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                label="API Key"
                                type="password"
                                fullWidth
                                value={llmApiKey}
                                onChange={(e) => setLLMApiKey(e.target.value)}
                                placeholder="Enter your API key..."
                                helperText="Keys are stored locally in your browser session."
                            />
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            backgroundColor: theme.palette.mode === 'dark'
                                ? 'rgba(0, 0, 0, 0.2)'
                                : 'rgba(255, 255, 255, 0.5)',
                            backdropFilter: 'blur(4px)',
                            borderRadius: 2,
                            border: `1px solid ${theme.palette.divider}`,
                        }}
                    >
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                            Hyperparameters
                        </Typography>

                        <Box sx={{ mt: 4, px: 2 }}>
                            <Typography gutterBottom>
                                Temperature: {llmTemperature}
                            </Typography>
                            <Slider
                                value={llmTemperature}
                                min={0}
                                max={1.5}
                                step={0.1}
                                onChange={(_, value) => setLLMTemperature(value as number)}
                                valueLabelDisplay="auto"
                                marks={[
                                    { value: 0, label: 'Precise' },
                                    { value: 0.7, label: 'Balanced' },
                                    { value: 1.5, label: 'Creative' },
                                ]}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 4 }}>
                                Lower temperature results in more deterministic, factual responses.
                                Higher temperature allows for more creative and varied design concepts.
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
