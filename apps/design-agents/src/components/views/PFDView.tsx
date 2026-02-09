import { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  Stack, 
  CircularProgress, 
  TextField,
  Divider
} from '@mui/material';
import { 
  AutoAwesome as MagicIcon,
  CheckCircle as ConfirmIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  TableChart as TableIcon
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useDesignStore } from '../../store/useDesignStore';
import { runAgent } from '../../lib/api';
import { runTurboPipeline } from '../../lib/turbo';
import { MarkdownEditorDialog } from '../common/MarkdownEditorDialog';

export const PFDView = () => {
  const { designState, updateDesignState, updateStepStatus, activeStepId, setActiveStep, steps } = useDesignStore();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localFlowsheet, setLocalFlowsheet] = useState(designState.flowsheet_description || '');

  useEffect(() => {
    if (designState.flowsheet_description) {
      setLocalFlowsheet(designState.flowsheet_description);
    }
  }, [designState.flowsheet_description]);

  const handleRunPFD = async () => {
    if (!designState.selected_concept_details) return;
    
    setLoading(true);
    try {
      if (designState.turbo_mode) {
        const turboResult = await runTurboPipeline('pfd');
        if (turboResult.status === 'failed') {
          throw new Error(turboResult.error || 'Turbo pipeline failed.');
        }
        return;
      }

      updateStepStatus(activeStepId, 'running');
      const result = await runAgent('pfd_agent', { 
        prompt: designState.process_requirements || "Generate PFD", // Prompt is required by API schema
        requirements: designState.process_requirements,
        concept_name: designState.selected_concept?.name,
        concept_details: designState.selected_concept_details,
      });
      
      if (result.status === 'completed' && result.data?.output) {
         updateDesignState({ flowsheet_description: result.data.output });
         setLocalFlowsheet(result.data.output);
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
      setLocalFlowsheet(newContent);
      updateDesignState({ flowsheet_description: newContent });
      setIsEditing(false);
  };

  const handleConfirmAndNext = () => {
      updateDesignState({ flowsheet_description: localFlowsheet });
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
      {/* Top Pane: Context */}
      <Box sx={{ 
        flex: '0 0 auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
        maxHeight: '30vh' 
      }}>
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
             <Typography variant="subtitle1" fontWeight="bold">Context: Detailed Design Basis</Typography>
             <Button 
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <MagicIcon />} 
                onClick={handleRunPFD} 
                variant="contained" 
                size="medium"
                disabled={loading || !designState.selected_concept_details}
            >
                Generate Flowsheet
            </Button>
          </Stack>
          
          <Box sx={{ 
             typography: 'caption', 
             color: 'text.secondary',
             overflowY: 'auto',
             maxHeight: '150px',
             border: '1px solid',
             borderColor: 'divider',
             borderRadius: 1,
             p: 1,
             '& h2': { fontSize: '1.1em', fontWeight: 'bold', mt: 1, mb: 0.5 }
          }}>
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {designState.selected_concept_details || "*No design basis available*"}
              </ReactMarkdown>
          </Box>
        </Paper>
      </Box>

      {/* Bottom Pane: PFD Output */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
        minHeight: '400px'
      }}>
        <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">Process Flow Diagram (Description)</Typography>
            <Typography variant="caption" color="text.secondary">Units, Streams, and Connectivity</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
             <Button startIcon={<EditIcon />} onClick={() => setIsEditing(true)} variant="outlined" size="small" disabled={!localFlowsheet}>
                 Edit
             </Button>
             <Button 
                startIcon={<ConfirmIcon />} 
                onClick={handleConfirmAndNext} 
                variant="contained" 
                color="success"
                disabled={!localFlowsheet || Boolean(designState.turbo_mode)}
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
          {localFlowsheet ? (
            <Box sx={{ 
                typography: 'body2', 
                '& h2': { color: 'primary.main', borderBottom: '1px solid', borderColor: 'divider', pb: 0.5, mt: 3, mb: 2 },
                '& table': { width: '100%', borderCollapse: 'collapse', mb: 2, fontSize: '0.9em' },
                '& th, & td': { border: '1px solid', borderColor: 'divider', p: 1, textAlign: 'left' },
                '& th': { bgcolor: 'action.hover', fontWeight: 'bold' },
                '& ul': { pl: 3, mb: 2 }
            }}>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {localFlowsheet}
                </ReactMarkdown>
            </Box>
          ) : (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, flexDirection: 'column', gap: 2 }}>
                <TableIcon sx={{ fontSize: 60 }} />
                <Typography fontStyle="italic">Generate the PFD description to see Units and Streams.</Typography>
            </Box>
          )}
        </Paper>
      </Box>

      <MarkdownEditorDialog 
        open={isEditing} 
        onClose={() => setIsEditing(false)} 
        onSave={handleSave}
        initialContent={localFlowsheet}
        title="Edit Process Flow Diagram Description"
      />
    </Box>
  );
};
