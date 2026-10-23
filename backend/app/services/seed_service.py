import random
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, List, Tuple

from faker import Faker
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.compensation import Compensation
from app.models.department import Department
from app.models.employee import Employee

# Seed constants
RANDOM_SEED = 42
TARGET_EMPLOYEE_COUNT = 10000

DEPARTMENTS_DATA = [
    {"code": "ENG", "name": "Engineering"},
    {"code": "PROD", "name": "Product Management"},
    {"code": "SALES", "name": "Sales & Revenue"},
    {"code": "MKTG", "name": "Marketing & Growth"},
    {"code": "HR", "name": "Human Resources"},
    {"code": "FIN", "name": "Finance & Accounting"},
    {"code": "LEGAL", "name": "Legal & Compliance"},
    {"code": "OPS", "name": "Operations & Support"},
]

# Distribution of headcount across 7 countries summing to exactly 10,000
COUNTRY_DISTRIBUTION = [
    {"country_code": "US", "currency_code": "USD", "count": 3200},
    {"country_code": "DE", "currency_code": "EUR", "count": 1600},
    {"country_code": "GB", "currency_code": "GBP", "count": 1500},
    {"country_code": "JP", "currency_code": "JPY", "count": 1200},
    {"country_code": "CA", "currency_code": "CAD", "count": 1000},
    {"country_code": "IN", "currency_code": "INR", "count": 800},
    {"country_code": "AU", "currency_code": "AUD", "count": 700},
]

# Base salary ranges (min, max) per currency for a mid-level baseline
CURRENCY_BASE_RANGES = {
    "USD": (70000, 140000),
    "EUR": (55000, 110000),
    "GBP": (50000, 100000),
    "JPY": (6500000, 13000000),
    "CAD": (650000, 130000),  # Wait, CAD should be 65,000 to 130,000
    "AUD": (75000, 145000),
    "INR": (1400000, 3200000),
}
# Correction for CAD
CURRENCY_BASE_RANGES["CAD"] = (65000, 130000)

DEPARTMENT_ROLES: Dict[str, List[Tuple[str, float]]] = {
    # (Job Title, Seniority multiplier)
    "ENG": [
        ("Associate Software Engineer", 0.75),
        ("Software Engineer", 1.0),
        ("Senior Software Engineer", 1.35),
        ("Staff Software Engineer", 1.7),
        ("Principal Engineer", 2.2),
        ("Engineering Manager", 1.65),
        ("Director of Engineering", 2.4),
        ("QA Automation Engineer", 0.9),
        ("DevOps Engineer", 1.15),
        ("Data Engineer", 1.2),
    ],
    "PROD": [
        ("Associate Product Manager", 0.8),
        ("Product Manager", 1.1),
        ("Senior Product Manager", 1.45),
        ("Principal Product Manager", 1.85),
        ("Director of Product", 2.3),
        ("Product Designer", 0.95),
        ("Senior Product Designer", 1.3),
    ],
    "SALES": [
        ("Sales Development Rep", 0.65),
        ("Account Executive", 1.0),
        ("Senior Account Executive", 1.4),
        ("Enterprise Account Director", 1.8),
        ("VP of Global Sales", 2.6),
        ("Sales Operations Lead", 1.1),
    ],
    "MKTG": [
        ("Marketing Coordinator", 0.65),
        ("Digital Marketing Specialist", 0.9),
        ("Content Marketing Manager", 1.1),
        ("Growth Marketing Lead", 1.35),
        ("Director of Brand Marketing", 2.0),
    ],
    "HR": [
        ("People Operations Coordinator", 0.65),
        ("Technical Recruiter", 0.95),
        ("Senior HR Business Partner", 1.3),
        ("Head of Total Rewards", 1.8),
        ("VP of People & Culture", 2.3),
    ],
    "FIN": [
        ("Financial Analyst", 0.85),
        ("Senior Accountant", 1.1),
        ("Finance Manager", 1.45),
        ("Corporate Controller", 1.9),
        ("VP of Finance", 2.5),
    ],
    "LEGAL": [
        ("Legal Operations Specialist", 0.8),
        ("Compliance Analyst", 0.95),
        ("Corporate Counsel", 1.5),
        ("Senior Legal Counsel", 1.95),
    ],
    "OPS": [
        ("Operations Coordinator", 0.65),
        ("Systems Administrator", 1.0),
        ("Senior Operations Analyst", 1.25),
        ("Director of Business Operations", 1.9),
    ],
}

STATUS_CHOICES = ["ACTIVE", "ON_LEAVE", "INACTIVE", "TERMINATED"]
STATUS_WEIGHTS = [0.93, 0.03, 0.02, 0.02]


