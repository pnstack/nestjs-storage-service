# Implementation Plan: Modern Storage Service for Microservices

**Branch**: `001-modern-storage-service` | **Date**: 2025-10-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-modern-storage-service/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a modern storage service for microservices that enables secure object storage with signed URLs, namespace isolation, resumable uploads, and metadata management. Technical approach: NestJS service with AWS S3 backend, OpenAPI/GraphQL contracts, Redis caching, Bull queues for background jobs, and structured logging.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 18+ (matches existing project .nvmrc)  
**Primary Dependencies**: NestJS 10.x, AWS SDK v3 for S3, Bull (queue), Redis, class-validator, class-transformer, TypeORM, PostgreSQL  
**Storage**: AWS S3 for object storage; PostgreSQL for metadata (object records, custom key-values, audit events); Redis for caching and queue state  
**Testing**: Jest (unit), Supertest (e2e), existing project test setup  
**Target Platform**: Linux server / containerized (Docker)  
**Project Type**: Single backend service (NestJS API)  
**Performance Goals**: Metadata endpoints p95 < 200ms; signed-link generation near-instant; stream uploads to avoid OOM at 100MB files; support 1000 req/s under load  
**Constraints**: Must stream uploads; external calls (S3, Redis, PostgreSQL) need timeouts/retries; idempotency for uploads; TLS in transit; S3 encryption at rest  
**Scale/Scope**: Multi-tenant with namespace isolation; support 10k+ namespaces; 100MB file size limit initially; expandable to larger files with multipart

**Decision Log** (resolved from research.md):
- Metadata persistence: PostgreSQL (rich queries, audit logs, JSON columns for custom metadata)
- Local development: LocalStack for S3 emulation
- Resumable uploads: S3 multipart API with UploadSession entity in PostgreSQL
- Logging: nestjs-pino for structured JSON with requestId correlation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Security & Secrets Hygiene (NON-NEGOTIABLE)
- [x] AWS credentials via environment variables (.env, CI secrets)
- [x] S3 buckets enforce encryption at rest (AES-256/KMS)
- [x] S3 buckets block public access
- [x] File uploads enforce MIME type allowlist and size limits
- [x] User inputs validated and sanitized
- [x] Objects accessed via signed URLs or authenticated gateways
- [x] Logs do not contain secrets or PII

### Contract-First APIs & Documentation
- [x] OpenAPI (Swagger) and/or GraphQL schema as source-of-truth
- [x] Docs updated in same PR as contract changes
- [x] Breaking changes trigger MAJOR release + migration note
- [x] Consistent error codes/messages across endpoints
- [x] Deprecations announced and preserved for one MINOR version

### Test-First Delivery & Coverage Gates
- [x] Unit tests for services/utils
- [x] E2e tests for core flows (upload → store → retrieve)
- [x] Coverage: lines ≥ 80%, branches ≥ 70%
- [x] Tests run in CI; must pass before merge

### Observability & Operations Readiness
- [x] Structured (JSON) logging with correlation id (requestId)
- [x] Health endpoints for readiness/liveness checks
- [x] Operational metrics (requests, latency, errors, queue depth) collected
- [x] Trace context propagation across async boundaries when OpenTelemetry enabled

### Reliability, Performance & Scalability
- [x] Uploads streamed (no full file in memory)
- [x] External calls (S3, Redis, queues) have timeouts, retries with backoff, idempotency
- [x] Background jobs (Bull) have dead-letter handling
- [x] Target: metadata endpoints p95 < 200ms under nominal load
- [x] Target: upload paths stream and avoid OOM at 100MB file size
- [x] Hot paths avoid blocking I/O on event loop

**Gate Status**: PASS (all constitution requirements aligned with feature design)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── modules/
│   ├── storage/       # Core storage module (objects, namespaces, signed URLs)
│   │   ├── storage.controller.ts
│   │   ├── storage.service.ts
│   │   ├── storage.module.ts
│   │   ├── dto/
│   │   └── entities/
│   └── upload/        # Upload module (resumable uploads, validation)
│       ├── upload.controller.ts
│       ├── upload.service.ts
│       ├── upload.module.ts
│       └── utils/
├── common/
│   ├── configs/
│   ├── logger/
│   └── swagger/
├── types/
└── utils/

tests/
├── unit/
├── integration/
└── e2e/
```

**Structure Decision**: Single NestJS backend project. Existing structure in `src/modules/storage` and `src/modules/upload` will be expanded with new entities, DTOs, and services for namespace isolation, metadata, audit events, and resumable uploads.

## Complexity Tracking

> No constitution violations; complexity tracking table not needed.
