from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.compensation import Compensation
from app.models.department import Department
from app.models.employee import Employee
from app.schemas.analytics import (
    AnalyticsBreakdownResponse,
    AnalyticsDimensionGroup,
    CountryHeadcount,
    CurrencyPayrollStat,
    DashboardSummary,
    DepartmentStat,
)


def calculate_median(values: List[Decimal]) -> Decimal:
    """Calculates exact median from a list of Decimal values."""
    if not values:
        return Decimal("0.00")
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    mid = n // 2
    if n % 2 == 1:
        return sorted_vals[mid]
    else:
        return (sorted_vals[mid - 1] + sorted_vals[mid]) / Decimal("2")


def get_dashboard_summary(db: Session) -> DashboardSummary:
    """
    Computes comprehensive dashboard metrics using fast SQL aggregate queries
    directly in the database to guarantee sub-second responsiveness over 10,000 records.
    """
    # 1. Total and status counts
    total_employees = db.query(Employee).count()
    active_employees = db.query(Employee).filter(Employee.employment_status == "ACTIVE").count()
    inactive_employees = total_employees - active_employees

    # 2. SQL database aggregation for active currencies in a single query
    currency_agg_rows = db.execute(text("""
        SELECT
            c.currency_code,
            COUNT(c.id) as emp_count,
            SUM(c.annual_salary) as total_payroll,
            AVG(c.annual_salary) as avg_salary,
            MIN(c.annual_salary) as min_salary,
            MAX(c.annual_salary) as max_salary
        FROM compensations c
        JOIN employees e ON e.id = c.employee_id
        WHERE e.employment_status = 'ACTIVE' AND c.effective_to IS NULL
        GROUP BY c.currency_code
    """)).fetchall()

    currency_payrolls: List[CurrencyPayrollStat] = []
    total_usd_normalized = Decimal("0.00")

    for row in currency_agg_rows:
        curr = row[0]
        cnt = row[1]
        total_p = Decimal(str(row[2] or 0)).quantize(Decimal("0.01"))
        mean_p = Decimal(str(row[3] or 0)).quantize(Decimal("0.01"))
        min_p = Decimal(str(row[4] or 0)).quantize(Decimal("0.01"))
        max_p = Decimal(str(row[5] or 0)).quantize(Decimal("0.01"))

        # Fast median lookup via index offset
        offset_idx = cnt // 2
        med_row = db.execute(text("""
            SELECT c.annual_salary
            FROM compensations c
            JOIN employees e ON e.id = c.employee_id
            WHERE e.employment_status = 'ACTIVE' AND c.effective_to IS NULL AND c.currency_code = :curr
            ORDER BY c.annual_salary
            LIMIT 1 OFFSET :offset_idx
        """), {"curr": curr, "offset_idx": offset_idx}).scalar()
        median_p = Decimal(str(med_row or mean_p)).quantize(Decimal("0.01"))

        currency_payrolls.append(
            CurrencyPayrollStat(
                currency=curr,
                total_payroll=total_p,
                employee_count=cnt,
                mean_salary=mean_p,
                median_salary=median_p,
                min_salary=min_p,
                max_salary=max_p,
            )
        )

        rate = Decimal(str(settings.EXCHANGE_RATES_TO_USD.get(curr, 1.0)))
        total_usd_normalized += total_p * rate

    currency_payrolls.sort(key=lambda x: x.employee_count, reverse=True)
    total_usd_normalized = total_usd_normalized.quantize(Decimal("0.01"))

    # 3. Country Headcount Distribution in single group-by query
    country_rows = db.execute(text("""
        SELECT country_code, COUNT(id)
        FROM employees
        GROUP BY country_code
        ORDER BY COUNT(id) DESC
    """)).fetchall()

    country_distribution = []
    for c_code, cnt in country_rows:
        c_name = settings.SUPPORTED_COUNTRIES.get(c_code, c_code)
        pct = round((cnt / total_employees * 100), 1) if total_employees > 0 else 0.0
        country_distribution.append(
            CountryHeadcount(
                country_code=c_code,
                country_name=c_name,
                headcount=cnt,
                percentage=pct,
            )
        )

    # 4. Department Headcounts and Spend in single group-by query
    dept_agg_rows = db.execute(text("""
        SELECT
            d.id,
            d.code,
            d.name,
            COUNT(DISTINCT e.id) as emp_count,
            c.currency_code,
            SUM(c.annual_salary) as sum_salary,
            AVG(c.annual_salary) as avg_salary
        FROM departments d
        LEFT JOIN employees e ON d.id = e.department_id AND e.employment_status = 'ACTIVE'
        LEFT JOIN compensations c ON e.id = c.employee_id AND c.effective_to IS NULL
        GROUP BY d.id, d.code, d.name, c.currency_code
    """)).fetchall()

    dept_map: Dict[int, Dict[str, Any]] = {}
    for row in dept_agg_rows:
        d_id = row[0]
        d_code = row[1]
        d_name = row[2]
        c_code = row[4]
        sum_sal = row[5]

        if d_id not in dept_map:
            dept_map[d_id] = {
                "id": d_id,
                "code": d_code,
                "name": d_name,
                "headcount": 0,
                "total_usd": Decimal("0.00"),
            }

        if sum_sal and c_code:
            rate = Decimal(str(settings.EXCHANGE_RATES_TO_USD.get(c_code, 1.0)))
            dept_map[d_id]["total_usd"] += Decimal(str(sum_sal)) * rate

    # Total headcount per department (including inactive)
    dept_headcounts = dict(db.execute(text("""
        SELECT department_id, COUNT(id) FROM employees GROUP BY department_id
    """)).fetchall())

    dept_distribution: List[DepartmentStat] = []
    for d_id, data in dept_map.items():
        h_cnt = dept_headcounts.get(d_id, 0)
        pct = round((h_cnt / total_employees * 100), 1) if total_employees > 0 else 0.0
        tot_usd = data["total_usd"].quantize(Decimal("0.01"))
        mean_usd = (tot_usd / Decimal(h_cnt)).quantize(Decimal("0.01")) if h_cnt > 0 else Decimal("0.00")

        dept_distribution.append(
            DepartmentStat(
                department_id=d_id,
                department_code=data["code"],
                department_name=data["name"],
                headcount=h_cnt,
                percentage=pct,
                total_payroll_usd_normalized=tot_usd,
                mean_salary_usd_normalized=mean_usd,
                median_salary_usd_normalized=mean_usd,  # Approximate median via mean normalized
            )
        )

    dept_distribution.sort(key=lambda x: x.headcount, reverse=True)

    return DashboardSummary(
        total_employees=total_employees,
        active_employees=active_employees,
        inactive_employees=inactive_employees,
        currency_payrolls=currency_payrolls,
        total_payroll_usd_normalized=total_usd_normalized,
        country_distribution=country_distribution,
        department_distribution=dept_distribution,
        benchmark_rates=settings.EXCHANGE_RATES_TO_USD,
    )


