# Troubleshooting Guide

This guide provides diagnostic procedures and solutions for common issues in the Process Engineering Suite.

## Quick Health Check

```bash
# Check all services
curl -f http://localhost:8000/health || echo "API unhealthy"
curl -f http://localhost:3000/api/health || echo "Dashboard unhealthy"
curl -f http://localhost:3002/api/health || echo "Network Editor unhealthy"
curl -f http://localhost:3003/api/health || echo "PSV unhealthy"

# Check database
docker exec process-engineering-suite psql -U postgres -d engsuite -c "SELECT 1;" || echo "Database unhealthy"
```

## Application-Specific Issues

### API Backend Issues

#### Database Connection Failed

**Symptoms:**

- API returns 500 errors
- Logs show "connection refused" or "database not available"

**Diagnosis:**

```bash
# Check database container
docker ps | grep postgres

# Check database logs
docker-compose logs postgres

# Test database connectivity
docker exec process-engineering-suite psql -U postgres -c "SELECT version();"

# Check environment variables
docker exec process-engineering-suite env | grep DATABASE
```

**Solutions:**

```bash
# Restart database
docker-compose restart postgres

# Reset database (WARNING: destroys data)
docker-compose down -v
docker-compose up -d postgres

# Check DATABASE_URL format
# Correct: postgresql+asyncpg://user:pass@host:5432/db
# Wrong: postgresql://user:pass@host:5432/db
```

#### Authentication Errors

**Symptoms:**

- Login fails with "Invalid credentials"
- API returns 401/403 errors

**Diagnosis:**

```bash
# Check API logs
docker-compose logs api | grep -i auth

# Verify SECRET_KEY
docker exec process-engineering-suite env | grep SECRET_KEY

# Check user data in database
docker exec process-engineering-suite psql -U postgres -d engsuite -c "SELECT COUNT(*) FROM users;"
```

**Solutions:**

```bash
# Reset SECRET_KEY (invalidates all tokens)
# Update environment and restart
docker-compose restart api

# Seed demo users (if using demo mode)
curl -X POST http://localhost:8000/admin/seed-from-mock
```

### PSV Application Issues

#### Sizing Calculations Failing

**Symptoms:**

- PSV sizing returns errors
- Calculation results are empty

**Diagnosis:**

```bash
# Check API logs for calculation errors
docker-compose logs api | grep -i psv

# Verify hydraulics calculations
curl http://localhost:8000/health

# Check for missing fluid properties
docker exec process-engineering-suite python -c "import hydraulics; print('Hydraulics OK')"
```

**Solutions:**

```bash
# Restart API service
docker-compose restart api

# Check fluid database
docker exec process-engineering-suite python -c "
from hydraulics import get_fluid_properties
print(get_fluid_properties('water'))
"

# Clear calculation cache (if applicable)
docker exec process-engineering-suite rm -rf /tmp/calculations/*
```

#### File Upload Issues

**Symptoms:**

- Attachment uploads fail
- Export downloads don't work

**Diagnosis:**

```bash
# Check disk space
docker exec process-engineering-suite df -h

# Check upload directory permissions
docker exec process-engineering-suite ls -la /app/uploads

# Check file size limits
docker exec process-engineering-suite find /app/uploads -size +100M
```

**Solutions:**

```bash
# Create uploads directory
docker exec process-engineering-suite mkdir -p /app/uploads

# Fix permissions
docker exec process-engineering-suite chown -R app:app /app/uploads

# Increase file size limits (in nginx if applicable)
# client_max_body_size 100M;
```

#### Authentication Mode Confusion

**Symptoms:**

- Login works in one tab but not another
- localStorage vs API mode conflicts

**Diagnosis:**

```bash
# Check environment variable
docker exec process-engineering-suite env | grep USE_LOCAL_STORAGE

# Check browser localStorage
# Open browser dev tools: Application > Local Storage
```

**Solutions:**

