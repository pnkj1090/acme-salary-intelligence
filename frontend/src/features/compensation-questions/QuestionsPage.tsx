import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
} from '@mui/material';
import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { api } from '../../api/client';
import { QuestionQueryParams, QuestionAnswerResponse } from '../../types';

const PIE_COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

export const QuestionsPage: React.FC = () => {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('active_employees_by_country');
  const [countryCode, setCountryCode] = useState<string>('US');
  const [currencyCode, setCurrencyCode] = useState<string>('USD');
  const [departmentId, setDepartmentId] = useState<number>(1);
  const [salaryThreshold, setSalaryThreshold] = useState<number>(120000);

  // Fetch available templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['questionTemplates'],
    queryFn: api.getQuestionTemplates,
  });

  // Query mutation
  const queryMutation = useMutation({
    mutationFn: (params: QuestionQueryParams) => api.queryQuestion(params),
  });

  const selectedTemplate = templates.find((t) => t.id === selectedQuestionId);

  // Auto-run first question on load
  useEffect(() => {
    if (templates.length > 0 && !queryMutation.data && !queryMutation.isPending) {
      queryMutation.mutate({
        question_id: 'active_employees_by_country',
      });
    }
  }, [templates]);

  const handleRunQuery = () => {
    queryMutation.mutate({
      question_id: selectedQuestionId,
      country_code: countryCode,
      currency_code: currencyCode,
      department_id: departmentId,
      salary_threshold: salaryThreshold,
    });
  };

  const answer = queryMutation.data as QuestionAnswerResponse | undefined;

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Compensation Intelligence Query Hub
        </Typography>
        <Typography variant="subtitle1">
          Deterministic, parameterized executive queries answering key questions about organizational pay.
        </Typography>
      </Box>

      {/* Query Selector Card */}
      <Card sx={{ mb: 3.5 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PsychologyAltIcon sx={{ color: '#6366f1' }} />
            Select Predefined Question Template
          </Typography>

          {isLoadingTemplates ? (
            <CircularProgress size={24} />
          ) : (
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={7}>
                <TextField
                  select
                  fullWidth
                  label="Executive Compensation Question"
                  value={selectedQuestionId}
                  onChange={(e) => setSelectedQuestionId(e.target.value)}
                >
                  {templates.map((tpl) => (
                    <MenuItem key={tpl.id} value={tpl.id}>
                      {tpl.title}
                    </MenuItem>
                  ))}
                </TextField>
                {selectedTemplate && (
                  <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                    {selectedTemplate.description}
                  </Typography>
                )}
              </Grid>

              {/* Dynamic Parameter Inputs based on template requirements */}
              {selectedQuestionId === 'avg_median_by_country_currency' && (
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Select Country"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                  >
                    <MenuItem value="US">United States (USD)</MenuItem>
                    <MenuItem value="DE">Germany (EUR)</MenuItem>
                    <MenuItem value="GB">United Kingdom (GBP)</MenuItem>
                    <MenuItem value="JP">Japan (JPY)</MenuItem>
                    <MenuItem value="CA">Canada (CAD)</MenuItem>
                    <MenuItem value="IN">India (INR)</MenuItem>
                    <MenuItem value="AU">Australia (AUD)</MenuItem>
                  </TextField>
                </Grid>
              )}

              {selectedQuestionId === 'salary_distribution_by_department' && (
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Select Department"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(Number(e.target.value))}
                  >
                    <MenuItem value={1}>Engineering</MenuItem>
                    <MenuItem value={2}>Product Management</MenuItem>
                    <MenuItem value={3}>Sales & Revenue</MenuItem>
                    <MenuItem value={4}>Marketing & Growth</MenuItem>
                    <MenuItem value={5}>Human Resources</MenuItem>
                    <MenuItem value={6}>Finance & Accounting</MenuItem>
                    <MenuItem value={7}>Legal & Compliance</MenuItem>
                    <MenuItem value={8}>Operations & Support</MenuItem>
                  </TextField>
                </Grid>
              )}

              {(selectedQuestionId === 'employees_above_salary_threshold' ||
                selectedQuestionId === 'salary_ranges_by_job_title') && (
                <Grid item xs={12} sm={6} md={2.5}>
                  <TextField
                    select
                    fullWidth
                    label="Currency"
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value)}
                  >
                    <MenuItem value="USD">USD ($)</MenuItem>
                    <MenuItem value="EUR">EUR (€)</MenuItem>
                    <MenuItem value="GBP">GBP (£)</MenuItem>
                    <MenuItem value="JPY">JPY (¥)</MenuItem>
                    <MenuItem value="CAD">CAD ($)</MenuItem>
                    <MenuItem value="INR">INR (₹)</MenuItem>
                    <MenuItem value="AUD">AUD ($)</MenuItem>
                  </TextField>
                </Grid>
              )}

              {selectedQuestionId === 'employees_above_salary_threshold' && (
                <Grid item xs={12} sm={6} md={2.5}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Salary Threshold"
                    value={salaryThreshold}
                    onChange={(e) => setSalaryThreshold(Number(e.target.value))}
                  />
                </Grid>
              )}

              <Grid item xs={12} md={selectedQuestionId === 'active_employees_by_country' || selectedQuestionId === 'highest_median_salary_department' || selectedQuestionId === 'highest_total_payroll_departments' ? 5 : 2} sx={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  size="large"
                  onClick={handleRunQuery}
                  disabled={queryMutation.isPending}
                  startIcon={queryMutation.isPending ? <CircularProgress size={18} /> : <PlayArrowIcon />}
                  sx={{ height: 54 }}
                >
                  Execute Query
                </Button>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Query Error Alert */}
      {queryMutation.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to process query: {(queryMutation.error as Error).message}
        </Alert>
      )}

      {/* Query Answer Container */}
      {answer && (
        <Box>
          {/* Natural Language Summary Banner */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3.5,
              backgroundColor: '#eef2ff',
              border: '1px solid #c7d2fe',
              borderRadius: 3,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Typography variant="overline" sx={{ fontWeight: 700, color: '#4338ca', letterSpacing: '0.08em' }}>
                Verified Query Result
              </Typography>
              {answer.currency_basis && (
                <Chip label={`Basis: ${answer.currency_basis}`} size="small" color="primary" sx={{ fontWeight: 600 }} />
              )}
            </Box>

            <Typography variant="h6" sx={{ color: '#1e1b4b', fontWeight: 600, lineHeight: 1.5, mb: 1 }}>
              {answer.natural_language_summary}
            </Typography>

            {answer.numerical_result !== undefined && answer.numerical_result !== null && (
              <Box sx={{ mt: 2, display: 'inline-flex', alignItems: 'baseline', gap: 1, backgroundColor: '#ffffff', px: 2, py: 1, borderRadius: 2, border: '1px solid #e0e7ff' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Key Numerical Output:
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#4f46e5' }}>
                  {typeof answer.numerical_result === 'number'
                    ? answer.numerical_result.toLocaleString()
                    : String(answer.numerical_result)}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Results Visual & Table Grid */}
          <Grid container spacing={3}>
            {/* Visual Chart if applicable */}
            {answer.chart_data && answer.chart_data.length > 0 && (
              <Grid item xs={12} md={answer.table_data.length > 0 ? 5 : 12}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Visual Breakdown
                    </Typography>

                    <Box sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        {answer.chart_type === 'pie' ? (
                          <PieChart>
                            <Pie
                              data={answer.chart_data}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={95}
                              innerRadius={50}
                              paddingAngle={3}
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            >
                              {answer.chart_data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(val: number) => [val.toLocaleString(), 'Count']} />
                          </PieChart>
                        ) : (
                          <BarChart data={answer.chart_data} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                            <XAxis
                              dataKey="name"
                              angle={-25}
                              textAnchor="end"
                              interval={0}
                              tick={{ fontSize: 11, fill: '#64748b' }}
                            />
                            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                            <Tooltip formatter={(val: number) => [val.toLocaleString(), 'Value']} />
                            <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Results Table */}
            {answer.table_data.length > 0 && (
              <Grid item xs={12} md={answer.chart_data && answer.chart_data.length > 0 ? 7 : 12}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Tabular Data View
                    </Typography>

                    <TableContainer sx={{ maxHeight: 380 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            {answer.table_columns.map((col) => (
                              <TableCell key={col} sx={{ fontWeight: 600 }}>
                                {col}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {answer.table_data.map((row, rIdx) => (
                            <TableRow key={rIdx} hover>
                              {Object.values(row).map((val: any, cIdx) => (
                                <TableCell key={cIdx}>
                                  {typeof val === 'number' ? val.toLocaleString() : String(val)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Box>
      )}
    </Box>
  );
};
