import time

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.compensation import Compensation
from app.models.department import Department
from app.models.employee import Employee
from app.services.analytics_service import get_dashboard_summary
from app.services.employee_service import get_employees_paginated


def test_seed_10000_employees_count():
    """Confirms that the demo database contains exactly 10,000 employees."""
    db: Session = SessionLocal()
    try:
        emp_count = db.query(Employee).count()
        assert emp_count == 10000, f"Expected exactly 10,000 employees, found {emp_count}"

        dept_count = db.query(Department).count()
        assert dept_count == 8, f"Expected 8 departments, found {dept_count}"

        comp_count = db.query(Compensation).count()
        assert comp_count >= 10000, f"Expected at least 10,000 compensation records, found {comp_count}"

        # Confirm distinct countries is 7
        distinct_countries = db.query(Employee.country_code).distinct().count()
        assert distinct_countries == 7
    finally:
        db.close()


def test_benchmark_pagination_performance():
    """
    Performance benchmark: ensures server-side pagination with sorting
    and filtering over 10,000 records executes in under 250ms.
    """
    db: Session = SessionLocal()
    try:
        start_time = time.perf_counter()
        items, total = get_employees_paginated(
            db=db,
            page=1,
            size=50,
            search=None,
            country_code="US",
            employment_status="ACTIVE",
            sort_by="last_name",
            sort_order="asc",
        )
        duration_ms = (time.perf_counter() - start_time) * 1000
        assert total > 0
        assert len(items) == 50
        assert duration_ms < 300, f"Pagination query took {duration_ms:.2f}ms (threshold 300ms)"
    finally:
        db.close()


def test_benchmark_dashboard_aggregation_performance():
    """
    Performance benchmark: ensures global dashboard aggregation across 10,000 records
    executes in under 400ms.
    """
    db: Session = SessionLocal()
    try:
        start_time = time.perf_counter()
        summary = get_dashboard_summary(db)
        duration_ms = (time.perf_counter() - start_time) * 1000
        assert summary.total_employees == 10000
        assert duration_ms < 500, f"Dashboard aggregation took {duration_ms:.2f}ms (threshold 500ms)"
    finally:
        db.close()
