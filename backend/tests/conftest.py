import os
from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.main import app
from app.models.compensation import Compensation
from app.models.department import Department
from app.models.employee import Employee

TEST_DB_URL = "sqlite:///./test_acme_salary.db"

test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_acme_salary.db"):
        try:
            os.remove("./test_acme_salary.db")
        except Exception:
            pass


@pytest.fixture
def db_session():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_department(db_session):
    dept = Department(code="ENG", name="Engineering")
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)
    return dept


@pytest.fixture
def sample_employee(db_session, sample_department):
    emp = Employee(
        employee_number="EMP-TEST-01",
        first_name="Jane",
        last_name="Doe",
        email="jane.doe@acme-corp.internal",
        country_code="US",
        department_id=sample_department.id,
        job_title="Senior Software Engineer",
        employment_status="ACTIVE",
        hire_date=date(2023, 1, 15),
    )
    db_session.add(emp)
    db_session.commit()
    db_session.refresh(emp)

    comp = Compensation(
        employee_id=emp.id,
        annual_salary=Decimal("145000.00"),
        currency_code="USD",
        effective_from=emp.created_at,
        effective_to=None,
    )
    db_session.add(comp)
    db_session.commit()
    db_session.refresh(comp)
    return emp
