# Research: Modern Storage Service for Microservices

**Date**: 2025-10-25  
**Feature**: Modern storage service with NestJS and S3  
**Purpose**: Resolve technical unknowns and document decisions for implementation

## Research Items

### R1: Metadata Persistence Strategy

**Question**: Which persistence layer for object metadata (name, size, content-type, namespace, custom key-values)?

**Options Evaluated**:

1. **DynamoDB**
   - Pros: AWS-native; auto-scaling; low latency for key-value lookups; strong consistency option
   - Cons: Additional AWS service; query patterns limited to keys/indexes; cost at scale
   - Fit: Excellent for namespace + object id lookups; supports secondary indexes for list/filter by prefix

2. **PostgreSQL**
   - Pros: Rich query capabilities; JSON column for custom metadata; ACID guarantees; existing NestJS TypeORM integration
   - Cons: Requires RDS or self-hosted instance; scaling overhead; may be over-engineered for key-value access
   - Fit: Good for complex queries and audit logs; familiar to team

3. **In-memory (Redis only) for MVP**
   - Pros: Fast; simple; already in stack for caching/queue
   - Cons: No durability; data loss on restart; not viable for production
   - Fit: Suitable for proof-of-concept only

**Decision**: **PostgreSQL** (with TypeORM)

**Rationale**:
- Already in project ecosystem (NestJS has strong TypeORM support)
- Enables rich queries for filtering by namespace, prefix, creation time range, content type
- JSON column accommodates custom metadata key-values without schema changes
- Audit events (create, read, delete) can be stored in same DB with relational integrity
- Team familiarity and operational maturity
- Migration path: if scale requires, move hot metadata to DynamoDB later with dual-write pattern

**Alternatives Considered**:
- DynamoDB: deferred; revisit if query patterns simplify or scale demands NoSQL
- Redis-only: rejected; no durability for production use

---

### R2: NestJS + AWS SDK v3 Integration Patterns

**Question**: Best practices for integrating AWS SDK v3 in NestJS modules?

**Findings**:

**Approach**: Use NestJS providers with `@Injectable()` decorators and dependency injection for S3 client.

**Pattern**:
```typescript
// src/common/providers/s3.provider.ts
import { S3Client } from '@aws-sdk/client-s3';
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const S3_CLIENT = 'S3_CLIENT';

export const s3Provider: Provider = {
  provide: S3_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    return new S3Client({
      region: config.get('AWS_REGION'),
      credentials: {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
  },
};
```

**Service Integration**:
```typescript
// src/modules/storage/storage.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  constructor(@Inject(S3_CLIENT) private readonly s3Client: S3Client) {}

  async generateSignedUrl(key: string, expiresIn: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }
}
```

**Best Practices**:
- Use modular SDK imports (`@aws-sdk/client-s3`, not full `aws-sdk`)
- Configure credentials via ConfigService (reads from .env)
- Wrap S3 operations in try/catch with structured error handling
- Use `@aws-sdk/s3-request-presigner` for signed URLs
- Stream large uploads/downloads using Node.js streams (avoid buffering full file)

**References**:
- AWS SDK v3 docs: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/
- NestJS custom providers: https://docs.nestjs.com/fundamentals/custom-providers

---

### R3: Resumable Upload Implementation with S3 Multipart

**Question**: How to enable resumable uploads for large files using S3 multipart upload API?

**Findings**:

**S3 Multipart Upload Flow**:
1. Initiate upload: `CreateMultipartUploadCommand` → returns `UploadId`
2. Upload parts: `UploadPartCommand` with part number and data stream → returns `ETag`
3. Complete upload: `CompleteMultipartUploadCommand` with all part ETags
4. Abort if failed: `AbortMultipartUploadCommand`

**Implementation Pattern**:
- Store `UploadSession` entity in PostgreSQL with: `id`, `uploadId` (S3), `namespace`, `expectedSize`, `status`, `partsCompleted`
- Client requests upload initiation → service creates multipart upload + session
- Client uploads parts (can retry individual parts on failure)
- Client signals completion → service verifies parts and completes S3 upload
- Idempotency: dedupe by client-provided `uploadId` or namespace + object name

