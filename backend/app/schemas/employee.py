from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.compensation import CompensationRead


class EmployeeBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    country_code: str = Field(..., min_length=2, max_length=2, description="ISO 3166-1 alpha-2 code")
    department_id: int
    job_title: str = Field(..., min_length=1, max_length=150)
    employment_status: str = Field(default="ACTIVE", description="ACTIVE, INACTIVE, TERMINATED, ON_LEAVE")
    hire_date: date


class EmployeeCreate(EmployeeBase):
    employee_number: Optional[str] = Field(None, max_length=32, description="Optional custom identifier, auto-generated if omitted")
    annual_salary: Decimal = Field(..., gt=0, decimal_places=2)
    currency_code: str = Field(..., min_length=3, max_length=3)


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    country_code: Optional[str] = Field(None, min_length=2, max_length=2)
    department_id: Optional[int] = None
    job_title: Optional[str] = Field(None, min_length=1, max_length=150)
    employment_status: Optional[str] = None
    hire_date: Optional[date] = None
    annual_salary: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    currency_code: Optional[str] = Field(None, min_length=3, max_length=3)


class EmployeeRead(EmployeeBase):
    id: int
    employee_number: str
    department_name: Optional[str] = None
    current_salary: Optional[Decimal] = None
    currency_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmployeeDetail(EmployeeRead):
    compensations: List[CompensationRead] = []


class EmployeeListResponse(BaseModel):
    items: List[EmployeeRead]
    total: int
    page: int
    size: int
    pages: int
