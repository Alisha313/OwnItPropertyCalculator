#!/usr/bin/env bash
# ============================================================
#  deploy-aws.sh  –  Build & deploy OwnIt Property Calculator
#
#  Frontend → S3 + CloudFront
#  Backend  → Lambda + API Gateway (HTTP API)
#  Proxy    → CloudFront routes /api/* to API Gateway
#             (same-domain = session cookies work in browsers)
#
#  Prerequisites:
#    • AWS CLI v2 configured (aws sts get-caller-identity works)
#    • Node.js + npm installed
#    • jq installed (brew install jq)
#    • python3 installed (for JSON config builder)
# ============================================================
set -euo pipefail

# ── Configuration ──────────────────────────────────────────
APP_NAME="ownit-prop-calc"
REGION="us-east-1"               # CloudFront requires us-east-1 for OAC
LAMBDA_RUNTIME="nodejs20.x"
LAMBDA_HANDLER="lambda.handler"
LAMBDA_MEMORY=256
LAMBDA_TIMEOUT=30
JWT_SECRET="ownit-jwt-secret-$(date +%s)"
MONGODB_URI="mongodb+srv://paalisha_db_user:LMaGOVJw0vABFc24@ownit.2yfj4f1.mongodb.net/?appName=ownit"
GROQ_API_KEY="${GROQ_API_KEY:-your_groq_api_key_here}"
OPENAI_API_KEY="${OPENAI_API_KEY:-your_openai_api_key_here}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
BACKEND_DIR="$PROJECT_DIR/backend"
TMP_BUILD="/tmp/${APP_NAME}-build-$$"

echo "╔══════════════════════════════════════════════════╗"
echo "║  OwnIt Property Calculator — AWS Deploy Script  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Preflight checks ──────────────────────────────────────
echo "▶ Preflight checks..."
command -v aws     >/dev/null 2>&1 || { echo "❌ aws CLI not found. Install it first."; exit 1; }
command -v jq      >/dev/null 2>&1 || { echo "❌ jq not found. Install with: brew install jq"; exit 1; }
command -v node    >/dev/null 2>&1 || { echo "❌ Node.js not found. Install it first."; exit 1; }
command -v npm     >/dev/null 2>&1 || { echo "❌ npm not found. Install it first."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ python3 not found. Install it first."; exit 1; }

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "   AWS Account : $ACCOUNT_ID"
echo "   Region      : $REGION"
echo ""

# ── Derived names ─────────────────────────────────────────
BUCKET_NAME="${APP_NAME}-frontend-${ACCOUNT_ID}"
LAMBDA_NAME="${APP_NAME}-api"
ROLE_NAME="${APP_NAME}-lambda-role"
API_NAME="${APP_NAME}-http-api"

# ===========================================================
#  STEP 1 — Build Lambda deployment package
# ===========================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ Step 1/7 — Building Lambda package..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

rm -rf "$TMP_BUILD"
mkdir -p "$TMP_BUILD"

# Copy backend source (no SQLite needed - using MongoDB)
cp "$BACKEND_DIR/lambda.js"      "$TMP_BUILD/"
cp "$BACKEND_DIR/package.json"   "$TMP_BUILD/"
cp "$BACKEND_DIR/server.js"      "$TMP_BUILD/"
cp -r "$BACKEND_DIR/src"         "$TMP_BUILD/src"

# Add serverless-express and mongodb dependencies
cd "$TMP_BUILD"
jq '.dependencies["@vendia/serverless-express"] = "^4.12.6"' package.json > package.tmp.json
mv package.tmp.json package.json
jq '.dependencies["mongodb"] = "^6.3.0"' package.json > package.tmp.json
mv package.tmp.json package.json
jq '.dependencies["jsonwebtoken"] = "^9.0.2"' package.json > package.tmp.json
mv package.tmp.json package.json

# Install deps — sql.js is pure JS/WASM so no native compilation needed
echo "   Installing dependencies..."
npm install --omit=dev --loglevel=error 2>&1 | tail -5

# Create zip
echo "   Creating lambda.zip..."
LAMBDA_ZIP="$PROJECT_DIR/lambda.zip"
rm -f "$LAMBDA_ZIP"
cd "$TMP_BUILD"
zip -r -q "$LAMBDA_ZIP" .
ZIP_SIZE=$(du -h "$LAMBDA_ZIP" | cut -f1)
echo "   ✅ Lambda package ready ($ZIP_SIZE)"
echo ""

# ===========================================================
#  STEP 2 — Create IAM Role
# ===========================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ Step 2/7 — Creating IAM role..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TRUST_POLICY='{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "lambda.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}'

ROLE_ARN=""
if aws iam get-role --role-name "$ROLE_NAME" --region "$REGION" >/dev/null 2>&1; then
  ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query "Role.Arn" --output text)
  echo "   Role already exists: $ROLE_ARN"
