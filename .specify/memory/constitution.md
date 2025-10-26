<!--
Sync Impact Report

- Version change: N/A → 1.0.0
- Modified principles:
  - [PRINCIPLE_1_NAME] → Security & Secrets Hygiene (NON-NEGOTIABLE)
  - [PRINCIPLE_2_NAME] → Contract-First APIs & Documentation
  - [PRINCIPLE_3_NAME] → Test-First Delivery & Coverage Gates
  - [PRINCIPLE_4_NAME] → Observability & Operations Readiness
  - [PRINCIPLE_5_NAME] → Reliability, Performance & Scalability
- Added sections:
  - Security & Compliance Constraints
  - Development Workflow & Quality Gates
- Removed sections:
  - None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (aligned; no change required)
  - ✅ .specify/templates/spec-template.md (aligned; no change required)
  - ✅ .specify/templates/tasks-template.md (aligned; no change required)
  - ⚠ .specify/templates/commands/*.md (directory not found; plan-template references it)
  - ✅ README.md (referenced in Governance as runtime guidance; no edits needed)
- Follow-up TODOs:
  - TODO(RATIFICATION_DATE): original adoption date unknown — maintainers to set.
  - Create .specify/templates/commands/plan.md or update plan-template note.
-->

# NestJS Storage Service Constitution

## Core Principles

### Security & Secrets Hygiene (NON-NEGOTIABLE)
All credentials and sensitive config MUST be supplied via environment variables (.env, CI
secrets) and NEVER committed to the repository. AWS IAM permissions MUST follow least
privilege. S3 buckets MUST enforce encryption at rest and blocking public access. File
uploads MUST enforce explicit allowlists for MIME types and size limits; user inputs MUST be
validated and sanitized. Access to objects MUST use signed URLs or authenticated gateways.
Logs MUST NOT contain secrets or PII.

### Contract-First APIs & Documentation
OpenAPI (Swagger) docs and GraphQL schema are source-of-truth contracts. Any change to
request/response shapes or schema types MUST update documentation in the same PR. Backward
incompatible contract changes MUST trigger a MAJOR release and include a migration note.
Errors MUST use consistent codes/messages; deprecations MUST be announced and preserved for
at least one MINOR version.

### Test-First Delivery & Coverage Gates
Each change MUST include unit tests for services/utils and, when relevant, e2e tests for
core flows (e.g., upload → store → retrieve). Minimum coverage gate: lines ≥ 80%, branches ≥
70%. Tests MUST run in CI for PRs and pass before merge. Where feasible, write tests to
reproduce the bug or define the new contract before implementation.

### Observability & Operations Readiness
Logs MUST be structured (JSON) and include a correlation id (requestId) across request
lifecycles. Health endpoints MUST be exposed and used in readiness/liveness checks.
Operational metrics (requests, latency, error rates, queue depth) SHOULD be collected; when
OpenTelemetry is enabled, trace context MUST propagate across async boundaries.

### Reliability, Performance & Scalability
Uploads MUST be streamed to avoid loading whole files into memory. External calls (S3,
Redis, queues) MUST implement timeouts, retries with backoff, and idempotency where
applicable (e.g., idempotency keys for multi-part uploads). Background jobs (Bull) MUST have
dead‑letter handling. Target gates: metadata endpoints p95 < 200ms under nominal load; upload
paths MUST stream and avoid OOM at 100MB file size. Hot paths MUST avoid blocking I/O on the
event loop.

## Security & Compliance Constraints
Configuration MUST follow 12‑factor principles. Data in transit MUST use TLS. S3 encryption
at rest MUST be enabled (AES‑256 or KMS). Access logs SHOULD be retained according to the
organization’s policy. Secrets management MUST use environment variables or a vault solution
in production. Privacy: do not log file contents or user identifiers beyond what is strictly
necessary for operations and debugging.

## Development Workflow & Quality Gates
- PRs MUST pass: lint, type-check, unit tests, and required e2e smoke tests.
- Commit messages SHOULD follow Conventional Commits.
- API or schema changes MUST include updated Swagger/GraphQL artifacts and a changelog entry.
- Releases follow SemVer: MAJOR for breaking changes, MINOR for features, PATCH for fixes.
- CI MUST run on every PR; main branch MUST remain releasable.

## Governance
This constitution supersedes prior undocumented practices. Amendments require a PR that:
1) describes the change and rationale, 2) updates this file, 3) includes a Sync Impact
Report (as HTML comment at top), and 4) links any migration steps required.

Versioning policy for governance changes follows SemVer:
- MAJOR: Backward-incompatible principle removal/redefinition.
- MINOR: New principle/section or materially expanded guidance.
- PATCH: Clarifications/wording/typos with no semantic change.

Compliance reviews MUST occur before each release and at least quarterly. Reviewers MUST
check feature plans’ “Constitution Check” gates are aligned with principles above. For
runtime development guidance and project overview, see README.md.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date unknown | **Last Amended**: 2025-10-25
