import math
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeDetail,
    EmployeeListResponse,
    EmployeeRead,
    EmployeeUpdate,
)
from app.services.employee_service import (
    create_employee,
    deactivate_employee,
    get_employee_by_id,
    get_employees_paginated,
    update_employee,
)

router = APIRouter()


@router.get("", response_model=EmployeeListResponse, summary="Paginated & Filtered Employee Directory")
def list_employees(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    size: int = Query(50, ge=10, le=200, description="Items per page (max 200)"),
    search: Optional[str] = Query(None, description="Search term matching name, email, title, or employee number"),
    country_code: Optional[str] = Query(None, description="2-letter ISO country code filter"),
    department_id: Optional[int] = Query(None, description="Department ID filter"),
    employment_status: Optional[str] = Query(None, description="Status filter: ACTIVE, INACTIVE, TERMINATED, ON_LEAVE"),
    currency_code: Optional[str] = Query(None, description="ISO currency code filter"),
    sort_by: str = Query("id", description="Field to sort on"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="Sort direction: asc or desc"),
):
    """
    Returns server-paginated employee records with active compensation details.
    Enforces maximum page size limits to protect browser performance.
    """
    items, total = get_employees_paginated(
        db=db,
        page=page,
        size=size,
        search=search,
        country_code=country_code,
        department_id=department_id,
        employment_status=employment_status,
        currency_code=currency_code,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    pages = math.ceil(total / size) if total > 0 else 1

    return EmployeeListResponse(
        items=[EmployeeRead(**item) for item in items],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.get("/{employee_id}", response_model=EmployeeDetail, summary="Get Employee Details")
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    """Retrieves full employee profile including historical compensation audit trail."""
    return get_employee_by_id(db, employee_id)


@router.post("", response_model=EmployeeDetail, status_code=status.HTTP_201_CREATED, summary="Create New Employee")
def create_new_employee(emp_in: EmployeeCreate, db: Session = Depends(get_db)):
    """Onboards a new employee with initial compensation record and uniqueness validation."""
    return create_employee(db, emp_in)


@router.patch("/{employee_id}", response_model=EmployeeDetail, summary="Update Employee & Compensation")
def update_existing_employee(employee_id: int, emp_in: EmployeeUpdate, db: Session = Depends(get_db)):
    """
    Updates profile details. Salary adjustments close the prior active compensation
    record and insert a new active record, preserving historical compensation audibility.
    """
    return update_employee(db, employee_id, emp_in)


@router.post("/{employee_id}/deactivate", response_model=EmployeeDetail, summary="Deactivate Employee")
def deactivate_existing_employee(employee_id: int, db: Session = Depends(get_db)):
    """Soft-deactivates an employee (marking status INACTIVE) without destroying historical records."""
    return deactivate_employee(db, employee_id)
