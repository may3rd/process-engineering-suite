import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Button, 
  MenuItem, 
  Stack, 
  IconButton,
  Box,
  Typography
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Close as CloseIcon } from '@mui/icons-material';
import { ResearchConcept } from '../../types';

interface ConceptEditorDialogProps {
  open: boolean;
  initialConcept?: ResearchConcept; // If provided, we are editing. If null, adding.
  onClose: () => void;
  onSave: (concept: ResearchConcept) => void;
}

const MATURITY_OPTIONS = [
  { value: 'conventional', label: 'Conventional' },
  { value: 'innovative', label: 'Innovative' },
  { value: 'state_of_the_art', label: 'State of the Art' },
];

export const ConceptEditorDialog = ({ open, initialConcept, onClose, onSave }: ConceptEditorDialogProps) => {
  const [concept, setConcept] = useState<ResearchConcept>({
    name: '',
    maturity: 'conventional',
    description: '',
    unit_operations: [],
    key_benefits: []
  });

  // Local state for list inputs
  const [newUnitOp, setNewUnitOp] = useState('');
  const [newBenefit, setNewBenefit] = useState('');

  useEffect(() => {
    if (open) {
      if (initialConcept) {
        setConcept(JSON.parse(JSON.stringify(initialConcept))); // Deep copy
      } else {
        setConcept({
          name: '',
          maturity: 'conventional',
          description: '',
          unit_operations: [],
          key_benefits: []
        });
      }
      setNewUnitOp('');
      setNewBenefit('');
    }
  }, [open, initialConcept]);

  const handleAddUnitOp = () => {
    if (newUnitOp.trim()) {
      setConcept(prev => ({
        ...prev,
        unit_operations: [...prev.unit_operations, newUnitOp.trim()]
      }));
      setNewUnitOp('');
    }
  };

  const handleDeleteUnitOp = (index: number) => {
    setConcept(prev => ({
      ...prev,
      unit_operations: prev.unit_operations.filter((_, i) => i !== index)
    }));
  };

  const handleAddBenefit = () => {
    if (newBenefit.trim()) {
      setConcept(prev => ({
        ...prev,
        key_benefits: [...prev.key_benefits, newBenefit.trim()]
      }));
      setNewBenefit('');
    }
  };

  const handleDeleteBenefit = (index: number) => {
    setConcept(prev => ({
      ...prev,
      key_benefits: prev.key_benefits.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    if (!concept.name || !concept.description) return; // Basic validation
    onSave(concept);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initialConcept ? 'Edit Concept' : 'Add New Concept'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Concept Name"
            fullWidth
            value={concept.name}
            onChange={(e) => setConcept({ ...concept, name: e.target.value })}
          />
          
          <TextField
            select
            label="Technology Maturity"
            fullWidth
            value={concept.maturity}
            onChange={(e) => setConcept({ ...concept, maturity: e.target.value as any })}
          >
            {MATURITY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Description"
            multiline
            rows={4}
            fullWidth
            value={concept.description}
            onChange={(e) => setConcept({ ...concept, description: e.target.value })}
          />

          {/* Unit Ops Input */}
          <Box>
            <Typography variant="caption" color="text.secondary">Unit Operations</Typography>
            <Stack direction="row" spacing={1} mb={1}>
              <TextField 
                size="small" 
                fullWidth 
                placeholder="Add unit (e.g. Reactor)" 
                value={newUnitOp}
                onChange={(e) => setNewUnitOp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUnitOp())}
              />
              <Button variant="outlined" onClick={handleAddUnitOp}>Add</Button>
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {concept.unit_operations.map((item, i) => (
                <Box 
                  key={`${i}-${item}`} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    bgcolor: 'action.hover', 
                    borderRadius: 1, 
                    pl: 1, 
                    pr: 0.5, 
                    py: 0.5 
                  }}
                >
                  <Typography variant="body2">{item}</Typography>
                  <IconButton size="small" onClick={() => handleDeleteUnitOp(i)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Benefits Input */}
          <Box>
            <Typography variant="caption" color="text.secondary">Key Benefits</Typography>
            <Stack direction="row" spacing={1} mb={1}>
              <TextField 
                size="small" 
                fullWidth 
                placeholder="Add benefit" 
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBenefit())}
              />
              <Button variant="outlined" onClick={handleAddBenefit}>Add</Button>
            </Stack>
            <Stack spacing={1}>
              {concept.key_benefits.map((item, i) => (
                <Box 
                  key={`${i}-${item}`} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    bgcolor: 'action.hover', 
                    borderRadius: 1, 
                    pl: 1, 
                    pr: 0.5, 
                    py: 0.5 
                  }}
                >
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>{item}</Typography>
                  <IconButton size="small" onClick={() => handleDeleteBenefit(i)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          </Box>

        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!concept.name}>
          Save Concept
        </Button>
      </DialogActions>
    </Dialog>
  );
};
