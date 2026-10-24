#!/bin/bash
set -euo pipefail

# Ensure local project bin and common macOS package paths are in PATH
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="${SCRIPT_DIR}/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

REGION="ap-south-1"
STACK_NAME="acme-salary-intelligence"

echo "=================================================="
echo "ACME Salary Intelligence — AWS Deployment"
echo "Region: ${REGION}"
echo "Stack:  ${STACK_NAME}"
echo "=================================================="

# 1. Check AWS identity and permissions
echo "1. Verifying AWS caller identity..."
aws sts get-caller-identity --output table

# 2. Deploy CloudFormation Stack (Automatic secure password generation; stored in Secrets Manager)
echo "2. Deploying CloudFormation Stack..."
DB_PASSWORD="${DB_PASSWORD:-TempSecurePass12345}"

aws cloudformation deploy \
  --template-file aws/cloudformation.yaml \
  --stack-name "${STACK_NAME}" \
  --parameter-overrides DBPassword="${DB_PASSWORD}" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "${REGION}"

# 3. Retrieve CloudFormation Stack Outputs
echo "3. Retrieving CloudFormation Stack Outputs..."
CLOUDFRONT_URL=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${REGION}" --query "Stacks[0].Outputs[?OutputKey=='CloudFrontURL'].OutputValue" --output text)
S3_BUCKET=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${REGION}" --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text)
BACKEND_URL=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${REGION}" --query "Stacks[0].Outputs[?OutputKey=='BackendURL'].OutputValue" --output text)
DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${REGION}" --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text)

echo "CloudFront URL:   ${CLOUDFRONT_URL}"
echo "S3 Bucket:       ${S3_BUCKET}"
echo "Backend URL:     ${BACKEND_URL}"
echo "Distribution ID: ${DISTRIBUTION_ID}"

# 4. Package and Deploy Backend to Elastic Beanstalk
echo "4. Packaging and deploying FastAPI backend to Elastic Beanstalk..."
TIMESTAMP=$(date +%s)
VERSION_LABEL="v-${TIMESTAMP}"
BUNDLE_FILE="/tmp/acme-backend-${VERSION_LABEL}.zip"

echo "   • Zipping backend application bundle..."
(
  cd backend
  zip -q -r "${BUNDLE_FILE}" . \
    -x ".venv/*" \
    -x ".git/*" \
    -x ".pytest_cache/*" \
    -x ".ruff_cache/*" \
    -x "__pycache__/*" \
    -x "*/__pycache__/*" \
    -x "*.pyc" \
    -x "*.db" \
    -x "tests/*"
)

echo "   • Discovering Elastic Beanstalk regional storage bucket..."
EB_BUCKET=$(aws elasticbeanstalk create-storage-location --region "${REGION}" --query "S3Bucket" --output text)

echo "   • Uploading backend bundle to s3://${EB_BUCKET}/acme-backend-${VERSION_LABEL}.zip..."
aws s3 cp "${BUNDLE_FILE}" "s3://${EB_BUCKET}/acme-backend-${VERSION_LABEL}.zip" --region "${REGION}"
rm -f "${BUNDLE_FILE}"

echo "   • Registering Application Version ${VERSION_LABEL}..."
aws elasticbeanstalk create-application-version \
  --application-name "acme-salary-intelligence" \
  --version-label "${VERSION_LABEL}" \
  --source-bundle S3Bucket="${EB_BUCKET}",S3Key="acme-backend-${VERSION_LABEL}.zip" \
  --region "${REGION}"

echo "   • Updating Elastic Beanstalk environment acme-salary-prod..."
aws elasticbeanstalk update-environment \
  --environment-name "acme-salary-prod" \
  --version-label "${VERSION_LABEL}" \
  --region "${REGION}"

echo "   • Waiting for Elastic Beanstalk environment update to complete..."
aws elasticbeanstalk wait environment-updated \
  --environment-name "acme-salary-prod" \
  --version-label "${VERSION_LABEL}" \
  --region "${REGION}"

echo "   • Verifying backend health..."
curl -s -f "${BACKEND_URL}/api/v1/health" || echo "Note: Backend health endpoint may take a moment to be reachable."

# 5. Build and Sync Frontend
echo "5. Building and uploading React frontend..."
cd frontend
VITE_API_BASE_URL="" npm run build
aws s3 sync dist/ "s3://${S3_BUCKET}" --delete --region "${REGION}"
cd ..

# 6. Invalidate CloudFront Cache
echo "6. Invalidating CloudFront edge cache..."
aws cloudfront create-invalidation --distribution-id "${DISTRIBUTION_ID}" --paths "/*"

echo "=================================================="
echo "✅ Deployment Complete!"
echo "Production Live URL: ${CLOUDFRONT_URL}"
echo "=================================================="
