import { useState, useEffect } from 'react';
import { Box, TextField, Button, Paper, Typography, Stack, CircularProgress, Divider } from '@mui/material';
import { PlayArrow, Save } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown'; // We need to install this or use a simple display
import { useDesignStore } from '../../store/useDesignStore';
import { runAgent } from '../../lib/api';

export const RequirementsView = () => {
  const { designState, updateDesignState, updateStepStatus, activeStepId } = useDesignStore();
  const [problemStatement, setProblemStatement] = useState(designState.problem_statement || '');
  const [loading, setLoading] = useState(false);

  // Sync from store on mount
  useEffect(() => {
    if (designState.problem_statement) {
      setProblemStatement(designState.problem_statement);
    }
  }, [designState.problem_statement]);

  const handleSave = () => {
    updateDesignState({ problem_statement: problemStatement });
  };

  const handleRunAgent = async () => {
    handleSave();
    setLoading(true);
    updateStepStatus(activeStepId, 'running');
    try {
      // We send the problem statement to the agent
      const result = await runAgent('requirements_agent', { prompt: problemStatement });
      
      if (result.status === 'completed' && result.data?.output) {
         updateDesignState({ 
             process_requirements: result.data.output 
         });
         updateStepStatus(activeStepId, 'completed');
      } else {
         throw new Error(result.message || 'Unknown error');
      }
    } catch (e) {
      console.error(e);
      updateStepStatus(activeStepId, 'failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', gap: 2 }}>
      {/* Left Pane: Input */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">Problem Statement</Typography>
          <Stack direction="row" spacing={1}>
            <Button startIcon={<Save />} onClick={handleSave} variant="outlined" size="small">
              Save
            </Button>
            <Button 
              startIcon={loading ? <CircularProgress size={20} /> : <PlayArrow />} 
              onClick={handleRunAgent} 
              variant="contained" 
              size="small"
              disabled={loading || !problemStatement}
            >
              Analyze
            </Button>
          </Stack>
        </Paper>

        <TextField
          multiline
          fullWidth
          placeholder="Describe your process here (e.g., 'Design a 50,000 BPD crude unit...')"
          value={problemStatement}
          onChange={(e) => setProblemStatement(e.target.value)}
          sx={{ 
            flexGrow: 1, 
            bgcolor: 'background.paper',
            '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start', p: 2 } 
          }}
        />
      </Box>

      {/* Right Pane: Output */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper sx={{ p: 2, height: '100%', overflow: 'auto', bgcolor: 'background.default' }}>
           <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Design Basis (AI Analysis)
           </Typography>
           <Divider sx={{ mb: 2 }} />
           
           {designState.process_requirements ? (
             <Box sx={{ 
                typography: 'body2', 
                '& h2': { fontSize: '1.2em', mt: 2, mb: 1, color: 'primary.main' },
                '& ul': { pl: 2 },
                '& li': { mb: 0.5 }
             }}>
               {/* Simple markdown rendering or just pre-wrap text */}
               <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                 {designState.process_requirements}
               </pre>
             </Box>
           ) : (
             <Typography color="text.secondary" fontStyle="italic">
               Run the analysis to generate the design basis.
             </Typography>
           )}
        </Paper>
      </Box>
    </Box>
  );
};