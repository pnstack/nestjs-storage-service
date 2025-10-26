# Quickstart: Modern Storage Service

**Feature**: Modern storage service with NestJS and S3  
**Purpose**: Guide for setting up local development environment and testing the service

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18+ (check `.nvmrc` for exact version)
- **pnpm**: v8+ (package manager)
- **Docker**: v20+ with Docker Compose
- **Git**: For version control
- **curl** or **Postman**: For API testing

---

## Quick Start (5 minutes)

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd nestjs-storage-service

# Checkout the feature branch
git checkout 001-modern-storage-service

# Install dependencies
pnpm install
```

---

### 2. Start Infrastructure Services

The service depends on PostgreSQL, Redis, and LocalStack (for S3 emulation). Start them with Docker Compose:

```bash
# Start all infrastructure services
docker-compose up -d

# Verify services are running
docker-compose ps
```

**Expected output**:
```
NAME                COMMAND                  STATUS
postgres            "docker-entrypoint..."   Up
redis               "docker-entrypoint..."   Up
localstack          "docker-entrypoint..."   Up
```

---

### 3. Initialize LocalStack S3 Bucket

Create the S3 bucket and configure encryption:

```bash
# Run the initialization script
chmod +x ./scripts/init-localstack.sh
./scripts/init-localstack.sh
```

**Script contents** (`scripts/init-localstack.sh`):
```bash
#!/bin/bash
set -e

echo "Initializing LocalStack S3 bucket..."

# Create bucket
aws --endpoint-url=http://localhost:4566 s3 mb s3://local-storage-bucket

# Enable encryption at rest
aws --endpoint-url=http://localhost:4566 s3api put-bucket-encryption \
  --bucket local-storage-bucket \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

echo "✅ S3 bucket 'local-storage-bucket' created and encrypted"
```

---

### 4. Configure Environment Variables

Create a `.env.local` file for local development:

```bash
# Copy the example env file
cp .env.example .env.local
```

**`.env.local` contents**:
```env
# Node environment
NODE_ENV=development
PORT=3000

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=storage_service
DB_SYNCHRONIZE=true  # Auto-sync schema in dev (disable in prod)

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# AWS S3 (LocalStack)
AWS_ENDPOINT=http://localhost:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_BUCKET=local-storage-bucket

# Logging
LOG_LEVEL=debug

# API
API_PREFIX=/api/v1

# Upload limits
MAX_FILE_SIZE=104857600  # 100 MB

# Signed URL expiration (seconds)
DEFAULT_SIGNED_URL_EXPIRY=3600  # 1 hour
```

---

### 5. Run Database Migrations

Apply database schema migrations:

```bash
# Run TypeORM migrations
pnpm migration:run
```

**Note**: If `DB_SYNCHRONIZE=true`, migrations run automatically on app start (dev only).

---

### 6. Start the NestJS Application

```bash
# Development mode with hot-reload
pnpm dev

# Or with pnpm run
pnpm run start:dev
```

**Expected output**:
```
[Nest] INFO  [NestFactory] Starting Nest application...
[Nest] INFO  [InstanceLoader] AppModule dependencies initialized
[Nest] INFO  [InstanceLoader] StorageModule dependencies initialized
[Nest] INFO  [InstanceLoader] UploadModule dependencies initialized
[Nest] INFO  [RoutesResolver] StorageController {/api/v1/storage}:
[Nest] INFO  [RouterExplorer] Mapped {/api/v1/objects, POST} route
[Nest] INFO  [RouterExplorer] Mapped {/api/v1/objects/:id, GET} route
[Nest] INFO  [NestApplication] Nest application successfully started
[Nest] INFO  Application is running on: http://localhost:3000
[Nest] INFO  Swagger docs available at: http://localhost:3000/api
```

---

### 7. Verify Health Checks

```bash
# Liveness check
curl http://localhost:3000/api/v1/health/live

# Readiness check (verifies DB, Redis, S3 connectivity)
curl http://localhost:3000/api/v1/health/ready
```

**Expected response** (readiness):
```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "s3": "ok"
  }
}
```

---

## Testing the API

### 1. Create a Namespace

```bash
curl -X POST http://localhost:3000/api/v1/namespaces \
  -H "Content-Type: application/json" \
  -d '{
    "name": "org-demo",
    "displayName": "Demo Organization",
    "quotaBytes": 107374182400
  }'
```

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "org-demo",
  "displayName": "Demo Organization",
  "quotaBytes": 107374182400,
  "usedBytes": 0,
  "objectCount": 0,
  "createdAt": "2025-10-25T10:30:00Z"
}
```

