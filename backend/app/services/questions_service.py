from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.compensation import Compensation
from app.models.department import Department
from app.models.employee import Employee
from app.schemas.questions import (
    CompensationQuestionTemplate,
    QuestionAnswerResponse,
    QuestionParameter,
    QuestionQueryParams,
)
from app.services.analytics_service import calculate_median

QUESTION_TEMPLATES: List[CompensationQuestionTemplate] = [
    CompensationQuestionTemplate(
        id="active_employees_by_country",
        title="How many active employees are there in each country?",
        description="Returns headcount of active personnel segmented across all global offices.",
        parameters=[],
    ),
    CompensationQuestionTemplate(
        id="highest_median_salary_department",
        title="Which department has the highest median salary?",
        description="Ranks departments by median salary (USD normalized for cross-currency parity).",
        parameters=[],
    ),
    CompensationQuestionTemplate(
        id="salary_distribution_by_department",
        title="What is the salary distribution by department?",
        description="Shows headcount, average, minimum, and maximum compensation for a selected department.",
        parameters=[
            QuestionParameter(
                name="department_id",
                label="Department",
                type="select",
                required=False,
                default=1,
            )
        ],
    ),
    CompensationQuestionTemplate(
        id="avg_median_by_country_currency",
        title="What are the average and median salaries for a selected country and currency?",
        description="Calculates exact mean and median base compensation in the country's local currency.",
        parameters=[
            QuestionParameter(
                name="country_code",
                label="Country",
                type="select",
                required=True,
                default="US",
                options=[{"value": k, "label": f"{v} ({settings.COUNTRY_TO_CURRENCY.get(k, '')})"} for k, v in settings.SUPPORTED_COUNTRIES.items()],
            )
        ],
    ),
    CompensationQuestionTemplate(
        id="highest_total_payroll_departments",
        title="Which departments have the highest total payroll?",
        description="Compares aggregate annual payroll spend across all departments in USD normalized terms.",
        parameters=[],
    ),
    CompensationQuestionTemplate(
        id="employees_above_salary_threshold",
        title="How many employees earn above a specified salary threshold in a selected currency?",
        description="Finds high-earners exceeding a designated compensation threshold in a given currency.",
        parameters=[
            QuestionParameter(
                name="currency_code",
                label="Currency",
                type="select",
                required=True,
                default="USD",
                options=[{"value": k, "label": f"{k} ({settings.SUPPORTED_COUNTRIES.get(c, '')})"} for c, k in settings.COUNTRY_TO_CURRENCY.items()],
            ),
            QuestionParameter(
                name="salary_threshold",
                label="Salary Threshold",
                type="number",
                required=True,
                default=120000,
            ),
        ],
    ),
    CompensationQuestionTemplate(
        id="salary_ranges_by_job_title",
        title="How do salary ranges vary by job title?",
        description="Analyzes minimum, median, and maximum pay bands across primary job titles in a currency.",
        parameters=[
            QuestionParameter(
                name="currency_code",
                label="Currency",
                type="select",
                required=True,
                default="USD",
                options=[{"value": k, "label": f"{k} ({settings.SUPPORTED_COUNTRIES.get(c, '')})"} for c, k in settings.COUNTRY_TO_CURRENCY.items()],
            )
        ],
    ),
]


def get_available_question_templates() -> List[CompensationQuestionTemplate]:
    """Returns the list of all supported structured compensation questions."""
    return QUESTION_TEMPLATES


