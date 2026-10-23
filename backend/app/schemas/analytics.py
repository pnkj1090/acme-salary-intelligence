from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class CurrencyPayrollStat(BaseModel):
    currency: str
    total_payroll: Decimal
    employee_count: int
    mean_salary: Decimal
    median_salary: Decimal
    min_salary: Decimal
    max_salary: Decimal


class CountryHeadcount(BaseModel):
    country_code: str
    country_name: str
    headcount: int
    percentage: float


class DepartmentStat(BaseModel):
    department_id: int
    department_code: str
    department_name: str
    headcount: int
    percentage: float
    total_payroll_usd_normalized: Decimal
    mean_salary_usd_normalized: Decimal
    median_salary_usd_normalized: Decimal


class SalaryDistributionBin(BaseModel):
    bin_label: str
    min_val: Decimal
    max_val: Decimal
    count: int


class DashboardSummary(BaseModel):
    total_employees: int
    active_employees: int
    inactive_employees: int
    currency_payrolls: List[CurrencyPayrollStat]
    total_payroll_usd_normalized: Decimal
    country_distribution: List[CountryHeadcount]
    department_distribution: List[DepartmentStat]
    benchmark_rates: Dict[str, float]


class AnalyticsDimensionGroup(BaseModel):
    group_key: str
    group_name: str
    headcount: int
    mean_salary: Decimal
    median_salary: Decimal
    min_salary: Decimal
    max_salary: Decimal
    currency: str


class AnalyticsBreakdownResponse(BaseModel):
    dimension: str
    currency: Optional[str] = None
    groups: List[AnalyticsDimensionGroup]
    total_headcount: int
