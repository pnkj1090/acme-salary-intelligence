# Architecture Decision Records (ADRs)

This document records the critical architectural choices, trade-offs, evaluated alternatives, and engineering justifications made during the development of ACME Salary Intelligence.

---

## ADR-001: Modular Monolith Architecture vs. Microservices

### Context
ACME has 10,000 employees and requires high-throughput querying, relational integrity across departments and compensations, and rapid end-to-end development for an assessment scenario.

### Decision
Implement a **Modular Monolith** using FastAPI and React, maintaining strict internal module boundaries (routers, schemas, services, models).

### Alternatives Considered
1. **Microservices (Employee Service + Compensation Service + Analytics Service)**:
   - *Rejected*: Introduces distributed transactions, network latency over HTTP/gRPC, eventual consistency complexities, and deployment overhead without any scaling necessity for 10,000 records.
2. **Serverless Functions**:
   - *Rejected*: Cold-start latencies and connection pooling limits with relational databases degrade performance for interactive analytical dashboards.

### Consequences
- **Positive**: Single codebase, atomic database transactions, zero network latency between services, simplified local development, and straightforward CI testing.
- **Negative**: Vertical scaling limit (mitigated easily: 10,000 employees fits entirely in modest container memory).

---

## ADR-002: ISO 4217 Currency Isolation & Exact Decimal Precision

### Context
ACME operates across 7 countries with distinct sovereign currencies: US (USD), Germany (EUR), UK (GBP), Japan (JPY), Canada (CAD), India (INR), and Australia (AUD). Naive HR tools often sum salaries directly or convert them with hidden, stale exchange rates.

### Decision
1. Represent all monetary figures using exact `Decimal` precision (`NUMERIC(14, 2)`) in the database and Python service layers.
2. Enforce strict **currency isolation**: never aggregate different currencies into a single total.
3. Group all dashboard metrics, department comparisons, and analytics breakdowns strictly by `currency_code`.

### Alternatives Considered
1. **Converting all salaries to USD using a fixed or dynamic exchange rate**:
   - *Rejected*: Exchange rates fluctuate daily; converting base local compensations obscures contractual pay rates, introduces currency risk distortion into compensation reviews, and creates misleading compliance reports.
2. **Binary Floating-Point (`float`)**:
   - *Rejected*: Binary floating-point arithmetic causes rounding errors (e.g. `0.1 + 0.2 = 0.30000000000000004`) unacceptable in financial software.

### Consequences
- **Positive**: Absolute mathematical correctness, compliance with financial accounting standards, and transparent reporting for HR leaders.
- **Negative**: Analytics UI must present currency-specific breakdowns rather than a single aggregated KPI card.

---

## ADR-003: Server-Side Windowed Pagination & Composite Indexing

### Context
The dataset contains 10,000 employee records and 12,000+ compensation entries. Loading 10,000 rows into the browser DOM degrades memory and locks UI threads.

### Decision
Implement **server-side windowed pagination** (`limit` default 25, max 100) with SQL pushdown filtering and composite B-tree indexes:
- `idx_employees_country_status_last`: `(country_code, employment_status, last_name)`
- `idx_compensations_employee_effective`: `(employee_id, effective_to)`

### Alternatives Considered
1. **Client-Side Pagination (loading all 10,000 items in JSON)**:
   - *Rejected*: Results in a 4MB+ payload on initial load, high latency on mobile or slow networks, and DOM node bloat.
2. **Infinite Scroll**:
   - *Rejected*: Poor accessibility for enterprise data navigation; HR managers frequently need to jump to specific pages and maintain deterministic reference positions.

### Consequences
- **Positive**: Sub-300ms query latency, minimal memory usage in browser, and instant pagination transitions.
- **Negative**: Requires maintaining synchronized query parameters between React Router and the backend.

---

## ADR-004: Parameterized Query Templates vs. LLM Natural Language-to-SQL

