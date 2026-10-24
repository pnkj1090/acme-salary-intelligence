import {
  Department,
  EmployeeDetail,
  EmployeeListResponse,
  EmployeeFilterParams,
  EmployeeCreateInput,
  EmployeeUpdateInput,
  DashboardSummary,
  AnalyticsBreakdownResponse,
  CompensationQuestionTemplate,
  QuestionQueryParams,
  QuestionAnswerResponse,
} from '../types';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorDetail = 'Network request failed';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  getHealth: () => request<{ status: string; database: string }>('/api/v1/health'),

  getDepartments: () => request<Department[]>('/api/v1/departments'),

  getDashboardSummary: () => request<DashboardSummary>('/api/v1/dashboard/summary'),

  getEmployees: (params: EmployeeFilterParams) => {
    const query = new URLSearchParams();
    query.set('page', params.page.toString());
    query.set('size', params.size.toString());
    if (params.search) query.set('search', params.search);
    if (params.country_code) query.set('country_code', params.country_code);
    if (params.department_id) query.set('department_id', params.department_id.toString());
    if (params.employment_status) query.set('employment_status', params.employment_status);
    if (params.currency_code) query.set('currency_code', params.currency_code);
    if (params.sort_by) query.set('sort_by', params.sort_by);
    if (params.sort_order) query.set('sort_order', params.sort_order);

    return request<EmployeeListResponse>(`/api/v1/employees?${query.toString()}`);
  },

  getEmployee: (id: number) => request<EmployeeDetail>(`/api/v1/employees/${id}`),

  createEmployee: (input: EmployeeCreateInput) =>
    request<EmployeeDetail>('/api/v1/employees', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateEmployee: (id: number, input: EmployeeUpdateInput) =>
    request<EmployeeDetail>(`/api/v1/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  deactivateEmployee: (id: number) =>
    request<EmployeeDetail>(`/api/v1/employees/${id}/deactivate`, {
      method: 'POST',
    }),

  getAnalytics: (dimension: string, currency?: string) => {
    const query = new URLSearchParams();
    query.set('dimension', dimension);
    if (currency) query.set('currency', currency);
    return request<AnalyticsBreakdownResponse>(`/api/v1/analytics/breakdown?${query.toString()}`);
  },

  getQuestionTemplates: () => request<CompensationQuestionTemplate[]>('/api/v1/questions/templates'),

  queryQuestion: (params: QuestionQueryParams) =>
    request<QuestionAnswerResponse>('/api/v1/questions/query', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getExportCsvUrl: (params: Partial<EmployeeFilterParams>) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.country_code) query.set('country_code', params.country_code);
    if (params.department_id) query.set('department_id', params.department_id.toString());
    if (params.employment_status) query.set('employment_status', params.employment_status);
    if (params.currency_code) query.set('currency_code', params.currency_code);

    return `${API_BASE_URL}/api/v1/export/employees?${query.toString()}`;
  },
};
