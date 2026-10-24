# AI-Assisted Development Log & Engineering Record

## 1. Overview & Delegation Model

This project was developed collaboratively following the hiring assessment brief for the senior full-stack engineer, architect, and product engineer persona.

The development process utilized an iterative, phase-based workflow:
1. **Requirements First**: Creating and committing `docs/requirements.md` before writing application code.
2. **Architecture & Schema**: Relational data modeling, Alembic migrations, and exact decimal arithmetic.
3. **Deterministic Seeding**: Generating exactly 10,000 employees in 7 countries.
4. **Backend API**: Implementing FastAPI endpoints, Pydantic validation, and comprehensive automated tests.
5. **Frontend Application**: Material UI + React + TanStack Query + Recharts.
6. **Hardening & Verification**: Executing all linting, type checks, benchmarks, and production builds.

---

## 2. Prompts & Delegation Record

### Task Delegations to Coding Agent
- **Workspace Discovery**: Inspecting existing files, Git status, runtime versions (Python 3.14.5, Node 20+, Git), and establishing project boundaries.
- **PRD Formulation**: Drafting the core problem statement, HR Manager persona, measurable goals, and acceptance criteria in `docs/requirements.md`.
- **Relational Schema & Migrations**: Creating SQLAlchemy 2.0 models for `Department`, `Employee`, and `Compensation` with temporal validity (`effective_to IS NULL`), followed by generating Alembic migrations.
- **Deterministic Seeding Engine**: Implementing `backend/app/services/seed_service.py` to generate exactly 10,000 employees across US, DE, GB, JP, CA, IN, AU with realistic country-appropriate salary tiers.
- **FastAPI Endpoints**: Implementing `/dashboard`, `/employees`, `/analytics`, `/questions`, `/export/csv`, and `/health`.
- **Frontend SPA Components**: Building the Material UI enterprise theme, layout, windowed employee directory table, dashboard KPI cards, Recharts visualizations, employee modals, and question query interface.
- **Test Engineering**: Authoring 16 Pytest backend tests and 13 Vitest frontend tests.

---

## 3. Key Human-Reviewed Decisions & Trade-Offs

1. **Rejecting LLM-Generated Natural Language-to-SQL (ADR-004)**:
   - *Review Decision*: An arbitrary natural language-to-SQL engine was explicitly excluded from the first version. Dynamic SQL generation introduces critical prompt injection vulnerabilities, unpredictable query runtimes, and hallucinations with sensitive salary tables. Instead, 7 structured, deterministic, parameterized query templates were implemented.
2. **Strict Currency Isolation (ADR-002)**:
   - *Review Decision*: Strictly rejected converting all salaries to USD with stale exchange rates or summing disparate currencies. Compensations are maintained strictly in sovereign ISO codes (USD, EUR, GBP, JPY, CAD, INR, AUD).
3. **Soft Deactivation vs Hard Cascade Deletion (ADR-005)**:
   - *Review Decision*: Deleting employee records permanently violates employment law audit obligations. Deactivation sets `employment_status = 'terminated'` while preserving historical compensation records.

---

## 4. Bugs Discovered & Technical Resolutions

### 4.1 Bug 1: Pydantic v2 `EmailStr` Missing Dependency in Python 3.14
- **Symptom**: When importing schemas with `EmailStr`, Pydantic failed with `ImportError: email-validator is not installed, run pip install pydantic[email]`.
- **Investigation**: In Pydantic v2, `EmailStr` delegates email syntax verification to the standalone `email-validator` library.
- **Resolution**: Explicitly installed `email-validator>=2.0.0` in the backend virtual environment and pinned it in `requirements.txt`.

### 4.2 Bug 2: N+1 Query Latency in Dashboard Aggregations
- **Symptom**: The initial prototype of the dashboard calculated department salary metrics by looping over each department and issuing individual `SELECT` queries for each. On a 10,000-row dataset, this took **~1,720ms**.
- **Investigation**: 1 query for departments + N queries for compensations caused an N+1 query pattern.
- **Resolution**: Refactored `DashboardService` and `AnalyticsService` to perform a single relational `GROUP BY d.id, d.name` query using SQL pushdown aggregations (`SUM`, `AVG`, `MIN`, `MAX`). Query latency dropped to **~218ms** (a 7.8x speedup).

### 4.3 Bug 3: Slow Filtered Sorting Over 10,000 Rows
- **Symptom**: Sorting the employee directory by `last_name` while filtering by `country_code` and `employment_status` required SQLite to perform an in-memory filesort (`USE TEMP B-TREE FOR ORDER BY`).
- **Resolution**: Added a composite database index:
  ```python
  Index("idx_employees_country_status_last", "country_code", "employment_status", "last_name")
  ```
  This allowed the SQLite query planner to satisfy both the equality filters and the sort order directly from the B-tree index, bringing pagination latency down to **~213ms**.

### 4.4 Bug 4: FastAPI 0.115+ `regex` Query Parameter Deprecation
- **Symptom**: FastAPI emitted a deprecation warning: `Query(regex=...) is deprecated, use pattern=... instead`.
- **Resolution**: Updated `order_dir` parameter in `backend/app/api/v1/endpoints/employees.py` to `pattern="^(asc|desc)$"`.

### 4.5 Bug 5: Vitest JSDOM Test Timeouts with Recharts
- **Symptom**: Running frontend component tests in Vitest timed out on `Questions.test.tsx` (exceeding default 5s timeout).
- **Investigation**: JSDOM does not provide native implementations of `ResizeObserver` or `matchMedia`, which Recharts components rely on for responsive layout measurement. Furthermore, concurrent background execution in sandboxed environments created CPU contention.
- **Resolution**: Polyfilled `ResizeObserver` on `globalThis` in `frontend/src/test/setup.ts`, polyfilled `window.matchMedia`, configured `testTimeout: 15000` in `vite.config.ts`, and ensured single-threaded test execution in CI. All 13 tests passed.

### 4.6 Bug 6: TypeScript Types for `import.meta.env` and Recharts Tooltip
- **Symptom**: `tsc --noEmit` flagged `Property 'env' does not exist on type 'ImportMeta'` and parameter type mismatches on Recharts `Tooltip` `labelFormatter`.
- **Resolution**: Added `"types": ["vite/client"]` in `frontend/tsconfig.json`, created `frontend/src/vite-env.d.ts`, and refined the `Tooltip` callback signatures to accept flexible payload tuples. `tsc --noEmit` subsequently passed with 0 errors.

---

## 5. Verification Gates Executed

All code generated during this project was verified by executing real automated tooling:
1. **Pytest**: 16/16 backend tests passed in 2.83s.
2. **Ruff**: Verified 0 linting errors across `app` and `tests`.
3. **Vitest**: 13/13 frontend tests passed across 4 test suites.
4. **TypeScript Compiler (`tsc`)**: Passed with 0 errors in strict mode.
5. **Vite Production Build**: Successfully bundled `dist/` in 1m 28s.
6. **Seed Script Verification**: Verified exactly 10,000 employees and 12,771 compensations generated deterministically in 6.95s.
