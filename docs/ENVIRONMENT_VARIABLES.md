# Environment Variables Reference

Complete reference for all environment variables used in the Process Engineering Suite.

## Environment Detection

### `DEPLOYMENT_ENV`

Determines which deployment environment is active. Controls behavior throughout the application.

- **Required**: No (defaults to `local`)
- **Values**: `local`, `aws`, `vercel`
- **Used By**: Backend config, frontend config, CORS settings

**Examples**:
```bash
DEPLOYMENT_ENV=local  # Local development
DEPLOYMENT_ENV=aws    # AWS production
```

## Database Configuration

### `DATABASE_URL`

PostgreSQL connection string for the API backend.

- **Required**: Yes (unless `USE_MOCK_DATA=true`)
- **Format**: `postgresql+asyncpg://user:password@host:port/database`
- **Used By**: API backend

**Examples**:
```bash
# Local
DATABASE_URL=postgresql+asyncpg://postgres:mypassword@postgres:5432/engsuite

# AWS
DATABASE_URL=postgresql+asyncpg://postgres:mypassword@rds-endpoint:5432/engsuite
```

### `POSTGRES_PASSWORD`

PostgreSQL password (Docker Compose only).

- **Required**: Yes (for local development)
- **Used By**: Docker Compose postgres service

### `USE_MOCK_DATA`

Use in-memory mock data instead of PostgreSQL.

- **Required**: No
- **Default**: `false`
- **Values**: `true`, `false`

## API Configuration

### `SECRET_KEY`

Secret key for JWT token signing and session management.

- **Required**: Yes
- **Generation**: `openssl rand -hex 32`
- **Security**: Must be cryptographically secure in production

**Examples**:
```bash
SECRET_KEY=dev-secret-key-change-in-production  # Development only
SECRET_KEY=<64-char-hex-string>                  # Production
```

### `ALLOWED_ORIGINS`

Comma-separated list of allowed CORS origins (AWS/production only).

- **Required**: Yes (for `DEPLOYMENT_ENV=aws`)
- **Not Used**: In local mode (auto-configured)
- **Used By**: API backend CORS middleware

**Examples**:
```bash
ALLOWED_ORIGINS=https://alb-domain.com,https://yourdomain.com
```

### `API_HOST` / `API_PORT` / `LOG_LEVEL`

- **API_HOST**: Default `0.0.0.0`
- **API_PORT**: Default `8000`
- **LOG_LEVEL**: Default `INFO` (values: `DEBUG`, `INFO`, `WARNING`, `ERROR`)

## Frontend Configuration

### `NEXT_PUBLIC_API_URL`

API base URL for browser requests (Next.js apps).

- **Required**: No (auto-detected via `getApiUrl()`)
- **Auto-Detection**:
  - `local`: `http://localhost:8000`
  - `aws`: `http://api:8000` (ECS service discovery)

**Override Examples**:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000      # Local
NEXT_PUBLIC_API_URL=http://api:8000            # AWS
NEXT_PUBLIC_API_URL=https://api.custom.com     # Custom
```

### `VITE_API_URL`

API base URL for Vite apps (design-agents). Same auto-detection as above.

## AWS Configuration

### `AWS_REGION`

AWS region for services.

- **Required**: No (unless using AWS services)
- **Used By**: API backend

**Example**: `AWS_REGION=us-east-1`

### `AWS_SECRETS_ARN`

ARN pattern for AWS Secrets Manager secrets.

- **Required**: No
- **Example**: `AWS_SECRETS_ARN=arn:aws:secretsmanager:region:account:secret:process-engineering/*`

## Environment Matrix

### Local Development

| Variable | Required | Value | Source |
|----------|----------|-------|--------|
| `DEPLOYMENT_ENV` | No | `local` | `.env.local` |
| `DATABASE_URL` | Yes | `postgresql+asyncpg://...` | `.env.local` |
| `POSTGRES_PASSWORD` | Yes | User-defined | `.env.local` |
| `SECRET_KEY` | No | `dev-secret-key-change-in-production` | `.env.local` |
| `NEXT_PUBLIC_API_URL` | No | Auto: `http://localhost:8000` | - |
| `ALLOWED_ORIGINS` | No | Auto-configured | - |

### AWS Production

| Variable | Required | Value | Source |
|----------|----------|-------|--------|
| `DEPLOYMENT_ENV` | Yes | `aws` | Task Definition |
| `DATABASE_URL` | Yes | RDS endpoint | Secrets Manager |
| `SECRET_KEY` | Yes | Generated | Secrets Manager |
| `ALLOWED_ORIGINS` | Yes | ALB domains | Secrets Manager |
| `NEXT_PUBLIC_API_URL` | No | Auto: `http://api:8000` | - |
| `AWS_REGION` | Yes | `us-east-1` | Task Definition |

## Configuration Files

### Local: `infra/.env.local`

Template: `infra/.env.local.example` (gitignored)

Required:
```bash
DEPLOYMENT_ENV=local
POSTGRES_PASSWORD=your_password
DATABASE_URL=postgresql+asyncpg://postgres:your_password@postgres:5432/engsuite
```

### AWS: Secrets Manager + Task Definitions

Secrets in Secrets Manager:
- `process-engineering/database-url`
- `process-engineering/secret-key`
- `process-engineering/allowed-origins`

Environment in Task Definitions:
- `DEPLOYMENT_ENV=aws`
- `AWS_REGION=us-east-1`

## Security Best Practices

1. Never commit secrets to git (use `.gitignore`)
2. Use AWS Secrets Manager in production
3. Generate strong secrets: `openssl rand -hex 32`
4. Use IAM policies for least privilege access
5. Isolate environments (separate AWS accounts)

## Troubleshooting

### Variable not being read

```bash
# Check loaded config
docker-compose -f infra/docker-compose.yml config

# Check in container
docker-compose -f infra/docker-compose.yml exec api env | grep VAR_NAME
```

### CORS errors

```bash
# Verify DEPLOYMENT_ENV
curl http://localhost:8000/health -v

# Check AWS secrets
aws secretsmanager get-secret-value --secret-id process-engineering/allowed-origins
```

## Additional Resources

- [Deployment Guide](./DEPLOYMENT.md)
- [12-Factor App](https://12factor.net/config)