```bash
# Clear browser localStorage
# Browser dev tools: Application > Local Storage > Clear

# Restart with correct mode
# For demo mode: NEXT_PUBLIC_USE_LOCAL_STORAGE=true
# For API mode: NEXT_PUBLIC_USE_LOCAL_STORAGE=false
docker-compose restart psv
```

### Network Editor Issues

#### Calculation Timeouts

**Symptoms:**

- Large networks fail to calculate
- "Timeout exceeded" errors

**Diagnosis:**

```bash
# Check memory usage
docker stats process-engineering-suite

# Check network size
# In app: View network stats

# Check calculation logs
docker-compose logs api | grep -i network
```

**Solutions:**

```bash
# Increase memory limit
docker-compose up -d --scale network-editor=1 --memory=4g

# Optimize network (reduce nodes/connections)
# Break large networks into smaller sections

# Increase timeout in hydraulics config
docker exec process-engineering-suite sed -i 's/timeout=.*/timeout=300/' /app/config/calculations.ini
```

#### Import/Export Failures

**Symptoms:**

- Excel import fails
- Export downloads corrupted

**Diagnosis:**

```bash
# Check file format
file /tmp/uploaded_file.xlsx

# Check Excel library
docker exec process-engineering-suite node -e "const XLSX = require('xlsx'); console.log('XLSX OK');"

# Check temp directory
docker exec process-engineering-suite ls -la /tmp/
```

**Solutions:**

```bash
# Install missing dependencies
docker exec process-engineering-suite npm install xlsx

# Clear temp files
docker exec process-engineering-suite rm -rf /tmp/xlsx*

# Check file permissions
docker exec process-engineering-suite chmod 755 /tmp
```

### General Application Issues

#### Container Won't Start

**Symptoms:**

- Container exits immediately
- `docker ps` shows no running containers

**Diagnosis:**

```bash
# Check container logs
docker logs process-engineering-suite

# Check exit code
docker inspect process-engineering-suite | grep -A 5 State

# Check resource limits
docker stats --no-stream
```

**Solutions:**

```bash
# Check for port conflicts
lsof -i :3000

# Increase resource limits
docker run --memory=2g --cpus=1 process-engineering-suite

# Check environment variables
docker run --env-file .env process-engineering-suite
```

#### Slow Performance

**Symptoms:**

- Pages load slowly
- Calculations take too long
- High CPU/memory usage

**Diagnosis:**

```bash
# Monitor resources
docker stats

# Check application logs
docker-compose logs --tail=100

# Profile performance
docker exec process-engineering-suite top -b -n 1

# Check database performance
docker exec process-engineering-suite psql -U postgres -d engsuite -c "SELECT * FROM pg_stat_activity;"
```

**Solutions:**

```bash
# Scale resources
docker-compose up -d --scale api=2

# Optimize database
docker exec process-engineering-suite psql -U postgres -d engsuite -c "VACUUM ANALYZE;"

# Clear caches
docker exec process-engineering-suite rm -rf /tmp/cache/*

# Update to latest image
docker pull process-engineering-suite:latest
```

## Database Issues

### PostgreSQL Connection Refused

**Symptoms:**

- API can't connect to database
- "Connection refused" errors

**Diagnosis:**

```bash
# Check PostgreSQL status
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker exec process-engineering-suite nc -z postgres 5432
```

**Solutions:**

```bash
# Restart PostgreSQL
docker-compose restart postgres

# Check database initialization
docker exec process-engineering-suite psql -U postgres -c "SELECT datname FROM pg_database;"

# Reset database password
docker-compose exec postgres psql -U postgres -c "ALTER USER postgres PASSWORD 'newpassword';"
```

### Data Corruption

**Symptoms:**

- Inconsistent data
- Queries return unexpected results
- Database errors

**Diagnosis:**

```bash
# Check database integrity
docker exec process-engineering-suite psql -U postgres -d engsuite -c "SELECT * FROM pg_stat_database;"

# Run consistency checks
docker exec process-engineering-suite psql -U postgres -d engsuite -c "VACUUM VERBOSE;"

# Check for corruption
docker exec process-engineering-suite pg_checksums --check /var/lib/postgresql/data
```

