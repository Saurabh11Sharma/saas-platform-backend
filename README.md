# SaaS Platform — Distributed Systems Reference Implementation

A full-stack, multi-tenant SaaS platform built as independently deployable microservices. The goal is to demonstrate production-grade engineering across frontend, backend, data, messaging, security, observability, testing, and cloud delivery.

## Technology stack

| Area | Technology | Responsibility |
|---|---|---|
| Web | Next.js App Router, React, TypeScript | SaaS user experience |
| Backend | NestJS, TypeScript | Independently deployable domain services |
| Edge | API Gateway / BFF | Routing, request policies, frontend composition |
| Relational data | PostgreSQL, Prisma | Service-owned transactional data |
| Document data | MongoDB | Audit/activity read models where appropriate |
| Cache | Redis | Caching, rate limits, distributed coordination |
| Messaging | RabbitMQ | Domain events and background work |
| Contracts | OpenAPI, versioned event schemas | Explicit service contracts |
| Runtime | Docker, Docker Compose | Reproducible local environment |
| Cloud | AWS | Container hosting, managed data, storage, secrets |
| CI/CD | GitHub Actions | Quality gates, image build, deployment |
| Testing | Jest, Supertest, Testcontainers, Playwright | Unit, integration, contract, e2e |
| Observability | OpenTelemetry, Prometheus, Grafana, Loki | Traces, metrics, logs |

RabbitMQ is the selected broker. Kafka is not added alongside it without a concrete streaming requirement; operating two brokers would add unnecessary complexity.

## High-level architecture

Next.js Web → NestJS API Gateway/BFF → independently deployable NestJS services → service-owned databases.
Services publish and consume integration events through RabbitMQ. PostgreSQL is the default transactional store; MongoDB is reserved for the audit/activity document read model; Redis is for cache and ephemeral coordination.

See [System Architecture](docs/architecture/system-architecture.md) and [Service Boundaries](docs/architecture/service-boundaries.md).

## Planned services

- **API Gateway / BFF:** edge routing, request correlation, throttling, authentication context propagation, and frontend composition.
- **Identity:** registration, login, password security, refresh-token rotation, sessions, and account security.
- **Tenant:** organizations, memberships, invitations, tenant lifecycle, roles, and permissions.
- **Project:** projects, tasks, assignments, and project lifecycle.
- **Billing:** plans, subscriptions, invoices, payment-provider integration, and webhook processing.
- **Notification:** email/in-app notifications, templates, preferences, and retryable delivery workers.
- **Audit:** security and business audit events, retention, and searchable activity history.

Each service owns its data and publishes versioned integration events. No service reads or writes another service's database.

## Repository layout

```text
apps/
  web/                         # Next.js frontend
  gateway/                     # NestJS API Gateway / BFF
  services/
    identity/
    tenant/
    project/
    billing/
    notification/
    audit/
packages/
  contracts/                   # Shared API/event schemas, not domain logic
  observability/               # OpenTelemetry setup
  config/                       # Shared tooling configuration
infra/
  docker/
  aws/
docs/
  architecture/
  runbooks/
```

## Architectural principles

1. Bounded contexts: each service owns a business capability and its domain model.
2. Database per service: no shared-table integration.
3. Hexagonal Architecture: domain and application logic do not depend on NestJS, Prisma, AWS, or RabbitMQ.
4. DDD where useful: aggregates, value objects, domain events, and ubiquitous language.
5. Reliable messaging: transactional outbox/inbox, idempotent consumers, retries, dead-letter queues, and schema versioning.
6. Tenant isolation: derive tenant identity from verified authentication context and enforce it at every data boundary.
7. Security by default: least privilege, secure password hashing, short-lived access tokens, rotating refresh tokens, and secrets management.
8. Resilience: explicit timeouts, bounded retries, circuit breakers where appropriate, health checks, and graceful shutdown.
9. Observability: correlated structured logs, metrics, and distributed traces across HTTP and messaging.
10. Test pyramid: domain, infrastructure-backed integration, contract, and end-to-end tests.

## Delivery roadmap

- [ ] Monorepo tooling, shared TypeScript configuration, linting, formatting, and CI
- [ ] Docker Compose infrastructure and local developer experience
- [ ] Next.js web shell and NestJS gateway health endpoints
- [ ] Identity: credentials, access/refresh tokens, rotation, revocation
- [ ] Tenant: organizations, memberships, invitations, RBAC
- [ ] Project: tenant-scoped project/task workflows
- [ ] RabbitMQ event contracts, outbox/inbox, retries, dead-letter handling
- [ ] Notification service and asynchronous delivery
- [ ] Audit service and MongoDB-backed activity read model
- [ ] Billing service and payment webhook idempotency
- [ ] OpenTelemetry, metrics, dashboards, logs, and runbooks
- [ ] Integration/contract/e2e tests, security checks, and load testing
- [ ] AWS infrastructure as code, container deployment, and release pipeline

## Development

The local environment will use Node.js LTS, npm workspaces, Docker Compose, PostgreSQL, MongoDB, Redis, and RabbitMQ. Exact commands will be documented with the first runnable implementation milestone.

Never commit real credentials. Production secrets belong in AWS Secrets Manager or an equivalent secret store.

## Engineering standards

See [Development Standards](docs/development-standards.md) and [Architecture Decision Records](docs/architecture/decisions/README.md).
