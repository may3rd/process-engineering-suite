# Process Engineering Suite - Deployment Guide

This guide covers deployment of the complete Process Engineering Suite, including all applications: Network Editor, PSV, API, Docs, and Web/Dashboard.

## Applications Overview

- **Web/Dashboard** (`apps/web`): Main entry point with navigation to all tools
- **Network Editor** (`apps/network-editor`): Hydraulic network design and simulation
- **PSV** (`apps/psv`): Pressure safety valve sizing and management
- **API** (`apps/api`): FastAPI backend with database and hydraulics calculations
- **Docs** (`apps/docs`): Documentation site (Coming Soon)

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL (for API with database mode)
- At least 4GB RAM recommended for production

## Development Deployment

Run all applications with hot reload for development:

```bash
# Clone repository
git clone <repository-url>
cd process-engineering-suite

# Install dependencies
npm install

# Start all services with Docker Compose
docker-compose -f infra/docker-compose.yml up --build
```

**Services Available:**

- Web/Dashboard: http://localhost:3000
- Network Editor: http://localhost:3002
- PSV: http://localhost:3003
- API: http://localhost:8000/docs
- PostgreSQL: localhost:5432 (dev only)

**Hot Reload**: Code changes are reflected immediately due to volume mounts.

## Production Deployment

Build a single Docker image containing all applications:

```bash
# Build the image
docker build -t process-engineering-suite .

# Run with PostgreSQL included
docker run \
  -p 3000:3000 \
  -p 3001:3001 \
  -p 3002:3002 \
  -p 3003:3003 \
  -p 8000:8000 \
  -e POSTGRES_PASSWORD="your-secure-password" \
  -e POSTGRES_USER="postgres" \
  -e POSTGRES_DB="engsuite" \
  -v postgres_data:/var/lib/postgresql/data \
  process-engineering-suite
```

**Data Persistence**: PostgreSQL data is stored in the named volume `postgres_data`.

**Custom Database URL** (optional):

```bash
docker run \
  -e DATABASE_URL="postgresql+asyncpg://postgres:password@host:5432/engsuite" \
  -e POSTGRES_PASSWORD="password" \
  process-engineering-suite
```

## Hybrid Development Deployment

Run frontend applications locally while backend runs in Docker:

```bash
# Start backend services (API + Database)
docker-compose -f infra/docker-compose.yml up api postgres

# In another terminal, start frontend
npm run dev
```

**Benefits**: Maximum performance for frontend development with reliable backend.

## Application-Specific Deployment Notes

### Network Editor

- **Memory Requirements**: Allocate at least 2GB RAM for large network calculations
- **Performance**: Monitor calculation times for networks >100 nodes
- **Storage**: Excel imports/exports require temporary file space

### PSV Application

- **Authentication**: Supports both API and localStorage demo modes
- **File Exports**: PDF/Excel exports require write permissions
- **Database**: Full integration with API for production data
- **Status**: Production-ready with comprehensive testing

### API Backend

- **Database Options**: PostgreSQL (production) or mock data (fallback)
- **Migrations**: Automatic Alembic upgrades on container start
- **Health Checks**: Available at `/health` endpoint
- **Environment**: Configure via `DATABASE_URL` or individual Postgres variables

### Docs Application

- **Status**: Coming Soon - Basic static deployment planned
- **Current**: Not included in Docker builds
- **Future**: Will be added as static site deployment

### Web/Dashboard

- **Navigation**: Central hub for all applications
- **Theme Sync**: Global theme preferences across all apps
- **Lightweight**: Minimal resource requirements

## Health Checks

Verify deployment health:

```bash
# API Health
curl http://localhost:8000/health

# Web Dashboard
curl http://localhost:3000/api/health

# Network Editor
curl http://localhost:3002/api/health

# PSV Application
curl http://localhost:3003/api/health
```

## Monitoring and Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f web

# Monitor resource usage
docker stats
```

## Scaling Considerations

- **Single Container**: Suitable for small to medium deployments
- **Database**: PostgreSQL handles concurrent users well
- **Memory**: Monitor Network Editor for large calculations
- **Storage**: Plan for PSV attachments and Network Editor files

## Security Notes

- Change default PostgreSQL password in production
- Use HTTPS in production environments
- Configure proper firewall rules
- Regular security updates for base images

## Troubleshooting

For deployment issues, see `TROUBLESHOOTING.md`.

## Related Documentation

- `DOCKER_DEPLOYMENT.md` - Detailed Docker commands
- `ENVIRONMENT_VARIABLES.md` - Complete environment reference
- `CICD_EXAMPLES.md` - CI/CD pipeline examples
- `BACKUP_RESTORE.md` - Backup and restore procedures
- `DEPLOYMENT_CHECKLIST.md` - Pre/post deployment verification
