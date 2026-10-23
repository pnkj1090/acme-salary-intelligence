import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { EmployeeDirectoryPage } from '../features/employees/EmployeeDirectoryPage';
import { api } from '../api/client';

vi.mock('../api/client', () => ({
  api: {
    getEmployees: vi.fn(),
    getDepartments: vi.fn(),
    getExportCsvUrl: vi.fn().mockReturnValue('/api/v1/export/employees'),
  },
}));

const mockDepartments = [
  { id: 1, code: 'ENG', name: 'Engineering' },
  { id: 2, code: 'SALES', name: 'Sales' },
];

const mockEmployeesResponse = {
  items: [
    {
      id: 1,
      employee_number: 'EMP-00001',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe.1@acme-corp.internal',
      country_code: 'US',
      department_id: 1,
      department_name: 'Engineering',
      job_title: 'Software Engineer',
      employment_status: 'ACTIVE',
      hire_date: '2022-04-10',
      current_salary: 130000,
      currency_code: 'USD',
      created_at: '2022-04-10T00:00:00Z',
      updated_at: '2022-04-10T00:00:00Z',
    },
  ],
  total: 10000,
  page: 1,
  size: 50,
  pages: 200,
};

describe('EmployeeDirectoryPage Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('renders employee table with search, filters, and records', async () => {
    (api.getDepartments as any).mockResolvedValue(mockDepartments);
    (api.getEmployees as any).mockResolvedValue(mockEmployeesResponse);

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <EmployeeDirectoryPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Employee Directory')).toBeInTheDocument();
      expect(screen.getByText('EMP-00001')).toBeInTheDocument();
    });

    // Check search input
    expect(screen.getByPlaceholderText(/Search name, ID, email, title.../i)).toBeInTheDocument();

    // Check record row
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('$130,000.00 USD')).toBeInTheDocument();

    // Check pagination count
    expect(screen.getByText(/1–50 of 10000/i)).toBeInTheDocument();
  });

  it('opens add employee modal when clicking button', async () => {
    (api.getDepartments as any).mockResolvedValue(mockDepartments);
    (api.getEmployees as any).mockResolvedValue(mockEmployeesResponse);

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <EmployeeDirectoryPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Add Employee')).toBeInTheDocument();
    });

    const addBtn = screen.getByText('Add Employee');
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText('Onboard New Employee')).toBeInTheDocument();
    });
  });
});