else
  ROLE_ARN=$(aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY" \
    --query "Role.Arn" --output text)

  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"

  echo "   Created role: $ROLE_ARN"
  echo "   Waiting 10s for IAM propagation..."
  sleep 10
fi
echo ""

# ===========================================================
#  STEP 3 — Create / Update Lambda Function
# ===========================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ Step 3/7 — Deploying Lambda function..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if aws lambda get-function --function-name "$LAMBDA_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "   Updating existing function..."
  aws lambda update-function-code \
    --function-name "$LAMBDA_NAME" \
    --zip-file "fileb://$LAMBDA_ZIP" \
    --region "$REGION" \
    --no-cli-pager > /dev/null

  aws lambda wait function-updated --function-name "$LAMBDA_NAME" --region "$REGION" 2>/dev/null || true

  aws lambda update-function-configuration \
    --function-name "$LAMBDA_NAME" \
    --runtime "$LAMBDA_RUNTIME" \
    --handler "$LAMBDA_HANDLER" \
    --memory-size "$LAMBDA_MEMORY" \
    --timeout "$LAMBDA_TIMEOUT" \
    --environment "Variables={JWT_SECRET=$JWT_SECRET,MONGODB_URI=$MONGODB_URI,GROQ_API_KEY=$GROQ_API_KEY,OPENAI_API_KEY=$OPENAI_API_KEY,NODE_ENV=production}" \
    --region "$REGION" \
    --no-cli-pager > /dev/null

  LAMBDA_ARN=$(aws lambda get-function --function-name "$LAMBDA_NAME" --region "$REGION" \
    --query "Configuration.FunctionArn" --output text)
  echo "   ✅ Lambda updated: $LAMBDA_NAME"
else
  echo "   Creating new function..."
  LAMBDA_ARN=$(aws lambda create-function \
    --function-name "$LAMBDA_NAME" \
    --runtime "$LAMBDA_RUNTIME" \
    --handler "$LAMBDA_HANDLER" \
    --role "$ROLE_ARN" \
    --zip-file "fileb://$LAMBDA_ZIP" \
    --memory-size "$LAMBDA_MEMORY" \
    --timeout "$LAMBDA_TIMEOUT" \
    --environment "Variables={JWT_SECRET=$JWT_SECRET,MONGODB_URI=$MONGODB_URI,GROQ_API_KEY=$GROQ_API_KEY,OPENAI_API_KEY=$OPENAI_API_KEY,NODE_ENV=production}" \
    --region "$REGION" \
    --query "FunctionArn" --output text \
    --no-cli-pager)

  echo "   Waiting for function to be active..."
  aws lambda wait function-active-v2 --function-name "$LAMBDA_NAME" --region "$REGION" 2>/dev/null || sleep 5
  echo "   ✅ Lambda created: $LAMBDA_NAME"
fi
echo ""

# ===========================================================
#  STEP 4 — Create API Gateway (HTTP API)
# ===========================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ Step 4/7 — Setting up API Gateway..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

API_ID=""
EXISTING_APIS=$(aws apigatewayv2 get-apis --region "$REGION" --query "Items[?Name=='$API_NAME'].ApiId" --output text 2>/dev/null || true)
if [ -n "$EXISTING_APIS" ] && [ "$EXISTING_APIS" != "None" ]; then
  API_ID="$EXISTING_APIS"
  echo "   API Gateway already exists: $API_ID"

  INTEGRATION_ID=$(aws apigatewayv2 get-integrations --api-id "$API_ID" --region "$REGION" \
    --query "Items[0].IntegrationId" --output text 2>/dev/null || true)
  if [ -n "$INTEGRATION_ID" ] && [ "$INTEGRATION_ID" != "None" ]; then
    aws apigatewayv2 update-integration \
      --api-id "$API_ID" \
      --integration-id "$INTEGRATION_ID" \
      --integration-uri "$LAMBDA_ARN" \
      --region "$REGION" \
      --no-cli-pager > /dev/null
  fi

  # Remove API Gateway CORS — Express handles CORS, CloudFront proxies /api/*
  aws apigatewayv2 delete-cors-configuration --api-id "$API_ID" --region "$REGION" 2>/dev/null || true
else
  # Create HTTP API (no CORS config — CloudFront proxy handles same-domain)
  API_ID=$(aws apigatewayv2 create-api \
    --name "$API_NAME" \
    --protocol-type HTTP \
    --region "$REGION" \
    --query "ApiId" --output text \
    --no-cli-pager)

  echo "   Created HTTP API: $API_ID"

  INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id "$API_ID" \
    --integration-type AWS_PROXY \
    --integration-uri "$LAMBDA_ARN" \
    --payload-format-version "2.0" \
    --region "$REGION" \
    --query "IntegrationId" --output text \
    --no-cli-pager)

  aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "ANY /api/{proxy+}" \
    --target "integrations/$INTEGRATION_ID" \
    --region "$REGION" \
    --no-cli-pager > /dev/null

  aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "GET /api/health" \
    --target "integrations/$INTEGRATION_ID" \
    --region "$REGION" \
    --no-cli-pager > /dev/null

  aws apigatewayv2 create-stage \
    --api-id "$API_ID" \
    --stage-name "\$default" \
    --auto-deploy \
    --region "$REGION" \
    --no-cli-pager > /dev/null

  echo "   ✅ API routes created"