**NestJS Service Sketch**:
```typescript
async initiateUpload(namespace: string, name: string, size: number, contentType: string) {
  const command = new CreateMultipartUploadCommand({
    Bucket: this.bucketName,
    Key: `${namespace}/${name}`,
    ContentType: contentType,
  });
  const { UploadId } = await this.s3Client.send(command);
  
  // Store session in DB
  const session = this.uploadSessionRepo.create({ uploadId: UploadId, namespace, name, expectedSize: size, status: 'IN_PROGRESS' });
  await this.uploadSessionRepo.save(session);
  
  return { uploadId: UploadId, sessionId: session.id };
}

async uploadPart(sessionId: string, partNumber: number, data: Buffer) {
  const session = await this.uploadSessionRepo.findOne({ where: { id: sessionId } });
  const command = new UploadPartCommand({
    Bucket: this.bucketName,
    Key: `${session.namespace}/${session.name}`,
    UploadId: session.uploadId,
    PartNumber: partNumber,
    Body: data,
  });
  const { ETag } = await this.s3Client.send(command);
  
  // Track part completion
  session.partsCompleted.push({ partNumber, ETag });
  await this.uploadSessionRepo.save(session);
  
  return { partNumber, ETag };
}

async completeUpload(sessionId: string) {
  const session = await this.uploadSessionRepo.findOne({ where: { id: sessionId } });
  const command = new CompleteMultipartUploadCommand({
    Bucket: this.bucketName,
    Key: `${session.namespace}/${session.name}`,
    UploadId: session.uploadId,
    MultipartUpload: {
      Parts: session.partsCompleted.map(p => ({ PartNumber: p.partNumber, ETag: p.ETag })),
    },
  });
  await this.s3Client.send(command);
  
  session.status = 'COMPLETED';
  await this.uploadSessionRepo.save(session);
}
```

**Checksum Validation**:
- Use `ChecksumAlgorithm: 'SHA256'` in `CreateMultipartUploadCommand`
- S3 validates checksum on complete; reject if mismatch

**References**:
- S3 Multipart Upload: https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html
- AWS SDK v3 Multipart: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/

---

### R4: Namespace Isolation and Multi-Tenancy in S3

**Question**: How to enforce namespace (tenant) isolation using S3 key prefixes and access controls?

**Findings**:

**S3 Key Structure**: `{namespace}/{objectId}` or `{namespace}/{userPath}`
- Example: `org-acme/invoices/2025/invoice-001.pdf`
- Namespace prefix groups objects logically
- S3 list operations can filter by prefix efficiently

**Access Control**:
- **IAM Policy Scoping**: Service uses single IAM role with bucket-wide access; app logic enforces namespace boundaries
- **Signed URL Scoping**: Each signed URL includes full key (`{namespace}/{objectId}`); URL only grants access to that specific key
- **Application-Level Checks**: All list/delete/read operations validate namespace against user's authorized namespaces

**NestJS Authorization Pattern**:
```typescript
// Guard or interceptor
@Injectable()
export class NamespaceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userNamespaces = request.user.namespaces; // from JWT or session
    const requestedNamespace = request.params.namespace;
    return userNamespaces.includes(requestedNamespace);
  }
}

@Controller('storage/:namespace')
@UseGuards(NamespaceGuard)
export class StorageController {
  @Get('objects')
  async listObjects(@Param('namespace') namespace: string) {
    // Only lists objects with prefix = namespace
    return this.storageService.listByNamespace(namespace);
  }
}
```

**Isolation Guarantees**:
- DB queries filter by `namespace` column
- S3 list operations use `Prefix: namespace`
- Signed URLs embed full key path (no cross-namespace access)
- Audit logs record namespace for every operation

**References**:
- S3 key design: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html
- NestJS guards: https://docs.nestjs.com/guards

---

### R5: Error Handling and Retries for S3 Operations

**Question**: How to implement timeouts, retries, and idempotency for S3 calls?

**Findings**:

**AWS SDK v3 Built-in Retry**:
- Default: 3 retries with exponential backoff
- Customizable via client config:
  ```typescript
  new S3Client({
    maxAttempts: 5,
    retryMode: 'adaptive', // or 'standard'
  });
  ```

**Timeouts**:
- Use Node.js `AbortController`:
  ```typescript
  const abortController = new AbortController();
  setTimeout(() => abortController.abort(), 30000); // 30s timeout
  
  const command = new PutObjectCommand({ Bucket, Key, Body });
  await this.s3Client.send(command, { abortSignal: abortController.signal });
  ```

**Idempotency for Uploads**:
- Use client-provided idempotency key (e.g., hash of namespace + name + timestamp)
- Check if upload session with same key exists before creating new one
- S3 PutObject is inherently idempotent (same key overwrites)
- Multipart uploads: store `uploadId` in DB; retry uses same `uploadId`

**Error Classification**:
- **Transient** (retry): `ServiceUnavailable`, `RequestTimeout`, `TooManyRequests`
- **Permanent** (fail fast): `AccessDenied`, `NoSuchBucket`, `InvalidRequest`
- **Client** (validation): `EntityTooLarge`, `InvalidObjectState`

