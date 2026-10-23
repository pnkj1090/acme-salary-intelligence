from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter()


@router.get("/health", summary="System Health & Database Connectivity")
def health_check(db: Session = Depends(get_db)):
    """Health check verifying API operational status and database responsiveness."""
    try:
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "service": "ACME Salary Intelligence API",
        "version": "1.0.0",
    }
