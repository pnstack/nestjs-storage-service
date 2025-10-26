# Tasks: Modern Storage Service for Microservices

**Input**: Design documents from `/specs/001-modern-storage-service/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/rest-api.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Tests**: Tests are NOT explicitly requested in the specification, so test tasks are omitted. Focus is on implementation and validation via manual testing and quickstart guide.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure per plan.md

- [ ] T001 Install NestJS dependencies: @nestjs/common, @nestjs/core, @nestjs/platform-express, @nestjs/config, @nestjs/typeorm, typeorm, pg, reflect-metadata
- [ ] T002 [P] Install AWS SDK v3 dependencies: @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
- [ ] T003 [P] Install Bull and Redis dependencies: @nestjs/bull, bull, ioredis
- [ ] T004 [P] Install validation dependencies: class-validator, class-transformer
- [ ] T005 [P] Install logging dependency: nestjs-pino, pino-http
- [ ] T006 [P] Install dev/test dependencies: @types/node, jest, @nestjs/testing, supertest
- [ ] T007 Create Docker Compose file with PostgreSQL, Redis, and LocalStack services in docker-compose.yml
- [ ] T008 Create environment configuration file template in .env.example with AWS, DB, Redis, and app config
- [ ] T009 Create LocalStack S3 initialization script in scripts/init-localstack.sh per quickstart.md
- [ ] T010 Configure TypeORM connection in src/app.module.ts with PostgreSQL settings from research.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T011 Create S3 client provider in src/common/providers/s3.provider.ts using NestJS DI pattern from research.md R2
- [ ] T012 [P] Create base configuration interface in src/common/configs/storage.config.ts with S3, database, and Redis settings
- [ ] T013 [P] Configure nestjs-pino logger module in src/common/logger/logger.module.ts with requestId correlation per research.md R6
- [ ] T014 Create TypeORM entities for Namespace in src/modules/storage/entities/namespace.entity.ts per data-model.md
- [ ] T015 [P] Create TypeORM entities for Object in src/modules/storage/entities/object.entity.ts per data-model.md
- [ ] T016 [P] Create TypeORM entities for AuditEvent in src/modules/storage/entities/audit-event.entity.ts per data-model.md
- [ ] T017 [P] Create TypeORM entities for UploadSession in src/modules/upload/entities/upload-session.entity.ts per data-model.md
- [ ] T018 Create database migration for all entities in src/migrations/###-create-storage-schema.ts
- [ ] T019 Create NamespaceGuard for namespace access control in src/common/guards/namespace.guard.ts per research.md R4
- [ ] T020 [P] Create global exception filter for consistent error responses in src/common/filters/http-exception.filter.ts
- [ ] T021 [P] Create validation pipe configuration in src/main.ts for class-validator DTOs
- [ ] T022 Create health check module with readiness/liveness endpoints in src/modules/health/health.module.ts and health.controller.ts per contracts (endpoints 11, 12)
- [ ] T023 Configure Swagger/OpenAPI in src/common/swagger/index.ts with base URL /api/v1

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Store and retrieve objects via signed links (Priority: P1) 🎯 MVP

**Goal**: Enable core value - store files with metadata, generate signed URLs for secure retrieval

**Independent Test**: Create namespace → create object with metadata → request signed download URL → verify access within validity window → verify metadata correctness

### Implementation for User Story 1

- [ ] T024 [P] [US1] Create CreateNamespaceDto in src/modules/storage/dto/create-namespace.dto.ts with validation per data-model.md Namespace entity
- [ ] T025 [P] [US1] Create NamespaceResponseDto in src/modules/storage/dto/namespace-response.dto.ts for API responses
- [ ] T026 [US1] Implement NamespaceService in src/modules/storage/services/namespace.service.ts with create, findByName, and quota enforcement methods
- [ ] T027 [US1] Implement POST /namespaces endpoint in src/modules/storage/controllers/namespace.controller.ts per contracts endpoint 6
- [ ] T028 [US1] Implement GET /namespaces/:name endpoint in src/modules/storage/controllers/namespace.controller.ts per contracts endpoint 7
- [ ] T029 [P] [US1] Create CreateObjectDto in src/modules/storage/dto/create-object.dto.ts with validation per data-model.md Object entity
- [ ] T030 [P] [US1] Create ObjectResponseDto in src/modules/storage/dto/object-response.dto.ts for API responses
- [ ] T031 [P] [US1] Create GenerateSignedUrlDto in src/modules/storage/dto/generate-signed-url.dto.ts with expiresIn validation
- [ ] T032 [US1] Implement StorageService.createObject in src/modules/storage/services/storage.service.ts: validate namespace, create DB record, generate S3 key, return signed upload URL per contracts endpoint 1
- [ ] T033 [US1] Implement StorageService.getObject in src/modules/storage/services/storage.service.ts: retrieve object metadata by ID per contracts endpoint 2
- [ ] T034 [US1] Implement StorageService.generateSignedUrl in src/modules/storage/services/storage.service.ts: generate pre-signed download URL using @aws-sdk/s3-request-presigner per contracts endpoint 3 and research.md R2
- [ ] T035 [US1] Implement POST /objects endpoint in src/modules/storage/controllers/storage.controller.ts per contracts endpoint 1
- [ ] T036 [US1] Implement GET /objects/:id endpoint in src/modules/storage/controllers/storage.controller.ts per contracts endpoint 2
- [ ] T037 [US1] Implement POST /objects/:id/signed-url endpoint in src/modules/storage/controllers/storage.controller.ts per contracts endpoint 3
- [ ] T038 [US1] Add AuditEventService.logEvent in src/modules/storage/services/audit-event.service.ts: create audit record with requestId, action (CREATE/READ), entityType, entityId, namespace, actor per data-model.md AuditEvent entity
- [ ] T039 [US1] Integrate audit logging in StorageService.createObject and generateSignedUrl methods to log CREATE and READ actions
- [ ] T040 [US1] Add error handling for S3 operations in StorageService per research.md R5: map NoSuchKey → 404, AccessDenied → 403, transient errors → 503
- [ ] T041 [US1] Add structured logging with requestId to all StorageService operations per research.md R6

**Checkpoint**: At this point, User Story 1 should be fully functional - can create namespaces, store objects, generate signed URLs, and audit events are logged

---

## Phase 4: User Story 2 - Manage objects by namespace/tenant (Priority: P2)

**Goal**: Enable multi-tenant isolation, list/search/delete objects within namespace boundaries

**Independent Test**: Create 2 namespaces with objects in each → list objects in namespace A → verify no objects from namespace B appear → delete object in namespace A → verify it becomes unavailable

### Implementation for User Story 2

- [ ] T042 [P] [US2] Create ListObjectsQueryDto in src/modules/storage/dto/list-objects-query.dto.ts with prefix, limit, offset validation per contracts endpoint 4
- [ ] T043 [P] [US2] Create PaginatedObjectsResponseDto in src/modules/storage/dto/paginated-objects-response.dto.ts with items, total, limit, offset fields
- [ ] T044 [US2] Implement StorageService.listByNamespace in src/modules/storage/services/storage.service.ts: query DB with namespace filter, support prefix/pagination, exclude soft-deleted per data-model.md Object indexes
- [ ] T045 [US2] Implement GET /namespaces/:namespace/objects endpoint in src/modules/storage/controllers/storage.controller.ts per contracts endpoint 4
- [ ] T046 [US2] Apply NamespaceGuard to GET /namespaces/:namespace/objects endpoint to enforce access control per research.md R4
- [ ] T047 [US2] Implement StorageService.deleteObject in src/modules/storage/services/storage.service.ts: soft delete (set deletedAt timestamp) per data-model.md Object entity
- [ ] T048 [US2] Implement DELETE /objects/:id endpoint in src/modules/storage/controllers/storage.controller.ts per contracts endpoint 5
- [ ] T049 [US2] Add audit logging for DELETE action in StorageService.deleteObject using AuditEventService.logEvent
- [ ] T050 [US2] Update NamespaceService to decrement usedBytes and objectCount on object deletion
- [ ] T051 [US2] Add namespace quota validation in StorageService.createObject: check usedBytes + sizeBytes ≤ quotaBytes per data-model.md Namespace entity, throw 403 if exceeded
- [ ] T052 [US2] Add structured logging for list and delete operations with namespace context

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - namespace isolation is enforced, objects can be listed/deleted within boundaries

---

## Phase 5: User Story 3 - Large file uploads with resiliency (Priority: P3)

**Goal**: Enable resumable multipart uploads for large files with integrity verification

**Independent Test**: Initiate upload → upload parts (simulate interruption) → resume and complete → verify object integrity (size and checksum match)

### Implementation for User Story 3

- [ ] T053 [P] [US3] Create InitiateUploadDto in src/modules/upload/dto/initiate-upload.dto.ts with namespace, name, contentType, expectedSizeBytes validation per contracts endpoint 8
- [ ] T054 [P] [US3] Create InitiateUploadResponseDto in src/modules/upload/dto/initiate-upload-response.dto.ts with sessionId, uploadId, expiresAt fields
- [ ] T055 [P] [US3] Create UploadPartResponseDto in src/modules/upload/dto/upload-part-response.dto.ts with partNumber, ETag fields
- [ ] T056 [P] [US3] Create CompleteUploadResponseDto in src/modules/upload/dto/complete-upload-response.dto.ts with objectId, s3Key fields
- [ ] T057 [US3] Implement UploadService.initiateUpload in src/modules/upload/services/upload.service.ts: call CreateMultipartUploadCommand, store UploadSession in DB per research.md R3
- [ ] T058 [US3] Implement UploadService.uploadPart in src/modules/upload/services/upload.service.ts: call UploadPartCommand, track partNumber and ETag in UploadSession.partsCompleted per research.md R3
- [ ] T059 [US3] Implement UploadService.completeUpload in src/modules/upload/services/upload.service.ts: call CompleteMultipartUploadCommand with all parts, create Object record, update UploadSession status to COMPLETED per research.md R3
- [ ] T060 [US3] Implement POST /uploads/initiate endpoint in src/modules/upload/controllers/upload.controller.ts per contracts endpoint 8
- [ ] T061 [US3] Implement PUT /uploads/:sessionId/parts/:partNumber endpoint in src/modules/upload/controllers/upload.controller.ts per contracts endpoint 9
- [ ] T062 [US3] Implement POST /uploads/:sessionId/complete endpoint in src/modules/upload/controllers/upload.controller.ts per contracts endpoint 10
- [ ] T063 [US3] Add checksum validation in UploadService.initiateUpload: set ChecksumAlgorithm to SHA256 in CreateMultipartUploadCommand per research.md R3
- [ ] T064 [US3] Add idempotency check in UploadService.initiateUpload: query for existing UploadSession with same namespace+name+IN_PROGRESS status, return existing session if found per research.md R5
- [ ] T065 [US3] Add session expiration check in UploadService.uploadPart and completeUpload: verify expiresAt > now(), throw 404 if expired
- [ ] T066 [US3] Create Bull queue for cleanup job in src/modules/upload/queues/upload-cleanup.queue.ts: abort expired upload sessions using AbortMultipartUploadCommand
- [ ] T067 [US3] Register cleanup job processor in src/modules/upload/processors/upload-cleanup.processor.ts to run every 6 hours
- [ ] T068 [US3] Add audit logging for upload initiation, part upload, and completion using AuditEventService
- [ ] T069 [US3] Add error handling for S3 multipart operations: map upload-specific errors per research.md R5
- [ ] T070 [US3] Add structured logging for all upload operations with sessionId and namespace context
- [ ] T071 [US3] Update NamespaceService to increment usedBytes when upload completes successfully

**Checkpoint**: All user stories should now be independently functional - resumable uploads work end-to-end with integrity validation

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and production readiness

- [ ] T072 [P] Add S3 client timeout configuration in s3.provider.ts: use AbortController with 30s timeout per research.md R5
- [ ] T073 [P] Add S3 client retry configuration in s3.provider.ts: set maxAttempts to 5, retryMode to adaptive per research.md R5
- [ ] T074 [P] Add request timeout middleware in src/common/middleware/timeout.middleware.ts: abort requests after 60s
- [ ] T075 [P] Create seed script in scripts/seed.ts per quickstart.md: create 2 test namespaces (org-demo, org-test) and sample objects
- [ ] T076 [P] Update README.md with quickstart instructions: prerequisites, Docker Compose setup, LocalStack initialization, API examples
- [ ] T077 [P] Generate Swagger/OpenAPI JSON schema and serve at /api endpoint
- [ ] T078 [P] Add custom metadata validation in CreateObjectDto: max 10 keys, each key max 100 chars, each value max 1000 chars per data-model.md
- [ ] T079 [P] Add MIME type allowlist validation in StorageService: check contentType against configurable allowlist per requirements FR-005
- [ ] T080 [P] Add size limit validation in CreateObjectDto and InitiateUploadDto: sizeBytes ≤ 104857600 (100 MB) per requirements FR-005
- [ ] T081 Add streaming support for large uploads in UploadService: use Node.js streams to avoid buffering full file per plan.md constraints
- [ ] T082 [P] Add health check for PostgreSQL in HealthController: test DB connection and return status
- [ ] T083 [P] Add health check for Redis in HealthController: test Redis connection and return status
- [ ] T084 [P] Add health check for S3 in HealthController: test S3 bucket access (ListBucketsCommand) and return status
- [ ] T085 Add Prometheus metrics endpoint in src/modules/metrics/metrics.controller.ts: expose request count, latency, error rate, queue depth
- [ ] T086 [P] Add integration with existing GraphQL schema in src/schema.graphql: add Object, Namespace, UploadSession types if GraphQL access is desired
- [ ] T087 Add performance optimization: add Redis caching for frequently accessed object metadata in StorageService.getObject with 5-minute TTL
- [ ] T088 [P] Run quickstart.md validation: execute all curl examples and verify responses match contracts
- [ ] T089 Security review: verify all endpoints use NamespaceGuard, no secrets in logs, all inputs validated
- [ ] T090 Code cleanup: remove unused imports, add TSDoc comments to public methods, format with Prettier

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-5)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P2): Can start after Foundational - Reuses entities/services from US1 but independently testable
  - User Story 3 (P3): Can start after Foundational - Reuses Object entity from US1 but independently testable
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### Within Each User Story

**User Story 1**:
- T024-T028 (Namespace DTOs, service, endpoints) can start in parallel after T014 (Namespace entity)
- T029-T031 (Object DTOs) can start in parallel after T015 (Object entity)
- T032-T037 (StorageService methods and endpoints) depend on T029-T031 (DTOs) and T011 (S3 provider)
- T038-T041 (Audit logging, error handling) depend on T032-T037 (core service methods)

**User Story 2**:
- T042-T043 (List/pagination DTOs) can start in parallel after T015 (Object entity)
- T044-T045 (List endpoint) depend on T042-T043 (DTOs)
- T046 (NamespaceGuard) depends on T019 (guard creation in foundational)
- T047-T049 (Delete functionality) depend on T015 (Object entity) and T038 (AuditEventService)
- T050-T052 (Quota enforcement, logging) depend on T026 (NamespaceService) and T032 (createObject)

**User Story 3**:
- T053-T056 (Upload DTOs) can start in parallel after T017 (UploadSession entity)
- T057-T062 (Upload service and endpoints) depend on T053-T056 (DTOs) and T011 (S3 provider)
- T063-T065 (Validation, idempotency, expiration) depend on T057-T059 (core upload methods)
- T066-T067 (Cleanup queue) depend on T017 (UploadSession entity)
- T068-T071 (Audit, error handling, logging, quota) depend on T057-T062 (upload endpoints)

### Parallel Opportunities

**Phase 1 (Setup)**: T002-T006 (all dependency installations) can run in parallel

**Phase 2 (Foundational)**:
- T012-T013 (config, logger) can run in parallel
- T014-T017 (all entity files) can run in parallel
- T020-T021 (exception filter, validation pipe) can run in parallel

**Within User Story 1**:
- T024-T025 (Namespace DTOs) can run in parallel
- T029-T031 (Object DTOs) can run in parallel

**Within User Story 2**:
- T042-T043 (List DTOs) can run in parallel

**Within User Story 3**:
- T053-T056 (Upload DTOs) can run in parallel

**Phase 6 (Polish)**: T072-T074, T075-T080, T082-T084, T086 can all run in parallel (different files)

**Different User Stories**: Once Foundational phase completes, US1, US2, US3 can be worked on in parallel by different team members

---

## Parallel Example: Foundational Phase

```bash
# Launch all entity creations together:
Task T014: "Create Namespace entity in src/modules/storage/entities/namespace.entity.ts"
Task T015: "Create Object entity in src/modules/storage/entities/object.entity.ts"
Task T016: "Create AuditEvent entity in src/modules/storage/entities/audit-event.entity.ts"
Task T017: "Create UploadSession entity in src/modules/upload/entities/upload-session.entity.ts"

