# Data Model: Modern Storage Service

**Feature**: Modern storage service with NestJS and S3  
**Purpose**: Define entities, fields, relationships, and validation rules for metadata persistence

---

## Entity: Object

**Description**: Represents a stored object (file) in S3 with metadata tracked in PostgreSQL.

**Table Name**: `objects`

### Fields

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key, Auto-generated | Unique object identifier |
| `namespace` | VARCHAR(255) | NOT NULL, Index | Tenant/namespace isolation key (e.g., `org-acme`) |
| `name` | VARCHAR(500) | NOT NULL | Original filename or user-provided name |
| `s3Key` | VARCHAR(1000) | NOT NULL, Unique | Full S3 key path: `{namespace}/{objectId}` or `{namespace}/{userPath}` |
| `contentType` | VARCHAR(255) | NOT NULL | MIME type (e.g., `application/pdf`, `image/jpeg`) |
| `sizeBytes` | BIGINT | NOT NULL | File size in bytes |
| `checksum` | VARCHAR(64) | NULLABLE | SHA-256 checksum for integrity verification |
| `customMetadata` | JSONB | NULLABLE | User-defined key-value metadata (e.g., `{"department": "finance", "year": "2025"}`) |
| `createdAt` | TIMESTAMP | NOT NULL, Default NOW() | Object creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL, Default NOW() | Last update timestamp |
| `deletedAt` | TIMESTAMP | NULLABLE | Soft delete timestamp (NULL = active) |

### Indexes

- **Primary Key**: `id`
- **Unique Index**: `s3Key` (ensures no duplicate S3 keys)
- **Composite Index**: `(namespace, deletedAt)` for listing objects by namespace (excludes soft-deleted)
- **Index**: `namespace` for fast tenant filtering
- **Index**: `createdAt` for time-range queries

### Validation Rules

- `namespace`: alphanumeric + hyphens, max 255 chars (regex: `^[a-z0-9][a-z0-9-]*$`)
- `name`: non-empty, max 500 chars, no leading/trailing whitespace
- `s3Key`: must match pattern `{namespace}/{...}` (enforced by service)
- `contentType`: must be in MIME type allowlist (e.g., `image/*`, `application/pdf`, `text/*`)
- `sizeBytes`: 0 < size ≤ 104857600 (100 MB initially)
- `checksum`: if provided, must be valid SHA-256 hex string (64 chars)
- `customMetadata`: JSON object with max 10 keys, each key max 100 chars, each value max 1000 chars

### Relationships

- **One-to-Many** with `AuditEvent`: Each object has many audit events (create, read, delete)
- **One-to-Many** with `UploadSession`: Each object may have multiple upload sessions (resumable uploads)

---

## Entity: Namespace

**Description**: Represents a tenant or logical grouping of objects. Tracks namespace metadata and quotas.

**Table Name**: `namespaces`

### Fields

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key, Auto-generated | Unique namespace identifier |
| `name` | VARCHAR(255) | NOT NULL, Unique | Namespace name (e.g., `org-acme`) |
| `displayName` | VARCHAR(255) | NULLABLE | Human-readable name (e.g., `Acme Corporation`) |
| `quotaBytes` | BIGINT | NULLABLE | Storage quota in bytes (NULL = unlimited) |
| `usedBytes` | BIGINT | NOT NULL, Default 0 | Current storage used in bytes |
| `objectCount` | INTEGER | NOT NULL, Default 0 | Number of active objects in namespace |
| `metadata` | JSONB | NULLABLE | Namespace-level metadata (e.g., `{"tier": "premium", "owner": "admin@acme.com"}`) |
| `createdAt` | TIMESTAMP | NOT NULL, Default NOW() | Namespace creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL, Default NOW() | Last update timestamp |
| `archivedAt` | TIMESTAMP | NULLABLE | Archive timestamp (NULL = active) |

### Indexes

- **Primary Key**: `id`
- **Unique Index**: `name`
- **Index**: `archivedAt` for filtering active namespaces

### Validation Rules

- `name`: alphanumeric + hyphens, lowercase, 3-255 chars (regex: `^[a-z0-9][a-z0-9-]{2,254}$`)
- `displayName`: if provided, max 255 chars
- `quotaBytes`: if provided, must be ≥ 0
- `usedBytes`: automatically updated on object create/delete (not user-editable)
- `objectCount`: automatically updated on object create/delete (not user-editable)

