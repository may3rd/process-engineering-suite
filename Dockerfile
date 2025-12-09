# Base image with Python 3.10
FROM python:3.10-slim as builder

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Install Supervisor
RUN pip install supervisor

WORKDIR /app

# 1. Install Dependencies
# Copy package manifests first for caching
COPY package.json package-lock.json turbo.json ./
# Copy minimal app/package structure for turbo pruning (simplified here: copy config files)
COPY apps/web/package.json apps/web/
COPY apps/network-editor/package.json apps/network-editor/
COPY apps/api/requirements.txt apps/api/
COPY packages/ui-kit/package.json packages/ui-kit/
COPY packages/physics-engine/package.json packages/physics-engine/
# Note: In a real robust setup we'd use 'turbo prune', but for now we copy manifests manually 
# or just copy everything if the repo isn't huge. Given context constraints, let's copy root manifests.
# To be safe and simple: Copy everything now, npm install, then build.
# Optimization: Just copy root deps first if possible, but monorepo linking requires packages.

# Copy entire repo
COPY . .

# Install Node Dependencies
RUN npm install

# Install Python Dependencies
RUN pip install --no-cache-dir -r apps/api/requirements.txt

# 2. Build Apps
# Build all apps/packages via Turbo
RUN npm run build

# 3. Cleanup (Optional - remove devDependencies if we want smaller image, but turbo needs some)
# RUN npm prune --production # Pruning in monorepos can be tricky, skipping for safety.

# Expose ports
EXPOSE 3000 3002 8000

# Copy supervisord config
COPY infra/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Start Supervisor
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
