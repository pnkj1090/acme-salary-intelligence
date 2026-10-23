#!/usr/bin/env python3
import time

from app.core.database import SessionLocal
from app.services.seed_service import seed_database


def main():
    print("==================================================")
    print("ACME Salary Intelligence — Deterministic Database Seeder")
    print("Target: Exactly 10,000 Employees across 7 Countries")
    print("==================================================")
    start_time = time.time()

    db = SessionLocal()
    try:
        results = seed_database(db, target_count=10000)
        elapsed = time.time() - start_time
        print(f"✅ Seeding Complete in {elapsed:.2f} seconds!")
        print(f"• Departments Seeded: {results['departments_count']}")
        print(f"• Employees Seeded:   {results['employees_count']}")
        print(f"• Compensations Logged: {results['compensations_count']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