def answer_compensation_question(db: Session, params: QuestionQueryParams) -> QuestionAnswerResponse:
    """Executes a deterministic, parameterized SQL query for the requested question."""
    qid = params.question_id

    # 1. Active employees by country
    if qid == "active_employees_by_country":
        rows = (
            db.query(Employee.country_code, func.count(Employee.id).label("count"))
            .filter(Employee.employment_status == "ACTIVE")
            .group_by(Employee.country_code)
            .order_by(desc("count"))
            .all()
        )
        total_active = sum(r.count for r in rows)
        top_country = rows[0].country_code if rows else "N/A"
        top_count = rows[0].count if rows else 0
        top_name = settings.SUPPORTED_COUNTRIES.get(top_country, top_country)

        table_data = []
        chart_data = []
        for r in rows:
            c_name = settings.SUPPORTED_COUNTRIES.get(r.country_code, r.country_code)
            pct = round((r.count / total_active * 100), 1) if total_active > 0 else 0
            table_data.append({
                "country_code": r.country_code,
                "country_name": c_name,
                "active_headcount": r.count,
                "percentage": f"{pct}%",
            })
            chart_data.append({"name": c_name, "value": r.count})

        summary = (
            f"ACME has {total_active:,} active employees across {len(rows)} countries. "
            f"The largest workforce is in {top_name} ({top_country}) with {top_count:,} employees "
            f"({round(top_count / total_active * 100, 1) if total_active else 0}% of active headcount)."
        )

        return QuestionAnswerResponse(
            question_id=qid,
            question_title="How many active employees are there in each country?",
            natural_language_summary=summary,
            numerical_result=total_active,
            filters_applied={"employment_status": "ACTIVE"},
            currency_basis="Headcount (No currency aggregation)",
            table_columns=["Country Code", "Country Name", "Active Headcount", "Percentage"],
            table_data=table_data,
            chart_type="pie",
            chart_data=chart_data,
        )

    # 2. Highest median salary department
    elif qid == "highest_median_salary_department":
        departments = db.query(Department).all()
        dept_results = []
        for dept in departments:
            comp_records = (
                db.query(Compensation.annual_salary, Compensation.currency_code)
                .join(Employee, Employee.id == Compensation.employee_id)
                .filter(
                    Employee.department_id == dept.id,
                    Employee.employment_status == "ACTIVE",
                    Compensation.effective_to.is_(None),
                )
                .all()
            )
            usd_salaries = []
            for sal, curr in comp_records:
                rate = Decimal(str(settings.EXCHANGE_RATES_TO_USD.get(curr, 1.0)))
                usd_salaries.append(Decimal(str(sal)) * rate)

            if usd_salaries:
                med_usd = calculate_median(usd_salaries).quantize(Decimal("0.01"))
                mean_usd = (sum(usd_salaries) / Decimal(len(usd_salaries))).quantize(Decimal("0.01"))
                dept_results.append({
                    "department_id": dept.id,
                    "department_name": dept.name,
                    "headcount": len(usd_salaries),
                    "median_salary_usd": float(med_usd),
                    "mean_salary_usd": float(mean_usd),
                })

        dept_results.sort(key=lambda x: x["median_salary_usd"], reverse=True)
        top = dept_results[0] if dept_results else None

        summary = (
            f"The department with the highest median salary is {top['department_name']} "
            f"at ${top['median_salary_usd']:,.2f} USD (normalized across currencies), "
            f"with an active headcount of {top['headcount']} employees."
            if top
            else "No department salary data available."
        )

        return QuestionAnswerResponse(
            question_id=qid,
            question_title="Which department has the highest median salary?",
            natural_language_summary=summary,
            numerical_result=top["median_salary_usd"] if top else 0,
            filters_applied={"metric": "Median Salary", "basis": "USD Benchmark Normalization"},
            currency_basis="USD Normalized Benchmark",
            table_columns=["Department", "Headcount", "Median Salary (USD)", "Mean Salary (USD)"],
            table_data=dept_results,
            chart_type="bar",
            chart_data=[{"name": d["department_name"], "value": d["median_salary_usd"]} for d in dept_results],
        )

    # 3. Salary distribution by department
    elif qid == "salary_distribution_by_department":
        dept_id = params.department_id or 1
        dept = db.query(Department).filter(Department.id == dept_id).first()
        dept_name = dept.name if dept else f"Department #{dept_id}"

        # Group by currency within department
        rows = (
            db.query(
                Compensation.currency_code,
                func.count(Employee.id).label("count"),
                func.min(Compensation.annual_salary).label("min_sal"),
                func.avg(Compensation.annual_salary).label("avg_sal"),
                func.max(Compensation.annual_salary).label("max_sal"),
            )
            .join(Employee, Employee.id == Compensation.employee_id)
            .filter(
                Employee.department_id == dept_id,
                Employee.employment_status == "ACTIVE",
                Compensation.effective_to.is_(None),
            )
            .group_by(Compensation.currency_code)
            .all()
        )

        table_data = []
        chart_data = []
        for r in rows:
            c = r.currency_code
            table_data.append({
                "currency": c,
                "headcount": r.count,
                "min_salary": f"{Decimal(str(r.min_sal)):,.2f} {c}",
                "mean_salary": f"{Decimal(str(r.avg_sal)):,.2f} {c}",
                "max_salary": f"{Decimal(str(r.max_sal)):,.2f} {c}",
            })
            chart_data.append({"name": c, "value": r.count})

        total_dept_headcount = sum(r.count for r in rows)
        summary = (
            f"The {dept_name} department employs {total_dept_headcount:,} active personnel "
            f"across {len(rows)} regional currencies. Detailed local salary bounds are tabulated below."
        )

        return QuestionAnswerResponse(
            question_id=qid,
            question_title="What is the salary distribution by department?",
            natural_language_summary=summary,
            numerical_result=total_dept_headcount,
            filters_applied={"department_id": dept_id, "department_name": dept_name},
            currency_basis="Local Currency Bands per Region",
            table_columns=["Currency", "Headcount", "Min Salary", "Mean Salary", "Max Salary"],
            table_data=table_data,
            chart_type="pie",
            chart_data=chart_data,
        )

    # 4. Average and median salaries for selected country and currency
    elif qid == "avg_median_by_country_currency":
        country = (params.country_code or "US").upper()
        country_name = settings.SUPPORTED_COUNTRIES.get(country, country)
        currency = settings.COUNTRY_TO_CURRENCY.get(country, "USD")

        salaries = (
            db.query(Compensation.annual_salary)
            .join(Employee, Employee.id == Compensation.employee_id)
            .filter(
                Employee.country_code == country,
                Employee.employment_status == "ACTIVE",
                Compensation.effective_to.is_(None),
            )
            .all()
        )
        sal_vals = [Decimal(str(s[0])) for s in salaries]
        headcount = len(sal_vals)

        if sal_vals:
            mean_sal = (sum(sal_vals) / Decimal(headcount)).quantize(Decimal("0.01"))
            med_sal = calculate_median(sal_vals).quantize(Decimal("0.01"))
            min_sal = min(sal_vals).quantize(Decimal("0.01"))
            max_sal = max(sal_vals).quantize(Decimal("0.01"))
        else:
            mean_sal = med_sal = min_sal = max_sal = Decimal("0.00")

        summary = (
            f"In {country_name} ({country}), active employees are paid in {currency}. "
            f"The average base salary is {mean_sal:,.2f} {currency} and the median is "
            f"{med_sal:,.2f} {currency} across a total workforce of {headcount:,} employees."
        )

        table_data = [
            {"metric": "Headcount", "value": f"{headcount:,}"},
            {"metric": "Mean Salary", "value": f"{mean_sal:,.2f} {currency}"},
            {"metric": "Median Salary", "value": f"{med_sal:,.2f} {currency}"},
            {"metric": "Minimum Salary", "value": f"{min_sal:,.2f} {currency}"},
            {"metric": "Maximum Salary", "value": f"{max_sal:,.2f} {currency}"},
        ]

        chart_data = [
            {"name": "Min", "value": float(min_sal)},
            {"name": "Median", "value": float(med_sal)},
            {"name": "Mean", "value": float(mean_sal)},
            {"name": "Max", "value": float(max_sal)},
        ]

        return QuestionAnswerResponse(
            question_id=qid,
            question_title="What are the average and median salaries for a selected country and currency?",
            natural_language_summary=summary,
            numerical_result=float(med_sal),
            filters_applied={"country_code": country, "country_name": country_name, "currency": currency},
            currency_basis=currency,
            table_columns=["Metric", "Value"],
            table_data=table_data,
            chart_type="bar",
            chart_data=chart_data,
        )

    # 5. Which departments have highest total payroll?
    elif qid == "highest_total_payroll_departments":
        departments = db.query(Department).all()
        dept_payroll = []
        for dept in departments:
            comp_records = (
                db.query(Compensation.annual_salary, Compensation.currency_code)
                .join(Employee, Employee.id == Compensation.employee_id)
                .filter(
                    Employee.department_id == dept.id,
                    Employee.employment_status == "ACTIVE",
                    Compensation.effective_to.is_(None),
                )
                .all()
            )
            total_dept_usd = Decimal("0.00")
            for sal, curr in comp_records:
                rate = Decimal(str(settings.EXCHANGE_RATES_TO_USD.get(curr, 1.0)))
                total_dept_usd += Decimal(str(sal)) * rate

            dept_payroll.append({
                "department_name": dept.name,
                "headcount": len(comp_records),
                "total_payroll_usd": float(total_dept_usd.quantize(Decimal("0.01"))),
            })

        dept_payroll.sort(key=lambda x: x["total_payroll_usd"], reverse=True)
        top = dept_payroll[0] if dept_payroll else None

        summary = (
            f"The department with the highest total payroll is {top['department_name']} "
            f"at ${top['total_payroll_usd']:,.2f} USD annually, supporting {top['headcount']} employees."
            if top
            else "No payroll data available."
        )

        return QuestionAnswerResponse(
            question_id=qid,
            question_title="Which departments have the highest total payroll?",
            natural_language_summary=summary,
            numerical_result=top["total_payroll_usd"] if top else 0,
            filters_applied={"metric": "Total Annual Payroll (USD Normalized)"},
            currency_basis="USD Normalized Benchmark",
            table_columns=["Department", "Headcount", "Total Annual Payroll (USD)"],
            table_data=dept_payroll,
            chart_type="bar",
            chart_data=[{"name": d["department_name"], "value": d["total_payroll_usd"]} for d in dept_payroll],
        )

    # 6. Employees above salary threshold
    elif qid == "employees_above_salary_threshold":
        curr = (params.currency_code or "USD").upper()
        threshold = Decimal(str(params.salary_threshold or 120000))

        above_emps = (
            db.query(Employee, Compensation.annual_salary)
            .join(Compensation, (Employee.id == Compensation.employee_id) & (Compensation.effective_to.is_(None)))
            .filter(
                Compensation.currency_code == curr,
                Compensation.annual_salary >= threshold,
                Employee.employment_status == "ACTIVE",
            )
            .order_by(desc(Compensation.annual_salary))
            .all()
        )

        count_above = len(above_emps)
        table_data = []
        for row in above_emps[:50]:  # Cap table view to 50
            emp = row.Employee
            sal = Decimal(str(row.annual_salary))
            table_data.append({
                "employee_number": emp.employee_number,
                "name": f"{emp.first_name} {emp.last_name}",
                "job_title": emp.job_title,
                "country": emp.country_code,
                "salary": f"{sal:,.2f} {curr}",
            })

        summary = (
            f"There are {count_above:,} active employees earning at or above "
            f"{threshold:,.2f} {curr}. "
            f"{'Displaying top 50 earners below.' if count_above > 50 else 'All qualifying earners displayed below.'}"
        )

        return QuestionAnswerResponse(
            question_id=qid,
            question_title="How many employees earn above a specified salary threshold in a selected currency?",
            natural_language_summary=summary,
            numerical_result=count_above,
            filters_applied={"currency": curr, "salary_threshold": f"{threshold:,.2f}"},
            currency_basis=curr,
            table_columns=["Employee ID", "Employee Name", "Job Title", "Country", "Annual Salary"],
            table_data=table_data,
            chart_type="bar" if count_above > 0 else None,
            chart_data=[{"name": ">= Threshold", "value": count_above}],
        )

    # 7. Salary ranges by job title
    elif qid == "salary_ranges_by_job_title":
        curr = (params.currency_code or "USD").upper()
        title_rows = (
            db.query(
                Employee.job_title,
                func.count(Employee.id).label("count"),
                func.min(Compensation.annual_salary).label("min_sal"),
                func.avg(Compensation.annual_salary).label("avg_sal"),
                func.max(Compensation.annual_salary).label("max_sal"),
            )
            .join(Compensation, (Employee.id == Compensation.employee_id) & (Compensation.effective_to.is_(None)))
            .filter(
                Compensation.currency_code == curr,
                Employee.employment_status == "ACTIVE",
            )
            .group_by(Employee.job_title)
            .order_by(desc("avg_sal"))
            .all()
        )

        table_data = []
        chart_data = []
        for r in title_rows:
            min_s = Decimal(str(r.min_sal)).quantize(Decimal("0.01"))
            avg_s = Decimal(str(r.avg_sal)).quantize(Decimal("0.01"))
            max_s = Decimal(str(r.max_sal)).quantize(Decimal("0.01"))
            table_data.append({
                "job_title": r.job_title,
                "headcount": r.count,
                "min_salary": f"{min_s:,.2f} {curr}",
                "mean_salary": f"{avg_s:,.2f} {curr}",
                "max_salary": f"{max_s:,.2f} {curr}",
            })
            chart_data.append({"name": r.job_title[:20], "value": float(avg_s)})

        summary = (
            f"Compensation spans {len(title_rows)} job titles in {curr}. "
            f"Titles are ranked by mean annual salary below."
        )

        return QuestionAnswerResponse(
            question_id=qid,
            question_title="How do salary ranges vary by job title?",
            natural_language_summary=summary,
            numerical_result=len(title_rows),
            filters_applied={"currency": curr},
            currency_basis=curr,
            table_columns=["Job Title", "Headcount", "Min Salary", "Mean Salary", "Max Salary"],
            table_data=table_data,
            chart_type="bar",
            chart_data=chart_data[:10],  # Top 10 for clean chart rendering
        )

    # Unsupported question handling
    else:
        return QuestionAnswerResponse(
            question_id=qid,
            question_title="Unsupported Question",
            natural_language_summary=(
                f"Question ID '{qid}' is not recognized. Please choose one of the predefined "
                f"compensation templates from the catalog to ensure mathematically validated results."
            ),
            numerical_result=None,
            filters_applied={},
            currency_basis=None,
            table_columns=[],
            table_data=[],
            chart_type=None,
            chart_data=None,
        )
