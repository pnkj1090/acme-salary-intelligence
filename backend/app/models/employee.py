from datetime import date, datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Column, Date, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.compensation import Compensation


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_number = Column(String(32), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    country_code = Column(String(2), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False, index=True)
    job_title = Column(String(150), nullable=False, index=True)
    employment_status = Column(String(30), nullable=False, default="ACTIVE", index=True)
    hire_date = Column(Date, nullable=False, index=True)

    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    department = relationship("Department", back_populates="employees")
    compensations = relationship(
        "Compensation",
        back_populates="employee",
        cascade="all, delete-orphan",
        order_by="desc(Compensation.effective_from)"
    )

    __table_args__ = (
        # Composite index for faceted directory filtering & slicing
        Index("idx_emp_dept_country_status", "department_id", "country_code", "employment_status"),
        Index("idx_emp_country_status_name", "country_code", "employment_status", "last_name"),
        Index("idx_emp_name", "last_name", "first_name"),
    )

    @property
    def current_compensation(self) -> Optional["Compensation"]:
        """Returns the currently active compensation record (effective_to is None)."""
        for comp in self.compensations:
            if comp.effective_to is None:
                return comp
        return None

    def __repr__(self) -> str:
        return (
            f"<Employee(id={self.id}, number='{self.employee_number}', "
            f"name='{self.first_name} {self.last_name}', status='{self.employment_status}')>"
        )
