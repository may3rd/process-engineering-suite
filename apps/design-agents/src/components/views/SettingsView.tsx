import { useState, useEffect } from 'react';
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
  Alert
} from '@mui/material';
import { Save as SaveIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { useDesignStore } from '../../store/useDesignStore';
import { LLMSettings } from '../../types';

const PROVIDERS = ['OpenRouter', 'OpenAI', 'Google'];

export const SettingsView = () => {
  const { designState, updateDesignState } = useDesignStore();
  const [settings, setSettings] = useState<LLMSettings>(designState.llmSettings || {
    provider: 'OpenRouter',
    quickModel: 'google/gemini-2.5-flash-lite',
    deepModel: 'google/gemini-2.0-flash-001',
    temperature: 0.7,
    apiKey: ''
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (designState.llmSettings) {
      setSettings(prev => ({ ...prev, ...designState.llmSettings }));
    }
  }, [designState.llmSettings]);

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
            onChange={(e) => setSettings({ ...settings, provider: e.target.value as any })}
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
            <TextField
              value={settings.quickModel}
              onChange={(e) => setSettings({ ...settings, quickModel: e.target.value })}
              helperText="Used for simple summaries, formatting, and quick checks."
              fullWidth
            />
          </Box>

          <Box>
            <Typography gutterBottom>Deep Thinking Model</Typography>
            <TextField
              value={settings.deepModel}
              onChange={(e) => setSettings({ ...settings, deepModel: e.target.value })}
              helperText="Used for reasoning, HAZOP, sizing, and complex generation."
              fullWidth
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
