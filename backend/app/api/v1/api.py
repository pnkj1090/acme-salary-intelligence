from fastapi import APIRouter

from app.api.v1.endpoints import (
    analytics,
    dashboard,
    departments,
    employees,
    export,
    health,
    questions,
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(departments.router, prefix="/departments", tags=["Departments"])
api_router.include_router(employees.router, prefix="/employees", tags=["Employees"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(questions.router, prefix="/questions", tags=["Compensation Questions"])
api_router.include_router(export.router, prefix="/export", tags=["CSV Export"])
