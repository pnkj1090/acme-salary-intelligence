import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { api } from '../api/client';

vi.mock('../api/client', () => ({
  api: {
    getDashboardSummary: vi.fn(),
  },
}));

const mockSummary = {
  total_employees: 10000,
  active_employees: 9300,
  inactive_employees: 700,
  currency_payrolls: [
    {
      currency: 'USD',
      total_payroll: 420000000,
      employee_count: 3200,
      mean_salary: 131250,
      median_salary: 125000,
      min_salary: 70000,
      max_salary: 220000,
    },
    {
      currency: 'EUR',
      total_payroll: 136000000,
      employee_count: 1600,
      mean_salary: 85000,
      median_salary: 82000,
      min_salary: 55000,
      max_salary: 150000,
    },
  ],
  total_payroll_usd_normalized: 1045000000,
  country_distribution: [
    { country_code: 'US', country_name: 'United States', headcount: 3200, percentage: 32.0 },
    { country_code: 'DE', country_name: 'Germany', headcount: 1600, percentage: 16.0 },
  ],
  department_distribution: [
    {
      department_id: 1,
      department_code: 'ENG',
      department_name: 'Engineering',
      headcount: 2500,
      percentage: 25.0,
      total_payroll_usd_normalized: 310000000,
      mean_salary_usd_normalized: 124000,
      median_salary_usd_normalized: 120000,
    },
  ],
  benchmark_rates: { USD: 1.0, EUR: 1.08 },
};

describe('DashboardPage Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.getDashboardSummary as any).mockReturnValue(new Promise(() => {}));
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders dashboard metrics upon successful fetch', async () => {
    (api.getDashboardSummary as any).mockResolvedValue(mockSummary);
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Global Compensation Overview')).toBeInTheDocument();
    });

    // Check KPIs
    expect(screen.getByText('10,000')).toBeInTheDocument();
    expect(screen.getByText('Total Workforce')).toBeInTheDocument();
    expect(screen.getByText('Regional Currency Compensation Breakdown')).toBeInTheDocument();

    // Check strict currency table
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('EUR')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    (api.getDashboardSummary as any).mockRejectedValue(new Error('Backend offline'));
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load executive dashboard data/i)).toBeInTheDocument();
    });
  });
});