---

### 2. Create an Object (Simple Upload)

```bash
curl -X POST http://localhost:3000/api/v1/objects \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "org-demo",
    "name": "test-file.txt",
    "contentType": "text/plain",
    "sizeBytes": 1024
  }'
```

**Response**:
```json
{
  "id": "660f9500-f39c-52e5-b827-557766551111",
  "namespace": "org-demo",
  "name": "test-file.txt",
  "s3Key": "org-demo/660f9500-f39c-52e5-b827-557766551111",
  "uploadUrl": "http://localhost:4566/local-storage-bucket/org-demo/660f9500-f39c-52e5-b827-557766551111?X-Amz-Algorithm=...",
  "createdAt": "2025-10-25T10:35:00Z"
}
```

---

### 3. Upload File to S3 via Signed URL

```bash
# Upload file content using the signed URL from previous response
curl -X PUT "<uploadUrl>" \
  -H "Content-Type: text/plain" \
  --data-binary "Hello, modern storage service!"
```

**Response**: `200 OK` (empty body)

---

### 4. Generate Signed Download URL

```bash
curl -X POST http://localhost:3000/api/v1/objects/660f9500-f39c-52e5-b827-557766551111/signed-url \
  -H "Content-Type: application/json" \
  -d '{
    "expiresIn": 3600
  }'
```

**Response**:
```json
{
  "url": "http://localhost:4566/local-storage-bucket/org-demo/660f9500-f39c-52e5-b827-557766551111?X-Amz-Algorithm=...",
  "expiresAt": "2025-10-25T11:35:00Z"
}
```

---

### 5. Download File via Signed URL

```bash
# Download file content using the signed URL
curl "<url>"
```

**Response**: `Hello, modern storage service!`

---

### 6. List Objects in Namespace

```bash
curl http://localhost:3000/api/v1/namespaces/org-demo/objects?limit=10
```

**Response**:
```json
{
  "items": [
    {
      "id": "660f9500-f39c-52e5-b827-557766551111",
      "namespace": "org-demo",
      "name": "test-file.txt",
      "s3Key": "org-demo/660f9500-f39c-52e5-b827-557766551111",
      "contentType": "text/plain",
      "sizeBytes": 1024,
      "createdAt": "2025-10-25T10:35:00Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

---

### 7. Delete Object

```bash
curl -X DELETE http://localhost:3000/api/v1/objects/660f9500-f39c-52e5-b827-557766551111
```

**Response**: `204 No Content`

---

## Testing Resumable Uploads (Multipart)

### 1. Initiate Multipart Upload

```bash
curl -X POST http://localhost:3000/api/v1/uploads/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "org-demo",
    "name": "large-file.bin",
    "contentType": "application/octet-stream",
    "expectedSizeBytes": 10485760
  }'
```

**Response**:
```json
{
  "sessionId": "770g0600-g49d-63f6-c938-668877662222",
  "uploadId": "S3UploadId12345",
  "expiresAt": "2025-11-01T10:30:00Z"
}
```

---

### 2. Upload Parts

```bash
# Upload part 1 (example: 5 MB chunk)
curl -X PUT http://localhost:3000/api/v1/uploads/770g0600-g49d-63f6-c938-668877662222/parts/1 \
  -H "Content-Type: application/octet-stream" \
  --data-binary @part1.bin
```

**Response**:
```json
{
  "partNumber": 1,
  "ETag": "\"abc123def456...\""
}
```

Repeat for all parts...

---

### 3. Complete Upload

```bash
curl -X POST http://localhost:3000/api/v1/uploads/770g0600-g49d-63f6-c938-668877662222/complete
```

**Response**:
```json
{
  "objectId": "880h1700-h59e-74g7-d049-779988773333",
  "s3Key": "org-demo/880h1700-h59e-74g7-d049-779988773333"
}
```

---

## Running Tests

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run with coverage
pnpm test:cov

# Run specific test file
pnpm test storage.service.spec.ts
```

**Expected coverage** (target: 80%+ lines, 70%+ branches):
```
--------------------|---------|----------|---------|---------|-------------------
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------|---------|----------|---------|---------|-------------------
All files           |   82.5  |   72.3   |   85.1  |   82.5  |
 storage.service.ts |   85.2  |   75.0   |   88.9  |   85.2  | 45-48,62
--------------------|---------|----------|---------|---------|-------------------
```

---

### E2E Tests

```bash
# Run e2e tests (requires running infrastructure)
pnpm test:e2e
```

