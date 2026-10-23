from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CompensationBase(BaseModel):
    annual_salary: Decimal = Field(..., gt=0, decimal_places=2, description="Annual base salary")
    currency_code: str = Field(..., min_length=3, max_length=3, description="ISO 4217 3-letter currency code")
    effective_from: Optional[datetime] = None


class CompensationCreate(CompensationBase):
    pass


class CompensationRead(CompensationBase):
    id: int
    employee_id: int
    effective_to: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