### Relationships

- **One-to-Many** with `Object`: Each namespace contains many objects

---

## Entity: UploadSession

**Description**: Tracks resumable multipart upload sessions for large files.

**Table Name**: `upload_sessions`

### Fields

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key, Auto-generated | Unique session identifier |
| `uploadId` | VARCHAR(255) | NOT NULL, Unique | S3 multipart upload ID |
| `namespace` | VARCHAR(255) | NOT NULL | Target namespace |
| `name` | VARCHAR(500) | NOT NULL | Target object name |
| `s3Key` | VARCHAR(1000) | NOT NULL | Full S3 key path (same as `Object.s3Key` on completion) |
| `contentType` | VARCHAR(255) | NOT NULL | MIME type |
| `expectedSizeBytes` | BIGINT | NOT NULL | Expected total file size |
| `uploadedSizeBytes` | BIGINT | NOT NULL, Default 0 | Total bytes uploaded so far |
| `partsCompleted` | JSONB | NOT NULL, Default '[]' | Array of completed parts: `[{"partNumber": 1, "ETag": "..."}, ...]` |
| `status` | ENUM | NOT NULL | `IN_PROGRESS`, `COMPLETED`, `ABORTED`, `EXPIRED` |
| `expiresAt` | TIMESTAMP | NOT NULL | Session expiration (S3 aborts after 7 days) |
| `createdAt` | TIMESTAMP | NOT NULL, Default NOW() | Session creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL, Default NOW() | Last update timestamp |

### Indexes

- **Primary Key**: `id`
- **Unique Index**: `uploadId`
- **Composite Index**: `(namespace, status)` for listing active sessions
- **Index**: `expiresAt` for cleanup jobs (abort expired sessions)

### Validation Rules

- `uploadId`: must be valid S3 multipart upload ID (generated by S3)
- `expectedSizeBytes`: 0 < size ≤ 104857600 (100 MB initially; expandable)
- `uploadedSizeBytes`: 0 ≤ uploaded ≤ expectedSizeBytes
- `partsCompleted`: array of objects with `partNumber` (integer) and `ETag` (string)
- `status`: transitions: `IN_PROGRESS` → `COMPLETED` or `ABORTED` (one-way)
- `expiresAt`: defaults to 7 days from creation (S3 multipart limit)

### Relationships

- **Many-to-One** with `Object`: Each session creates one object on completion (via `s3Key`)

---

## Entity: AuditEvent

**Description**: Tracks create, read, delete operations for compliance and debugging.

**Table Name**: `audit_events`

### Fields

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key, Auto-generated | Unique event identifier |
| `requestId` | VARCHAR(255) | NOT NULL, Index | Correlation ID from request |
| `action` | ENUM | NOT NULL | `CREATE`, `READ`, `DELETE`, `UPDATE` |
| `entityType` | VARCHAR(100) | NOT NULL | Entity type (e.g., `Object`, `Namespace`, `UploadSession`) |
| `entityId` | UUID | NOT NULL, Index | ID of the affected entity |
| `namespace` | VARCHAR(255) | NOT NULL, Index | Namespace context |
| `actor` | VARCHAR(255) | NULLABLE | User/service identifier (e.g., `user:123`, `service:uploader`) |
| `metadata` | JSONB | NULLABLE | Additional event details (e.g., `{"ipAddress": "...", "userAgent": "..."}`) |
| `createdAt` | TIMESTAMP | NOT NULL, Default NOW() | Event timestamp |

### Indexes

- **Primary Key**: `id`
- **Index**: `requestId` for tracing requests across operations
- **Index**: `entityId` for entity history
- **Composite Index**: `(namespace, createdAt)` for filtering events by tenant and time
- **Index**: `action` for filtering by event type

### Validation Rules

- `requestId`: non-empty, max 255 chars (UUID or custom format)
- `action`: must be one of defined enum values
- `entityType`: non-empty, max 100 chars
- `entityId`: valid UUID
- `actor`: if provided, max 255 chars

### Relationships

- **Many-to-One** with `Object`: Many events reference one object (via `entityId` when `entityType = 'Object'`)
- **Many-to-One** with `Namespace`: Many events reference one namespace (via `entityId` when `entityType = 'Namespace'`)

