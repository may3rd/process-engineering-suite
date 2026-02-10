# Environment Variables Reference

This document lists all environment variables used by the Process Engineering Suite applications.

## Global Variables

These variables apply to the entire suite or multiple applications.

### Deployment Target Contract

- `DEPLOY_TARGET`: deployment lane selector used to keep platform behavior isolated
  - Values: `local`, `vercel`, `aws`
  - Default: `local`
  - Set `DEPLOY_TARGET=vercel` on Vercel projects
  - Set `DEPLOY_TARGET=aws` on AWS deployments

### Database Configuration

- `POSTGRES_PASSWORD`: PostgreSQL database password (required for production)
- `POSTGRES_USER`: PostgreSQL database user (default: postgres)
- `POSTGRES_DB`: PostgreSQL database name (default: engsuite)
- `DATABASE_URL`: Full PostgreSQL connection string (optional, auto-built if not provided)
  - Format: `postgresql+asyncpg://user:password@host:port/database`

### API Configuration

- `NEXT_PUBLIC_API_URL`: Backend API base URL (default: http://localhost:8000)
  - Used by all frontend applications
- `API_PROXY_TARGET`: server-side rewrite target for PSV `/api/*` routes
  - Default: `NEXT_PUBLIC_API_URL` if set, otherwise `http://localhost:8000`

### Cross-App Routing (Web Dashboard)

- `DOCS_URL`: docs app origin used by web rewrites
- `NETWORK_EDITOR_URL`: network-editor app origin used by web rewrites
- `PSV_URL`: PSV app origin used by web rewrites
- `DESIGN_AGENTS_URL`: design-agents app origin used by web rewrites

## Application-Specific Variables

### PSV Application (apps/psv)

- `NEXT_PUBLIC_USE_LOCAL_STORAGE`: Enable demo mode with localStorage authentication
  - Values: `true` (demo mode) or `false` (API mode)
  - Default: `false`
  - In demo mode, no backend required

### API Backend (apps/api)

- `USE_MOCK_DATA`: Force mock data usage even when database is available
  - Values: `true` or `false`
  - Default: `false`
- `SECRET_KEY`: Secret key for JWT tokens and security
  - Required for production authentication

### Network Editor (apps/network-editor)

No application-specific environment variables required.

### Web/Dashboard (apps/web)

- `DEFAULT_THEME`: Default theme for the application
  - Values: `light` or `dark`
  - Default: `light`

### Docs Application (apps/docs)

Coming Soon - No environment variables defined yet.

## Development vs Production

### Development

```bash
# Basic development setup
bun run dev

# With custom API URL
NEXT_PUBLIC_API_URL=http://localhost:8000 bun run dev
```

### Production - Docker

```bash
# Environment file
cat > .env << EOF
DEPLOY_TARGET=aws
POSTGRES_PASSWORD=secure-password
POSTGRES_USER=postgres
POSTGRES_DB=engsuite
DATABASE_URL=postgresql+asyncpg://postgres:secure-password@postgres:5432/engsuite
NEXT_PUBLIC_API_URL=https://api.your-domain.com
API_PROXY_TARGET=https://api.your-domain.com
DOCS_URL=https://docs.your-domain.com
NETWORK_EDITOR_URL=https://network-editor.your-domain.com
PSV_URL=https://psv.your-domain.com
DESIGN_AGENTS_URL=https://design-agents.your-domain.com
EOF

# Run with environment
docker run --env-file .env [other-options] process-engineering-suite
```

### Production - Direct Deployment

```bash
# API environment
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db
SECRET_KEY=your-secret-key
USE_MOCK_DATA=false

# Frontend environment
NEXT_PUBLIC_API_URL=https://your-api-domain
API_PROXY_TARGET=https://your-api-domain
NEXT_PUBLIC_USE_LOCAL_STORAGE=false
```

### Production - Vercel

Set these in each Vercel project:

```bash
DEPLOY_TARGET=vercel
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

For `apps/web`, also set:

```bash
DOCS_URL=https://your-docs-app.vercel.app
NETWORK_EDITOR_URL=https://your-network-editor-app.vercel.app
PSV_URL=https://your-psv-app.vercel.app
DESIGN_AGENTS_URL=https://your-design-agents-app.vercel.app
```

## Security Considerations

- Never commit `.env` files to version control
- Use strong passwords for database credentials
- Rotate `SECRET_KEY` regularly in production
- Use HTTPS for `NEXT_PUBLIC_API_URL` in production
- Consider using Docker secrets or external secret management

## Validation

Verify environment configuration:

```bash
# Check API health
curl http://localhost:8000/health

# Check database connection (API logs)
curl http://localhost:8000/admin/data-source

# Test frontend connectivity
curl http://localhost:3003/api/health  # PSV
curl http://localhost:3002/api/health  # Network Editor
```

Validate both deployment lanes before merge:

```bash
bun run check:deploy:matrix
```

## Troubleshooting

### Common Issues

- **API connection errors**: Check `NEXT_PUBLIC_API_URL` format and accessibility
- **Database connection failed**: Verify `DATABASE_URL` syntax and database availability
- **Authentication issues**: Ensure `SECRET_KEY` is set for API
- **Demo mode not working**: Confirm `NEXT_PUBLIC_USE_LOCAL_STORAGE=true`

### Environment Variable Precedence

1. Explicit `DATABASE_URL` overrides individual Postgres variables
2. Application-specific variables override defaults
3. `API_PROXY_TARGET` overrides `NEXT_PUBLIC_API_URL` for PSV server-side rewrites
4. Docker environment overrides system environment

## Related Documentation

- `DEPLOYMENT_GUIDE.md` - Main deployment instructions
- `DOCKER_DEPLOYMENT.md` - Docker-specific commands
- `TROUBLESHOOTING.md` - Issue resolution guides
