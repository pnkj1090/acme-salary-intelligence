from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.analytics import DashboardSummary
from app.services.analytics_service import get_dashboard_summary

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary, summary="Executive Dashboard Summary")
def dashboard_summary(db: Session = Depends(get_db)):
    """
    Returns verified aggregate statistics calculated from 10,000 employee records,
    strictly distinguishing regional currencies and providing explicit USD normalization.
    """
    return get_dashboard_summary(db)
