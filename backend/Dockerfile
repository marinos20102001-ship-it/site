# Dockerfile για deploy στο Fly.io
FROM python:3.11-slim

WORKDIR /app

# System deps for openpyxl/pypdf
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Persistent volume mount point — όπου αποθηκεύονται τα uploaded αρχεία πελατών
RUN mkdir -p /data/clients-data
ENV CLIENTS_DATA_DIR=/data/clients-data

EXPOSE 8080

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8080}"]
