FROM python:3.10-slim

WORKDIR /app

# Install system dependencies if needed (e.g. build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    postgresql-client \
    libpango-1.0-0 \
    libharfbuzz0b \
    libpangoft2-1.0-0 \
    libffi-dev \
    libjpeg-dev \
    libopenjp2-7-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements separately to cache install
COPY apps/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
# We expect the build context to be the repository root
COPY apps/api /app/apps/api
COPY packages /app/packages

# Add /app to PYTHONPATH so "packages.hydraulics" is importable
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8000

# Run in production mode (no reload)
CMD ["uvicorn", "apps.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
