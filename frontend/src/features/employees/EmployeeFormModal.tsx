import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';

import { Department, EmployeeDetail, EmployeeCreateInput, EmployeeUpdateInput } from '../../types';
import { COUNTRY_NAMES } from '../../utils/formatters';

const COUNTRY_TO_DEFAULT_CURRENCY: Record<string, string> = {
  US: 'USD',
  GB: 'GBP',
  DE: 'EUR',
  JP: 'JPY',
  CA: 'CAD',
  IN: 'INR',
  AU: 'AUD',
};

interface EmployeeFormModalProps {
  open: boolean;
  employee: EmployeeDetail | null;
  departments: Department[];
  onClose: () => void;
  onSubmitCreate: (data: EmployeeCreateInput) => Promise<void>;
  onSubmitUpdate: (id: number, data: EmployeeUpdateInput) => Promise<void>;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  open,
  employee,
  departments,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}) => {
  const isEdit = Boolean(employee);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('US');
  const [departmentId, setDepartmentId] = useState<number>(1);
  const [jobTitle, setJobTitle] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('ACTIVE');
  const [hireDate, setHireDate] = useState('2024-01-15');
  const [annualSalary, setAnnualSalary] = useState<string>('120000');
  const [currencyCode, setCurrencyCode] = useState('USD');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (employee) {
      setFirstName(employee.first_name);
      setLastName(employee.last_name);
      setEmail(employee.email);
      setCountryCode(employee.country_code);
      setDepartmentId(employee.department_id);
      setJobTitle(employee.job_title);
      setEmploymentStatus(employee.employment_status);
      setHireDate(employee.hire_date);
      setAnnualSalary(employee.current_salary ? String(employee.current_salary) : '0');
      setCurrencyCode(employee.currency_code || 'USD');
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setCountryCode('US');
      setDepartmentId(departments[0]?.id || 1);
      setJobTitle('');
      setEmploymentStatus('ACTIVE');
      setHireDate(new Date().toISOString().split('T')[0]);
      setAnnualSalary('120000');
      setCurrencyCode('USD');
    }
    setErrorMsg(null);
  }, [employee, departments, open]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCountry = e.target.value;
    setCountryCode(newCountry);
    // Auto-align default regional currency when country changes
    if (!isEdit && COUNTRY_TO_DEFAULT_CURRENCY[newCountry]) {
      setCurrencyCode(COUNTRY_TO_DEFAULT_CURRENCY[newCountry]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Frontend validation
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('First and last name are required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('A valid email address is required.');
      return;
    }
    if (!jobTitle.trim()) {
      setErrorMsg('Job title is required.');
      return;
    }
    const parsedSalary = parseFloat(annualSalary);
    if (isNaN(parsedSalary) || parsedSalary <= 0) {
      setErrorMsg('Annual salary must be a positive number greater than 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEdit && employee) {
        await onSubmitUpdate(employee.id, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          country_code: countryCode,
          department_id: departmentId,
          job_title: jobTitle.trim(),
          employment_status: employmentStatus,
          hire_date: hireDate,
          annual_salary: parsedSalary,
          currency_code: currencyCode,
        });
      } else {
        await onSubmitCreate({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          country_code: countryCode,
          department_id: departmentId,
          job_title: jobTitle.trim(),
          employment_status: employmentStatus,
          hire_date: hireDate,
          annual_salary: parsedSalary,
          currency_code: currencyCode,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving employee data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {isEdit ? `Edit Employee (${employee?.employee_number})` : 'Onboard New Employee'}
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2.5 }}>
              {errorMsg}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                fullWidth
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                fullWidth
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Corporate Email"
                fullWidth
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                helperText="Must be unique across the organization"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Department"
                select
                fullWidth
                required
                value={departmentId}
                onChange={(e) => setDepartmentId(Number(e.target.value))}
              >
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Country Office"
                select
                fullWidth
                required
                value={countryCode}
                onChange={handleCountryChange}
              >
                {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
                  <MenuItem key={code} value={code}>
                    {name} ({code})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Job Title"
                fullWidth
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Employment Status"
                select
                fullWidth
                required
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
              >
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="ON_LEAVE">On Leave</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
                <MenuItem value="TERMINATED">Terminated</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Hire Date"
                type="date"
                fullWidth
                required
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={7}>
              <TextField
                label="Annual Base Salary"
                type="number"
                fullWidth
                required
                value={annualSalary}
                onChange={(e) => setAnnualSalary(e.target.value)}
                helperText={isEdit ? 'Adjusting salary preserves prior historical records' : 'Starting annual base'}
              />
            </Grid>

            <Grid item xs={12} sm={5}>
              <TextField
                label="Currency"
                select
                fullWidth
                required
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
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} variant="outlined" startIcon={<CloseIcon />}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={18} /> : <SaveIcon />}
          >
            {isEdit ? 'Save Changes' : 'Create Employee'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
