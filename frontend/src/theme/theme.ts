import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0f172a', // Deep slate navy
      light: '#334155',
      dark: '#020617',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#4f46e5', // Vibrant modern indigo
      light: '#6366f1',
      dark: '#4338ca',
      contrastText: '#ffffff',
    },
    success: {
      main: '#059669', // Emerald
      light: '#10b981',
      dark: '#047857',
    },
    warning: {
      main: '#d97706', // Amber
      light: '#f59e0b',
      dark: '#b45309',
    },
    error: {
      main: '#e11d48', // Rose
      light: '#f43f5e',
      dark: '#be123c',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
    },
    divider: '#e2e8f0',
  },
  typography: {
    fontFamily: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'].join(','),
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: '#0f172a',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
      color: '#0f172a',
    },
    h6: {
      fontWeight: 600,
      color: '#0f172a',
    },
    subtitle1: {
      color: '#64748b',
    },
    body1: {
      color: '#1e293b',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: '#475569',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        },
        root: {
          borderBottom: '1px solid #f1f5f9',
          fontSize: '0.875rem',
        },
      },
    },
  },
});