---

## Entity Relationship Diagram (ERD)

```
┌─────────────┐       1:N        ┌───────────┐
│  Namespace  │──────────────────▶│  Object   │
└─────────────┘                   └───────────┘
      │                                  │
      │                                  │ 1:N
      │                                  ▼
      │                           ┌─────────────┐
      │                           │ AuditEvent  │
      │                           └─────────────┘
      │ 1:N                              ▲
      ▼                                  │
┌────────────────┐                       │
│ UploadSession  │───────────────────────┘
└────────────────┘       1:N
       │
       │ (creates)
       ▼
  (Object on completion)
```

---

## TypeORM Entity Examples

### Object Entity

```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';

@Entity('objects')
@Index(['namespace', 'deletedAt'])
export class Object {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  namespace: string;

  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Column({ type: 'varchar', length: 1000, unique: true })
  s3Key: string;

  @Column({ type: 'varchar', length: 255 })
  contentType: string;

  @Column({ type: 'bigint' })
  sizeBytes: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum: string | null;

  @Column({ type: 'jsonb', nullable: true })
  customMetadata: Record<string, string> | null;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
```

### Namespace Entity

```typescript
@Entity('namespaces')
export class Namespace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  displayName: string | null;

  @Column({ type: 'bigint', nullable: true })
  quotaBytes: number | null;

  @Column({ type: 'bigint', default: 0 })
  usedBytes: number;

  @Column({ type: 'int', default: 0 })
  objectCount: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  archivedAt: Date | null;
}
```

### UploadSession Entity

```typescript
@Entity('upload_sessions')
@Index(['namespace', 'status'])
export class UploadSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  uploadId: string;

  @Column({ type: 'varchar', length: 255 })
  namespace: string;

  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Column({ type: 'varchar', length: 1000 })
  s3Key: string;

  @Column({ type: 'varchar', length: 255 })
  contentType: string;

  @Column({ type: 'bigint' })
  expectedSizeBytes: number;

  @Column({ type: 'bigint', default: 0 })
  uploadedSizeBytes: number;

  @Column({ type: 'jsonb', default: '[]' })
  partsCompleted: Array<{ partNumber: number; ETag: string }>;

  @Column({ type: 'enum', enum: ['IN_PROGRESS', 'COMPLETED', 'ABORTED', 'EXPIRED'] })
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABORTED' | 'EXPIRED';

  @Column({ type: 'timestamp' })
  @Index()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### AuditEvent Entity

```typescript
@Entity('audit_events')
@Index(['namespace', 'createdAt'])
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  requestId: string;

  @Column({ type: 'enum', enum: ['CREATE', 'READ', 'DELETE', 'UPDATE'] })
  @Index()
  action: 'CREATE' | 'READ' | 'DELETE' | 'UPDATE';

  @Column({ type: 'varchar', length: 100 })
  entityType: string;

  @Column({ type: 'uuid' })
  @Index()
  entityId: string;

  @Column({ type: 'varchar', length: 255 })
  namespace: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actor: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

## Validation Service Examples

### Object Validation

```typescript
import { IsNotEmpty, IsString, MaxLength, Matches, IsOptional, IsPositive, Max, IsObject } from 'class-validator';

export class CreateObjectDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-z0-9][a-z0-9-]*$/, { message: 'Invalid namespace format' })
  namespace: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  name: string;

  @IsNotEmpty()
  @IsString()
  contentType: string;

  @IsPositive()
  @Max(104857600) // 100 MB
  sizeBytes: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  checksum?: string;

  @IsOptional()
  @IsObject()
  customMetadata?: Record<string, string>;
}
```

---

## Summary

- **4 Core Entities**: Object, Namespace, UploadSession, AuditEvent
- **PostgreSQL + TypeORM**: Relational integrity, JSON columns for flexible metadata
- **Indexes**: Optimized for namespace filtering, time-range queries, audit tracing
- **Validation**: class-validator DTOs enforce constraints at API layer
- **Soft Deletes**: Objects use `deletedAt` for recovery workflows
- **Audit Trail**: All CUD operations logged with requestId correlation

Ready to proceed to contracts/ and quickstart.md generation.
