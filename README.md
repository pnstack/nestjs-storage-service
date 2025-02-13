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
