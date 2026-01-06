"use client";

import { Component, ReactNode, ErrorInfo } from 'react';
import { Box, Alert, AlertTitle, Typography, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface JSONParseBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    showReset?: boolean;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class JSONParseBoundary extends Component<JSONParseBoundaryProps, State> {
    state: State = {
        hasError: false,
        error: null,
    };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.props.onError?.(error, errorInfo);
        console.error('JSON parse error:', error, errorInfo);
    }

    handleReset = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Alert
                    severity="error"
                    action={
                        this.props.showReset !== false && (
                            <Button
                                color="inherit"
                                size="small"
                                startIcon={<RefreshIcon />}
                                onClick={this.handleReset}
                            >
                                Reset
                            </Button>
                        )
                    }
                >
                    <AlertTitle>Data Parse Error</AlertTitle>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Unable to parse the JSON data. The format may be invalid.
                    </Typography>
                    {this.state.error && (
                        <Typography
                            variant="caption"
                            component="pre"
                            sx={{
                                mt: 1,
                                p: 1,
                                bgcolor: 'rgba(0,0,0,0.1)',
                                borderRadius: 1,
                                overflow: 'auto',
                                maxHeight: 100,
                            }}
                        >
                            {this.state.error.message}
                        </Typography>
                    )}
                </Alert>
            );
        }

        return this.props.children;
    }
}

/**
 * Hook-based wrapper for functional components
 */
export function useJSONParse<T>(
    data: string,
    parser: (data: string) => T
): { value: T | null; error: Error | null; isValid: boolean } {
    const [state, setState] = React.useState<{ value: T | null; error: Error | null }>({
        value: null,
        error: null,
    });

    React.useEffect(() => {
        try {
            const parsed = parser(data);
            setState({ value: parsed, error: null });
        } catch (e) {
            setState({ value: null, error: e as Error });
        }
    }, [data, parser]);

    return {
        value: state.value,
        error: state.error,
        isValid: state.error === null,
    };
}

import React from 'react';
