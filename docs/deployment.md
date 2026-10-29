# Production Deployment & Hosting Guide (AWS)

## 1. Deployment Topology

**ACME Salary Intelligence** is deployed on **Amazon Web Services (AWS)** in the `ap-south-1` (Asia Pacific - Mumbai) region. The infrastructure is modeled as Infrastructure as Code (IaC) using AWS CloudFormation, ensuring high availability, security isolation, and sub-second performance.

The production deployment architecture uses a **Unified CloudFront Distribution** that provides a single HTTPS entrypoint for both the React SPA and the FastAPI backend:

```
                                  ┌────────────────────────────────────────┐
                                  │      Client Browser (Global)           │
                                  └───────────────────┬────────────────────┘
                                                      │ HTTPS
                                                      ▼
                                  ┌────────────────────────────────────────┐
                                  │    Amazon CloudFront CDN (Global)      │
                                  │  https://<distribution-id>.cloudfront.net │
                                  └───────┬────────────────────────┬───────┘
                     Default Cache (/*)   │                        │ Path Pattern (/api/*)
                     Static Assets        │                        │ All HTTP Methods, No Cache
                                          ▼                        ▼
               ┌────────────────────────────────────┐    ┌───────────────────────────────────┐
               │         Amazon S3 Bucket           │    │    AWS Elastic Beanstalk (AL2023) │
               │   React 18 + Vite Production SPA   │    │      Python 3.11 + FastAPI        │
               │   Origin Access Control (OAC)      │    │    acme-salary-api-env            │
               └────────────────────────────────────┘    └─────────────────┬─────────────────┘
                                                                           │ Private Subnet
                                                                           │ SQLAlchemy 2.0 Pool
                                                                           ▼
                                                         ┌───────────────────────────────────┐
                                                         │    Amazon RDS PostgreSQL 15.18    │
                                                         │    Multi-AZ Isolated Subnets      │
                                                         │    10,000 Employees + Indexes     │
                                                         └───────────────────────────────────┘
```

### Component Architecture
| Layer | AWS Service | Configuration & Sizing | Purpose |
| :--- | :--- | :--- | :--- |
| **CDN & Edge Routing** | **Amazon CloudFront** | TLS 1.3, Origin Access Control (OAC), Gzip/Brotli compression | Single HTTPS origin for both frontend and backend; eliminates browser cross-origin CORS latency. |
| **Frontend Hosting** | **Amazon S3** | Private Bucket, Public Access Blocked, SPA 403/404 redirects | High-durability hosting for compiled Vite bundle and static assets. |
| **Backend API** | **AWS Elastic Beanstalk** | `64bit Amazon Linux 2023 v4.13.11 running Python 3.11` | Scalable ASGI container running FastAPI with Gunicorn/Uvicorn process manager. |
| **Relational Database**| **Amazon RDS PostgreSQL** | PostgreSQL 15.18, `db.t3.micro`, 20GB gp3 SSD | ACID transactional storage with composite B-tree indexes for sub-300ms queries at 10,000 records. |
| **Credentials & Secrets**| **AWS Secrets Manager** | `acme/salary/db-credentials` (AES-256 encrypted) | Zero plaintext secrets in code or repository; dynamically read by deployment hooks. |
| **Network & Isolation**| **Amazon VPC** | 2 Public Subnets + 2 Private Subnets across AZs | RDS is strictly unreachable from the public internet; ingress restricted to Beanstalk Security Group. |

---

## 2. Infrastructure as Code (CloudFormation)

