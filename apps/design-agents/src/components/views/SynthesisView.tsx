import { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  Stack, 
  CircularProgress, 
  Divider,
  TextField
} from '@mui/material';
import { 
  AutoAwesome as MagicIcon,
  CheckCircle as ConfirmIcon,
  Edit as EditIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useDesignStore } from '../../store/useDesignStore';
import { runAgent } from '../../lib/api';

export const SynthesisView = () => {
  const { designState, updateDesignState, updateStepStatus, activeStepId, setActiveStep, steps } = useDesignStore();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localDetails, setLocalDetails] = useState(designState.selected_concept_details || '');

  useEffect(() => {
    if (designState.selected_concept_details) {
      setLocalDetails(designState.selected_concept_details);
    }
  }, [designState.selected_concept_details]);

  const handleRunSynthesis = async () => {
    if (!designState.selected_concept) return;
    
    setLoading(true);
    updateStepStatus(activeStepId, 'running');
    try {
      // Prompt is the Requirements, Context contains the Selected Concept
      const result = await runAgent('synthesis_agent', { 
        prompt: designState.process_requirements || '',
        selected_concept: designState.selected_concept
      });
      
      if (result.status === 'completed' && result.data?.output) {
         updateDesignState({ selected_concept_details: result.data.output });
         setLocalDetails(result.data.output);
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

  const handleSave = () => {
      updateDesignState({ selected_concept_details: localDetails });
      setIsEditing(false);
  };

  const handleConfirmAndNext = () => {
      handleSave();
      const currentIndex = steps.findIndex(s => s.id === activeStepId);
      if (currentIndex < steps.length - 1) {
          setActiveStep(steps[currentIndex + 1].id);
      }
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: { xs: 'column', lg: 'row' }, 
      gap: 3 
    }}>
      {/* Left Pane: Selection Summary */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
        minHeight: { xs: 'auto', lg: 'auto' }
      }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">Selected Technology</Typography>
          <Typography variant="h6" color="primary.main" gutterBottom>
             {designState.selected_concept?.name || "None Selected"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
             {designState.selected_concept?.description}
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>Key Units</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {designState.selected_concept?.unit_operations.map((unit, i) => (
                  <Paper key={i} variant="outlined" sx={{ px: 1, py: 0.5, bgcolor: 'action.hover' }}>
                      <Typography variant="caption">{unit}</Typography>
                  </Paper>
              ))}
          </Box>
        </Paper>

        <Button 
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <MagicIcon />} 
            onClick={handleRunSynthesis} 
            variant="contained" 
            fullWidth
            size="large"
            disabled={loading || !designState.selected_concept}
        >
            Generate Detailed Design Basis
        </Button>
      </Box>

      {/* Right Pane: Detailed Output */}
      <Box sx={{ 
        flex: 2, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
        minHeight: { xs: '500px', lg: 'auto' }
      }}>
        <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">Detailed Design Basis</Typography>
          <Stack direction="row" spacing={1}>
             {!isEditing ? (
                 <Button startIcon={<EditIcon />} onClick={() => setIsEditing(true)} variant="outlined" size="small" disabled={!localDetails}>
                     Edit
                 </Button>
             ) : (
                 <Button startIcon={<SaveIcon />} onClick={handleSave} variant="contained" color="secondary" size="small">
                     Save
                 </Button>
             )}
             <Button 
                startIcon={<ConfirmIcon />} 
                onClick={handleConfirmAndNext} 
                variant="contained" 
                color="success"
                disabled={!localDetails || isEditing}
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
            border: isEditing ? '1px solid' : 'none',
            borderColor: 'secondary.main'
        }}>
          {isEditing ? (
              <TextField
                  multiline
                  fullWidth
                  value={localDetails}
                  onChange={(e) => setLocalDetails(e.target.value)}
                  sx={{ 
                      height: '100%',
                      '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start', fontFamily: 'monospace' } 
                  }}
              />
          ) : localDetails ? (
            <Box sx={{ 
                typography: 'body2', 
                '& h2': { color: 'primary.main', borderBottom: '1px solid', borderColor: 'divider', pb: 0.5, mt: 3, mb: 2 },
                '& table': { width: '100%', borderCollapse: 'collapse', mb: 2 },
                '& th, & td': { border: '1px solid', borderColor: 'divider', p: 1, textAlign: 'left' },
                '& th': { bgcolor: 'action.hover' },
                '& ul': { pl: 3, mb: 2 }
            }}>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {localDetails}
                </ReactMarkdown>
            </Box>
          ) : (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                <Typography fontStyle="italic">Click "Generate" to create the detailed design basis.</Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};
