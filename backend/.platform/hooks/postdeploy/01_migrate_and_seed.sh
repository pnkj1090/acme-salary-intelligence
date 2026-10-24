#!/bin/bash
set -euo pipefail

echo '=================================================='
echo 'ACME Salary Intelligence — Post-Deploy Hook'
echo '=================================================='

# 1. Activate Elastic Beanstalk Python virtual environment
if [ -d "/var/app/venv" ]; then
    VENV_ACTIVATE=$(find /var/app/venv -name activate | head -n 1)
    if [ -n "${VENV_ACTIVATE}" ]; then
        source "${VENV_ACTIVATE}"
    fi
fi
cd /var/app/current

# 2. Run Alembic database migrations
echo '1. Running database migrations (alembic upgrade head)...'
alembic upgrade head

# 3. Deterministically seed 10,000 employees if database is empty
echo '2. Checking database seeding status...'
python seed.py

echo '✅ Migrations and seeding check completed successfully!'
