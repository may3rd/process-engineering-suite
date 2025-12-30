# Base image with Python 3.10
FROM python:3.10-slim as builder

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    gnupg \
    build-essential \
    libpango-1.0-0 \
    libharfbuzz0b \
    libpangoft2-1.0-0 \
    libffi-dev \
    libjpeg-dev \
    libopenjp2-7-dev \
    postgresql \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Install Supervisor
RUN pip install supervisor

WORKDIR /app

# 1. Install Dependencies
# Copy package manifests first for caching
COPY package.json bun.lock turbo.json ./
# Copy minimal app/package structure for turbo pruning (simplified here: copy config files)
COPY apps/web/package.json apps/web/
COPY apps/network-editor/package.json apps/network-editor/
COPY apps/psv/package.json apps/psv/
COPY apps/docs/package.json apps/docs/
COPY apps/api/requirements.txt apps/api/
COPY packages/ui-kit/package.json packages/ui-kit/
COPY packages/physics-engine/package.json packages/physics-engine/
COPY packages/api-std/package.json packages/api-std/
COPY packages/vessels/package.json packages/vessels/
COPY packages/tsconfig/ packages/tsconfig/
# Note: In a real robust setup we'd use 'turbo prune', but for now we copy manifests manually 
# or just copy everything if the repo isn't huge. Given context constraints, let's copy root manifests.
# To be safe and simple: Copy everything now, bun install, then build.
# Optimization: Just copy root deps first if possible, but monorepo linking requires packages.

# Copy entire repo
COPY . .

# Install Node Dependencies with Bun
RUN bun install --frozen-lockfile

# Install Python Dependencies
RUN pip install --no-cache-dir -r apps/api/requirements.txt

# 2. Build Apps
# Build all apps/packages via Turbo
RUN bun run build

# 3. Cleanup (Optional - remove devDependencies if we want smaller image, but turbo needs some)
# RUN bun prune --production # Pruning in monorepos can be tricky, skipping for safety.

# Expose ports
EXPOSE 3000 3001 3002 3003 8000

# Copy supervisord config
COPY infra/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY infra/start-postgres.sh /usr/local/bin/start-postgres.sh
COPY infra/start-api.sh /usr/local/bin/start-api.sh
RUN chmod +x /usr/local/bin/start-postgres.sh
RUN chmod +x /usr/local/bin/start-api.sh

RUN mkdir -p /var/lib/postgresql/data \
    && chown -R postgres:postgres /var/lib/postgresql

# Start Supervisor
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