The entire AWS infrastructure is declared in [aws/cloudformation.yaml](file:///Users/pnkj/Practice/Assignment/Incubyte%20assignment/aws/cloudformation.yaml).

### Key CloudFormation Resources
- `VPC`: Dedicated Virtual Private Cloud with CIDR `10.0.0.0/16`.
- `PublicSubnet1` & `PublicSubnet2`: Dual-AZ subnets with Internet Gateway routing.
- `PrivateSubnet1` & `PrivateSubnet2`: Dual-AZ isolated subnets for database workloads.
- `DBSubnetGroup`: Groups private subnets across multiple AZs for Amazon RDS compliance.
- `DBInstance`: Amazon RDS PostgreSQL 15.18 with automated storage encryption and backup retention.
- `DBSecret`: AWS Secrets Manager entry storing master database credentials.
- `EBApplication` & `EBEnvironment`: Elastic Beanstalk environment with configured system environment variables (`DATABASE_URL`, `ENVIRONMENT=production`, `READ_ONLY_MODE=false`).
- `FrontendBucket`: Private S3 bucket with OAC bucket policy allowing only the CloudFront distribution.
- `CloudFrontDistribution`: Unified distribution mapping `/api/*` to Elastic Beanstalk and `/*` to S3.

---

## 3. Automated One-Command Deployment

The repository includes a comprehensive, automated deployment script: [aws/deploy.sh](file:///Users/pnkj/Practice/Assignment/Incubyte%20assignment/aws/deploy.sh).

### Executing Full Deployment
```bash
# Ensure AWS credentials are configured in your shell
aws sts get-caller-identity

# Run automated end-to-end deployment
./aws/deploy.sh
```

### What `aws/deploy.sh` Does:
1. **Validates & Deploys CloudFormation Stack**:
   - Generates an encrypted random database password.
   - Creates or updates the `acme-salary-intelligence` CloudFormation stack in `ap-south-1`.
   - Waits for stack status `CREATE_COMPLETE` or `UPDATE_COMPLETE`.
2. **Packages Backend Artifact**:
   - Creates a clean deployment zip containing FastAPI application code, Alembic migrations, database models, and deployment hooks (`backend/.platform/hooks/postdeploy/`).
   - Excludes local virtual environments (`.venv`), cache files (`__pycache__`), and local SQLite databases.
3. **Deploys Backend to Elastic Beanstalk**:
   - Uploads the package to the provisioned Elastic Beanstalk S3 bucket.
   - Registers a new Application Version (e.g. `app-v1729862900`).
   - Updates `acme-salary-api-env` to the new version and polls until environment health is `Ready` and `Green`.
4. **Executes Database Migrations & Seeds 10,000 Employees**:
   - The post-deploy hook `.platform/hooks/postdeploy/01_migrate_and_seed.sh` automatically runs on instance boot.
   - Executes `alembic upgrade head`.
   - Runs idempotent seed script populating 10,000 employees and synchronizes PostgreSQL primary key sequences.
5. **Builds & Syncs Frontend to S3**:
   - Executes `npm run build` inside `frontend/` with production environment flags.
   - Synchronizes compiled assets to the private S3 bucket (`s3://acme-salary-frontend-<account-id>-ap-south-1`).
6. **Invalidates CloudFront Cache**:
   - Issues a global cache invalidation for `/*` on CloudFront distribution `E2W941F48UUP4X`.
   - Ensures the updated UI is immediately visible to global users without stale cache delays.

---

## 4. Live Verification & Endpoints

| Resource | Production Endpoint (When Deployed) | Notes |
| :--- | :--- | :--- |
| **Production Application (Web)** | `https://<distribution-id>.cloudfront.net` | React 18 SPA served via global CloudFront edge nodes. |
| **Interactive OpenAPI Documentation** | `https://<distribution-id>.cloudfront.net/api/v1/docs` | Swagger UI for exploring and testing API endpoints. |
| **System Health Check** | `https://<distribution-id>.cloudfront.net/api/v1/health` | Validates API connectivity and PostgreSQL connection pool. |

### Verifying via CLI
```bash
# 1. Verify API Health & PostgreSQL Connectivity
curl -s https://<distribution-id>.cloudfront.net/api/v1/health
# Expected: {"status":"healthy","database":"connected","version":"1.0.0"}

# 2. Verify 10,000 Seeded Employees & Database Aggregations
curl -s https://<distribution-id>.cloudfront.net/api/v1/dashboard | jq .
# Expected: {"total_employees": 10000, "total_departments": 8, "total_countries": 7, ...}

# 3. Verify Pagination Performance Benchmark
time curl -s "https://<distribution-id>.cloudfront.net/api/v1/employees?page=1&size=25" > /dev/null
# Sub-300ms round-trip response time over global HTTPS
```

---

## 5. Security & Production Hardening

1. **Origin Access Control (OAC)**: The S3 frontend bucket blocks all direct public HTTP/S3 access. Only CloudFront's service principal can retrieve objects via signed requests.
2. **Same-Origin API Routing**: Because CloudFront routes both static frontend requests (`/*`) and API calls (`/api/*`) through the same HTTPS hostname, browser cross-origin preflight requests (OPTIONS) are eliminated, improving performance and security.
3. **Database Network Isolation**: Amazon RDS PostgreSQL is placed in private VPC subnets with no public IP allocation. Inbound traffic on port 5432 is strictly allowed only from the Elastic Beanstalk EC2 security group.
4. **Encrypted Secrets Management**: Master database credentials are generated using high-entropy alphanumeric strings, encrypted with AWS KMS, and stored in AWS Secrets Manager.
5. **CSV Formula Injection Neutralization**: Export endpoints sanitize all cell contents starting with `=`, `+`, `-`, or `@` to prevent spreadsheet command execution.
6. **Demo Mode Safeguards**: Write operations can be constrained in production by setting `READ_ONLY_MODE=true` in Elastic Beanstalk configuration.

---

## 6. Teardown & Clean Up

To cleanly decommission all AWS resources and prevent ongoing charges:

```bash
# Execute automated teardown script
./aws/teardown.sh
```

This script:
1. Empties the S3 frontend bucket (including versioned markers).
2. Deletes the CloudFormation stack `acme-salary-intelligence`.
3. Monitors deletion of Elastic Beanstalk environments, RDS instances, Security Groups, Subnets, and VPC until complete.
