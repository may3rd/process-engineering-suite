import { useState, useEffect } from 'react';
import { Box, TextField, Button, Paper, Typography, Stack, CircularProgress } from '@mui/material';
import { PlayArrow, Save } from '@mui/icons-material';
import { useDesignStore } from '../../store/useDesignStore';
import { runAgent } from '../../lib/api';

export const RequirementsView = () => {
  const { designState, updateDesignState, updateStepStatus, activeStepId } = useDesignStore();
  const [localReqs, setLocalReqs] = useState(designState.process_requirements || '');
  const [loading, setLoading] = useState(false);

  // Sync from store on mount
  useEffect(() => {
    if (designState.process_requirements) {
      setLocalReqs(designState.process_requirements);
    }
  }, [designState.process_requirements]);

  const handleSave = () => {
    updateDesignState({ process_requirements: localReqs });
  };

  const handleRunAgent = async () => {
    handleSave();
    setLoading(true);
    updateStepStatus(activeStepId, 'running');
    try {
      const result = await runAgent('requirements_agent', { prompt: localReqs });
      // In a real app, the result would update the state
      console.log('Agent Result:', result);
      updateStepStatus(activeStepId, 'completed');
    } catch (e) {
      console.error(e);
      updateStepStatus(activeStepId, 'failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1">Define Process Objectives & Constraints</Typography>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<Save />} onClick={handleSave} variant="outlined">
            Save Draft
          </Button>
          <Button 
            startIcon={loading ? <CircularProgress size={20} /> : <PlayArrow />} 
            onClick={handleRunAgent} 
            variant="contained" 
            disabled={loading || !localReqs}
          >
            Run Analysis
          </Button>
        </Stack>
      </Paper>

      <TextField
        multiline
        fullWidth
        minRows={10}
        maxRows={20}
        placeholder="Enter process requirements here (e.g., 'Design a 50,000 BPD crude unit...')"
        value={localReqs}
        onChange={(e) => setLocalReqs(e.target.value)}
        sx={{ 
          flexGrow: 1, 
          bgcolor: 'background.paper',
          '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' } 
        }}
      />
    </Box>
  );
};
