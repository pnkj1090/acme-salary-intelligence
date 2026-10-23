export interface Department {
  id: number;
  code: string;
  name: string;
}

export interface Compensation {
  id: number;
  employee_id: number;
  annual_salary: string | number;
  currency_code: string;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
}

export interface Employee {
  id: number;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  country_code: string;
  department_id: number;
  department_name?: string;
  job_title: string;
  employment_status: string;
  hire_date: string;
  current_salary?: string | number;
  currency_code?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeDetail extends Employee {
  compensations: Compensation[];
}

export interface EmployeeCreateInput {
  employee_number?: string;
  first_name: string;
  last_name: string;
  email: string;
  country_code: string;
  department_id: number;
  job_title: string;
  employment_status: string;
  hire_date: string;
  annual_salary: number;
  currency_code: string;
}

export interface EmployeeUpdateInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  country_code?: string;
  department_id?: number;
  job_title?: string;
  employment_status?: string;
  hire_date?: string;
  annual_salary?: number;
  currency_code?: string;
}

export interface EmployeeListResponse {
  items: Employee[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface EmployeeFilterParams {
  page: number;
  size: number;
  search?: string;
  country_code?: string;
  department_id?: number;
  employment_status?: string;
  currency_code?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CurrencyPayrollStat {
  currency: string;
  total_payroll: number | string;
  employee_count: number;
  mean_salary: number | string;
  median_salary: number | string;
  min_salary: number | string;
  max_salary: number | string;
}

export interface CountryHeadcount {
  country_code: string;
  country_name: string;
  headcount: number;
  percentage: number;
}

export interface DepartmentStat {
  department_id: number;
  department_code: string;
  department_name: string;
  headcount: number;
  percentage: number;
  total_payroll_usd_normalized: number | string;
  mean_salary_usd_normalized: number | string;
  median_salary_usd_normalized: number | string;
}

export interface DashboardSummary {
  total_employees: number;
  active_employees: number;
  inactive_employees: number;
  currency_payrolls: CurrencyPayrollStat[];
  total_payroll_usd_normalized: number | string;
  country_distribution: CountryHeadcount[];
  department_distribution: DepartmentStat[];
  benchmark_rates: Record<string, number>;
}

export interface AnalyticsDimensionGroup {
  group_key: string;
  group_name: string;
  headcount: number;
  mean_salary: number | string;
  median_salary: number | string;
  min_salary: number | string;
  max_salary: number | string;
  currency: string;
}

export interface AnalyticsBreakdownResponse {
  dimension: string;
  currency?: string;
  groups: AnalyticsDimensionGroup[];
  total_headcount: number;
}

export interface QuestionParameter {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  default?: any;
  options?: { value: string; label: string }[];
}

export interface CompensationQuestionTemplate {
  id: string;
  title: string;
  description: string;
  parameters: QuestionParameter[];
}

export interface QuestionQueryParams {
  question_id: string;
  country_code?: string;
  currency_code?: string;
  department_id?: number;
  salary_threshold?: number;
}

export interface QuestionAnswerResponse {
  question_id: string;
  question_title: string;
  natural_language_summary: string;
  numerical_result?: any;
  filters_applied: Record<string, any>;
  currency_basis?: string;
  table_columns: string[];
  table_data: Record<string, any>[];
  chart_type?: string | null;
  chart_data?: { name: string; value: number }[] | null;
}
