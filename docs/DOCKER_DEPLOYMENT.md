# Docker Deployment Playbook

This playbook provides detailed Docker commands and configurations for deploying the Process Engineering Suite.

## Prerequisites

- Docker and Docker Compose installed
- At least 4GB RAM available
- Ports 3000-3003 and 8000 available

## Image Building

### Build Production Image

```bash
# From repository root
docker build -t process-engineering-suite:latest .

# With specific platforms (for multi-arch)
docker build --platform linux/amd64 -t process-engineering-suite:latest .

# With build args
docker build --build-arg NODE_ENV=production -t process-engineering-suite:latest .
```

### Build Development Image

```bash
# With hot reload for development
docker build --target development -t process-engineering-suite:dev .
```

## Production Deployment

### Single Container with Built-in Database

```bash
docker run \
  --name process-engineering-suite \
  -p 3000:3000 \
  -p 3001:3001 \
  -p 3002:3002 \
  -p 3003:3003 \
  -p 8000:8000 \
  -e POSTGRES_PASSWORD="your-secure-password" \
  -e POSTGRES_USER="postgres" \
  -e POSTGRES_DB="engsuite" \
  -v postgres_data:/var/lib/postgresql/data \
  -d \
  process-engineering-suite:latest
```

### With External Database

```bash
docker run \
  --name process-engineering-suite \
  -p 3000:3000 \
  -p 3001:3001 \
  -p 3002:3002 \
  -p 3003:3003 \
  -p 8000:8000 \
  -e DATABASE_URL="postgresql+asyncpg://user:pass@host:5432/database" \
  -d \
  process-engineering-suite:latest
```

### With Custom Configuration

```bash
docker run \
  --name process-engineering-suite \
  --env-file .env.production \
  -v /host/path/config:/app/config \
  -v /host/path/logs:/app/logs \
  --restart unless-stopped \
  -d \
  process-engineering-suite:latest
```

## Development Deployment

### Hot Reload Setup

```bash
# Run all services with live reload
docker-compose -f infra/docker-compose.yml up --build

# Run specific services
docker-compose -f infra/docker-compose.yml up api postgres

# With custom environment
docker-compose -f infra/docker-compose.yml --env-file .env.dev up
```

### Hybrid Development

```bash
# Backend in Docker
docker-compose -f infra/docker-compose.yml up api postgres

# Frontend locally (new terminal)
npm run dev
```

## Volume Management

### Named Volumes for Data Persistence

```bash
# Create volumes
docker volume create postgres_data
docker volume create psv_exports

# Inspect volumes
docker volume inspect postgres_data

# Backup volume
docker run --rm -v postgres_data:/source -v $(pwd)/backup:/backup alpine tar czf /backup/postgres_backup.tar.gz -C /source .
```

### Bind Mounts for Development

```bash
# Mount source code for hot reload
docker run \
  -v $(pwd):/app \
  -v /app/node_modules \
  -p 3000:3000 \
  process-engineering-suite:dev
```

## Health Checks and Monitoring

### Health Check Commands

```bash
# API health
curl http://localhost:8000/health

# Application health
curl http://localhost:3000/api/health    # Dashboard
curl http://localhost:3002/api/health    # Network Editor
curl http://localhost:3003/api/health    # PSV

# Database connectivity
curl http://localhost:8000/admin/data-source
```

### Container Logs

```bash
# View logs
docker logs process-engineering-suite

# Follow logs
docker logs -f process-engineering-suite

# Logs with timestamps
docker logs --timestamps process-engineering-suite

# Specific service logs (compose)
docker-compose logs -f api
docker-compose logs -f web
```

### Resource Monitoring

```bash
# Container stats
docker stats process-engineering-suite

# System resources
docker system df

# Container inspection
docker inspect process-engineering-suite
```

## Troubleshooting

### Common Issues

**Port conflicts:**

```bash
# Check port usage
lsof -i :3000

# Stop conflicting containers
docker stop $(docker ps -q)
```

**Database connection:**

```bash
# Check database logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up postgres
```

**Memory issues:**

```bash
# Increase memory limit
docker run --memory=4g --memory-swap=6g process-engineering-suite

# Check memory usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### Debugging Commands

```bash
# Enter container shell
docker exec -it process-engineering-suite /bin/bash

# Check running processes
docker exec process-engineering-suite ps aux

# View environment variables
docker exec process-engineering-suite env

# Check disk usage
docker exec process-engineering-suite df -h
```

## Backup and Restore

### Database Backup

```bash
# Backup running container database
docker exec process-engineering-suite pg_dump -U postgres -d engsuite > backup.sql

# Backup with timestamp
docker exec process-engineering-suite pg_dump -U postgres -d engsuite > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Database Restore

```bash
# Restore to running container
docker exec -i process-engineering-suite psql -U postgres -d engsuite < backup.sql

# Restore from volume backup
docker run --rm -v postgres_data:/var/lib/postgresql/data -v $(pwd)/backup:/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /
```

### Application Data Backup

```bash
# PSV exports and attachments
docker cp process-engineering-suite:/app/uploads ./backup/uploads

# Configuration files
docker cp process-engineering-suite:/app/config ./backup/config
```

## Scaling and Performance

### Resource Limits

```bash
docker run \
  --memory=4g \
  --cpus=2 \
  --memory-swap=6g \
  process-engineering-suite
```

### Multiple Instances

```bash
# Load balancer setup (example with nginx)
docker run -d --name load-balancer -p 80:80 nginx
docker run -d --name app1 -e PORT=3001 process-engineering-suite
docker run -d --name app2 -e PORT=3002 process-engineering-suite
```

## Security Best Practices

### Production Hardening

```bash
# Run as non-root user
docker run --user 1000:1000 process-engineering-suite

# Read-only filesystem
docker run --read-only --tmpfs /tmp process-engineering-suite

# Drop capabilities
docker run --cap-drop ALL --cap-add NET_BIND_SERVICE process-engineering-suite
```

### Secrets Management

```bash
# Use Docker secrets
echo "secret-password" | docker secret create db_password -
docker service create --secret db_password process-engineering-suite

# Environment file (not committed)
echo "POSTGRES_PASSWORD=secret" > .env.production
docker run --env-file .env.production process-engineering-suite
```

## Maintenance

### Updates and Upgrades

```bash
# Stop and remove old container
docker stop process-engineering-suite
docker rm process-engineering-suite

# Pull/build new image
docker build -t process-engineering-suite:v2.0 .

# Start with data migration
docker run --env-file .env.production -v postgres_data:/var/lib/postgresql/data process-engineering-suite:v2.0
```

### Cleanup

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Full system cleanup
docker system prune -a
```

## Related Documentation

- `DEPLOYMENT_GUIDE.md` - High-level deployment overview
- `ENVIRONMENT_VARIABLES.md` - Environment configuration
- `BACKUP_RESTORE.md` - Detailed backup procedures
- `TROUBLESHOOTING.md` - Issue resolution
