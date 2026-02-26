import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField,
  IconButton,
  Box,
  Typography,
  useTheme
} from '@mui/material';
import { Close as CloseIcon, Save as SaveIcon } from '@mui/icons-material';

interface MarkdownEditorDialogProps {
  open: boolean;
  title?: string;
  initialContent: string;
  onClose: () => void;
  onSave: (content: string) => void;
}

export const MarkdownEditorDialog = ({ 
  open, 
  title = "Edit Content", 
  initialContent, 
  onClose, 
  onSave 
}: MarkdownEditorDialogProps) => {
  const [content, setContent] = useState(initialContent);
  const theme = useTheme();

  useEffect(() => {
    if (open) {
      setContent(initialContent);
    }
  }, [open, initialContent]);

  const handleSave = () => {
    onSave(content);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
          bgcolor: theme.palette.background.paper,
          backgroundImage: 'none',
          boxShadow: theme.shadows[24]
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
        <Typography variant="h6" fontWeight="bold">{title}</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        <TextField
          multiline
          fullWidth
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type markdown here..."
          variant="standard"
          InputProps={{
            disableUnderline: true,
            sx: {
              height: '100%',
              p: 3,
              fontFamily: 'monospace',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              alignItems: 'flex-start',
              '& textarea': {
                height: '100% !important',
                overflowY: 'auto !important'
              }
            }
          }}
          sx={{ flexGrow: 1, height: '100%' }}
        />
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          startIcon={<SaveIcon />}
          color="primary"
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};
