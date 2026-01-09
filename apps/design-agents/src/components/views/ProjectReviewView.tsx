import { useState, useMemo } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  Stack, 
  CircularProgress, 
  Divider,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Chip
} from '@mui/material';
import { 
  AutoAwesome as MagicIcon,
  CheckCircle as ConfirmIcon,
  AssignmentTurnedIn as ReviewIcon,
  MonetizationOn as CostIcon,
  Description as MemoIcon,
  TrendingUp as GrowthIcon
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useDesignStore } from '../../store/useDesignStore';
import { runAgent } from '../../lib/api';

export const ProjectReviewView = () => {
  const { designState, updateDesignState, updateStepStatus, activeStepId, setActiveStep, steps } = useDesignStore();
  const [loading, setLoading] = useState(false);

  const handleRunReview = async () => {
    setLoading(true);
    updateStepStatus(activeStepId, 'running');
    try {
      const result = await runAgent('manager_agent', { 
        prompt: "Perform Final Design Review",
        requirements: designState.process_requirements,
        design_basis: designState.selected_concept_details,
        flowsheet: designState.flowsheet_description,
        full_results: designState.sizing_results || designState.full_simulation_results,
        safety_report: designState.safety_report
      });
      
      if (result.status === 'completed' && result.data?.output) {
         updateDesignState({ 
             project_manager_report: result.data.output,
             project_approval_status: result.data.status
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

  const handleConfirmAndNext = () => {
      const currentIndex = steps.findIndex(s => s.id === activeStepId);
      if (currentIndex < steps.length - 1) {
          setActiveStep(steps[currentIndex + 1].id);
      }
  };

  // Extract Financials using Regex from Markdown table
  const financials = useMemo(() => {
      const report = designState.project_manager_report;
      if (!report) return null;
      
      const capex = report.match(/CAPEX \(millions\)\s*\|\s*([\d.]+)/i)?.[1];
      const opex = report.match(/OPEX \(millions per year\)\s*\|\s*([\d.]+)/i)?.[1];
      const total = report.match(/Total Estimated Cost\s*\|\s*([\d.]+)/i)?.[1];
      
      return { capex, opex, total };
  }, [designState.project_manager_report]);

  const status = designState.project_approval_status || 'Pending Review';
  const getStatusColor = (s: string) => {
      if (s.match(/approved/i)) return 'success';
      if (s.match(/conditional/i)) return 'warning';
      if (s.match(/hold|revision/i)) return 'error';
      return 'default';
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">Project Manager Review & Costing</Typography>
            <Typography variant="caption" color="text.secondary">
               Stage-gate approval memo with financial outlook and implementation roadmap.
            </Typography>
          </Box>
          <Chip 
            label={status} 
            color={getStatusColor(status) as any} 
            variant="filled" 
            sx={{ fontWeight: 'bold', textTransform: 'uppercase' }} 
          />
        </Box>
        <Stack direction="row" spacing={2}>
             <Button 
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <MagicIcon />} 
                onClick={handleRunReview} 
                variant="contained" 
                color="primary"
                disabled={loading || !designState.safety_report}
             >
                {designState.project_manager_report ? "Update Review" : "Generate Approval Memo"}
             </Button>
             <Button 
                startIcon={<ConfirmIcon />} 
                onClick={handleConfirmAndNext} 
                variant="contained" 
                color="success"
                disabled={!designState.project_manager_report}
             >
                Finalize & Generate Report
             </Button>
        </Stack>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {!designState.project_manager_report ? (
              <Box sx={{ p: 10, textAlign: 'center', opacity: 0.5 }}>
                  <ReviewIcon sx={{ fontSize: 80, mb: 2 }} />
                  <Typography>Run the review agent to generate financial estimates and approval memo.</Typography>
              </Box>
          ) : (
              <Grid container spacing={3}>
                  {/* Financial Dashboard */}
                  {financials && (
                      <Grid item xs={12}>
                          <Grid container spacing={2}>
                              <Grid item xs={12} md={4}>
                                  <Card variant="outlined" sx={{ textAlign: 'center', py: 2, bgcolor: 'background.paper' }}>
                                      <Typography variant="caption" color="text.secondary">CAPEX (Est.)</Typography>
                                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                          ${financials.capex}M
                                      </Typography>
                                  </Card>
                              </Grid>
                              <Grid item xs={12} md={4}>
                                  <Card variant="outlined" sx={{ textAlign: 'center', py: 2, bgcolor: 'background.paper' }}>
                                      <Typography variant="caption" color="text.secondary">OPEX (Annual)</Typography>
                                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                                          ${financials.opex}M
                                      </Typography>
                                  </Card>
                              </Grid>
                              <Grid item xs={12} md={4}>
                                  <Card variant="outlined" sx={{ textAlign: 'center', py: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                                      <Typography variant="caption">Total Project Cost</Typography>
                                      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                          ${financials.total}M
                                      </Typography>
                                  </Card>
                              </Grid>
                          </Grid>
                      </Grid>
                  )}

                  {/* Memo Markdown */}
                  <Grid item xs={12}>
                      <Paper sx={{ p: 4, bgcolor: 'background.default' }}>
                          <Box sx={{ 
                              typography: 'body2',
                              '& h2': { color: 'primary.main', borderBottom: '1px solid', borderColor: 'divider', pb: 1, mt: 4, mb: 2 },
                              '& table': { width: '100%', borderCollapse: 'collapse', mb: 3 },
                              '& th, & td': { border: '1px solid', borderColor: 'divider', p: 1.5, textAlign: 'left' },
                              '& th': { bgcolor: 'action.hover', fontWeight: 'bold' },
                              '& ul': { pl: 3, mb: 2 },
                              '& li': { mb: 1.5 }
                          }}>
                              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                  {designState.project_manager_report}
                              </ReactMarkdown>
                          </Box>
                      </Paper>
                  </Grid>
              </Grid>
          )}
      </Box>
    </Box>
  );
};
