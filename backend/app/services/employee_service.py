import csv
import io
import math
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.compensation import Compensation
from app.models.department import Department
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeDetail, EmployeeRead, EmployeeUpdate


def sanitize_csv_cell(value: Any) -> str:
    """Sanitizes cells against CSV formula injection attacks (=, +, -, @, TAB)."""
    if value is None:
        return ""
    str_val = str(value)
    if str_val and str_val[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + str_val
    return str_val


def get_employees_paginated(
    db: Session,
    page: int = 1,
    size: int = 50,
    search: Optional[str] = None,
    country_code: Optional[str] = None,
    department_id: Optional[int] = None,
    employment_status: Optional[str] = None,
    currency_code: Optional[str] = None,
    sort_by: str = "id",
    sort_order: str = "asc",
) -> Tuple[List[dict], int]:
    """
    Retrieves server-side filtered, sorted, and paginated employees along with active salary.
    Uses indexed lookups and avoids N+1 queries.
    """
    # Enforce safe page boundaries
    page = max(1, page)
    size = min(max(10, size), 200)

    # Base query joining Employee with Department and active Compensation
    query = (
        db.query(
            Employee.id,
            Employee.employee_number,
            Employee.first_name,
            Employee.last_name,
            Employee.email,
            Employee.country_code,
            Employee.department_id,
            Employee.job_title,
            Employee.employment_status,
            Employee.hire_date,
            Employee.created_at,
            Employee.updated_at,
            Department.name.label("department_name"),
            Compensation.annual_salary.label("current_salary"),
            Compensation.currency_code.label("currency_code"),
        )
        .join(Department, Employee.department_id == Department.id)
        .outerjoin(
            Compensation,
            (Employee.id == Compensation.employee_id) & (Compensation.effective_to.is_(None)),
        )
    )

    # Apply filters
    filters = []
    if search:
        search_term = f"%{search.strip()}%"
        filters.append(
            or_(
                Employee.employee_number.ilike(search_term),
                Employee.first_name.ilike(search_term),
                Employee.last_name.ilike(search_term),
                Employee.email.ilike(search_term),
                Employee.job_title.ilike(search_term),
            )
        )

    if country_code:
        filters.append(Employee.country_code == country_code.upper())

    if department_id:
        filters.append(Employee.department_id == department_id)

    if employment_status:
        filters.append(Employee.employment_status == employment_status.upper())

    for f in filters:
        query = query.filter(f)

    if currency_code:
        query = query.filter(Compensation.currency_code == currency_code.upper())

    # Fast indexed count
    count_query = db.query(func.count(Employee.id))
    if currency_code:
        count_query = count_query.join(
            Compensation,
            (Employee.id == Compensation.employee_id) & (Compensation.effective_to.is_(None)),
        ).filter(Compensation.currency_code == currency_code.upper())
    for f in filters:
        count_query = count_query.filter(f)
    total_count = count_query.scalar() or 0

    # Apply sorting
    sort_col_map = {
        "id": Employee.id,
        "employee_number": Employee.employee_number,
        "first_name": Employee.first_name,
        "last_name": Employee.last_name,
        "email": Employee.email,
        "country_code": Employee.country_code,
        "department_id": Employee.department_id,
        "job_title": Employee.job_title,
        "employment_status": Employee.employment_status,
        "hire_date": Employee.hire_date,
        "current_salary": Compensation.annual_salary,
        "currency_code": Compensation.currency_code,
    }

    sort_col = sort_col_map.get(sort_by, Employee.id)
    if sort_order.lower() == "desc":
        query = query.order_by(desc(sort_col))
    else:
        query = query.order_by(asc(sort_col))

    # Apply pagination
    offset = (page - 1) * size
    results = query.offset(offset).limit(size).all()

    items = []
    for row in results:
        items.append({
            "id": row.id,
            "employee_number": row.employee_number,
            "first_name": row.first_name,
            "last_name": row.last_name,
            "email": row.email,
            "country_code": row.country_code,
            "department_id": row.department_id,
            "department_name": row.department_name,
            "job_title": row.job_title,
            "employment_status": row.employment_status,
            "hire_date": row.hire_date,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
            "current_salary": row.current_salary,
            "currency_code": row.currency_code,
        })

    return items, total_count


def get_employee_by_id(db: Session, employee_id: int) -> EmployeeDetail:
    """Fetches employee by ID along with complete compensation history."""
    emp = (
        db.query(Employee)
        .options(joinedload(Employee.department), joinedload(Employee.compensations))
        .filter(Employee.id == employee_id)
        .first()
    )
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found",
        )

    active_comp = emp.current_compensation
    return EmployeeDetail(
        id=emp.id,
        employee_number=emp.employee_number,
        first_name=emp.first_name,
        last_name=emp.last_name,
        email=emp.email,
        country_code=emp.country_code,
        department_id=emp.department_id,
        department_name=emp.department.name if emp.department else None,
        job_title=emp.job_title,
        employment_status=emp.employment_status,
        hire_date=emp.hire_date,
        created_at=emp.created_at,
        updated_at=emp.updated_at,
        current_salary=active_comp.annual_salary if active_comp else None,
        currency_code=active_comp.currency_code if active_comp else None,
        compensations=emp.compensations,
    )


