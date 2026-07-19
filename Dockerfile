# Root Dockerfile for Fly.io deployment
# Builds the FastAPI backend from /backend/ folder
FROM python:3.11-slim

WORKDIR /app

# System deps for openpyxl/pypdf/xlrd
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps from backend/requirements.txt
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# Persistent volume mount point — where uploaded client files live
RUN mkdir -p /data/clients-data
ENV CLIENTS_DATA_DIR=/data/clients-data

EXPOSE 8080

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8080}"]
