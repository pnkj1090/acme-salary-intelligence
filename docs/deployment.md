# Production Deployment & Hosting Guide

## 1. Deployment Topology

ACME Salary Intelligence is structured for production deployment across decoupled static edge and containerized API tiers:

- **Frontend (Static Single Page Application)**: Hosted on **Vercel** (or Netlify / Cloudflare Pages) with global CDN edge caching.
- **Backend (Python ASGI Container)**: Deployed on **Render** (or Fly.io / Railway / AWS ECS) running Uvicorn + FastAPI.
- **Database (Relational Engine)**: Managed **PostgreSQL 15+** (e.g. Render Postgres, Supabase, Neon, AWS RDS) with persistent SSD storage and connection pooling.

```
                    ┌─────────────────────────────────┐
                    │     Vercel Edge Network         │
                    │   React 18 + Vite Production    │
                    └────────────────┬────────────────┘
                                     │ HTTPS API calls
                                     ▼
                    ┌─────────────────────────────────┐
                    │     Render Web Service          │
                    │      Uvicorn + FastAPI          │
                    └────────────────┬────────────────┘
                                     │ SQLAlchemy 2.0 Pool
                                     ▼
                    ┌─────────────────────────────────┐
                    │    Managed PostgreSQL 15+       │
                    │  10,000 Employees + 12k Comps   │
                    └─────────────────────────────────┘
```

---

## 2. Environment Variables Configuration

### 2.1 Backend Environment Variables (Render Web Service)
| Variable Name | Production Value Example | Purpose |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `production` | Disables debug mode and enables strict production error handling. |
| `DATABASE_URL` | `postgresql://acme_user:secret@dpg-xxx.render.com/acme_db?sslmode=require` | Managed PostgreSQL connection string. |
| `CORS_ORIGINS` | `https://acme-salary-intelligence.vercel.app` | Restricts API access exclusively to the production frontend domain. |
| `HOST` | `0.0.0.0` | Container network interface. |
| `PORT` | `8000` | Port assigned by hosting provider. |

### 2.2 Frontend Environment Variables (Vercel Project Settings)
| Variable Name | Production Value Example | Purpose |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://acme-salary-api.onrender.com` | Base URL pointing the React frontend to the deployed FastAPI backend. |

---

## 3. Step-by-Step Deployment Instructions

### 3.1 Step 1: Provision Managed PostgreSQL
1. On Render, navigate to **New** → **PostgreSQL Database**.
2. Name the database `acme-salary-db`.
3. Set the region matching your intended backend service (e.g. `Oregon (US West)` or `Frankfurt (EU)`).
4. Copy the **Internal Database URL** (for services within Render) or **External Database URL** (for outside connections).

### 3.2 Step 2: Deploy Backend to Render
1. Navigate to **New** → **Web Service** and connect the GitHub repository.
2. Configure settings:
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     pip install -r requirements.txt && alembic upgrade head
     ```
   - **Start Command**:
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
3. Add the Environment Variables:
   - `DATABASE_URL`: Your PostgreSQL URL from Step 1.
   - `ENVIRONMENT`: `production`
   - `CORS_ORIGINS`: `https://your-frontend-app.vercel.app`
4. Deploy the service.
5. Once deployment completes, note your backend public URL (e.g. `https://acme-salary-api.onrender.com`).
6. Verify the health check:
   ```bash
   curl https://acme-salary-api.onrender.com/api/v1/health
   # Expected response: {"status":"healthy","database":"connected","version":"1.0.0"}
   ```

### 3.3 Step 3: Seed 10,000 Employees (One-Time Execution)
> **CRITICAL**: The application must **NEVER** automatically seed or reset data on container startup. Seeding must be triggered once explicitly via the Render Shell or deployment CLI.

Open the **Render Shell** for your backend service and execute:
```bash
python seed.py  # or: python -m app.db.seed
```
Expected output:
```
[INFO] Starting database seed...
[INFO] Generated 10,000 employees and 12,771 compensations.
[SUCCESS] Seed complete. Exactly 10,000 employees verified in database.
```

### 3.4 Step 4: Deploy Frontend to Vercel
1. In Vercel, click **Add New Project** and select the repository.
2. Configure settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
3. Add the Environment Variable:
   - `VITE_API_BASE_URL`: `https://acme-salary-api.onrender.com`
4. Click **Deploy**.
5. Once complete, copy the assigned Vercel URL and update the backend `CORS_ORIGINS` on Render if not already set.

---

## 4. Containerization (Dockerfile)

For deployment on Docker-based container platforms (AWS ECS, Google Cloud Run, Fly.io), a production multi-stage Dockerfile is provided:

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim as builder

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

COPY . .

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/v1/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 5. Pre-Flight Verification Checklist

Before opening the production application to HR managers:
- [ ] Database migrations applied via `alembic upgrade head`.
- [ ] Exactly 10,000 employees seeded and verified (`/api/v1/dashboard` returns `total_employees: 10000`).
- [ ] Health check endpoint `/api/v1/health` returns HTTP 200 with `status: "healthy"`.
- [ ] CORS headers permit only the production Vercel domain.
- [ ] Production frontend loads without console errors and displays live metrics.
- [ ] Filtered CSV export downloads successfully with sanitized formulas.
- [ ] Employee search, update, and compensation questions return accurate, sub-second responses.
