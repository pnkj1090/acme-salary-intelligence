import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Chip,
  Grid,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SecurityIcon from '@mui/icons-material/Security';

export const SettingsPage: React.FC = () => {
  const benchmarkRates = [
    { currency: 'USD', name: 'US Dollar', rate: '1.0000', basis: 'Base Reference Standard' },
    { currency: 'EUR', name: 'Euro', rate: '1.0800', basis: '1 EUR = 1.08 USD' },
    { currency: 'GBP', name: 'British Pound', rate: '1.3000', basis: '1 GBP = 1.30 USD' },
    { currency: 'CAD', name: 'Canadian Dollar', rate: '0.7400', basis: '1 CAD = 0.74 USD' },
    { currency: 'AUD', name: 'Australian Dollar', rate: '0.6700', basis: '1 AUD = 0.67 USD' },
    { currency: 'JPY', name: 'Japanese Yen', rate: '0.0067', basis: '1 JPY = 0.0067 USD (~150 JPY = $1)' },
    { currency: 'INR', name: 'Indian Rupee', rate: '0.0120', basis: '1 INR = 0.0120 USD (~83.3 INR = $1)' },
  ];

  return (
    <Box maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          System Information & Operational Conventions
        </Typography>
        <Typography variant="subtitle1">
          Transparency guidelines, benchmark exchange rates, and data integrity guarantees.
        </Typography>
      </Box>

      {/* Demo notice */}
      <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mb: 3.5, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <strong>Fictional Demonstration Dataset Notice:</strong> All 10,000 employee records, names, email addresses,
        and compensation details in this application are programmatically generated and entirely fictional. No real personal
        identifying information (PII) is present or accessible.
      </Alert>

      {/* Currency Conventions */}
      <Card sx={{ mb: 3.5 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Currency Aggregation & Normalization Policy
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
            ACME enforces strict multi-currency isolation. Under no circumstances are foreign currency figures
            (such as USD, EUR, GBP, JPY, CAD, AUD, INR) directly summed into an arbitrary, mathematically corrupt global total.
            All cross-currency comparisons utilize the explicitly declared benchmark rates below:
          </Typography>

          <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ISO Code</TableCell>
                  <TableCell>Currency Name</TableCell>
                  <TableCell>Benchmark Factor to USD</TableCell>
                  <TableCell>Exchange Rule Basis</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {benchmarkRates.map((r) => (
                  <TableRow key={r.currency} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{r.currency}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#4f46e5' }}>{r.rate}</TableCell>
                    <TableCell sx={{ color: '#64748b' }}>{r.basis}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Architecture & Security Scope */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <SecurityIcon sx={{ color: '#059669' }} />
                <Typography variant="h6">Security Baseline & Data Protection</Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1.5 }}>
                • <strong>CSV Formula Injection Shield:</strong> All CSV exported cells are sanitized to neutralize formula command injection triggers (=, +, -, @).
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1.5 }}>
                • <strong>Parameterized Relational Queries:</strong> 100% of database interactions run via SQLAlchemy parameterization to block SQL injection.
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                • <strong>Soft Deactivation:</strong> Terminating or deactivating an employee preserves their full historical compensation and audit trail.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Environment & System Metadata
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>Application Version</Typography>
                  <Chip label="v1.0.0 (Assessment Release)" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>Target Persona</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>HR Manager / Total Rewards</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>Database Engine</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>SQLite (Dev) / Postgres (Prod)</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>Employee Database Size</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>10,000 Employees</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