**NestJS Error Handling**:
```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

try {
  await this.s3Client.send(command);
} catch (error) {
  if (error.name === 'NoSuchKey') {
    throw new HttpException('Object not found', HttpStatus.NOT_FOUND);
  }
  if (error.name === 'AccessDenied') {
    throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
  }
  // Log and rethrow transient errors (SDK retries first)
  this.logger.error('S3 operation failed', error);
  throw new HttpException('Storage service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
}
```

**References**:
- SDK retry config: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-smithy-util-retry/
- Idempotency patterns: https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/

---

### R6: Structured Logging and Correlation IDs with NestJS

**Question**: How to implement structured JSON logging with correlation IDs across requests and async jobs?

**Findings**:

**Logger Choice**: Use `nestjs-pino` (structured JSON logging with Pino)

**Setup**:
```typescript
// app.module.ts
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
        customProps: (req) => ({
          requestId: req.id, // correlation id
        }),
        serializers: {
          req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
      },
    }),
  ],
})
export class AppModule {}
```

**Correlation ID Propagation**:
- HTTP: Use `express-request-id` middleware or Pino's built-in `genReqId`
- Bull Jobs: Pass `requestId` as job data; log it in job handler

**Service Logging**:
```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  async createObject(namespace: string, name: string, requestId: string) {
    this.logger.log({ requestId, namespace, name, action: 'createObject' }, 'Creating object');
    // ... operation
    this.logger.log({ requestId, namespace, name, action: 'createObject', status: 'success' }, 'Object created');
  }
}
```

**Audit Events**:
- Store in DB with: `requestId`, `action`, `namespace`, `objectId`, `actor`, `timestamp`
- Query by requestId for request tracing

**References**:
- nestjs-pino: https://github.com/iamolegga/nestjs-pino
- Pino docs: https://getpino.io/

---

### R7: Local Development Setup (LocalStack for S3)

**Question**: How to run S3 locally for development without AWS account costs?

**Findings**:

**LocalStack**: Open-source tool that emulates AWS services locally.

**Docker Compose Setup**:
```yaml
# docker-compose.yml (add to existing)
services:
  localstack:
    image: localstack/localstack:latest
    ports:
      - "4566:4566"  # LocalStack gateway
    environment:
      - SERVICES=s3
      - DEBUG=1
      - DATA_DIR=/tmp/localstack/data
    volumes:
      - ./localstack-data:/tmp/localstack/data
```

**NestJS Config for Local**:
```typescript
// .env.local
AWS_ENDPOINT=http://localhost:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_BUCKET=local-storage-bucket

// src/common/providers/s3.provider.ts
useFactory: (config: ConfigService) => {
  const endpoint = config.get('AWS_ENDPOINT');
  return new S3Client({
    region: config.get('AWS_REGION'),
    credentials: {
      accessKeyId: config.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY'),
    },
    ...(endpoint && {
      endpoint,
      forcePathStyle: true, // Required for LocalStack
    }),
  });
},
```

**Bucket Initialization Script**:
```bash
# scripts/init-localstack.sh
#!/bin/bash
aws --endpoint-url=http://localhost:4566 s3 mb s3://local-storage-bucket
aws --endpoint-url=http://localhost:4566 s3api put-bucket-encryption \
  --bucket local-storage-bucket \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

**Quickstart Command**:
```bash
# Start LocalStack + Redis + PostgreSQL
docker-compose up -d

# Initialize S3 bucket
./scripts/init-localstack.sh

# Run NestJS
pnpm dev
```

**References**:
- LocalStack: https://localstack.cloud/
- AWS SDK with LocalStack: https://docs.localstack.cloud/user-guide/integrations/sdks/javascript/

---

## Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Metadata persistence | PostgreSQL with TypeORM | Rich queries, audit logs, team familiarity, JSON for custom metadata |
| AWS SDK integration | NestJS providers with DI | Standard NestJS pattern, testable, config-driven |
| Resumable uploads | S3 multipart + UploadSession entity | Native S3 feature, track state in DB, client retry support |
| Namespace isolation | S3 key prefix + app-level auth | Efficient S3 list by prefix, signed URLs scoped to key, guards enforce access |
| Error handling | SDK retry + custom error mapping | Leverage SDK defaults, map to HTTP status, structured logging |
| Logging | nestjs-pino with correlation IDs | Structured JSON, requestId propagation, audit trail |
| Local dev | LocalStack for S3 | Cost-free local testing, no AWS account needed, docker-compose integration |

All NEEDS CLARIFICATION items from Technical Context have been resolved. Ready to proceed to Phase 1 (data-model, contracts, quickstart).
