from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.questions import (
    CompensationQuestionTemplate,
    QuestionAnswerResponse,
    QuestionQueryParams,
)
from app.services.questions_service import (
    answer_compensation_question,
    get_available_question_templates,
)

router = APIRouter()


@router.get("/templates", response_model=List[CompensationQuestionTemplate], summary="List Supported Compensation Questions")
def list_question_templates():
    """Returns the catalog of predefined, parameterized executive compensation questions."""
    return get_available_question_templates()


@router.post("/query", response_model=QuestionAnswerResponse, summary="Query Compensation Intelligence")
def query_compensation_question(params: QuestionQueryParams, db: Session = Depends(get_db)):
    """
    Executes a deterministic parameterized query for a supported executive question.
    Returns natural language summary, verified numerical answer, filters used, and chart data.
    """
    return answer_compensation_question(db=db, params=params)