**E2E test scenarios**:
- Create namespace → create object → upload file → generate signed URL → download
- Initiate multipart upload → upload parts → complete → verify object exists
- List objects with filtering and pagination
- Delete object and verify soft delete

---

## Accessing Swagger/OpenAPI Docs

Navigate to http://localhost:3000/api in your browser to view interactive API documentation.

**Features**:
- Try out endpoints directly from the browser
- View request/response schemas
- Test authentication flows

---

## Debugging Tips

### View Application Logs

Logs are structured JSON in production, pretty-printed in development:

```bash
# Watch logs in development
pnpm dev
```

**Log format** (dev):
```
[2025-10-25 10:30:00] INFO  [StorageService] {"requestId":"abc123","action":"createObject","namespace":"org-demo","name":"test-file.txt"}
```

---

### Inspect LocalStack S3 Bucket

```bash
# List all buckets
aws --endpoint-url=http://localhost:4566 s3 ls

# List objects in bucket
aws --endpoint-url=http://localhost:4566 s3 ls s3://local-storage-bucket --recursive

# Download object from LocalStack
aws --endpoint-url=http://localhost:4566 s3 cp s3://local-storage-bucket/org-demo/660f9500-f39c-52e5-b827-557766551111 ./downloaded-file.txt
```

---

### Check PostgreSQL Database

```bash
# Connect to PostgreSQL
docker exec -it <postgres-container-id> psql -U postgres -d storage_service

# List tables
\dt

# Query objects
SELECT * FROM objects;

# Query namespaces
SELECT * FROM namespaces;

# Exit
\q
```

---

### Check Redis Cache

```bash
# Connect to Redis CLI
docker exec -it <redis-container-id> redis-cli

# List all keys
KEYS *

# Get queue status
LLEN bull:upload-queue

# Exit
quit
```

---

## Seeding Test Data

Use the provided seed script to populate test namespaces and objects:

```bash
# Run seed script
pnpm run seed
```

**Seed data** (`scripts/seed.ts`):
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { StorageService } from '../src/modules/storage/storage.service';
import { NamespaceService } from '../src/modules/namespace/namespace.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const namespaceService = app.get(NamespaceService);
  const storageService = app.get(StorageService);

  // Create test namespaces
  const ns1 = await namespaceService.create({
    name: 'org-demo',
    displayName: 'Demo Organization',
    quotaBytes: 107374182400,
  });

  const ns2 = await namespaceService.create({
    name: 'org-test',
    displayName: 'Test Organization',
  });

  // Create test objects
  await storageService.createObject({
    namespace: 'org-demo',
    name: 'sample-invoice.pdf',
    contentType: 'application/pdf',
    sizeBytes: 2048576,
    customMetadata: { department: 'finance', year: '2025' },
  });

  console.log('✅ Seed data created');
  await app.close();
}

bootstrap();
```

---

## Cleanup

### Stop Infrastructure Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (resets DB/Redis state)
docker-compose down -v
```

---

### Reset Database

```bash
# Drop and recreate database
pnpm migration:revert
pnpm migration:run
```

---

## Next Steps

- **Add Authentication**: Integrate JWT or OAuth2 (see spec clarification Q3)
- **Deploy to Cloud**: Configure AWS S3 (replace LocalStack endpoint)
- **Enable Monitoring**: Add Prometheus metrics and Grafana dashboards
- **Optimize Performance**: Add caching layer for frequently accessed metadata
- **Implement Retention Policies**: Auto-delete objects after TTL (see spec clarification Q1)

---

## Troubleshooting

### Issue: "Cannot connect to LocalStack"

**Solution**:
- Ensure LocalStack is running: `docker-compose ps`
- Check endpoint URL in `.env.local`: `AWS_ENDPOINT=http://localhost:4566`
- Verify port 4566 is not in use: `lsof -i :4566`

---

### Issue: "Database migration failed"

**Solution**:
- Check PostgreSQL is running: `docker-compose ps`
- Verify DB credentials in `.env.local`
- Reset DB: `docker-compose down -v && docker-compose up -d`

---

### Issue: "Signed URL returns 403 Forbidden"

**Solution**:
- Verify object exists: `GET /objects/{id}`
- Check S3 bucket permissions (LocalStack should allow all in dev)
- Ensure URL has not expired

---

## Summary

You now have a fully functional local development environment for the modern storage service! 🎉

**What you've set up**:
- ✅ NestJS application with hot-reload
- ✅ PostgreSQL for metadata persistence
- ✅ Redis for caching and queues
- ✅ LocalStack S3 for object storage
- ✅ Swagger API documentation
- ✅ Test data seeding

**Next**: Start implementing features or run the test suite!
