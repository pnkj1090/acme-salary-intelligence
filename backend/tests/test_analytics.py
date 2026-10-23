from datetime import date
from decimal import Decimal

from fastapi import status

from app.models.compensation import Compensation
from app.models.employee import Employee
from app.services.analytics_service import calculate_median


def test_calculate_median_function():
    # Odd length
    assert calculate_median([Decimal("10"), Decimal("50"), Decimal("20")]) == Decimal("20")
    # Even length
    assert calculate_median([Decimal("10"), Decimal("20"), Decimal("30"), Decimal("40")]) == Decimal("25")
    # Empty
    assert calculate_median([]) == Decimal("0.00")


def test_dashboard_summary_api(client, db_session, sample_department):
    # Add second employee with EUR to verify multi-currency handling
    emp_eur = Employee(
        employee_number="EMP-TEST-EUR",
        first_name="Hans",
        last_name="Mueller",
        email="hans.mueller@acme-corp.internal",
        country_code="DE",
        department_id=sample_department.id,
        job_title="Software Engineer",
        employment_status="ACTIVE",
        hire_date=date(2023, 6, 1),
    )
    db_session.add(emp_eur)
    db_session.commit()
    db_session.refresh(emp_eur)

    comp_eur = Compensation(
        employee_id=emp_eur.id,
        annual_salary=Decimal("80000.00"),
        currency_code="EUR",
        effective_from=emp_eur.created_at,
        effective_to=None,
    )
    db_session.add(comp_eur)
    db_session.commit()

    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["total_employees"] >= 1
    assert data["active_employees"] >= 1
    assert "currency_payrolls" in data
    assert len(data["currency_payrolls"]) >= 1
    assert "total_payroll_usd_normalized" in data
    assert "benchmark_rates" in data


def test_analytics_breakdown_api(client):
    response = client.get("/api/v1/analytics/breakdown?dimension=department")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["dimension"] == "department"
    assert "groups" in data
