from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), unique=True, nullable=False)

    # Relationships
    employees = relationship("Employee", back_populates="department", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Department(id={self.id}, code='{self.code}', name='{self.name}')>"
