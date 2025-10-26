# API Contracts: Modern Storage Service

**Feature**: Modern storage service with NestJS and S3  
**Purpose**: Define REST API contracts (OpenAPI/Swagger) for storage endpoints

---

## Overview

This document specifies the REST API contracts for the modern storage service. The service exposes:

1. **Object Management**: Create, retrieve, list, delete objects
2. **Signed URL Generation**: Generate pre-signed URLs for direct S3 access
3. **Namespace Management**: Create, list, retrieve namespaces
4. **Resumable Uploads**: Initiate, upload parts, complete multipart uploads
5. **Health Checks**: Readiness and liveness endpoints

**Base URL**: `/api/v1` (production) or `http://localhost:3000/api/v1` (local)

**Authentication**: All endpoints except health checks require authentication (mechanism: TBD - see spec clarification Q3)

---

## OpenAPI Specification

### Metadata

```yaml
openapi: 3.0.3
info:
  title: Modern Storage Service API
  version: 1.0.0
  description: |
    Secure object storage service with namespace isolation, signed URLs, and resumable uploads.
    Built with NestJS and AWS S3.
  contact:
    name: API Support
    email: support@example.com
servers:
  - url: http://localhost:3000/api/v1
    description: Local development
  - url: https://api.example.com/api/v1
    description: Production
tags:
  - name: Objects
    description: Object storage operations
  - name: Namespaces
    description: Namespace management
  - name: Uploads
    description: Resumable upload sessions
  - name: Health
    description: Health and readiness checks
```

---

## Endpoints

### 1. Create Object (Simple Upload)

**POST** `/objects`

Create a new object with metadata. Returns object record and signed upload URL.

**Request Body** (JSON):
```json
{
  "namespace": "org-acme",
  "name": "invoice-2025-001.pdf",
  "contentType": "application/pdf",
  "sizeBytes": 2048576,
  "customMetadata": {
    "department": "finance",
    "year": "2025"
  }
}
```

**OpenAPI Schema**:
```yaml
/objects:
  post:
    tags:
      - Objects
    summary: Create a new object
    operationId: createObject
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - namespace
              - name
              - contentType
              - sizeBytes
            properties:
              namespace:
                type: string
                pattern: '^[a-z0-9][a-z0-9-]*$'
                maxLength: 255
                example: org-acme
              name:
                type: string
                maxLength: 500
                example: invoice-2025-001.pdf
              contentType:
                type: string
                maxLength: 255
                example: application/pdf
              sizeBytes:
                type: integer
                minimum: 1
                maximum: 104857600
                example: 2048576
              checksum:
                type: string
                maxLength: 64
                description: SHA-256 checksum (optional)
                example: abc123def456...
              customMetadata:
                type: object
                additionalProperties:
                  type: string
                maxProperties: 10
                example:
                  department: finance
                  year: "2025"
    responses:
      '201':
        description: Object created successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                id:
                  type: string
                  format: uuid
                  example: 550e8400-e29b-41d4-a716-446655440000
                namespace:
                  type: string
                  example: org-acme
                name:
                  type: string
                  example: invoice-2025-001.pdf
                s3Key:
                  type: string
                  example: org-acme/550e8400-e29b-41d4-a716-446655440000
                contentType:
                  type: string
                  example: application/pdf
                sizeBytes:
                  type: integer
                  example: 2048576
                customMetadata:
                  type: object
                  additionalProperties:
                    type: string
                uploadUrl:
                  type: string
                  format: uri
                  description: Pre-signed URL for PUT upload (expires in 15 minutes)
                  example: https://s3.amazonaws.com/bucket/...?X-Amz-Signature=...
                createdAt:
                  type: string
                  format: date-time
                  example: "2025-10-25T10:30:00Z"
      '400':
        description: Invalid request (validation error)
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
      '403':
        description: Forbidden (namespace access denied)
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
      '409':
        description: Conflict (object already exists)
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
```

---

### 2. Get Object Metadata

**GET** `/objects/{id}`

Retrieve object metadata by ID.

**OpenAPI Schema**:
```yaml
/objects/{id}:
  get:
    tags:
      - Objects
    summary: Get object metadata
    operationId: getObject
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
        example: 550e8400-e29b-41d4-a716-446655440000
    responses:
      '200':
        description: Object metadata retrieved
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ObjectMetadata'
      '404':
        description: Object not found
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
```

---

### 3. Generate Signed Download URL

**POST** `/objects/{id}/signed-url`

Generate a pre-signed URL for downloading an object.

**Request Body** (JSON):
```json
{
  "expiresIn": 3600
}
```

