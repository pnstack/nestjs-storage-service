# NestJS Storage Service

A robust storage service built with NestJS for handling file uploads and storage management with AWS S3 integration.

## Features

- 📁 File storage management
- 🚀 AWS S3 integration for cloud storage
- 📤 File upload handling
- 🔐 Secure file access management
- 📝 Swagger API documentation
- 🔄 GraphQL support
- 📊 Bull queue for background jobs
- 🗄️ Redis caching integration

## Prerequisites

- Node.js (check `.nvmrc` for version)
- pnpm
- Redis (for caching and queues)
- AWS S3 credentials (for cloud storage)

## Installation

```bash
# Install dependencies
pnpm install
```

## Environment Configuration

Copy the example environment file and update it with your configuration:

```bash
cp .env.example .env
```

Required environment variables:

- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_REGION`: AWS region
- `AWS_BUCKET`: S3 bucket name
- `REDIS_URL`: Redis connection URL

## Development

```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Run e2e tests
pnpm test:e2e

# Generate API documentation
pnpm compodoc
```

## Production

```bash
# Build the application
pnpm build

# Start production server
pnpm start:prod
```

## Docker Support

Build and run the service using Docker:

```bash
# Build Docker image
docker build -t nestjs-storage-service .

# Run container
docker-compose up -d
```

## API Documentation

- Swagger UI: `http://localhost:3000/api/docs`
- Compodoc: `http://localhost:8080` (after running `pnpm compodoc`)

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Authors

- npv2k1

## Support

For support, please open an issue in the GitHub repository.

## Modern Storage Service Features

This service now includes the following capabilities:

### Core Features
- **Namespace Management**: Create and manage isolated namespaces with quotas
- **Object Storage**: Store objects with metadata and generate signed URLs
- **Multipart Uploads**: Resumable uploads for large files (up to 100MB)
- **Audit Logging**: Track all CREATE, READ, and DELETE operations
- **Health Checks**: Liveness and readiness endpoints

### API Endpoints

Base URL: `http://localhost:4000/api/v1`

#### Namespaces
- `POST /namespaces` - Create a namespace
- `GET /namespaces/:name` - Get namespace details

#### Objects
- `POST /objects` - Create object and get upload URL
- `GET /objects/:id` - Get object metadata
- `POST /objects/:id/signed-url` - Generate download URL
- `DELETE /objects/:id` - Delete object
- `GET /namespaces/:namespace/objects` - List objects in namespace

#### Multipart Uploads
- `POST /uploads/initiate` - Start multipart upload
- `PUT /uploads/:sessionId/parts/:partNumber` - Upload a part
- `POST /uploads/:sessionId/complete` - Complete upload

#### Health
- `GET /health/live` - Liveness check
- `GET /health/ready` - Readiness check (DB + S3)

### Quick Start

1. Install dependencies:
```bash
npm install
```

2. Start services with Docker Compose:
```bash
docker-compose up -d postgres redis minio
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Run the application:
```bash
npm run dev
```

5. Access Swagger documentation:
```
http://localhost:4000/api
```

### Example Usage

#### Create a Namespace
```bash
curl -X POST http://localhost:4000/api/v1/namespaces \
  -H "Content-Type: application/json" \
  -d '{
    "name": "org-demo",
    "displayName": "Demo Organization",
    "quotaBytes": 1073741824
  }'
```

#### Create an Object
```bash
curl -X POST http://localhost:4000/api/v1/objects \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "org-demo",
    "name": "test-file.pdf",
    "contentType": "application/pdf",
    "sizeBytes": 1024000
  }'
```

The response will include a pre-signed `uploadUrl` that you can use to upload the file directly to S3/MinIO storage using an HTTP PUT request.

### Database Schema

The service uses PostgreSQL with TypeORM. Tables are auto-created on startup:
- `namespaces` - Namespace/tenant information
- `objects` - Object metadata
- `upload_sessions` - Multipart upload sessions
- `audit_events` - Audit trail

### Configuration

See `.env.example` for all configuration options.
