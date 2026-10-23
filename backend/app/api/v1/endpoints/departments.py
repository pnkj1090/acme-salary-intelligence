from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.department import Department
from app.schemas.department import DepartmentRead

router = APIRouter()


@router.get("", response_model=List[DepartmentRead], summary="List all departments")
def list_departments(db: Session = Depends(get_db)):
    """Returns all organizational departments for forms and filter dropdowns."""
    return db.query(Department).order_by(Department.name.asc()).all()
