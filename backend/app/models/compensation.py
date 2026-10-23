from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, Numeric, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Compensation(Base):
    __tablename__ = "compensations"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)

    # Exact numeric representation for salary (precision 14, scale 2)
    annual_salary = Column(Numeric(14, 2), nullable=False)
    currency_code = Column(String(3), nullable=False, index=True)

    effective_from = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    effective_to = Column(DateTime, nullable=True, index=True)

    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    employee = relationship("Employee", back_populates="compensations")

    __table_args__ = (
        # Fast lookup for active compensation (effective_to is null) and currency aggregations
        Index("idx_comp_employee_active", "employee_id", "effective_to"),
        Index("idx_comp_curr_salary", "currency_code", "annual_salary"),
    )

    def __repr__(self) -> str:
        return (
            f"<Compensation(id={self.id}, employee_id={self.employee_id}, "
            f"salary={self.annual_salary} {self.currency_code}, active={self.effective_to is None})>"
        )
