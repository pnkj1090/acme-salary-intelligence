import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Button,
  Chip,
} from '@mui/material';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LanguageIcon from '@mui/icons-material/Language';
import BusinessIcon from '@mui/icons-material/Business';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

import { api } from '../../api/client';
import { StatCard } from '../../components/StatCard';
import { CurrencyBadge } from '../../components/CurrencyBadge';
import { formatMoney, formatNumber } from '../../utils/formatters';

const CHART_COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

export const DashboardPage: React.FC = () => {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: api.getDashboardSummary,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !summary) {
    return (
      <Alert severity="error" sx={{ my: 3 }}>
        Failed to load executive dashboard data: {(error as Error)?.message || 'Unknown error'}
      </Alert>
    );
  }

  // Pre-formatted data for charts
  const countryChartData = summary.country_distribution.map((c) => ({
    name: c.country_name,
    code: c.country_code,
    headcount: c.headcount,
    percentage: c.percentage,
  }));

  const deptChartData = summary.department_distribution.map((d) => ({
    name: d.department_name,
    headcount: d.headcount,
    payrollUsd: typeof d.total_payroll_usd_normalized === 'string' ? parseFloat(d.total_payroll_usd_normalized) : d.total_payroll_usd_normalized,
    meanSalaryUsd: typeof d.mean_salary_usd_normalized === 'string' ? parseFloat(d.mean_salary_usd_normalized) : d.mean_salary_usd_normalized,
  }));

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Global Compensation Overview
          </Typography>
          <Typography variant="subtitle1">
            Real-time salary intelligence across {formatNumber(summary.total_employees)} employees and 7 regional currencies.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            component={RouterLink}
            to="/employees"
            variant="outlined"
            endIcon={<ArrowForwardIcon />}
          >
            Employee Directory
          </Button>
          <Button
            component={RouterLink}
            to="/questions"
            variant="contained"
            color="secondary"
            endIcon={<ArrowForwardIcon />}
          >
            Ask Questions
          </Button>
        </Box>
      </Box>

      {/* KPI Stat Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Workforce"
            value={formatNumber(summary.total_employees)}
            subtitle={`${formatNumber(summary.active_employees)} Active • ${formatNumber(summary.inactive_employees)} Inactive`}
            icon={<PeopleOutlineIcon sx={{ fontSize: 28 }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Global Payroll (USD Norm.)"
            value={formatMoney(summary.total_payroll_usd_normalized, 'USD')}
            subtitle="Normalized across 7 currencies"
            footnote="Using benchmark reference rates"
            icon={<AttachMoneyIcon sx={{ fontSize: 28 }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Operating Countries"
            value={summary.country_distribution.length}
            subtitle="North America, Europe, APAC"
            icon={<LanguageIcon sx={{ fontSize: 28 }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Departments"
            value={summary.department_distribution.length}
            subtitle="All business divisions"
            icon={<BusinessIcon sx={{ fontSize: 28 }} />}
          />
        </Grid>
      </Grid>

      {/* Strict Currency Isolation Table */}
      <Card sx={{ mb: 3.5 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6">
                Regional Currency Compensation Breakdown
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Strict currency isolation. Regional currencies are never naively summed together into misleading totals.
              </Typography>
            </Box>
            <Chip label="Zero Currency Corruption" color="primary" size="small" variant="outlined" />
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Currency</TableCell>
                  <TableCell align="right">Headcount</TableCell>
                  <TableCell align="right">Annual Payroll</TableCell>
                  <TableCell align="right">Mean Salary</TableCell>
                  <TableCell align="right">Median Salary</TableCell>
                  <TableCell align="right">Min Salary</TableCell>
                  <TableCell align="right">Max Salary</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.currency_payrolls.map((cp) => (
                  <TableRow key={cp.currency} hover>
                    <TableCell>
                      <CurrencyBadge currency={cp.currency} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatNumber(cp.employee_count)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#0f172a' }}>
                      {formatMoney(cp.total_payroll, cp.currency)}
                    </TableCell>
                    <TableCell align="right">{formatMoney(cp.mean_salary, cp.currency)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#4f46e5' }}>
                      {formatMoney(cp.median_salary, cp.currency)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: '#64748b' }}>
                      {formatMoney(cp.min_salary, cp.currency)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: '#64748b' }}>
                      {formatMoney(cp.max_salary, cp.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Visual Analytics Grid */}
      <Grid container spacing={3}>
        {/* Headcount by Country */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Headcount by Country
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                Workforce distribution across regional hubs.
              </Typography>

              <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={countryChartData}
                      dataKey="headcount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={55}
                      paddingAngle={3}
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                    >
                      {countryChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${formatNumber(val)} Employees`, 'Headcount']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Department Compensation Comparisons */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Department Total Annual Spend (USD Normalized)
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                Normalized comparison using standard benchmark exchange rates.
              </Typography>

              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChartData} margin={{ top: 10, right: 20, left: 20, bottom: 40 }}>
                    <XAxis
                      dataKey="name"
                      angle={-30}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <YAxis
                      tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <Tooltip
                      formatter={(val: number) => [`$${(val / 1000000).toFixed(2)}M USD`, 'Annual Payroll']}
                    />
                    <Bar dataKey="payrollUsd" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