def get_analytics_breakdown(
    db: Session,
    dimension: str = "department",
    currency: Optional[str] = None,
) -> AnalyticsBreakdownResponse:
    """
    Computes statistical compensation breakdown (mean, median, min, max, headcount)
    grouped by the selected dimension and optional currency filter.
    """
    valid_dimensions = ["department", "country", "job_title", "employment_status"]
    if dimension not in valid_dimensions:
        dimension = "department"

    query = (
        db.query(
            Employee.id,
            Employee.department_id,
            Employee.country_code,
            Employee.job_title,
            Employee.employment_status,
            Department.name.label("department_name"),
            Compensation.annual_salary,
            Compensation.currency_code,
        )
        .join(Department, Employee.department_id == Department.id)
        .join(
            Compensation,
            (Employee.id == Compensation.employee_id) & (Compensation.effective_to.is_(None)),
        )
    )

    if currency:
        query = query.filter(Compensation.currency_code == currency.upper())

    records = query.all()

    grouped_data: Dict[str, Dict[str, Any]] = {}

    for row in records:
        sal = Decimal(str(row.annual_salary))
        curr = row.currency_code

        if dimension == "department":
            key = str(row.department_id)
            name = row.department_name
        elif dimension == "country":
            key = row.country_code
            name = settings.SUPPORTED_COUNTRIES.get(key, key)
        elif dimension == "job_title":
            key = row.job_title
            name = row.job_title
        else:  # employment_status
            key = row.employment_status
            name = row.employment_status

        group_identifier = f"{key}::{curr}" if not currency else key

        if group_identifier not in grouped_data:
            grouped_data[group_identifier] = {
                "group_key": key,
                "group_name": name,
                "currency": curr,
                "salaries": [],
            }

        grouped_data[group_identifier]["salaries"].append(sal)

    groups: List[AnalyticsDimensionGroup] = []
    for g_id, data in grouped_data.items():
        sals = data["salaries"]
        count = len(sals)
        if not count:
            continue
        mean_sal = (sum(sals) / Decimal(count)).quantize(Decimal("0.01"))
        median_sal = calculate_median(sals).quantize(Decimal("0.01"))
        min_sal = min(sals).quantize(Decimal("0.01"))
        max_sal = max(sals).quantize(Decimal("0.01"))

        groups.append(
            AnalyticsDimensionGroup(
                group_key=data["group_key"],
                group_name=data["group_name"],
                headcount=count,
                mean_salary=mean_sal,
                median_salary=median_sal,
                min_salary=min_sal,
                max_salary=max_sal,
                currency=data["currency"],
            )
        )

    groups.sort(key=lambda x: x.headcount, reverse=True)

    return AnalyticsBreakdownResponse(
        dimension=dimension,
        currency=currency,
        groups=groups,
        total_headcount=sum(g.headcount for g in groups),
    )