# Launch config and logger together:
Task T012: "Create storage config in src/common/configs/storage.config.ts"
Task T013: "Configure nestjs-pino logger in src/common/logger/logger.module.ts"
```

## Parallel Example: User Story 1

```bash
# Launch all DTO creations for namespaces together:
Task T024: "Create CreateNamespaceDto in src/modules/storage/dto/create-namespace.dto.ts"
Task T025: "Create NamespaceResponseDto in src/modules/storage/dto/namespace-response.dto.ts"

# Launch all DTO creations for objects together:
Task T029: "Create CreateObjectDto in src/modules/storage/dto/create-object.dto.ts"
Task T030: "Create ObjectResponseDto in src/modules/storage/dto/object-response.dto.ts"
Task T031: "Create GenerateSignedUrlDto in src/modules/storage/dto/generate-signed-url.dto.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T010) - ~1-2 hours
2. Complete Phase 2: Foundational (T011-T023) - **CRITICAL** - ~4-6 hours
3. Complete Phase 3: User Story 1 (T024-T041) - ~6-8 hours
4. **STOP and VALIDATE**: 
   - Create namespace via POST /namespaces
   - Create object via POST /objects
   - Get signed URL via POST /objects/:id/signed-url
   - Upload file to signed URL
   - Download file from signed URL
   - Verify audit events logged
