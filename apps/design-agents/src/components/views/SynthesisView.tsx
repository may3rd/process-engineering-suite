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
import { runTurboPipeline } from '../../lib/turbo';
import { MarkdownEditorDialog } from '../common/MarkdownEditorDialog';

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
    try {
      if (designState.turbo_mode) {
        const turboResult = await runTurboPipeline('synthesis');
        if (turboResult.status === 'failed') {
          throw new Error(turboResult.error || 'Turbo pipeline failed.');
        }
        return;
      }

      updateStepStatus(activeStepId, 'running');
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

  const handleSave = (newContent: string) => {
      setLocalDetails(newContent);
      updateDesignState({ selected_concept_details: newContent });
      setIsEditing(false);
  };

  const handleConfirmAndNext = () => {
      // If manually edited but not saved, save it
      updateDesignState({ selected_concept_details: localDetails });
      updateStepStatus(activeStepId, 'completed');
      const currentIndex = steps.findIndex(s => s.id === activeStepId);
      if (currentIndex < steps.length - 1) {
          setActiveStep(steps[currentIndex + 1].id);
      }
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 3 
    }}>
      {/* Top Pane: Selection Summary */}
      <Box sx={{ 
        flex: '0 0 auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
      }}>
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
                <Typography variant="subtitle1" fontWeight="bold">Selected Technology</Typography>
                <Typography variant="h6" color="primary.main" gutterBottom>
                    {designState.selected_concept?.name || "None Selected"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {designState.selected_concept?.description}
                </Typography>
            </Box>
            <Button 
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <MagicIcon />} 
                onClick={handleRunSynthesis} 
                variant="contained" 
                size="medium"
                disabled={loading || !designState.selected_concept}
            >
                Generate Design Basis
            </Button>
          </Stack>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>Key Units</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {designState.selected_concept?.unit_operations?.map((unit) => (
                  <Paper key={unit} variant="outlined" sx={{ px: 1, py: 0.5, bgcolor: 'action.hover' }}>
                      <Typography variant="caption">{unit}</Typography>
                  </Paper>
              ))}
          </Box>
        </Paper>
      </Box>

      {/* Bottom Pane: Detailed Output */}
      <Box sx={{ 
        flex: 1,
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
        minHeight: '400px'
      }}>
        <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">Detailed Design Basis</Typography>
          <Stack direction="row" spacing={1}>
             <Button startIcon={<EditIcon />} onClick={() => setIsEditing(true)} variant="outlined" size="small" disabled={!localDetails}>
                 Edit
             </Button>
             <Button 
                startIcon={<ConfirmIcon />} 
                onClick={handleConfirmAndNext} 
                variant="contained" 
                color="success"
                disabled={!localDetails || Boolean(designState.turbo_mode)}
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
            border: 'none',
            borderColor: 'secondary.main'
        }}>
          {localDetails ? (
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

      <MarkdownEditorDialog 
        open={isEditing} 
        onClose={() => setIsEditing(false)} 
        onSave={handleSave}
        initialContent={localDetails}
        title="Edit Detailed Design Basis"
      />
    </Box>
  );
};