def seed_database(db: Session, target_count: int = TARGET_EMPLOYEE_COUNT) -> Dict[str, int]:
    """
    Deterministically seeds the database with departments, exactly target_count employees,
    and associated active/historical compensation records.
    """
    random.seed(RANDOM_SEED)
    Faker.seed(RANDOM_SEED)
    fake = Faker()

    # 1. Clean existing records safely for reproducible resets
    db.execute(text("DELETE FROM compensations"))
    db.execute(text("DELETE FROM employees"))
    db.execute(text("DELETE FROM departments"))
    db.commit()

    # 2. Seed departments
    dept_objs = []
    dept_code_to_id = {}
    for item in DEPARTMENTS_DATA:
        dept = Department(code=item["code"], name=item["name"])
        db.add(dept)
        dept_objs.append(dept)
    db.commit()

    for dept in dept_objs:
        dept_code_to_id[dept.code] = dept.id

    dept_codes = list(dept_code_to_id.keys())

    # 3. Create employee list pool by country distribution
    employee_specs: List[Dict[str, str]] = []
    for dist in COUNTRY_DISTRIBUTION:
        for _ in range(dist["count"]):
            employee_specs.append({
                "country_code": dist["country_code"],
                "currency_code": dist["currency_code"],
            })

    # Shuffle deterministically to mix country sequence
    random.shuffle(employee_specs)

    # 4. Generate 10,000 employee dicts and compensation dicts
    today = date(2026, 10, 24)
    min_hire_date = date(2018, 1, 1)
    max_days_hired = (today - min_hire_date).days

    employees_to_insert = []
    compensations_to_insert = []

    used_emails = set()
    emp_id_counter = 1
    comp_id_counter = 1

    for idx, spec in enumerate(employee_specs):
        emp_num = f"EMP-{idx + 1:05d}"
        first_name = fake.first_name()
        last_name = fake.last_name()

        # Ensure 100% unique deterministic email
        email_base = f"{first_name.lower().replace(' ', '')}.{last_name.lower().replace(' ', '')}"
        email = f"{email_base}.{idx + 1}@acme-corp.internal"
        used_emails.add(email)

        # Department & role
        dept_code = random.choice(dept_codes)
        dept_id = dept_code_to_id[dept_code]
        role_choices = DEPARTMENT_ROLES[dept_code]
        job_title, level_mult = random.choice(role_choices)

        # Status
        status = random.choices(STATUS_CHOICES, weights=STATUS_WEIGHTS)[0]

        # Hire date
        hire_offset_days = random.randint(30, max_days_hired)
        hire_date = today - timedelta(days=hire_offset_days)
        hire_datetime = datetime.combine(hire_date, datetime.min.time(), tzinfo=timezone.utc)

        emp_record = {
            "id": emp_id_counter,
            "employee_number": emp_num,
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "country_code": spec["country_code"],
            "department_id": dept_id,
            "job_title": job_title,
            "employment_status": status,
            "hire_date": hire_date,
            "created_at": hire_datetime,
            "updated_at": hire_datetime,
        }
        employees_to_insert.append(emp_record)

        # Calculate salary
        curr = spec["currency_code"]
        base_min, base_max = CURRENCY_BASE_RANGES[curr]
        raw_base = random.randint(base_min, base_max)
        raw_salary = raw_base * level_mult

        # Round according to currency (e.g. JPY has zero decimal places)
        if curr == "JPY":
            final_salary = Decimal(int(raw_salary // 10000 * 10000))
        else:
            final_salary = Decimal(int(raw_salary // 100 * 100)).quantize(Decimal("0.01"))

        # If hired over 700 days ago, generate a prior historical compensation record (~25% of workforce)
        if hire_offset_days > 700 and random.random() < 0.35:
            # Historical salary was ~10% lower
            prior_salary = (final_salary * Decimal("0.90")).quantize(
                Decimal("1") if curr == "JPY" else Decimal("0.01")
            )
            split_date = hire_datetime + timedelta(days=365)

            # Prior record (closed)
            compensations_to_insert.append({
                "id": comp_id_counter,
                "employee_id": emp_id_counter,
                "annual_salary": prior_salary,
                "currency_code": curr,
                "effective_from": hire_datetime,
                "effective_to": split_date,
                "created_at": hire_datetime,
            })
            comp_id_counter += 1

            # Active record (open)
            compensations_to_insert.append({
                "id": comp_id_counter,
                "employee_id": emp_id_counter,
                "annual_salary": final_salary,
                "currency_code": curr,
                "effective_from": split_date,
                "effective_to": None,
                "created_at": split_date,
            })
            comp_id_counter += 1
        else:
            # Single active compensation from hire date
            compensations_to_insert.append({
                "id": comp_id_counter,
                "employee_id": emp_id_counter,
                "annual_salary": final_salary,
                "currency_code": curr,
                "effective_from": hire_datetime,
                "effective_to": None,
                "created_at": hire_datetime,
            })
            comp_id_counter += 1

        emp_id_counter += 1

    # 5. Bulk insert for blazingly fast execution
    db.bulk_insert_mappings(Employee, employees_to_insert)
    db.commit()

    db.bulk_insert_mappings(Compensation, compensations_to_insert)
    db.commit()

    return {
        "departments_count": len(dept_objs),
        "employees_count": len(employees_to_insert),
        "compensations_count": len(compensations_to_insert),
    }
