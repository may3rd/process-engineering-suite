import { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  Stack, 
  CircularProgress, 
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  PlayArrow, 
  Save, 
  Edit as EditIcon, 
  CheckCircle as ConfirmIcon,
  AutoAwesome as MagicIcon
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useDesignStore } from '../../store/useDesignStore';
import { runAgent } from '../../lib/api';

export const RequirementsView = () => {
  const { designState, updateDesignState, updateStepStatus, activeStepId, setActiveStep, steps } = useDesignStore();
  
  // Local states
  const [problemStatement, setProblemStatement] = useState(designState.problem_statement || '');
  const [editableBasis, setEditableBasis] = useState(designState.process_requirements || '');
  const [isEditingBasis, setIsEditingBasis] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync from store on mount
  useEffect(() => {
    if (designState.problem_statement) setProblemStatement(designState.problem_statement);
    if (designState.process_requirements) setEditableBasis(designState.process_requirements);
  }, [designState.problem_statement, designState.process_requirements]);

  const handleSaveProblem = () => {
    updateDesignState({ problem_statement: problemStatement });
  };

  const handleSaveBasis = () => {
    updateDesignState({ process_requirements: editableBasis });
    setIsEditingBasis(false);
  };

  const handleRunAgent = async () => {
    handleSaveProblem();
    setLoading(true);
    updateStepStatus(activeStepId, 'running');
    try {
      const result = await runAgent('requirements_agent', { prompt: problemStatement });
      if (result.status === 'completed' && result.data?.output) {
         updateDesignState({ process_requirements: result.data.output });
         setEditableBasis(result.data.output);
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

  const handleConfirmAndNext = () => {
      handleSaveBasis();
      updateStepStatus(activeStepId, 'completed');
      // Find index of next step
      const currentIndex = steps.findIndex(s => s.id === activeStepId);
      if (currentIndex < steps.length - 1) {
          const nextStep = steps[currentIndex + 1];
          if (nextStep) {
              setActiveStep(nextStep.id);
          }
      }
  };

  return (
    <Box sx={{ 
      height: 'calc(100vh - 180px)', 
      display: 'flex', 
      flexDirection: { xs: 'column', lg: 'row' }, // Stack on mobile/tablet
      gap: 3 
    }}>
      {/* Left Pane: Input */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
        minHeight: { xs: '300px', lg: 'auto' } // Ensure height on mobile
      }}>
        <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">1. Problem Statement</Typography>
            <Typography variant="caption" color="text.secondary">Input your process design goals</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button 
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <MagicIcon />} 
                onClick={handleRunAgent} 
                variant="contained" 
                color="primary"
                disabled={loading || !problemStatement}
            >
              Analyze
            </Button>
          </Stack>
        </Paper>

        <TextField
          multiline
          fullWidth
          placeholder="e.g., 'Design a heat exchanger to cool ethanol...'"
          value={problemStatement}
          onChange={(e) => setProblemStatement(e.target.value)}
          onBlur={handleSaveProblem}
          sx={{ 
            flexGrow: 1, 
            bgcolor: 'background.paper',
            '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start', p: 2, fontFamily: 'monospace' } 
          }}
        />
      </Box>

      {/* Right Pane: Output/Basis */}
      <Box sx={{ 
        flex: 1.2, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
        minHeight: { xs: '400px', lg: 'auto' } 
      }}>
        <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">2. Design Basis</Typography>
            <Typography variant="caption" color="text.secondary">Review and edit analyzed requirements</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {!isEditingBasis ? (
                <Button startIcon={<EditIcon />} onClick={() => setIsEditingBasis(true)} variant="outlined" size="small">
                    Edit
                </Button>
            ) : (
                <Button startIcon={<Save />} onClick={handleSaveBasis} variant="contained" color="secondary" size="small">
                    Save Changes
                </Button>
            )}
            <Button 
                startIcon={<ConfirmIcon />} 
                onClick={handleConfirmAndNext} 
                variant="contained" 
                color="success"
                disabled={!editableBasis || isEditingBasis}
            >
                Confirm & Next
            </Button>
          </Stack>
        </Paper>

        <Paper sx={{ 
            flexGrow: 1, 
            p: 3, 
            overflow: 'auto', 
            bgcolor: 'background.default',
            border: '1px solid',
            borderColor: isEditingBasis ? 'secondary.main' : 'divider'
        }}>
          {isEditingBasis ? (
            <TextField
                multiline
                fullWidth
                value={editableBasis}
                onChange={(e) => setEditableBasis(e.target.value)}
                sx={{ 
                    height: '100%',
                    '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start', fontFamily: 'monospace' } 
                }}
            />
          ) : (
            <Box sx={{ 
                typography: 'body2', 
                '& h1, & h2, & h3': { color: 'primary.main', mb: 1, mt: 2 },
                '& ul': { pl: 3, mb: 2 },
                '& li': { mb: 0.5 },
                '& p': { mb: 2, lineHeight: 1.6 },
                '& code': { bgcolor: 'action.hover', px: 0.5, borderRadius: 1 },
                // Math styling
                '& .katex': { fontSize: '1.1em' }
            }}>
              {editableBasis ? (
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                >
                    {editableBasis}
                </ReactMarkdown>
              ) : (
                <Typography color="text.secondary" fontStyle="italic" sx={{ mt: 2 }}>
                  Run analysis to generate the design basis or start typing...
                </Typography>
              )}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};