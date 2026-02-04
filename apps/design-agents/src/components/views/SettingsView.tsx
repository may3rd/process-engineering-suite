import { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  MenuItem, 
  Slider, 
  Button, 
  Stack, 
  Divider,
  Alert,
  Autocomplete
} from '@mui/material';
import { Save as SaveIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { useDesignStore } from '../../store/useDesignStore';
import { LLMSettings } from '../../types';

const PROVIDERS = ['OpenRouter', 'OpenAI', 'Google'];

const MODELS_BY_PROVIDER: Record<string, string[]> = {
  OpenRouter: [
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-opus',
    'deepseek/deepseek-r1',
    'deepseek/deepseek-chat',
    'google/gemini-3-flash-preview',
    'google/gemini-3-pro-preview',
    'google/gemini-2.5-flash',
    'google/gemini-2.5-flash-lite',
    'google/gemini-2.0-flash-001',
    'google/gemini-pro-1.5',
    'google/gemini-flash-1.5',
    'moonshotai/kimi-k2.5',
    'moonshotai/kimi-k2-thinking',
    'meta-llama/llama-3.1-405b-instruct',
    'meta-llama/llama-3.1-70b-instruct',
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'x-ai/grok-4.1-fast',
    'x-ai/grok-4-fast',
    'x-ai/grok-4'
  ],
  OpenAI: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
    'o1-preview',
    'o1-mini'
  ],
  Google: [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-pro',
    'gemini-1.5-flash'
  ]
};

export const SettingsView = () => {
  const { designState, updateDesignState } = useDesignStore();
  const [settings, setSettings] = useState<LLMSettings>(designState.llmSettings || {
    provider: 'OpenRouter',
    quickModel: 'moonshotai/kimi-k2.5',
    deepModel: 'moonshotai/kimi-k2.5',
    temperature: 0.7,
    apiKey: ''
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (designState.llmSettings) {
      setSettings(prev => ({ ...prev, ...designState.llmSettings }));
    }
  }, [designState.llmSettings]);

  const availableModels = useMemo(() => {
    return MODELS_BY_PROVIDER[settings.provider] || [];
  }, [settings.provider]);

  const handleSave = () => {
    updateDesignState({ llmSettings: settings });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper sx={{ p: 4 }}>
        <Stack direction="row" alignItems="center" gap={2} mb={3}>
          <SettingsIcon color="primary" fontSize="large" />
          <Box>
            <Typography variant="h5" fontWeight="bold">LLM Configuration</Typography>
            <Typography variant="body2" color="text.secondary">
              Configure the AI models used for Quick Thinking (fast tasks) and Deep Thinking (complex analysis).
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 4 }} />

        <Stack spacing={4}>
          <TextField
            select
            label="AI Provider"
            value={settings.provider}
            onChange={(e) => setSettings({ 
              ...settings, 
              provider: e.target.value as any,
              // Reset models if not in the new list (optional UX choice, keeping existing value for now)
            })}
            fullWidth
          >
            {PROVIDERS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="API Key (Optional override)"
            type="password"
            value={settings.apiKey || ''}
            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            helperText="Leave blank to use server-side environment variables."
            fullWidth
          />

          <Box>
            <Typography gutterBottom>Quick Thinking Model</Typography>
            <Autocomplete
              freeSolo
              options={availableModels}
              value={settings.quickModel}
              onInputChange={(_, newValue) => setSettings({ ...settings, quickModel: newValue })}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  helperText="Used for simple summaries, formatting, and quick checks."
                  fullWidth 
                />
              )}
            />
          </Box>

          <Box>
            <Typography gutterBottom>Deep Thinking Model</Typography>
            <Autocomplete
              freeSolo
              options={availableModels}
              value={settings.deepModel}
              onInputChange={(_, newValue) => setSettings({ ...settings, deepModel: newValue })}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  helperText="Used for reasoning, HAZOP, sizing, and complex generation."
                  fullWidth 
                />
              )}
            />
          </Box>

          <Box>
            <Typography gutterBottom>Temperature ({settings.temperature})</Typography>
            <Slider
              value={settings.temperature}
              onChange={(_, val) => setSettings({ ...settings, temperature: val as number })}
              min={0}
              max={1}
              step={0.1}
              marks
              valueLabelDisplay="auto"
            />
            <Typography variant="caption" color="text.secondary">
              Lower values are more deterministic; higher values are more creative.
            </Typography>
          </Box>

          {saved && <Alert severity="success">Settings saved successfully.</Alert>}

          <Button 
            variant="contained" 
            size="large" 
            startIcon={<SaveIcon />} 
            onClick={handleSave}
            sx={{ alignSelf: 'flex-start' }}
          >
            Save Configuration
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};
