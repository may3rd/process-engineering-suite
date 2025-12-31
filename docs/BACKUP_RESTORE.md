# Backup and Restore Procedures

This document provides comprehensive backup and restore procedures for the Process Engineering Suite, covering all applications and data types.

## Overview

The suite consists of multiple applications with different data persistence needs:

- **PostgreSQL Database**: User data, PSV configurations, revision history
- **Application Files**: PSV attachments, export files, user uploads
- **Configuration**: Environment variables, secrets
- **Docker Volumes**: Persistent data storage

## Automated Backup Strategy

### Docker Volume Backups

```bash
# Create backup script (backup.sh)
#!/bin/bash

BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL data
docker run --rm \
  -v postgres_data:/var/lib/postgresql/data \
  -v $(pwd):/backup \
  alpine tar czf "/backup/$BACKUP_DIR/postgres_data.tar.gz" -C /var/lib/postgresql/data .

# Backup application data
docker run --rm \
  -v psv_uploads:/app/uploads \
  -v $(pwd):/backup \
  alpine tar czf "/backup/$BACKUP_DIR/psv_uploads.tar.gz" -C /app/uploads .

echo "Backup completed: $BACKUP_DIR"
```

### Scheduled Backups with Cron

```bash
# Add to crontab for daily backups at 2 AM
0 2 * * * /path/to/process-engineering-suite/backup.sh

# Weekly full backup on Sundays
0 3 * * 0 /path/to/process-engineering-suite/backup.sh full
```

## Database Backup Procedures

### PostgreSQL Native Backup

```bash
# Backup running database
docker exec process-engineering-suite pg_dump \
  -U postgres \
  -d engsuite \
  --no-owner \
  --no-privileges \
  --format=custom \
  > backup_$(date +%Y%m%d_%H%M%S).dump

# Backup with compression
docker exec process-engineering-suite pg_dump \
  -U postgres \
  -d engsuite \
  | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Point-in-Time Recovery (PITR)

```bash
# Enable WAL archiving in postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/archive/%f'

# Take base backup
docker exec process-engineering-suite pg_basebackup \
  -U postgres \
  -D /tmp/base_backup \
  -Ft -z

