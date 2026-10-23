from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.analytics import AnalyticsBreakdownResponse
from app.services.analytics_service import get_analytics_breakdown

router = APIRouter()


@router.get("/breakdown", response_model=AnalyticsBreakdownResponse, summary="Compensation Analytics Breakdown")
def analytics_breakdown(
    db: Session = Depends(get_db),
    dimension: str = Query("department", description="Group by: department, country, job_title, employment_status"),
    currency: Optional[str] = Query(None, description="Optional ISO currency code filter (e.g., USD, EUR, GBP)"),
):
    """
    Returns statistical salary metrics (mean, median, min, max, headcount) aggregated
    directly in the database across the requested dimension.
    """
    return get_analytics_breakdown(db=db, dimension=dimension, currency=currency)