fi

aws lambda add-permission \
  --function-name "$LAMBDA_NAME" \
  --statement-id "apigateway-invoke-${API_ID}" \
  --action "lambda:InvokeFunction" \
  --principal "apigateway.amazonaws.com" \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*" \
  --region "$REGION" \
  --no-cli-pager > /dev/null 2>&1 || true

API_DOMAIN="${API_ID}.execute-api.${REGION}.amazonaws.com"
echo "   API Domain: $API_DOMAIN"
echo ""

# ===========================================================
#  STEP 5 — Create & configure S3 bucket
# ===========================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ Step 5/7 — Setting up S3 bucket..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if aws s3api head-bucket --bucket "$BUCKET_NAME" --region "$REGION" 2>/dev/null; then
  echo "   Bucket already exists: $BUCKET_NAME"
else
  aws s3api create-bucket \
    --bucket "$BUCKET_NAME" \
    --region "$REGION" \
    --no-cli-pager > /dev/null
  echo "   Created bucket: $BUCKET_NAME"
fi

aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region "$REGION" > /dev/null 2>&1
echo ""

# ===========================================================
#  STEP 6 — Upload frontend to S3 (NO URL patching needed)
# ===========================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ Step 6/7 — Uploading frontend to S3..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# No patching needed! CloudFront proxies /api/* to API Gateway,
# so the frontend's relative /api/ URLs work as-is.
echo "   Uploading files (no URL patching — CloudFront proxies /api/*)..."
aws s3 sync "$PROJECT_DIR" "s3://$BUCKET_NAME/" \
  --delete \
  --region "$REGION" \
  --no-cli-pager \
  --exclude ".DS_Store" \
  --exclude "*.php" \
  --exclude ".git/*" \
  --exclude "backend/*" \
  --exclude "frontend/node_modules/*" \
  --exclude "frontend/package-lock.json" \
  --exclude "frontend/package.json" \
  --exclude "frontend/*.js" \
  --exclude "lambda.zip" \
  --exclude "lambda 2.zip" \
  --exclude "deploy-aws.sh" \
  --exclude "plugin.php" \
  --exclude "readme.*" \
  --exclude "node_modules/*"

aws s3 cp "s3://$BUCKET_NAME/index.html" "s3://$BUCKET_NAME/index.html" \
  --content-type "text/html" --metadata-directive REPLACE \
  --region "$REGION" --no-cli-pager --quiet 2>/dev/null || true