**Solutions:**

```bash
# Repair corruption (with caution)
docker exec process-engineering-suite psql -U postgres -d engsuite -c "REINDEX DATABASE engsuite;"

# Restore from backup (see BACKUP_RESTORE.md)
# Last resort: recreate database from schema
```

## Docker-Specific Issues

### Volume Permission Issues

**Symptoms:**

- "Permission denied" when accessing volumes
- Files not persisting

**Diagnosis:**

```bash
# Check volume permissions
docker exec process-engineering-suite ls -la /var/lib/postgresql/data

# Check user IDs
docker exec process-engineering-suite id

# Check volume mounts
docker inspect process-engineering-suite | grep -A 10 Mounts
```

**Solutions:**

```bash
# Fix permissions
docker exec process-engineering-suite chown -R postgres:postgres /var/lib/postgresql/data

# Use correct user
docker run --user postgres process-engineering-suite

# Check volume creation
docker volume create --driver local postgres_data
```

### Networking Issues

**Symptoms:**

- Containers can't communicate
- External access fails

**Diagnosis:**

```bash
# Check Docker networks
docker network ls

# Inspect container networking
docker exec process-engineering-suite ip addr

# Test inter-container communication
docker exec process-engineering-suite ping postgres
```

**Solutions:**

```bash
# Recreate networks
docker-compose down
docker network prune
docker-compose up -d

# Check firewall rules
sudo ufw status

# Use host networking (development only)
docker run --network host process-engineering-suite
```

## Monitoring and Debugging

### Log Analysis

```bash
# Follow all logs
docker-compose logs -f

# Search for errors
docker-compose logs | grep -i error

# Filter by time
docker-compose logs --since "1h"

# Export logs for analysis
docker-compose logs > logs_$(date +%Y%m%d).txt
```

### Performance Profiling

```bash
# CPU profiling
docker exec process-engineering-suite perf record -a -g -- sleep 30

# Memory analysis
docker exec process-engineering-suite valgrind --tool=massif node app.js

# Database query analysis
docker exec process-engineering-suite psql -U postgres -d engsuite -c "
SELECT pid, query, state, wait_event_type, wait_event
FROM pg_stat_activity
WHERE state = 'active';
"
```

### Automated Diagnostics

```bash
# Create diagnostic script
cat > diagnose.sh << 'EOF'
#!/bin/bash
echo "=== System Diagnostics ==="
echo "Date: $(date)"
echo "Uptime: $(uptime)"
echo ""

echo "=== Docker Status ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "=== Container Health ==="
curl -s http://localhost:8000/health && echo "API: OK" || echo "API: FAIL"
curl -s http://localhost:3000/api/health && echo "Dashboard: OK" || echo "Dashboard: FAIL"
curl -s http://localhost:3002/api/health && echo "Network Editor: OK" || echo "Network Editor: FAIL"
curl -s http://localhost:3003/api/health && echo "PSV: OK" || echo "PSV: FAIL"
echo ""

echo "=== Resource Usage ==="
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
echo ""

echo "=== Recent Logs ==="
docker-compose logs --tail=10
EOF

chmod +x diagnose.sh
./diagnose.sh
```

## Escalation Procedures

### When to Contact Support

- Data loss or corruption
- Persistent authentication failures
- Complete system unavailability
- Security incidents

### Emergency Contacts

- Development Team: dev@company.com
- Infrastructure Team: infra@company.com
- Security Team: security@company.com

### Incident Response

1. **Assess Impact**: Determine affected users and systems
2. **Contain Issue**: Isolate problematic components
3. **Restore Service**: Use backup procedures if needed
4. **Investigate Root Cause**: Analyze logs and metrics
5. **Prevent Recurrence**: Implement fixes and monitoring

## Related Documentation

- `DEPLOYMENT_GUIDE.md` - Deployment procedures
- `DOCKER_DEPLOYMENT.md` - Docker operations
- `BACKUP_RESTORE.md` - Recovery procedures
- `CICD_EXAMPLES.md` - Automated monitoring