**OpenAPI Schema**:
```yaml
/objects/{id}/signed-url:
  post:
    tags:
      - Objects
    summary: Generate signed download URL
    operationId: generateSignedUrl
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              expiresIn:
                type: integer
                minimum: 60
                maximum: 604800
                default: 3600
                description: URL expiration time in seconds (1 min to 7 days)
                example: 3600
    responses:
      '200':
        description: Signed URL generated
        content:
          application/json:
            schema:
              type: object
              properties:
                url:
                  type: string
                  format: uri
                  example: https://s3.amazonaws.com/bucket/...?X-Amz-Signature=...
                expiresAt:
                  type: string
                  format: date-time
                  example: "2025-10-25T11:30:00Z"
      '404':
        description: Object not found
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
```

---

### 4. List Objects by Namespace

**GET** `/namespaces/{namespace}/objects`

List all objects in a namespace with optional filtering.

**Query Parameters**:
- `prefix` (optional): Filter by object name prefix
- `limit` (optional): Max results per page (default: 100, max: 1000)
- `offset` (optional): Pagination offset (default: 0)

**OpenAPI Schema**:
```yaml
/namespaces/{namespace}/objects:
  get:
    tags:
      - Objects
    summary: List objects in a namespace
    operationId: listObjects
    parameters:
      - name: namespace
        in: path
        required: true
        schema:
          type: string
          pattern: '^[a-z0-9][a-z0-9-]*$'
        example: org-acme
      - name: prefix
        in: query
        schema:
          type: string
          maxLength: 500
        example: invoices/2025/
      - name: limit
        in: query
        schema:
          type: integer
          minimum: 1
          maximum: 1000
          default: 100
      - name: offset
        in: query
        schema:
          type: integer
          minimum: 0
          default: 0
    responses:
      '200':
        description: Objects listed successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                items:
                  type: array
                  items:
                    $ref: '#/components/schemas/ObjectMetadata'
                total:
                  type: integer
                  example: 42
                limit:
                  type: integer
                  example: 100
                offset:
                  type: integer
                  example: 0
      '403':
        description: Forbidden (namespace access denied)
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
```

---

### 5. Delete Object

**DELETE** `/objects/{id}`

Soft delete an object (sets `deletedAt` timestamp).

**OpenAPI Schema**:
```yaml
/objects/{id}:
  delete:
    tags:
      - Objects
    summary: Delete an object
    operationId: deleteObject
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
    responses:
      '204':
        description: Object deleted successfully
      '404':
        description: Object not found or already deleted
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
```

---

### 6. Create Namespace

**POST** `/namespaces`

Create a new namespace.

**Request Body** (JSON):
```json
{
  "name": "org-acme",
  "displayName": "Acme Corporation",
  "quotaBytes": 107374182400,
  "metadata": {
    "tier": "premium",
    "owner": "admin@acme.com"
  }
}
```

**OpenAPI Schema**:
```yaml
/namespaces:
  post:
    tags:
      - Namespaces
    summary: Create a new namespace
    operationId: createNamespace
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - name
            properties:
              name:
                type: string
                pattern: '^[a-z0-9][a-z0-9-]{2,254}$'
                example: org-acme
              displayName:
                type: string
                maxLength: 255
                example: Acme Corporation
              quotaBytes:
                type: integer
                minimum: 0
                example: 107374182400
              metadata:
                type: object
                additionalProperties: true
                example:
                  tier: premium
                  owner: admin@acme.com
    responses:
      '201':
        description: Namespace created successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NamespaceMetadata'
      '400':
        description: Invalid request (validation error)
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
      '409':
        description: Conflict (namespace already exists)
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
```

---

### 7. Get Namespace Metadata

**GET** `/namespaces/{name}`

Retrieve namespace metadata by name.

**OpenAPI Schema**:
```yaml
/namespaces/{name}:
  get:
    tags:
      - Namespaces
    summary: Get namespace metadata
    operationId: getNamespace
    parameters:
      - name: name
        in: path
        required: true
        schema:
          type: string
          pattern: '^[a-z0-9][a-z0-9-]*$'
        example: org-acme
    responses:
      '200':
        description: Namespace metadata retrieved
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NamespaceMetadata'
      '404':
        description: Namespace not found
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
```

---

### 8. Initiate Multipart Upload

**POST** `/uploads/initiate`

Initiate a resumable multipart upload session.

**Request Body** (JSON):
```json
{
  "namespace": "org-acme",
  "name": "large-video.mp4",
  "contentType": "video/mp4",
  "expectedSizeBytes": 52428800
}
```

