#!/usr/bin/env bash
set -euo pipefail
SERVICE=claimlens-api
REGION=us-central1
PROJECT=${1:?"gcloud project id required"}

gcloud config set project "$PROJECT"
gcloud builds submit ./services/api --tag gcr.io/$PROJECT/claimlens-api

gcloud run deploy $SERVICE \
  --image gcr.io/$PROJECT/claimlens-api \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi --cpu 1 --max-instances 10

echo "API deployed. URL:" \
  $(gcloud run services describe $SERVICE --region $REGION --format 'value(status.url)')