# Restore to specific time
docker exec process-engineering-suite pg_ctl stop
docker exec process-engineering-suite rm -rf /var/lib/postgresql/data/*
docker exec process-engineering-suite tar xzf /tmp/base_backup/base.tar.gz -C /var/lib/postgresql/data
# Apply WAL files up to target time
docker exec process-engineering-suite pg_ctl start
```

## Application Data Backup

### PSV Application Data

```bash
# Backup attachments and uploads
docker cp process-engineering-suite:/app/uploads ./backup/uploads

# Backup export files
docker cp process-engineering-suite:/app/exports ./backup/exports

# Backup user configurations
docker exec process-engineering-suite tar czf - /app/config > config_backup.tar.gz
```

### Network Editor Data

```bash
# Backup saved network designs
docker cp process-engineering-suite:/app/networks ./backup/networks

# Backup calculation results
docker cp process-engineering-suite:/app/calculations ./backup/calculations
```

## Configuration Backup

### Environment Variables

```bash
# Backup .env files
cp .env.production ./backup/config/
cp .env.staging ./backup/config/

# Backup Docker Compose overrides
cp infra/docker-compose.override.yml ./backup/config/
```

### Secrets and Certificates

```bash
# Backup SSL certificates (if applicable)
cp /etc/ssl/certs/process-engineering-suite.* ./backup/ssl/

# Document secret locations (don't backup actual secrets)
echo "Secrets stored in: AWS Secrets Manager, GitHub Secrets, Docker Secrets" > ./backup/secrets/README.md
```

## Restore Procedures

### Full System Restore

```bash
# Stop running containers
docker-compose down

# Restore PostgreSQL data
docker run --rm \
  -v postgres_data:/var/lib/postgresql/data \
  -v $(pwd)/backup:/backup \
  alpine tar xzf /backup/postgres_data.tar.gz -C /var/lib/postgresql/data

# Restore application data
docker run --rm \
  -v psv_uploads:/app/uploads \
  -v $(pwd)/backup:/backup \
  alpine tar xzf /backup/psv_uploads.tar.gz -C /app/uploads

# Start services
docker-compose up -d
```

### Database-Only Restore

```bash
# Stop application to prevent writes
docker-compose stop web psv network-editor

# Drop and recreate database
docker exec process-engineering-suite dropdb -U postgres engsuite
docker exec process-engineering-suite createdb -U postgres engsuite

# Restore from dump
docker exec -i process-engineering-suite pg_restore \
  -U postgres \
  -d engsuite \
  --no-owner \
  --no-privileges \
  < backup.dump

# Restart applications
docker-compose start web psv network-editor
```

### Selective Data Restore

```bash
# Restore specific tables
docker exec -i process-engineering-suite psql -U postgres -d engsuite << EOF
DROP TABLE IF EXISTS old_table;
CREATE TABLE old_table AS SELECT * FROM backup_table;
EOF

# Restore user data only
docker exec process-engineering-suite pg_dump \
  -U postgres \
  -d engsuite \
  -t users -t user_profiles \
  > users_backup.sql

docker exec -i process-engineering-suite psql -U postgres -d engsuite < users_backup.sql
```

## Disaster Recovery

### Complete System Failure

1. **Assess Damage**: Identify which components are affected
2. **Prioritize Recovery**:
   - Database (highest priority)
   - Application configurations
   - User data files
   - System configurations

3. **Recovery Steps**:
   ```bash
   # Rebuild from backup
   docker-compose down -v  # Remove all volumes
   docker-compose up -d postgres  # Start fresh database
   # Restore from latest backup
   # Verify data integrity
   # Restart applications
   ```

### Data Corruption Recovery

```bash
# Use PostgreSQL point-in-time recovery
# Stop all writes
docker-compose stop web psv network-editor

# Restore to last known good state
docker exec process-engineering-suite pg_ctl stop
# Replace corrupted data directory with backup
# Start PostgreSQL and replay WAL

# Verify data integrity
docker exec process-engineering-suite psql -U postgres -d engsuite -c "SELECT COUNT(*) FROM users;"
```

## Backup Validation

### Automated Validation

```bash
# Create validation script (validate_backup.sh)
#!/bin/bash

BACKUP_FILE=$1

# Check backup integrity
if ! gunzip -t "$BACKUP_FILE"; then
    echo "Backup file corrupted: $BACKUP_FILE"
    exit 1
fi

# Test database restore
docker exec -i process-engineering-suite pg_restore \
  --list "$BACKUP_FILE" > /dev/null

if [ $? -eq 0 ]; then
    echo "Database backup valid: $BACKUP_FILE"
else
    echo "Database backup invalid: $BACKUP_FILE"
    exit 1
fi
```

### Manual Validation

```bash
# Test database connectivity
docker exec process-engineering-suite psql -U postgres -d engsuite -c "SELECT version();"

# Verify table counts
docker exec process-engineering-suite psql -U postgres -d engsuite -c "SELECT schemaname, tablename, n_tup_ins FROM pg_stat_user_tables;"

# Check file integrity
find ./backup -type f -exec sha256sum {} \; > checksums.txt
```

## Retention Policies

### Backup Retention Strategy

```bash
# Daily backups: keep 7 days
# Weekly backups: keep 4 weeks
# Monthly backups: keep 12 months
# Yearly backups: keep indefinitely

# Cleanup script
find ./backups -name "daily_*" -mtime +7 -delete
find ./backups -name "weekly_*" -mtime +28 -delete
find ./backups -name "monthly_*" -mtime +365 -delete
```

### Offsite Storage

```bash
# Upload to cloud storage
aws s3 cp ./backups/ s3://process-engineering-backups/ --recursive

# Encrypt backups before upload
gpg -c backup.tar.gz
aws s3 cp backup.tar.gz.gpg s3://secure-backups/
```

## Monitoring and Alerts

### Backup Health Monitoring

```bash
# Check backup age
LAST_BACKUP=$(find ./backups -name "*.tar.gz" -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2)
BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LAST_BACKUP")) / 86400 ))

if [ $BACKUP_AGE -gt 1 ]; then
    echo "WARNING: Last backup is $BACKUP_AGE days old"
    # Send alert
fi
```

### Automated Reporting

```bash
# Generate backup report
cat > backup_report.md << EOF
# Backup Report - $(date)

## Backup Status
- Last backup: $(date -r "$LAST_BACKUP")
- Backup size: $(du -sh ./backups | cut -f1)
- Database size: $(docker exec process-engineering-suite psql -U postgres -d engsuite -t -c "SELECT pg_size_pretty(pg_database_size('engsuite'));")

## Validation Results
$(./validate_backup.sh "$LAST_BACKUP")

## Recommendations
$(if [ $BACKUP_AGE -gt 1 ]; then echo "- Run backup immediately"; fi)
EOF
```

## Security Considerations

### Encryption

```bash
# Encrypt backups
openssl enc -aes-256-cbc -salt -in backup.tar.gz -out backup.tar.gz.enc -k "$ENCRYPTION_KEY"

# Decrypt for restore
openssl enc -d -aes-256-cbc -in backup.tar.gz.enc -out backup.tar.gz -k "$ENCRYPTION_KEY"
```

### Access Control

- Store backups in secure locations
- Use IAM roles for cloud storage access
- Encrypt sensitive data before backup
- Audit backup access logs

## Related Documentation

- `DEPLOYMENT_GUIDE.md` - Deployment procedures
- `DOCKER_DEPLOYMENT.md` - Docker-specific operations
- `TROUBLESHOOTING.md` - Recovery procedures
- `CICD_EXAMPLES.md` - Automated backup integration