echo "   ✅ Frontend uploaded to s3://$BUCKET_NAME"
echo ""

# ===========================================================
#  STEP 7 — Create CloudFront (S3 + API Gateway origins)
# ===========================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ Step 7/7 — Setting up CloudFront..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DIST_ID=""
EXISTING_DIST=$(aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='${APP_NAME}'].Id" --output text 2>/dev/null || true)
if [ -n "$EXISTING_DIST" ] && [ "$EXISTING_DIST" != "None" ] && [ "$EXISTING_DIST" != "" ]; then
  DIST_ID="$EXISTING_DIST"
  DIST_DOMAIN=$(aws cloudfront get-distribution --id "$DIST_ID" --query "Distribution.DomainName" --output text)
  echo "   CloudFront distribution already exists: $DIST_ID"
  echo "   Invalidating cache..."
  aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" --no-cli-pager --query "Invalidation.Id" --output text > /dev/null
  echo "   ✅ Cache invalidated"
else
  # Create OAC
  OAC_NAME="${APP_NAME}-oac"
  OAC_ID=""
  EXISTING_OAC=$(aws cloudfront list-origin-access-controls --query "OriginAccessControlList.Items[?Name=='${OAC_NAME}'].Id" --output text 2>/dev/null || true)
  if [ -n "$EXISTING_OAC" ] && [ "$EXISTING_OAC" != "None" ] && [ "$EXISTING_OAC" != "" ]; then
    OAC_ID="$EXISTING_OAC"
  else
    OAC_ID=$(aws cloudfront create-origin-access-control \
      --origin-access-control-config "{
        \"Name\": \"${OAC_NAME}\",
        \"Description\": \"OAC for ${APP_NAME}\",
        \"SigningProtocol\": \"sigv4\",
        \"SigningBehavior\": \"always\",
        \"OriginAccessControlOriginType\": \"s3\"
      }" \
      --query "OriginAccessControl.Id" --output text --no-cli-pager)
  fi
  echo "   OAC ID: $OAC_ID"

  # Build CloudFront config with TWO origins (S3 + API Gateway)
  # using python3 for reliable JSON construction
  python3 -c "
import json, sys

config = {
    'CallerReference': 'deploy-$(date +%s)',
    'Comment': '${APP_NAME}',
    'DefaultRootObject': 'index.html',
    'Enabled': True,
    'Origins': {
        'Quantity': 2,
        'Items': [
            {
                'Id': 's3-${BUCKET_NAME}',
                'DomainName': '${BUCKET_NAME}.s3.${REGION}.amazonaws.com',
                'OriginPath': '',
                'CustomHeaders': {'Quantity': 0},
                'OriginAccessControlId': '${OAC_ID}',
                'S3OriginConfig': {'OriginAccessIdentity': ''},
                'ConnectionAttempts': 3,
                'ConnectionTimeout': 10,
                'OriginShield': {'Enabled': False}
            },
            {
                'Id': 'api-gateway',
                'DomainName': '${API_DOMAIN}',
                'OriginPath': '',
                'CustomHeaders': {'Quantity': 0},
                'CustomOriginConfig': {
                    'HTTPPort': 80,
                    'HTTPSPort': 443,
                    'OriginProtocolPolicy': 'https-only',
                    'OriginSslProtocols': {'Quantity': 1, 'Items': ['TLSv1.2']},
                    'OriginReadTimeout': 30,
                    'OriginKeepaliveTimeout': 5
                },
                'ConnectionAttempts': 3,
                'ConnectionTimeout': 10,
                'OriginShield': {'Enabled': False}
            }
        ]
    },
    'DefaultCacheBehavior': {
        'TargetOriginId': 's3-${BUCKET_NAME}',
        'ViewerProtocolPolicy': 'redirect-to-https',
        'AllowedMethods': {
            'Quantity': 2, 'Items': ['GET', 'HEAD'],
            'CachedMethods': {'Quantity': 2, 'Items': ['GET', 'HEAD']}
        },
        'CachePolicyId': '658327ea-f89d-4fab-a63d-7e88639e58f6',
        'Compress': True,
        'SmoothStreaming': False,
        'FieldLevelEncryptionId': '',
        'LambdaFunctionAssociations': {'Quantity': 0},
        'FunctionAssociations': {'Quantity': 0},
        'TrustedSigners': {'Enabled': False, 'Quantity': 0},
        'TrustedKeyGroups': {'Enabled': False, 'Quantity': 0}
    },
    'CacheBehaviors': {
        'Quantity': 1,
        'Items': [{
            'PathPattern': '/api/*',
            'TargetOriginId': 'api-gateway',
            'ViewerProtocolPolicy': 'https-only',
            'AllowedMethods': {
                'Quantity': 7,
                'Items': ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'PATCH', 'DELETE'],
                'CachedMethods': {'Quantity': 2, 'Items': ['GET', 'HEAD']}
            },
            'CachePolicyId': '4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
            'OriginRequestPolicyId': 'b689b0a8-53d0-40ab-baf2-68738e2966ac',
            'Compress': True,
            'SmoothStreaming': False,
            'FieldLevelEncryptionId': '',
            'LambdaFunctionAssociations': {'Quantity': 0},
            'FunctionAssociations': {'Quantity': 0},
            'TrustedSigners': {'Enabled': False, 'Quantity': 0},
            'TrustedKeyGroups': {'Enabled': False, 'Quantity': 0}
        }]
    },
    'CustomErrorResponses': {
        'Quantity': 1,
        'Items': [{
            'ErrorCode': 403,
            'ResponsePagePath': '/index.html',
            'ResponseCode': '200',
            'ErrorCachingMinTTL': 10
        }]
    },
    'ViewerCertificate': {'CloudFrontDefaultCertificate': True},
    'PriceClass': 'PriceClass_100'
}

