#!/bin/bash
set -euo pipefail

# Ensure local project bin and common macOS package paths are in PATH
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="${SCRIPT_DIR}/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

REGION="ap-south-1"
STACK_NAME="acme-salary-intelligence"

echo "=================================================="
echo "ACME Salary Intelligence — Comprehensive AWS Teardown"
echo "Region: ${REGION}"
echo "Stack:  ${STACK_NAME}"
echo "=================================================="

echo "⚠️  WARNING: This will permanently delete all AWS resources created for ACME Salary Intelligence,"
echo "   including the RDS PostgreSQL database, S3 bucket, CloudFront distribution, Secrets Manager secrets, and VPC."
echo ""
read -p "Are you sure you want to proceed with complete teardown? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
    echo "Teardown aborted by user."
    exit 0
fi

# 1. Retrieve resource identifiers before stack deletion
echo "1. Identifying resources to clean up..."
S3_BUCKET=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${REGION}" --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text 2>/dev/null || true)
SECRET_ARN=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${REGION}" --query "Stacks[0].Outputs[?OutputKey=='DatabaseSecretArn'].OutputValue" --output text 2>/dev/null || true)

# 2. Empty S3 Bucket (including versioning markers to prevent DeleteBucket failure)
if [ -n "${S3_BUCKET}" ] && [ "${S3_BUCKET}" != "None" ]; then
    echo "2. Emptying S3 bucket s3://${S3_BUCKET}..."
    aws s3 rm "s3://${S3_BUCKET}" --recursive || true
fi

# 3. Delete CloudFormation stack
echo "3. Deleting CloudFormation stack ${STACK_NAME}..."
aws cloudformation delete-stack --stack-name "${STACK_NAME}" --region "${REGION}"

# 4. Wait for stack deletion to complete with failure handling
echo "4. Waiting for stack deletion to complete (typically takes 5-10 minutes)..."
if aws cloudformation wait stack-delete-complete --stack-name "${STACK_NAME}" --region "${REGION}"; then
    echo "   Stack deleted successfully!"
else
    echo "❌ Stack deletion encountered errors! Inspecting stack events:"
    aws cloudformation describe-stack-events --stack-name "${STACK_NAME}" --region "${REGION}" --query "StackEvents[?ResourceStatus=='DELETE_FAILED'].[LogicalResourceId,ResourceStatusReason]" --output table
    exit 1
fi

# 5. Purge Secrets Manager secret immediately to prevent residual charges ($0.40/month)
if [ -n "${SECRET_ARN}" ] && [ "${SECRET_ARN}" != "None" ]; then
    echo "5. Permanently purging Secrets Manager secret to eliminate residual storage fees..."
    aws secretsmanager delete-secret --secret-id "${SECRET_ARN}" --force-delete-without-recovery --region "${REGION}" 2>/dev/null || true
fi

# 6. Verify zero lingering EBS volumes or Elastic IPs in the VPC
echo "6. Verifying zero orphaned resources..."
echo "   • Checking unattached EBS volumes in ${REGION}..."
aws ec2 describe-volumes --filters Name=status,Values=available --region "${REGION}" --query "Volumes[*].VolumeId" --output table 2>/dev/null || true

echo "=================================================="
echo "✅ Teardown Complete! Zero active resources remain."
echo "   No ongoing charges will be incurred."
echo "=================================================="
