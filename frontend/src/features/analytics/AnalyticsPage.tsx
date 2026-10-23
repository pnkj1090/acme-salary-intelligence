import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

import { api } from '../../api/client';
import { CurrencyBadge } from '../../components/CurrencyBadge';
import { formatMoney, formatNumber } from '../../utils/formatters';

const DIMENSIONS = [
  { value: 'department', label: 'Department' },
  { value: 'country', label: 'Country' },
  { value: 'job_title', label: 'Job Title' },
  { value: 'employment_status', label: 'Employment Status' },
];

export const AnalyticsPage: React.FC = () => {
  const [dimension, setDimension] = useState<string>('department');
  const [currency, setCurrency] = useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['analyticsBreakdown', dimension, currency],
    queryFn: () => api.getAnalytics(dimension, currency || undefined),
  });

  // Prepare chart data (top 15 groups for clean layout)
  const chartData = (data?.groups || []).slice(0, 15).map((g) => ({
    name: g.group_name.length > 20 ? `${g.group_name.substring(0, 18)}...` : g.group_name,
    fullName: g.group_name,
    mean: typeof g.mean_salary === 'string' ? parseFloat(g.mean_salary) : g.mean_salary,
    median: typeof g.median_salary === 'string' ? parseFloat(g.median_salary) : g.median_salary,
    currency: g.currency,
    headcount: g.headcount,
  }));

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Compensation Analytics
        </Typography>
        <Typography variant="subtitle1">
          Deep statistical breakdown of salary bands, medians, and means across the organization.
        </Typography>
      </Box>

      {/* Control Filters */}
      <Card sx={{ mb: 3.5 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Group Breakdown By"
                value={dimension}
                onChange={(e) => setDimension(e.target.value)}
              >
                {DIMENSIONS.map((dim) => (
                  <MenuItem key={dim.value} value={dim.value}>
                    {dim.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Currency Isolation"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <MenuItem value="">All Currencies (Grouped)</MenuItem>
                <MenuItem value="USD">USD ($)</MenuItem>
                <MenuItem value="EUR">EUR (€)</MenuItem>
                <MenuItem value="GBP">GBP (£)</MenuItem>
                <MenuItem value="JPY">JPY (¥)</MenuItem>
                <MenuItem value="CAD">CAD ($)</MenuItem>
                <MenuItem value="INR">INR (₹)</MenuItem>
                <MenuItem value="AUD">AUD ($)</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {isLoading && (
        <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load compensation analytics: {(error as Error).message}
        </Alert>
      )}

      {!isLoading && !error && data && (
        <>
          {/* Visual Comparison Chart */}
          <Card sx={{ mb: 3.5 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Mean vs. Median Base Salary Comparison
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                Displaying top groups by headcount for the selected dimension.
              </Typography>

              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                    <XAxis
                      dataKey="name"
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <YAxis
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        `${Number(val).toLocaleString()} (Local Currency)`,
                        name === 'mean' ? 'Mean Salary' : 'Median Salary',
                      ]}
                      labelFormatter={(label: any, payload: any) => {
                        const item = payload?.[0]?.payload;
                        return item ? `${item.fullName} (${item.currency})` : label;
                      }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="mean" name="Mean Salary" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="median" name="Median Salary" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>

          {/* Statistical Data Table */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Detailed Compensation Metrics Table
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                Calculated directly in the database from 10,000 active employee records.
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Group Dimension</TableCell>
                      <TableCell>Currency</TableCell>
                      <TableCell align="right">Headcount</TableCell>
                      <TableCell align="right">Mean Salary</TableCell>
                      <TableCell align="right">Median Salary</TableCell>
                      <TableCell align="right">Min Salary</TableCell>
                      <TableCell align="right">Max Salary</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.groups.map((group, idx) => (
                      <TableRow key={`${group.group_key}-${idx}`} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{group.group_name}</TableCell>
                        <TableCell>
                          <CurrencyBadge currency={group.currency} />
                        </TableCell>
                        <TableCell align="right">{formatNumber(group.headcount)}</TableCell>
                        <TableCell align="right">{formatMoney(group.mean_salary, group.currency)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: '#4f46e5' }}>
                          {formatMoney(group.median_salary, group.currency)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#64748b' }}>
                          {formatMoney(group.min_salary, group.currency)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#64748b' }}>
                          {formatMoney(group.max_salary, group.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};
