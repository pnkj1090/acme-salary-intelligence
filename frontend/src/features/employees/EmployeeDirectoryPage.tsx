import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  TablePagination,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Grid,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

import { api } from '../../api/client';
import { Employee, EmployeeDetail, EmployeeCreateInput, EmployeeUpdateInput } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { CurrencyBadge } from '../../components/CurrencyBadge';
import { formatMoney, formatDate, getCountryName, COUNTRY_NAMES } from '../../utils/formatters';
import { EmployeeDetailModal } from './EmployeeDetailModal';
import { EmployeeFormModal } from './EmployeeFormModal';

export const EmployeeDirectoryPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [page, setPage] = useState<number>(0); // 0-indexed for MUI TablePagination
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal states
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<EmployeeDetail | null>(null);

  // Deactivation confirmation dialog
  const [deactivateTarget, setDeactivateTarget] = useState<Employee | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch departments for filter dropdown
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: api.getDepartments,
  });

  // Query paginated employees
  const { data, isLoading, error } = useQuery({
    queryKey: [
      'employees',
      page + 1,
      rowsPerPage,
      debouncedSearch,
      countryFilter,
      departmentFilter,
      statusFilter,
      currencyFilter,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      api.getEmployees({
        page: page + 1,
        size: rowsPerPage,
        search: debouncedSearch || undefined,
        country_code: countryFilter || undefined,
        department_id: departmentFilter ? Number(departmentFilter) : undefined,
        employment_status: statusFilter || undefined,
        currency_code: currencyFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      }),
  });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setCountryFilter('');
    setDepartmentFilter('');
    setStatusFilter('');
    setCurrencyFilter('');
    setPage(0);
  };

  const handleViewDetails = async (emp: Employee) => {
    try {
      const detail = await api.getEmployee(emp.id);
      setSelectedEmployee(detail);
      setIsDetailOpen(true);
    } catch (err: any) {
      alert(`Failed to load employee details: ${err.message}`);
    }
  };

  const handleOpenEdit = async (emp: Employee | EmployeeDetail) => {
    try {
      const detail = 'compensations' in emp ? (emp as EmployeeDetail) : await api.getEmployee(emp.id);
      setEmployeeToEdit(detail);
      setIsFormOpen(true);
    } catch (err: any) {
      alert(`Failed to load employee for edit: ${err.message}`);
    }
  };

  const handleOpenCreate = () => {
    setEmployeeToEdit(null);
    setIsFormOpen(true);
  };

  const handleCreateEmployee = async (input: EmployeeCreateInput) => {
    await api.createEmployee(input);
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
  };

  const handleUpdateEmployee = async (id: number, input: EmployeeUpdateInput) => {
    await api.updateEmployee(id, input);
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      setIsDeactivating(true);
      await api.deactivateEmployee(deactivateTarget.id);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setDeactivateTarget(null);
    } catch (err: any) {
      alert(`Deactivation failed: ${err.message}`);
    } finally {
      setIsDeactivating(false);
    }
  };

  const exportUrl = api.getExportCsvUrl({
    search: debouncedSearch || undefined,
    country_code: countryFilter || undefined,
    department_id: departmentFilter ? Number(departmentFilter) : undefined,
    employment_status: statusFilter || undefined,
    currency_code: currencyFilter || undefined,
  });

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Employee Directory
          </Typography>
          <Typography variant="subtitle1">
            Server-side paginated management of ACME's 10,000 global personnel.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            href={exportUrl}
            target="_blank"
            download
            startIcon={<FileDownloadIcon />}
          >
            Export Filtered CSV
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
          >
            Add Employee
          </Button>
        </Box>
      </Box>

      {/* Filter Toolbar */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search name, ID, email, title..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94a3b8' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={6} sm={3} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Country"
                value={countryFilter}
                onChange={(e) => {
                  setCountryFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All Countries</MenuItem>
                {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
                  <MenuItem key={code} value={code}>
                    {name} ({code})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={6} sm={3} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Department"
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All Departments</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={6} sm={3} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="ON_LEAVE">On Leave</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
                <MenuItem value="TERMINATED">Terminated</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={6} sm={3} md={1.5}>
              <TextField
                select
                fullWidth
                size="small"
                label="Currency"
                value={currencyFilter}
                onChange={(e) => {
                  setCurrencyFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
                <MenuItem value="JPY">JPY</MenuItem>
                <MenuItem value="CAD">CAD</MenuItem>
                <MenuItem value="INR">INR</MenuItem>
                <MenuItem value="AUD">AUD</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={1.5} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="text"
                size="small"
                startIcon={<FilterAltOffIcon />}
                onClick={handleClearFilters}
                sx={{ color: '#64748b' }}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Employee Data Table */}
      <Card>
        {isLoading && (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            Failed to load employee records: {(error as Error).message}
          </Alert>
        )}

        {!isLoading && !error && data && (
          <>
            <TableContainer>
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell onClick={() => handleSort('employee_number')} sx={{ cursor: 'pointer' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        ID {sortBy === 'employee_number' && (sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />)}
                      </Box>
                    </TableCell>
                    <TableCell onClick={() => handleSort('last_name')} sx={{ cursor: 'pointer' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        Name {sortBy === 'last_name' && (sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />)}
                      </Box>
                    </TableCell>
                    <TableCell>Country</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell onClick={() => handleSort('job_title')} sx={{ cursor: 'pointer' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        Job Title {sortBy === 'job_title' && (sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />)}
                      </Box>
                    </TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right" onClick={() => handleSort('current_salary')} sx={{ cursor: 'pointer' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        Annual Salary {sortBy === 'current_salary' && (sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />)}
                      </Box>
                    </TableCell>
                    <TableCell onClick={() => handleSort('hire_date')} sx={{ cursor: 'pointer' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        Hire Date {sortBy === 'hire_date' && (sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />)}
                      </Box>
                    </TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 6, color: '#64748b' }}>
                        No employees found matching the current search and filter criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.items.map((emp) => (
                      <TableRow key={emp.id} hover>
                        <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>
                          {emp.employee_number}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {emp.first_name} {emp.last_name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            {emp.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{getCountryName(emp.country_code)}</Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            {emp.country_code}
                          </Typography>
                        </TableCell>
                        <TableCell>{emp.department_name || `Dept #${emp.department_id}`}</TableCell>
                        <TableCell>{emp.job_title}</TableCell>
                        <TableCell>
                          <StatusBadge status={emp.employment_status} />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatMoney(emp.current_salary, emp.currency_code || 'USD')}
                        </TableCell>
                        <TableCell>{formatDate(emp.hire_date)}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            <Tooltip title="View Profile & Compensation Audit">
                              <IconButton size="small" onClick={() => handleViewDetails(emp)}>
                                <VisibilityIcon fontSize="small" sx={{ color: '#475569' }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Profile & Adjust Salary">
                              <IconButton size="small" onClick={() => handleOpenEdit(emp)}>
                                <EditIcon fontSize="small" sx={{ color: '#4f46e5' }} />
                              </IconButton>
                            </Tooltip>
                            {emp.employment_status === 'ACTIVE' && (
                              <Tooltip title="Deactivate Employee (Soft Delete)">
                                <IconButton size="small" onClick={() => setDeactivateTarget(emp)}>
                                  <PersonOffIcon fontSize="small" sx={{ color: '#e11d48' }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={data.total}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </>
        )}
      </Card>

      {/* Employee Detail Modal */}
      <EmployeeDetailModal
        open={isDetailOpen}
        employee={selectedEmployee}
        onClose={() => setIsDetailOpen(false)}
        onEdit={(emp) => handleOpenEdit(emp)}
      />

      {/* Add / Edit Employee Modal */}
      <EmployeeFormModal
        open={isFormOpen}
        employee={employeeToEdit}
        departments={departments}
        onClose={() => setIsFormOpen(false)}
        onSubmitCreate={handleCreateEmployee}
        onSubmitUpdate={handleUpdateEmployee}
      />

      {/* Confirmation Dialog for Deactivation */}
      <Dialog open={Boolean(deactivateTarget)} onClose={() => setDeactivateTarget(null)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Employee Deactivation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to deactivate{' '}
            <strong>
              {deactivateTarget?.first_name} {deactivateTarget?.last_name} ({deactivateTarget?.employee_number})
            </strong>
            ?
            <br />
            <br />
            This sets their employment status to <em>INACTIVE</em> while preserving their complete compensation history and audit trail. This operation does not delete historical records.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeactivateTarget(null)} disabled={isDeactivating}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeactivate}
            color="error"
            variant="contained"
            disabled={isDeactivating}
            startIcon={isDeactivating ? <CircularProgress size={16} /> : <PersonOffIcon />}
          >
            Deactivate Employee
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
