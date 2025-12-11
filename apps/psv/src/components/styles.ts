import { Theme } from '@mui/material/styles';

export const glassCardStyles = {
    backdropFilter: 'blur(10px)',
    backgroundColor: (theme: Theme) =>
        theme.palette.mode === 'dark'
            ? 'rgba(30, 41, 59, 0.7)'
            : 'rgba(255, 255, 255, 0.7)',
    border: '1px solid',
    borderColor: (theme: Theme) =>
        theme.palette.mode === 'dark'
            ? 'rgba(148, 163, 184, 0.1)'
            : 'rgba(203, 213, 225, 0.3)',
    borderRadius: '12px', // Reduced from 20px
    boxShadow: (theme: Theme) =>
        theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.3)'
            : '0 8px 32px rgba(0, 0, 0, 0.1)',
};
