import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { QuestionsPage } from '../features/compensation-questions/QuestionsPage';
import { api } from '../api/client';

vi.mock('../api/client', () => ({
  api: {
    getQuestionTemplates: vi.fn(),
    queryQuestion: vi.fn(),
  },
}));

const mockTemplates = [
  {
    id: 'active_employees_by_country',
    title: 'How many active employees are there in each country?',
    description: 'Returns headcount of active personnel.',
    parameters: [],
  },
];

const mockAnswer = {
  question_id: 'active_employees_by_country',
  question_title: 'How many active employees are there in each country?',
  natural_language_summary: 'ACME has 9,300 active employees across 7 countries.',
  numerical_result: 9300,
  filters_applied: { employment_status: 'ACTIVE' },
  currency_basis: 'Headcount',
  table_columns: ['Country Code', 'Active Headcount'],
  table_data: [{ country_code: 'US', active_headcount: 3200 }],
  chart_type: 'pie',
  chart_data: [{ name: 'United States', value: 3200 }],
};

describe('QuestionsPage Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('renders questions query hub and runs selected query', async () => {
    (api.getQuestionTemplates as any).mockResolvedValue(mockTemplates);
    (api.queryQuestion as any).mockResolvedValue(mockAnswer);

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <QuestionsPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Compensation Intelligence Query Hub')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Execute Query/i })).toBeInTheDocument();
    });

    const executeBtn = screen.getByRole('button', { name: /Execute Query/i });
    fireEvent.click(executeBtn);

    await waitFor(() => {
      expect(screen.getByText(/ACME has 9,300 active employees/i)).toBeInTheDocument();
      expect(screen.getByText('9,300')).toBeInTheDocument();
    });
  });
});
