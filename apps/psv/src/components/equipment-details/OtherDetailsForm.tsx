import React from 'react';
import {
    Box,
    TextField,
    Typography,
    Grid
} from '@mui/material';

interface OtherDetailsFormProps {
    details: Record<string, unknown> | null;
    onChange: (details: Record<string, unknown>) => void;
}

export function OtherDetailsForm({ details, onChange }: OtherDetailsFormProps) {
    const handleChange = (field: string, value: any) => {
        onChange({
            ...details,
            [field]: value
        });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" color="primary">Other Specification</Typography>
            <Typography variant="caption" color="text.secondary">
                Additional details for this equipment type
            </Typography>

            <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Notes / Specification"
                        value={details?.notes || ''}
                        onChange={(e) => handleChange('notes', e.target.value)}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}