### Context
Section 5.E requires an interface for HR managers to answer critical compensation questions (e.g. "Which department has the highest median salary?", "What are the average and median salaries for a selected country and currency?").

### Decision
Implement a deterministic **Structured Query Engine** with 7 predefined, parameterized query templates rather than arbitrary natural-language-to-SQL execution.

### Alternatives Considered
1. **LLM Text-to-SQL (Generating dynamic SQL queries via OpenAI/Gemini)**:
   - *Rejected*: Prone to hallucinations, SQL injection vulnerabilities, unpredictable execution times, non-deterministic results, and security risks with sensitive salary tables.
2. **Custom Query DSL**:
   - *Rejected*: High implementation complexity with minimal user value over structured templates.

### Consequences
- **Positive**: Deterministic, verifiable, safe, zero token cost, instant execution, and accompanied by structured chart/table visualizations and natural-language summaries.
- **Negative**: HR managers must select from supported query templates rather than typing arbitrary conversational prompts.

---

## ADR-005: Temporal Compensation Validity vs. Single-Row Overwriting

### Context
When an employee receives a salary adjustment or promotion, their compensation changes. We must decide how to model this in the database.

### Decision
Implement a **temporal validity model** using `effective_from` and `effective_to` dates:
- Current active compensation has `effective_to = NULL`.
- Prior compensations retain their historical validity windows.
- Editing an employee's salary closes the current window and inserts a new active record.

### Alternatives Considered
1. **Single Salary Column on `employees` Table**:
   - *Rejected*: Destroys compensation history, making historical reporting and promotion auditing impossible.
2. **Separate Full Audit Log Table (Event Sourcing)**:
   - *Rejected*: Over-engineered for assessment scope; querying historical pay requires replaying event streams.

### Consequences
- **Positive**: Preserves career compensation trajectory, supports future-dated compensation changes, and enables historical compensation auditing.
- **Negative**: Querying current salary requires filtering `effective_to IS NULL` or joining with appropriate date constraints.

---

## ADR-006: Chunked Bulk Insertion for Deterministic Seeding

### Context
Seeding 10,000 employees with realistic country-appropriate salaries, unique emails, and compensation records must be repeatable, deterministic, and fast.

### Decision
Use Python's `random` with a fixed seed (`seed=42`) and chunked database bulk insertion (`session.bulk_save_objects` in batches of 1,000).

### Alternatives Considered
1. **Individual ORM `session.add()` per employee**:
   - *Rejected*: Required **140 seconds** to complete due to 20,000+ individual round-trips and ORM identity map overhead.
2. **Raw SQL Dump File (`seed.sql`)**:
   - *Rejected*: Not portable between SQLite and PostgreSQL dialects; fragile to schema changes.

### Consequences
- **Positive**: Completed seeding of 10,000 employees and 12,771 compensations in **6.95 seconds** while retaining portability across database engines.
- **Negative**: Bypasses ORM instance event listeners during seeding (acceptable and intended for bulk population).

---

## ADR-007: SQLite for Development & Testing with PostgreSQL Compatibility

### Context
Local development and automated tests must be deterministic, zero-configuration, and self-contained without requiring external database server daemons. Production deployments require concurrent write throughput.

### Decision
Use **SQLite** with WAL mode for local development and deterministic pytest execution, while maintaining 100% **PostgreSQL** compatibility via SQLAlchemy 2.0 type mapping and migration scripts.

### Alternatives Considered
1. **Dockerized PostgreSQL required for local testing**:
   - *Rejected*: Introduces external dependency barriers for reviewers without Docker installed or configured.
2. **In-Memory Mock Database**:
   - *Rejected*: Hides SQL syntax errors, constraint violations, and index behavior.

### Consequences
- **Positive**: Anyone with Python can clone the repository, run tests, and start the app immediately with zero external dependencies.
- **Negative**: Must avoid SQLite-only or Postgres-only non-standard SQL dialects (e.g. using generic SQLAlchemy types `DateTime`, `Numeric`, `String`).
