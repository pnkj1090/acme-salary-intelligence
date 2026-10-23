from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.employee_service import export_employees_to_csv_io

router = APIRouter()


@router.get("/employees", summary="Export Filtered Employees to CSV")
def export_employees_csv(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Search term filter"),
    country_code: Optional[str] = Query(None, description="Country filter"),
    department_id: Optional[int] = Query(None, description="Department filter"),
    employment_status: Optional[str] = Query(None, description="Status filter"),
    currency_code: Optional[str] = Query(None, description="Currency filter"),
):
    """
    Exports currently filtered dataset as a downloadable CSV.
    Guarantees spreadsheet formula injection protection.
    """
    csv_io = export_employees_to_csv_io(
        db=db,
        search=search,
        country_code=country_code,
        department_id=department_id,
        employment_status=employment_status,
        currency_code=currency_code,
    )

    response = StreamingResponse(
        iter([csv_io.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=acme_employees_export.csv"},
    )
    return response