def create_employee(db: Session, emp_in: EmployeeCreate) -> EmployeeDetail:
    """Creates a new employee with active compensation record."""
    # Check duplicate email
    if db.query(Employee).filter(Employee.email == emp_in.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An employee with email '{emp_in.email}' already exists",
        )

    # Generate employee number if not provided
    emp_num = emp_in.employee_number
    if not emp_num:
        count = db.query(Employee).count()
        emp_num = f"EMP-{count + 1:05d}"
    else:
        if db.query(Employee).filter(Employee.employee_number == emp_num).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee number '{emp_num}' is already in use",
            )

    # Check department exists
    dept = db.query(Department).filter(Department.id == emp_in.department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department with ID {emp_in.department_id} does not exist",
        )

    now = datetime.now(timezone.utc)
    new_emp = Employee(
        employee_number=emp_num,
        first_name=emp_in.first_name.strip(),
        last_name=emp_in.last_name.strip(),
        email=emp_in.email.strip().lower(),
        country_code=emp_in.country_code.upper(),
        department_id=emp_in.department_id,
        job_title=emp_in.job_title.strip(),
        employment_status=emp_in.employment_status.upper(),
        hire_date=emp_in.hire_date,
        created_at=now,
        updated_at=now,
    )
    db.add(new_emp)
    db.flush()

    new_comp = Compensation(
        employee_id=new_emp.id,
        annual_salary=emp_in.annual_salary,
        currency_code=emp_in.currency_code.upper(),
        effective_from=now,
        effective_to=None,
        created_at=now,
    )
    db.add(new_comp)
    db.commit()
    db.refresh(new_emp)

    return get_employee_by_id(db, new_emp.id)


def update_employee(db: Session, employee_id: int, emp_in: EmployeeUpdate) -> EmployeeDetail:
    """
    Updates employee details. If salary or currency changed, cleanly closes prior
    active compensation record and inserts a new active record, preserving historical trail.
    """
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found",
        )

    # Check email duplicate if changed
    if emp_in.email and emp_in.email != emp.email:
        if db.query(Employee).filter(Employee.email == emp_in.email, Employee.id != employee_id).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{emp_in.email}' is already taken by another employee",
            )
        emp.email = emp_in.email.strip().lower()

    if emp_in.first_name is not None:
        emp.first_name = emp_in.first_name.strip()
    if emp_in.last_name is not None:
        emp.last_name = emp_in.last_name.strip()
    if emp_in.country_code is not None:
        emp.country_code = emp_in.country_code.upper()
    if emp_in.department_id is not None:
        dept = db.query(Department).filter(Department.id == emp_in.department_id).first()
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Department with ID {emp_in.department_id} does not exist",
            )
        emp.department_id = emp_in.department_id
    if emp_in.job_title is not None:
        emp.job_title = emp_in.job_title.strip()
    if emp_in.employment_status is not None:
        emp.employment_status = emp_in.employment_status.upper()
    if emp_in.hire_date is not None:
        emp.hire_date = emp_in.hire_date

    now = datetime.now(timezone.utc)
    emp.updated_at = now

    # Check if compensation adjustment is requested
    if emp_in.annual_salary is not None or emp_in.currency_code is not None:
        active_comp = emp.current_compensation
        new_salary = emp_in.annual_salary or (active_comp.annual_salary if active_comp else Decimal("0"))
        new_curr = (emp_in.currency_code.upper() if emp_in.currency_code else (active_comp.currency_code if active_comp else "USD"))

        # Only create new compensation if actually changed
        if not active_comp or active_comp.annual_salary != new_salary or active_comp.currency_code != new_curr:
            if active_comp:
                active_comp.effective_to = now
            new_comp = Compensation(
                employee_id=emp.id,
                annual_salary=new_salary,
                currency_code=new_curr,
                effective_from=now,
                effective_to=None,
                created_at=now,
            )
            db.add(new_comp)

    db.commit()
    return get_employee_by_id(db, emp.id)


def deactivate_employee(db: Session, employee_id: int) -> EmployeeDetail:
    """Soft deactivates an employee without deleting historical records."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found",
        )
    emp.employment_status = "INACTIVE"
    emp.updated_at = datetime.now(timezone.utc)
    db.commit()
    return get_employee_by_id(db, emp.id)


def export_employees_to_csv_io(
    db: Session,
    search: Optional[str] = None,
    country_code: Optional[str] = None,
    department_id: Optional[int] = None,
    employment_status: Optional[str] = None,
    currency_code: Optional[str] = None,
) -> io.StringIO:
    """Exports filtered employee list to sanitized CSV stream."""
    items, _ = get_employees_paginated(
        db=db,
        page=1,
        size=10000,  # Bounded to dataset max
        search=search,
        country_code=country_code,
        department_id=department_id,
        employment_status=employment_status,
        currency_code=currency_code,
        sort_by="employee_number",
        sort_order="asc",
    )

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    # Header
    writer.writerow([
        "Employee Number",
        "First Name",
        "Last Name",
        "Email",
        "Country",
        "Department",
        "Job Title",
        "Employment Status",
        "Hire Date",
        "Annual Salary",
        "Currency",
    ])

    for row in items:
        writer.writerow([
            sanitize_csv_cell(row["employee_number"]),
            sanitize_csv_cell(row["first_name"]),
            sanitize_csv_cell(row["last_name"]),
            sanitize_csv_cell(row["email"]),
            sanitize_csv_cell(row["country_code"]),
            sanitize_csv_cell(row["department_name"]),
            sanitize_csv_cell(row["job_title"]),
            sanitize_csv_cell(row["employment_status"]),
            sanitize_csv_cell(row["hire_date"]),
            sanitize_csv_cell(row["current_salary"]),
            sanitize_csv_cell(row["currency_code"]),
        ])

    output.seek(0)
    return output
