# Known Limitations & Enterprise Evolution Roadmap

## 1. Overview & Context

ACME Salary Intelligence was built as an assessment implementation demonstrating product engineering, relational data modeling, query optimization, and UX excellence for an organization of 10,000 employees.

To keep the assessment focused on core engineering fundamentals rather than boilerplate enterprise integrations, deliberate architectural boundaries were established. This document transparently outlines these boundaries and details how each would be addressed in a full production SaaS deployment.

---

## 2. Security, Authentication & Access Control

### 2.1 Current Implementation (Assessment Scope)
- The demo application runs in an **unauthenticated demonstration mode** without requiring login credentials.
- This deliberate decision allows hiring reviewers and stakeholders to immediately evaluate all features, explore 10,000 employee records, test queries, and inspect compensation charts without encountering artificial login roadblocks or fake credentials.

### 2.2 Enterprise Production Requirement
- **Risk**: Real employee salary data is strictly confidential and protected by privacy legislation (GDPR, CCPA, HIPAA).
- **Roadmap**:
  1. **Enterprise SSO / Identity Federation**: Integrate SAML 2.0 and OpenID Connect (OIDC) through providers such as Okta, Microsoft Azure AD, or Google Workspace.
  2. **Role-Based Access Control (RBAC)**:
     - `HR Super Admin`: Unrestricted access to view, edit, and export all international compensations.
     - `Department Manager`: Scoped read-only access to employees within their direct organizational hierarchy.
     - `Finance / Payroll Auditor`: Access to aggregate compensation reports without PII access.
     - `General Employee`: Access restricted strictly to their own personal profile.
  3. **Row-Level Security (RLS)**: Enforce PostgreSQL tenant and role security policies directly in the database engine to guarantee defense-in-depth even if application authorization fails.

---

## 3. Financial & Currency Semantics

### 3.1 Current Implementation (Strict Isolation)
- All compensation calculations and visualizations enforce **strict currency isolation** (USD, EUR, GBP, JPY, CAD, INR, AUD).
- We explicitly rejected converting local currencies into a single uniform USD total using an arbitrary fixed exchange rate, as this produces distorted payroll reports and hides contractual pay baselines.

### 3.2 Enterprise Production Requirement
- **Roadmap**:
  1. **Daily FX Rate Service**: Integrate with institutional exchange rate APIs (e.g. European Central Bank, Open Exchange Rates) to fetch daily mid-market FX rates.
  2. **Dual-View Analytics**: Provide an executive toggle allowing HR leadership to switch between:
     - *Contractual Local View* (Ground truth legal contracts).
     - *Constant-Currency Corporate Normalized View* (Normalized using a fixed board-approved annual budget rate for year-over-year corporate comparisons).
  3. **Explicit Exchange Rate Badging**: Display the exact rate and conversion timestamp alongside any normalized figure.

---

## 4. Total Rewards Modeling

### 4.1 Current Implementation
- Represents base **Annual Salary** with time-bounded historical validity (`effective_from`, `effective_to`).

### 4.2 Enterprise Production Requirement
- **Roadmap**:
  1. **Multi-Component Compensation Packages**: Model complete "Total Rewards" comprising:
     - Base Salary (fixed monthly/annual).
     - Variable Incentive Pay (Quarterly/Annual Performance Bonus, Commission).
     - Long-Term Incentives (Stock Options, RSUs with vesting schedules).
     - Benefits & Perquisites (Health coverage, Pension/401k employer match, car allowances).
  2. **FTE & Working Hours**: Track Full-Time Equivalent (FTE) ratios (e.g. 0.8 FTE for part-time employees) to calculate normalized annualized full-time compensation.

---

## 5. Compliance & Immutable Audit Logging

### 5.1 Current Implementation
- Soft deactivation transitions employee status to `'terminated'`.
- Salary updates preserve historical compensation rows (`effective_to` closed).

### 5.2 Enterprise Production Requirement
- **Roadmap**:
  1. **Append-Only Audit Ledger Table**: Implement an immutable `audit_logs` table recording every state mutation:
     ```sql
     CREATE TABLE audit_logs (
         id BIGSERIAL PRIMARY KEY,
         actor_id VARCHAR(100) NOT NULL,
         ip_address INET,
         action VARCHAR(50) NOT NULL,
         target_table VARCHAR(50) NOT NULL,
         target_id INT NOT NULL,
         diff_json JSONB NOT NULL,
         created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
     );
     ```
  2. **SOX & GDPR Compliance**: Required for Sarbanes-Oxley compliance in publicly traded companies and GDPR data subject request audits.

---

## 6. Scaling Beyond 100,000 Employees

### 6.1 Current Performance Profile
- Highly optimized for **10,000 to 50,000 employees**, achieving sub-300ms pagination and aggregation using indexed relational tables.

### 6.2 Ultra-Scale Strategy (500k+ Records)
- For organizations scaling into hundreds of thousands of global employees:
  1. **Read Replicas**: Route analytical queries (`/analytics`, `/dashboard`) to dedicated read replicas to isolate operational transaction throughput.
  2. **Materialized Aggregation Views**: Refresh hourly materialized rollups for cross-country and cross-department statistics.
  3. **Dedicated OLAP Columnar Store**: Stream compensation snapshots into ClickHouse or BigQuery for real-time exploratory analytics across millions of historical payroll rows.
