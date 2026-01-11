import { useState, useMemo } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  Stack, 
  CircularProgress, 
  Divider,
  TextField,
  Chip
} from '@mui/material';
import { 
  AutoAwesome as MagicIcon,
  CheckCircle as ConfirmIcon,
  HealthAndSafety as SafetyIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useDesignStore } from '../../store/useDesignStore';
import { runAgent } from '../../lib/api';

export const SafetyView = () => {
  const { designState, updateDesignState, updateStepStatus, activeStepId, setActiveStep, steps } = useDesignStore();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localReport, setLocalReport] = useState(designState.safety_report || '');

  const handleRunSafety = async () => {
    setLoading(true);
    updateStepStatus(activeStepId, 'running');
    try {
      const result = await runAgent('safety_agent', { 
        prompt: "Run Preliminary HAZOP",
        requirements: designState.process_requirements,
        design_basis: designState.selected_concept_details,
        flowsheet: designState.flowsheet_description,
        full_results: designState.sizing_results || designState.full_simulation_results
      });
      
      if (result.status === 'completed' && result.data?.output) {
         updateDesignState({ safety_report: result.data.output });
         setLocalReport(result.data.output);
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
      updateDesignState({ safety_report: localReport });
      setIsEditing(false);
  };

  const handleConfirmAndNext = () => {
      handleSave();
      const currentIndex = steps.findIndex(s => s.id === activeStepId);
      if (currentIndex < steps.length - 1) {
          setActiveStep(steps[currentIndex + 1].id);
      }
  };

  // Logic to extract risk level from markdown for a badge (simple regex)
  const riskLevel = useMemo(() => {
      if (!localReport) return null;
      const match = localReport.match(/\*\*Risk Level:\*\* (Low|Medium|High|Critical)/i);
      return match ? match[1] : 'Unknown';
  }, [localReport]);

  const getRiskColor = (level: string) => {
      switch (level.toLowerCase()) {
          case 'low': return 'success';
          case 'medium': return 'warning';
          case 'high': return 'error';
          case 'critical': return 'error';
          default: return 'default';
      }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">Safety & Risk Assessment (HAZOP)</Typography>
            <Typography variant="caption" color="text.secondary">
               Identify credible process hazards and propose mitigation strategies.
            </Typography>
          </Box>
          {riskLevel && (
              <Chip 
                icon={<WarningIcon />} 
                label={`Overall Risk: ${riskLevel}`} 
                color={getRiskColor(riskLevel) as any}
                variant="filled"
                sx={{ fontWeight: 'bold' }}
              />
          )}
        </Box>
        <Stack direction="row" spacing={2}>
             <Button 
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <MagicIcon />} 
                onClick={handleRunSafety} 
                variant="contained" 
                color="primary"
                disabled={loading || !designState.flowsheet_description}
             >
                {localReport ? "Re-assess Risk" : "Run Risk Assessment"}
             </Button>
             <Button 
                startIcon={<ConfirmIcon />} 
                onClick={handleConfirmAndNext} 
                variant="contained" 
                color="success"
                disabled={!localReport || isEditing}
             >
                Confirm & Next
             </Button>
        </Stack>
      </Paper>

      {/* Main Content */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 3, 
      }}>
          {/* Top: Summary Panel */}
          <Paper sx={{ 
            flex: '0 0 auto',
            p: 2, 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, // Horizontal on desktop
            gap: 2,
            bgcolor: 'action.hover',
            alignItems: { md: 'center' }
          }}>
              <Box>
                <Typography variant="subtitle2" gutterBottom color="primary">Assessment Scope</Typography>
                <Typography variant="caption">
                    Focuses on credible deviations (More/Less/No) for Temperature, Pressure, and Flow across all major units.
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
              <Box>
                <Typography variant="subtitle2" gutterBottom color="secondary">Compliance Checklist</Typography>
                <Typography variant="caption" sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <span>• ASME Section VIII (Vessels)</span>
                    <span>• API 520/521 (Relief)</span>
                    <span>• NFPA Standards</span>
                    <span>• Environmental VOC Limits</span>
                </Typography>
              </Box>
          </Paper>

          {/* Bottom: Report Area */}
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 2, 
            minHeight: '400px'
          }}>
              <Paper sx={{ p: 1, display: 'flex', justifyContent: 'flex-end', borderBottom: 'none' }}>
                  {!isEditing ? (
                      <Button startIcon={<EditIcon />} onClick={() => setIsEditing(true)} size="small" disabled={!localReport}>Edit Report</Button>
                  ) : (
                      <Button startIcon={<SaveIcon />} onClick={handleSave} variant="contained" color="secondary" size="small">Save</Button>
                  )}
              </Paper>
              <Paper sx={{ 
                  flexGrow: 1, 
                  p: 4, 
                  overflow: 'auto', 
                  bgcolor: 'background.default',
                  border: isEditing ? '1px solid' : 'none',
                  borderColor: 'secondary.main'
              }}>
                  {isEditing ? (
                      <TextField
                          multiline
                          fullWidth
                          value={localReport}
                          onChange={(e) => setLocalReport(e.target.value)}
                          sx={{ 
                              height: '100%',
                              '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start', fontFamily: 'monospace', fontSize: '0.9rem' } 
                          }}
                      />
                  ) : localReport ? (
                      <Box sx={{ 
                          typography: 'body2', 
                          '& h2': { color: 'primary.main', borderBottom: '1px solid', borderColor: 'divider', pb: 0.5, mt: 4, mb: 2 },
                          '& h3': { mt: 3, mb: 1, color: 'secondary.main' },
                          '& hr': { my: 4, opacity: 0.2 },
                          '& ul': { pl: 3, mb: 2 },
                          '& li': { mb: 1 }
                      }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {localReport}
                          </ReactMarkdown>
                      </Box>
                  ) : (
                      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, flexDirection: 'column', gap: 2 }}>
                          <SafetyIcon sx={{ fontSize: 80 }} />
                          <Typography fontStyle="italic">Generate the risk assessment report to see hazards and mitigations.</Typography>
                      </Box>
                  )}
              </Paper>
          </Box>
      </Box>
    </Box>
  );
};
