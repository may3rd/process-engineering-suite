import { createContext, useContext, useMemo, useState } from 'react';
import { CssBaseline, ThemeProvider, alpha, createTheme } from '@mui/material';

interface ThemeContextType {
  toggleColorMode: () => void;
  mode: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType>({
  toggleColorMode: () => {},
  mode: 'dark',
});

export const useThemeContext = () => useContext(ThemeContext);

export const ThemeContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<'light' | 'dark'>('dark');

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(() => {
    const isDark = mode === 'dark';
    const palette = {
      mode,
      primary: {
        main: '#2dd4bf',
        light: '#5eead4',
        dark: '#0f766e',
      },
      secondary: {
        main: '#f97316',
        light: '#fb923c',
        dark: '#c2410c',
      },
      background: {
        default: isDark ? '#060b14' : '#f4f7fb',
        paper: isDark ? '#0d1626' : '#ffffff',
      },
      text: {
        primary: isDark ? '#e5edf7' : '#10223a',
        secondary: isDark ? '#9fb1c9' : '#415773',
      },
    } as const;

    return createTheme({
      palette,
      shape: { borderRadius: 16 },
      typography: {
        fontFamily: '"Sora", "IBM Plex Sans", "Segoe UI", sans-serif',
        h1: { fontWeight: 700, letterSpacing: '-0.02em' },
        h2: { fontWeight: 700, letterSpacing: '-0.02em' },
        h3: { fontWeight: 700, letterSpacing: '-0.01em' },
        h4: { fontWeight: 700, letterSpacing: '-0.01em' },
        h5: { fontWeight: 650 },
        h6: { fontWeight: 650 },
        button: { fontWeight: 650, textTransform: 'none' },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: `
            @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Sora:wght@400;500;600;700&display=swap');
            :root {
              --design-accent: ${palette.primary.main};
              --design-accent-strong: ${palette.secondary.main};
            }
            body {
              color-scheme: ${mode};
              min-height: 100vh;
              background-color: ${palette.background.default};
              background-image:
                radial-gradient(1200px 700px at 8% -5%, ${isDark ? 'rgba(45, 212, 191, 0.2)' : 'rgba(45, 212, 191, 0.15)'} 0%, transparent 50%),
                radial-gradient(900px 600px at 92% -10%, ${isDark ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.15)'} 0%, transparent 52%),
                linear-gradient(180deg, ${isDark ? '#060b14' : '#f4f7fb'} 0%, ${isDark ? '#080f1c' : '#edf2f8'} 100%);
              background-attachment: fixed;
            }
            body::before {
              content: '';
              position: fixed;
              inset: 0;
              pointer-events: none;
              background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
              background-size: 28px 28px;
              opacity: ${isDark ? 0.14 : 0.06};
              z-index: -1;
            }
          `,
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              border: `1px solid ${isDark ? 'rgba(150, 171, 198, 0.18)' : 'rgba(20, 40, 70, 0.1)'}`,
              backdropFilter: 'blur(16px)',
              boxShadow: isDark
                ? '0 14px 40px rgba(3, 10, 20, 0.45)'
                : '0 10px 30px rgba(42, 58, 89, 0.08)',
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              paddingInline: 14,
            },
            contained: {
              boxShadow: 'none',
              '&:hover': {
                boxShadow: 'none',
              },
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 10,
            },
          },
        },
        MuiDivider: {
          styleOverrides: {
            root: {
              borderColor: alpha(isDark ? '#95aac8' : '#223a5f', isDark ? 0.28 : 0.18),
            },
          },
        },
      },
    });
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ toggleColorMode, mode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
