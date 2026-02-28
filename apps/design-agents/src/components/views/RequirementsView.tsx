import { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  Stack, 
  CircularProgress, 
  IconButton,
  Tooltip,
  Alert,
  AlertTitle
} from '@mui/material';
import { 
  Edit as EditIcon, 
  CheckCircle as ConfirmIcon,
  AutoAwesome as MagicIcon,
  OpenInFull as ExpandIcon,
  CloseFullscreen as CollapseIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useDesignStore } from '../../store/useDesignStore';
import { runAgent } from '../../lib/api';
import { runTurboPipeline } from '../../lib/turbo';
import { MarkdownEditorDialog } from '../common/MarkdownEditorDialog';
import { glassInputSx, glassPanelSx } from '@eng-suite/ui-kit';

export const RequirementsView = () => {
  const { designState, updateDesignState, updateStepStatus, activeStepId, setActiveStep, steps } = useDesignStore();
  
  // Local states
  const [problemStatement, setProblemStatement] = useState(designState.problem_statement || '');
  const [editableBasis, setEditableBasis] = useState(designState.process_requirements || '');
  const [isEditingBasis, setIsEditingBasis] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<'problem' | 'basis' | null>(null);

  // Sync from store on mount
  useEffect(() => {
    if (designState.problem_statement) setProblemStatement(designState.problem_statement);
    if (designState.process_requirements) setEditableBasis(designState.process_requirements);
  }, [designState.problem_statement, designState.process_requirements]);

  const handleSaveProblem = () => {
    updateDesignState({ problem_statement: problemStatement });
  };

  const handleSaveBasis = (newContent: string) => {
    setEditableBasis(newContent);
    updateDesignState({ process_requirements: newContent });
    setIsEditingBasis(false);
  };

  const handleRunAgent = async () => {
    handleSaveProblem();
    setLoading(true);
    setError(null);
    try {
      if (designState.turbo_mode) {
        const turboResult = await runTurboPipeline('requirements');
        if (turboResult.status === 'failed') {
          throw new Error(turboResult.error || 'Turbo pipeline failed.');
        }
        return;
      }

      updateStepStatus(activeStepId, 'running');
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
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndNext = () => {
      // Logic for next
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

  const isApiKeyError = error?.toLowerCase().includes('api key');
  const hasBasis = Boolean(editableBasis);

  const isProblemExpanded = expandedSection === 'problem';
  const isBasisExpanded = expandedSection === 'basis';

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex', 
      flexDirection: 'column',
      gap: 2.5
    }}>
      <Paper
        sx={{
          ...glassPanelSx,
          p: 2,
          borderRadius: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>Requirements</Typography>
          <Typography variant="caption" color="text.secondary">
            Analyze the problem statement, then confirm the design basis to continue.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <MagicIcon />}
            onClick={handleRunAgent}
            variant={hasBasis ? 'outlined' : 'contained'}
            color="primary"
            disabled={loading || !problemStatement}
            size="small"
          >
            Analyze
          </Button>
          <Button
            startIcon={<EditIcon />}
            onClick={() => setIsEditingBasis(true)}
            variant="outlined"
            size="small"
            disabled={!hasBasis}
          >
            Edit
          </Button>
          <Button
            startIcon={<ConfirmIcon />}
            onClick={handleConfirmAndNext}
            variant={hasBasis ? 'contained' : 'outlined'}
            color="success"
            disabled={!hasBasis || Boolean(designState.turbo_mode)}
            size="small"
          >
            Confirm & Next
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          action={isApiKeyError && (
            <Button color="inherit" size="small" onClick={() => setError(null)}>
              Dismiss
            </Button>
          )}
        >
          <AlertTitle>Analysis Failed</AlertTitle>
          {error}
          {isApiKeyError && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Please ensure your API Key is configured in the Settings tab or .env file.
            </Typography>
          )}
        </Alert>
      )}

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper
          sx={{
            ...glassPanelSx,
            p: 2,
            borderRadius: 2,
            display: isBasisExpanded ? 'none' : 'flex',
            flexDirection: 'column',
            gap: 1.5,
            flex: isProblemExpanded ? 1 : '0 0 auto',
            minHeight: isProblemExpanded ? undefined : 260,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>Problem Statement</Typography>
              <Typography variant="caption" color="text.secondary">
                Describe the goal in one paragraph.
              </Typography>
            </Box>
            <Tooltip title={isProblemExpanded ? 'Collapse' : 'Expand'}>
              <IconButton
                size="small"
                onClick={() => setExpandedSection(isProblemExpanded ? null : 'problem')}
              >
                {isProblemExpanded ? <CollapseIcon /> : <ExpandIcon />}
              </IconButton>
            </Tooltip>
          </Box>

          <TextField
            multiline
            fullWidth
            placeholder="e.g., 'Design a heat exchanger to cool ethanol...'"
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            onBlur={handleSaveProblem}
            variant="outlined"
            InputProps={{
              sx: {
                height: '100%',
                alignItems: 'flex-start',
                p: 2,
                fontFamily: 'monospace',
                '& textarea': {
                  height: '100% !important',
                  overflowY: 'auto !important',
                  caretColor: 'text.primary',
                  lineHeight: 1.6
                }
              }
            }}
            sx={{ 
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              '& .MuiInputBase-root': { height: '100%' },
              ...glassInputSx
            }}
          />
        </Paper>

        <Paper
          sx={{
            ...glassPanelSx,
            p: 2,
            borderRadius: 2,
            display: isProblemExpanded ? 'none' : 'flex',
            flexDirection: 'column',
            gap: 1.5,
            flex: isBasisExpanded ? 1 : '0 0 auto',
            minHeight: isBasisExpanded ? undefined : 320,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>Design Basis</Typography>
              <Typography variant="caption" color="text.secondary">
                Review the analyzed requirements.
              </Typography>
            </Box>
            <Tooltip title={isBasisExpanded ? 'Collapse' : 'Expand'}>
              <IconButton
                size="small"
                onClick={() => setExpandedSection(isBasisExpanded ? null : 'basis')}
              >
                {isBasisExpanded ? <CollapseIcon /> : <ExpandIcon />}
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto', pr: 1 }}>
            <Box sx={{ 
              typography: 'body2', 
              '& h1': { color: 'text.primary', fontWeight: 800, mb: 1.5, mt: 3 },
              '& h2': { color: 'text.primary', fontWeight: 800, mb: 1.5, mt: 3.5 },
              '& h3': { color: 'text.secondary', fontWeight: 700, mb: 1, mt: 3 },
              '& ul': { pl: 3, mb: 2 },
              '& li': { mb: 0.5 },
              '& p': { mb: 2, lineHeight: 1.6 },
              '& code': { bgcolor: 'action.hover', px: 0.5, borderRadius: 1 },
              '& .katex': { fontSize: '1.1em' }
            }}>
              {hasBasis ? (
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
          </Box>
        </Paper>
      </Box>

      <MarkdownEditorDialog 
        open={isEditingBasis} 
        onClose={() => setIsEditingBasis(false)} 
        onSave={handleSaveBasis}
        initialContent={editableBasis}
        title="Edit Design Basis"
      />
    </Box>
  );
};
