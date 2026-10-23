import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { EmployeeDetail } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { CurrencyBadge } from '../../components/CurrencyBadge';
import { formatMoney, formatDate, getCountryName } from '../../utils/formatters';

interface EmployeeDetailModalProps {
  employee: EmployeeDetail | null;
  open: boolean;
  onClose: () => void;
  onEdit: (employee: EmployeeDetail) => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  employee,
  open,
  onClose,
  onEdit,
}) => {
  if (!employee) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {employee.first_name} {employee.last_name}
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            {employee.employee_number} • {employee.job_title}
          </Typography>
        </Box>
        <StatusBadge status={employee.employment_status} />
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {/* Profile Attributes */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', mb: 2 }}>
          Employee Profile
        </Typography>

        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
              Work Email
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {employee.email}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
              Department
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {employee.department_name || `Dept #${employee.department_id}`}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
              Country Location
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {getCountryName(employee.country_code)} ({employee.country_code})
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
              Hire Date
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatDate(employee.hire_date)}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
              Current Base Salary
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
              {formatMoney(employee.current_salary, employee.currency_code || 'USD')}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
              Currency
            </Typography>
            <CurrencyBadge currency={employee.currency_code || 'USD'} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Auditable Compensation Timeline */}
        <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
              Compensation History & Audit Trail
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              All salary changes preserve past records without destructive overwrites.
            </Typography>
          </Box>
        </Box>

        <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Annual Salary</TableCell>
                <TableCell>Currency</TableCell>
                <TableCell>Effective From</TableCell>
                <TableCell>Effective To</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employee.compensations && employee.compensations.length > 0 ? (
                employee.compensations.map((comp) => {
                  const isActive = comp.effective_to === null;
                  return (
                    <TableRow key={comp.id} sx={{ backgroundColor: isActive ? '#f8fafc' : 'inherit' }}>
                      <TableCell>
                        <Chip
                          label={isActive ? 'Current Active' : 'Historical (Closed)'}
                          size="small"
                          color={isActive ? 'success' : 'default'}
                          variant={isActive ? 'filled' : 'outlined'}
                          sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {formatMoney(comp.annual_salary, comp.currency_code)}
                      </TableCell>
                      <TableCell>
                        <CurrencyBadge currency={comp.currency_code} />
                      </TableCell>
                      <TableCell>{formatDate(comp.effective_from)}</TableCell>
                      <TableCell>{comp.effective_to ? formatDate(comp.effective_to) : 'Present'}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3, color: '#64748b' }}>
                    No compensation records on file.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined" startIcon={<CloseIcon />}>
          Close
        </Button>
        <Button
          onClick={() => {
            onClose();
            onEdit(employee);
          }}
          variant="contained"
          color="secondary"
          startIcon={<EditIcon />}
        >
          Edit & Adjust Salary
        </Button>
      </DialogActions>
    </Dialog>
  );
};
