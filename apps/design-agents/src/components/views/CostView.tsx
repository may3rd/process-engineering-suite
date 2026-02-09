import { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  Stack, 
  CircularProgress,
  TextField
} from '@mui/material';
import { 
  PlayArrow, 
  Save, 
  Edit as EditIcon, 
  CheckCircle as ConfirmIcon,
  AttachMoney as CostIcon
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useDesignStore } from '../../store/useDesignStore';
import { runAgent } from '../../lib/api';
import { runTurboPipeline } from '../../lib/turbo';

export const CostView = () => {
  const { designState, updateDesignState, updateStepStatus, activeStepId, setActiveStep, steps } = useDesignStore();
  
  const [report, setReport] = useState(designState.cost_estimation_report || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (designState.cost_estimation_report) setReport(designState.cost_estimation_report);
  }, [designState.cost_estimation_report]);

  const handleSave = () => {
    updateDesignState({ cost_estimation_report: report });
    setIsEditing(false);
  };

  const handleRunAgent = async () => {
    setLoading(true);
    try {
      if (designState.turbo_mode) {
        const turboResult = await runTurboPipeline('cost');
        if (turboResult.status === 'failed') {
          throw new Error(turboResult.error || 'Turbo pipeline failed.');
        }
        return;
      }

      updateStepStatus(activeStepId, 'running');
      const result = await runAgent('cost_agent', { 
          design_basis: designState.selected_concept_details,
          flowsheet: designState.flowsheet_description,
          equipment_list: designState.sizing_results || designState.equipment_list_results,
          full_results: designState.full_simulation_results
      });
      
      if (result.status === 'completed' && result.data?.output) {
         updateDesignState({ cost_estimation_report: result.data.output });
         setReport(result.data.output);
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
      handleSave();
      updateStepStatus(activeStepId, 'completed');
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
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 3 
    }}>
      {/* Top Pane: Context Summary */}
      <Box sx={{ 
        flex: '0 0 auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
        maxHeight: '30vh'
      }}>
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                    <Typography variant="subtitle1" fontWeight="bold">Input Context: Equipment Scope</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Based on sized equipment list and flowsheet data.
                    </Typography>
                </Box>
                <Button 
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PlayArrow />} 
                    onClick={handleRunAgent} 
                    variant="contained" 
                    color="primary"
                    disabled={loading || !designState.sizing_results}
                >
                  Generate Estimate
                </Button>
            </Stack>
            
            {/* Short preview of equipment list */}
            {designState.sizing_results ? (
                <Box sx={{ 
                    p: 1.5, 
                    bgcolor: 'background.paper', 
                    borderRadius: 1, 
                    border: '1px solid',
                    borderColor: 'divider',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    maxHeight: '120px', // Limited height
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap'
                }}>
                    {designState.sizing_results.substring(0, 1000)}...
                </Box>
            ) : (
                <Typography color="error" variant="caption">
                    ⚠️ No sizing results found. Please complete the Sizing step first.
                </Typography>
            )}
        </Paper>
      </Box>

      {/* Bottom Pane: Output */}
      <Box sx={{ 
        flex: 1,
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
        minHeight: '400px'
      }}>
        <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <CostIcon color="primary" />
            <Box>
                <Typography variant="subtitle1" fontWeight="bold">Class 5 CAPEX Estimate</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            {report && (
                <>
                    {!isEditing ? (
                        <Button startIcon={<EditIcon />} onClick={() => setIsEditing(true)} variant="outlined" size="small">
                            Edit
                        </Button>
                    ) : (
                        <Button startIcon={<Save />} onClick={handleSave} variant="contained" color="secondary" size="small">
                            Save
                        </Button>
                    )}
                    <Button 
                        startIcon={<ConfirmIcon />} 
                        onClick={handleConfirmAndNext} 
                        variant="contained" 
                        color="success"
                        disabled={isEditing || Boolean(designState.turbo_mode)}
                    >
                        Confirm & Next
                    </Button>
                </>
            )}
          </Stack>
        </Paper>

        <Paper sx={{ 
            flexGrow: 1, 
            p: 3, 
            overflow: 'auto', 
            bgcolor: 'background.default',
            border: '1px solid',
            borderColor: isEditing ? 'secondary.main' : 'divider'
        }}>
          {isEditing ? (
            <TextField
                multiline
                fullWidth
                value={report}
                onChange={(e) => setReport(e.target.value)}
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
                '& table': { width: '100%', borderCollapse: 'collapse', mb: 2, fontSize: '0.85rem' },
                '& th': { borderBottom: '2px solid #444', textAlign: 'left', p: 1 },
                '& td': { borderBottom: '1px solid #ddd', p: 1 },
                // Dark mode table adjustments could be needed via theme
            }}>
              {report ? (
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                >
                    {report}
                </ReactMarkdown>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                    <CostIcon sx={{ fontSize: 60, mb: 2 }} />
                    <Typography>Ready to estimate project costs.</Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};