5. Deploy/demo if ready - **MVP is live!** 🎉

**Estimated MVP Time**: 12-16 hours for experienced NestJS developer

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (~6-8 hours)
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!) (~6-8 hours)
3. Add User Story 2 → Test independently → Deploy/Demo (~4-6 hours)
4. Add User Story 3 → Test independently → Deploy/Demo (~6-8 hours)
5. Add Polish → Production ready (~4-6 hours)

**Total Estimated Time**: 26-36 hours

### Parallel Team Strategy

With 3 developers:

1. Team completes Setup + Foundational together (~6-8 hours)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (T024-T041) - ~6-8 hours
   - **Developer B**: User Story 2 (T042-T052) - ~4-6 hours
   - **Developer C**: User Story 3 (T053-T071) - ~6-8 hours
3. Stories complete and integrate independently
4. Team tackles Polish together (T072-T090) - ~4-6 hours

**Parallel Estimated Time**: 16-22 hours wall-clock time

---

## Summary

- **Total Tasks**: 90 tasks
- **Setup**: 10 tasks
- **Foundational**: 13 tasks (BLOCKS all stories)
- **User Story 1** (P1 - MVP): 18 tasks
- **User Story 2** (P2): 11 tasks
- **User Story 3** (P3): 19 tasks
- **Polish**: 19 tasks

**Parallel Opportunities**: 32 tasks marked [P] can run in parallel within their phase

**Independent Test Criteria**:
- US1: Create namespace → create object → signed URL → upload/download → verify audit
- US2: Create 2 namespaces → list in each → verify isolation → delete → verify unavailable
- US3: Initiate upload → upload parts → complete → verify integrity (size/checksum)

**Suggested MVP Scope**: Phases 1-3 only (Setup + Foundational + User Story 1) = 41 tasks (~12-16 hours)

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Tests are NOT included as they were not explicitly requested in specification
- Manual testing via quickstart.md curl examples is the validation approach
- All file paths follow NestJS conventions from plan.md structure
- TypeORM migrations handle database schema setup
- LocalStack provides local S3 for development (no AWS costs)