**OpenAPI Schema**:
```yaml
/uploads/initiate:
  post:
    tags:
      - Uploads
    summary: Initiate multipart upload
    operationId: initiateUpload
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - namespace
              - name
              - contentType
              - expectedSizeBytes
            properties:
              namespace:
                type: string
                pattern: '^[a-z0-9][a-z0-9-]*$'
                example: org-acme
              name:
                type: string
                maxLength: 500
                example: large-video.mp4
              contentType:
                type: string
                example: video/mp4
              expectedSizeBytes:
                type: integer
                minimum: 1
                maximum: 104857600
                example: 52428800
    responses:
      '201':
        description: Upload session initiated
        content:
          application/json:
            schema:
              type: object
              properties:
                sessionId:
                  type: string
                  format: uuid
                  example: 550e8400-e29b-41d4-a716-446655440000
                uploadId:
                  type: string
                  example: S3UploadId12345
                expiresAt:
                  type: string
                  format: date-time
                  example: "2025-11-01T10:30:00Z"
      '400':
        description: Invalid request
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
```

---

### 9. Upload Part

**PUT** `/uploads/{sessionId}/parts/{partNumber}`

Upload a single part of a multipart upload.

**Request Body**: Binary data (part bytes)

**OpenAPI Schema**:
```yaml
/uploads/{sessionId}/parts/{partNumber}:
  put:
    tags:
      - Uploads
    summary: Upload a part
    operationId: uploadPart
    parameters:
      - name: sessionId
        in: path
        required: true
        schema:
          type: string
          format: uuid
      - name: partNumber
        in: path
        required: true
        schema:
          type: integer
          minimum: 1
          maximum: 10000
    requestBody:
      required: true
      content:
        application/octet-stream:
          schema:
            type: string
            format: binary
    responses:
      '200':
        description: Part uploaded successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                partNumber:
                  type: integer
                  example: 1
                ETag:
                  type: string
                  example: '"abc123def456..."'
      '404':
        description: Session not found or expired
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
```

---

### 10. Complete Multipart Upload

**POST** `/uploads/{sessionId}/complete`

Complete a multipart upload session and finalize the object.

**OpenAPI Schema**:
```yaml
/uploads/{sessionId}/complete:
  post:
    tags:
      - Uploads
    summary: Complete multipart upload
    operationId: completeUpload
    parameters:
      - name: sessionId
        in: path
        required: true
        schema:
          type: string
          format: uuid
    responses:
      '200':
        description: Upload completed successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                objectId:
                  type: string
                  format: uuid
                  example: 550e8400-e29b-41d4-a716-446655440000
                s3Key:
                  type: string
                  example: org-acme/550e8400-e29b-41d4-a716-446655440000
      '400':
        description: Upload incomplete or invalid
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
      '404':
        description: Session not found
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
```

---

### 11. Health Check (Readiness)

**GET** `/health/ready`

Check if service is ready to accept requests (DB, Redis, S3 accessible).

**OpenAPI Schema**:
```yaml
/health/ready:
  get:
    tags:
      - Health
    summary: Readiness check
    operationId: readinessCheck
    responses:
      '200':
        description: Service is ready
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                  example: ok
                checks:
                  type: object
                  properties:
                    database:
                      type: string
                      example: ok
                    redis:
                      type: string
                      example: ok
                    s3:
                      type: string
                      example: ok
      '503':
        description: Service is not ready
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                  example: error
                checks:
                  type: object
                  properties:
                    database:
                      type: string
                      example: error
```

---

### 12. Health Check (Liveness)

**GET** `/health/live`

Check if service is alive (process running).

**OpenAPI Schema**:
```yaml
/health/live:
  get:
    tags:
      - Health
    summary: Liveness check
    operationId: livenessCheck
    responses:
      '200':
        description: Service is alive
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                  example: ok
```

---

## Components

### Schemas

```yaml
components:
  schemas:
    ObjectMetadata:
      type: object
      properties:
        id:
          type: string
          format: uuid
        namespace:
          type: string
        name:
          type: string
        s3Key:
          type: string
        contentType:
          type: string
        sizeBytes:
          type: integer
        checksum:
          type: string
          nullable: true
        customMetadata:
          type: object
          additionalProperties:
            type: string
          nullable: true
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
    
    NamespaceMetadata:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        displayName:
          type: string
          nullable: true
        quotaBytes:
          type: integer
          nullable: true
        usedBytes:
          type: integer
        objectCount:
          type: integer
        metadata:
          type: object
          nullable: true
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
    
    ErrorResponse:
      type: object
      properties:
        statusCode:
          type: integer
          example: 400
        message:
          type: string
          example: Validation failed
        error:
          type: string
          example: Bad Request
        details:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
                example: namespace
              constraint:
                type: string
                example: pattern mismatch
```

---

## Summary

- **12 Endpoints**: Object CRUD, signed URLs, namespace management, multipart uploads, health checks
- **OpenAPI 3.0.3**: Complete contract with schemas, validation, error responses
- **Authentication**: Required for all endpoints except health checks (mechanism TBD)
- **Pagination**: Supported for list operations (limit/offset)
- **Error Handling**: Consistent HTTP status codes and error schema

Ready to proceed to quickstart.md generation.
