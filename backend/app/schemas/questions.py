from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class QuestionParameter(BaseModel):
    name: str
    label: str
    type: str  # "select", "number", "text"
    required: bool = False
    default: Optional[Any] = None
    options: Optional[List[Dict[str, str]]] = None


class CompensationQuestionTemplate(BaseModel):
    id: str
    title: str
    description: str
    parameters: List[QuestionParameter] = []


class QuestionQueryParams(BaseModel):
    question_id: str
    country_code: Optional[str] = None
    currency_code: Optional[str] = None
    department_id: Optional[int] = None
    salary_threshold: Optional[Decimal] = Field(None, gt=0)


class QuestionAnswerResponse(BaseModel):
    question_id: str
    question_title: str
    natural_language_summary: str
    numerical_result: Optional[Any] = None
    filters_applied: Dict[str, Any] = {}
    currency_basis: Optional[str] = None
    table_columns: List[str] = []
    table_data: List[Dict[str, Any]] = []
    chart_type: Optional[str] = None  # "bar", "pie", "distribution"
    chart_data: Optional[List[Dict[str, Any]]] = None
