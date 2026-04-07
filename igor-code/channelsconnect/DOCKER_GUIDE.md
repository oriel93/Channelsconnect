# Docker Deployment Guide

Complete guide for running Channels Connect with Docker.

## Quick Start

### Production Deployment

```bash
# 1. Create .env file with your credentials
cp .env.example .env
# Edit .env with your values

# 2. Build and start all services
docker-compose up -d

# 3. Access the application
# Frontend: http://localhost
# API: http://localhost:3001
# API Docs: http://localhost:3001/api/docs
```

### Development with Docker

```bash
# Use development compose file
docker-compose -f docker-compose.dev.yml up
```

## Services

### PostgreSQL Database

```yaml
Service: postgres
Port: 5432
Image: postgres:15
Volume: postgres_data
```

Health check runs every 10 seconds to ensure database is ready.

### API (NestJS Backend)

```yaml
Service: api
Port: 3001
Build: ./api/Dockerfile
Depends on: postgres
```

**Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_JWT_SECRET` - Supabase JWT secret
- `PORT` - API port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS

### App (React Frontend)

```yaml
Service: app
Port: 80
Build: ./app/Dockerfile
Depends on: api
```

**Environment Variables:**
- `VITE_API_URL` - API URL
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## Configuration Files

### Production: `docker-compose.yml`

- Builds optimized production images
- Runs migrations automatically
- Serves frontend with Nginx
- All services on same network

### Development: `docker-compose.dev.yml`

- Hot reload enabled
- Source code mounted as volumes
- Faster rebuild times
- Better for local development

## Environment Variables

Create `.env` file in project root:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here
```

## Docker Commands

### Build Services

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build api
docker-compose build app

# Build without cache
docker-compose build --no-cache
```

### Start Services

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Start specific service
docker-compose up api

# View logs
docker-compose logs -f
docker-compose logs -f api
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Manage Containers

```bash
# List running containers
docker-compose ps

# Execute command in container
docker-compose exec api npm run prisma:studio
docker-compose exec app sh

# View logs
docker-compose logs api
docker-compose logs app

# Restart service
docker-compose restart api
```

## Database Management

### Run Migrations

Migrations run automatically on startup, but you can run manually:

```bash
docker-compose exec api npx prisma migrate deploy
```

### Access Database

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d channelsconnect

# Or from host machine
psql -h localhost -U postgres -d channelsconnect
```

### Prisma Studio

```bash
docker-compose exec api npx prisma studio
```

Then access at http://localhost:5555

### Backup Database

```bash
# Backup
docker-compose exec postgres pg_dump -U postgres channelsconnect > backup.sql

# Restore
docker-compose exec -T postgres psql -U postgres channelsconnect < backup.sql
```

## Development Workflow

### Development Mode

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Code changes auto-reload
# API: Watch mode enabled
# App: Vite HMR enabled
```

### Testing in Docker

```bash
# Run API tests
docker-compose exec api npm test

# Run E2E tests
docker-compose exec api npm run test:e2e

# Check API health
curl http://localhost:3001/health
```

## Production Deployment

### Build Production Images

```bash
# Build optimized images
docker-compose build

# Tag for registry
docker tag channelsconnect-api:latest yourregistry/channelsconnect-api:latest
docker tag channelsconnect-app:latest yourregistry/channelsconnect-app:latest

# Push to registry
docker push yourregistry/channelsconnect-api:latest
docker push yourregistry/channelsconnect-app:latest
```

### Environment-Specific Configurations

Create separate compose files:

```bash
# docker-compose.staging.yml
# docker-compose.production.yml
```

Deploy with:

```bash
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

## Networking

All services are on the `channelsconnect` bridge network:

- Services can communicate using service names
- `api` accessible at `http://api:3001` from within network
- `postgres` accessible at `postgres:5432` from within network

## Volumes

### postgres_data

Persistent PostgreSQL data. To remove:

```bash
docker-compose down -v
```

### Development Volumes

Code is mounted for live reload:

```yaml
volumes:
  - ./api/src:/app/src  # API source
  - ./app:/app          # App source
```

## Troubleshooting

### Port Already in Use

Change ports in `docker-compose.yml`:

```yaml
ports:
  - '8080:80'     # Frontend
  - '3002:3001'   # API
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check health
docker-compose exec postgres pg_isready

# View logs
docker-compose logs postgres
```

### API Won't Start

```bash
# View API logs
docker-compose logs api

# Common issues:
# - Database not ready: Wait for health check
# - Migration failed: Check DATABASE_URL
# - Supabase credentials: Verify .env file
```

### Container Keeps Restarting

```bash
# Check logs
docker-compose logs api

# Remove and rebuild
docker-compose down
docker-compose build --no-cache api
docker-compose up api
```

### Out of Disk Space

```bash
# Remove unused images
docker system prune -a

# Remove volumes
docker volume prune

# Check disk usage
docker system df
```

## Performance Optimization

### Multi-Stage Builds

Dockerfiles use multi-stage builds:
- Builder stage: Compiles code
- Production stage: Only runtime dependencies

### Image Size

- API image: ~200MB
- App image: ~50MB (nginx + static files)

### Caching

Optimize build caching:
1. Copy package files first
2. Install dependencies
3. Copy source code
4. Build application

## Security

### Best Practices

1. **Don't commit .env file**
2. **Use secrets management** for production
3. **Run as non-root user** (already configured)
4. **Keep images updated** regularly
5. **Scan for vulnerabilities**: `docker scan`

### Environment Variables

Never hardcode secrets. Use:
- Docker secrets
- Environment variable files
- Secret management services (AWS Secrets Manager, etc.)

## Monitoring

### Health Checks

```bash
# Check service health
docker-compose ps

# API health endpoint
curl http://localhost:3001/health
```

### Resource Usage

```bash
# View resource stats
docker stats

# Specific service
docker stats channelsconnect-api
```

### Logs

```bash
# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Since timestamp
docker-compose logs --since 2024-01-01T00:00:00
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Docker Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build images
        run: docker-compose build
      
      - name: Run tests
        run: |
          docker-compose up -d postgres
          docker-compose run api npm run test:e2e
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker-compose push
```

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [NestJS Docker Guide](https://docs.nestjs.com/recipes/docker)

## Support

For issues:
1. Check logs: `docker-compose logs`
2. Verify .env configuration
3. Ensure ports are available
4. Check Docker daemon is running

