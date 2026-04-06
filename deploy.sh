#!/bin/bash
# Deploy ResumeAI to Cloud Run
# Firebase config is public (client-side keys). Gemini key is from Secret Manager.

set -euo pipefail

PROJECT_ID="${GCP_PROJECT:-lmsforshantithakur}"
REGION="${GCP_REGION:-asia-south1}"
SERVICE_NAME="resumeai"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "==> Creating Gemini API key secret (if not exists)..."
gcloud secrets describe gemini-api-key --project="${PROJECT_ID}" 2>/dev/null || \
  echo "Create it first: echo -n 'YOUR_KEY' | gcloud secrets create gemini-api-key --data-file=- --project=${PROJECT_ID}"

echo "==> Reading Gemini key from Secret Manager..."
GEMINI_KEY=$(gcloud secrets versions access latest --secret=gemini-api-key --project="${PROJECT_ID}" 2>/dev/null || echo "")

echo "==> Building container..."
docker build \
  --build-arg VITE_FIREBASE_API_KEY="AIzaSyDRGCy2r_P1YnAgKIXc9XRSr7lCo8xfU9U" \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN="lmsforshantithakur.firebaseapp.com" \
  --build-arg VITE_FIREBASE_PROJECT_ID="lmsforshantithakur" \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET="lmsforshantithakur.firebasestorage.app" \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID="409924770511" \
  --build-arg VITE_FIREBASE_APP_ID="1:409924770511:web:856761f31d5ced6a5db5ba" \
  --build-arg VITE_GEMINI_API_KEY="${GEMINI_KEY}" \
  -t "${IMAGE}" .

echo "==> Pushing to GCR..."
docker push "${IMAGE}"

echo "==> Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image="${IMAGE}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3

echo "==> Done. Service URL:"
gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format="value(status.url)"