with open('/tmp/cf-dist-create.json', 'w') as f:
    json.dump(config, f)
print('CF config built')
"

  DIST_RESULT=$(aws cloudfront create-distribution \
    --distribution-config file:///tmp/cf-dist-create.json \
    --query "Distribution.{Id:Id,DomainName:DomainName}" \
    --output json --no-cli-pager)

  DIST_ID=$(echo "$DIST_RESULT" | jq -r '.Id')
  DIST_DOMAIN=$(echo "$DIST_RESULT" | jq -r '.DomainName')

  echo "   Distribution created: $DIST_ID"

  # S3 bucket policy for CloudFront OAC
  BUCKET_POLICY="{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Sid\": \"AllowCloudFrontOAC\",
      \"Effect\": \"Allow\",
      \"Principal\": {
        \"Service\": \"cloudfront.amazonaws.com\"
      },
      \"Action\": \"s3:GetObject\",
      \"Resource\": \"arn:aws:s3:::${BUCKET_NAME}/*\",
      \"Condition\": {
        \"StringEquals\": {
          \"AWS:SourceArn\": \"arn:aws:cloudfront::${ACCOUNT_ID}:distribution/${DIST_ID}\"
        }
      }
    }]
  }"

  aws s3api put-bucket-policy \
    --bucket "$BUCKET_NAME" \
    --policy "$BUCKET_POLICY" \
    --region "$REGION" > /dev/null

  echo "   ✅ S3 bucket policy updated for CloudFront OAC"
fi

echo ""

# ── Cleanup ───────────────────────────────────────────────
rm -rf "$TMP_BUILD"

# ===========================================================
#  Done!
# ===========================================================
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                    🎉 Deployment Complete! 🎉                  ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
printf "║  🌐 LIVE URL:  https://%-40s ║\n" "$DIST_DOMAIN"
echo "║                                                                ║"
echo "║  ⏳ CloudFront may take 5-10 minutes to fully deploy.          ║"
echo "║     You can check status in the AWS Console.                   ║"
echo "║                                                                ║"
echo "║  Resources created:                                            ║"
printf "║    • S3 Bucket:     %-40s   ║\n" "$BUCKET_NAME"
printf "║    • Lambda:        %-40s   ║\n" "$LAMBDA_NAME"
printf "║    • API Gateway:   %-40s   ║\n" "$API_ID"
printf "║    • CloudFront:    %-40s   ║\n" "$DIST_ID"
printf "║    • IAM Role:      %-40s   ║\n" "$ROLE_NAME"
echo "║                                                                ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Test: curl https://${DIST_DOMAIN}/api/health"
echo ""
