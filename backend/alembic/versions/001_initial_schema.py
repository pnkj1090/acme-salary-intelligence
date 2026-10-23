"""001_initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-24 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create departments table
    op.create_table(
        'departments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_departments_code'), 'departments', ['code'], unique=True)
    op.create_index(op.f('ix_departments_id'), 'departments', ['id'], unique=False)

    # 2. Create employees table
    op.create_table(
        'employees',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_number', sa.String(length=32), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('country_code', sa.String(length=2), nullable=False),
        sa.Column('department_id', sa.Integer(), nullable=False),
        sa.Column('job_title', sa.String(length=150), nullable=False),
        sa.Column('employment_status', sa.String(length=30), nullable=False),
        sa.Column('hire_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_employees_country_code'), 'employees', ['country_code'], unique=False)
    op.create_index(op.f('ix_employees_department_id'), 'employees', ['department_id'], unique=False)
    op.create_index(op.f('ix_employees_email'), 'employees', ['email'], unique=True)
    op.create_index(op.f('ix_employees_employee_number'), 'employees', ['employee_number'], unique=True)
    op.create_index(op.f('ix_employees_employment_status'), 'employees', ['employment_status'], unique=False)
    op.create_index(op.f('ix_employees_hire_date'), 'employees', ['hire_date'], unique=False)
    op.create_index(op.f('ix_employees_id'), 'employees', ['id'], unique=False)
    op.create_index(op.f('ix_employees_job_title'), 'employees', ['job_title'], unique=False)
    op.create_index('idx_emp_dept_country_status', 'employees', ['department_id', 'country_code', 'employment_status'], unique=False)
    op.create_index('idx_emp_country_status_name', 'employees', ['country_code', 'employment_status', 'last_name'], unique=False)
    op.create_index('idx_emp_name', 'employees', ['last_name', 'first_name'], unique=False)

    # 3. Create compensations table
    op.create_table(
        'compensations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('annual_salary', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('currency_code', sa.String(length=3), nullable=False),
        sa.Column('effective_from', sa.DateTime(), nullable=False),
        sa.Column('effective_to', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_compensations_currency_code'), 'compensations', ['currency_code'], unique=False)
    op.create_index(op.f('ix_compensations_effective_to'), 'compensations', ['effective_to'], unique=False)
    op.create_index(op.f('ix_compensations_employee_id'), 'compensations', ['employee_id'], unique=False)
    op.create_index(op.f('ix_compensations_id'), 'compensations', ['id'], unique=False)
    op.create_index('idx_comp_curr_salary', 'compensations', ['currency_code', 'annual_salary'], unique=False)
    op.create_index('idx_comp_employee_active', 'compensations', ['employee_id', 'effective_to'], unique=False)


def downgrade() -> None:
    op.drop_table('compensations')
    op.drop_table('employees')
    op.drop_table('departments')
