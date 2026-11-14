# SaaS Platform — Distributed Systems Reference Implementation

A TypeScript SaaS platform repository being developed toward an independently deployable, multi-tenant microservices architecture. The current runnable slice is the NestJS API Gateway plus Identity, Tenant, Project, and Billing service processes, packaged independently and exercised by GitHub Actions. The web application, business APIs, PostgreSQL persistence, RabbitMQ integration, audit read model, OpenTelemetry instrumentation, and AWS deployment are not implemented yet; see the [delivery roadmap](docs/roadmap.md) for verified status.

## Target technology stack

| Area            | Technology                               | Responsibility                                    |
| --------------- | ---------------------------------------- | ------------------------------------------------- |
| Web             | Next.js App Router, React, TypeScript    | SaaS user experience                              |
| Backend         | NestJS, TypeScript                       | Independently deployable domain services          |
| Edge            | API Gateway / BFF                        | Routing, request policies, frontend composition   |
| Relational data | PostgreSQL, Prisma                       | Service-owned transactional data                  |
| Document data   | MongoDB                                  | Audit/activity read models where appropriate      |
| Cache           | Redis                                    | Caching, rate limits, distributed coordination    |
| Messaging       | RabbitMQ                                 | Domain events and background work                 |
| Contracts       | OpenAPI, versioned event schemas         | Explicit service contracts                        |
| Runtime         | Docker, Docker Compose                   | Reproducible local environment                    |
| Cloud           | AWS                                      | Container hosting, managed data, storage, secrets |
| CI/CD           | GitHub Actions                           | CI gates; deployment not configured               |
| Testing         | node:test via tsx; more planned          | Unit tests now; integration/e2e planned           |
| Observability   | OpenTelemetry, Prometheus, Grafana, Loki | Traces, metrics, logs                             |

The table describes the target stack, not a claim that every component is integrated. Current implementation and validation status are tracked in the [delivery roadmap](docs/roadmap.md). RabbitMQ is the selected broker. Kafka is not added alongside it without a concrete streaming requirement; operating two brokers would add unnecessary complexity.

## High-level architecture

Next.js Web → NestJS API Gateway/BFF → independently deployable NestJS services → service-owned databases.
Services publish and consume integration events through RabbitMQ. PostgreSQL is the default transactional store; MongoDB is reserved for the audit/activity document read model; Redis is for cache and ephemeral coordination.

See [System Architecture](docs/architecture/system-architecture.md) and [Service Boundaries](docs/architecture/service-boundaries.md).

## Service boundaries and current implementation status

- **API Gateway / BFF — partial:** a runnable NestJS process with liveness/readiness endpoints and aggregate downstream health checks. Public business routing, authentication context, throttling, and frontend composition are not implemented.
- **Identity — foundation:** a runnable NestJS process and a framework-independent `EmailAddress` value object with unit tests. Registration, password hashing, sessions, tokens, persistence, and authentication endpoints are not implemented.
- **Tenant — service shell:** a runnable NestJS process with health endpoints; tenant lifecycle, memberships, roles, authorization, and persistence are not implemented.
- **Project — service shell:** a runnable NestJS process with health endpoints; project/task APIs and persistence are not implemented.
- **Billing — service shell:** a runnable NestJS process with health endpoints; subscription workflows, provider integration, and persistence are not implemented.
- **Web, Notification, and Audit — planned:** no runnable workspace or container is present yet.

The intended ownership model remains service-owned data and versioned integration events. No current service-to-service database access is implemented; persistence and messaging integrations remain future work.

## Repository layout

```text
apps/
  gateway/                     # NestJS API Gateway / BFF
  services/
    identity/                  # NestJS service + EmailAddress domain primitive
    tenant/                    # NestJS service shell
    project/                   # NestJS service shell
    billing/                   # NestJS service shell
infra/
  docker/                      # Node service image and local PostgreSQL setup
docs/
  architecture/
    decisions/
  progress/
scripts/
  ci/
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

- [x] npm workspaces, shared TypeScript configuration, Prettier formatting, lockfile, and CI build/test/smoke baseline
- [ ] Linting and broader static analysis
- [x] Docker Compose infrastructure and local developer experience for the five runnable NestJS processes
- [x] NestJS liveness/readiness endpoints and gateway platform-health aggregation
- [ ] Next.js web shell
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

See the [detailed delivery roadmap](docs/roadmap.md) for the current implementation boundary, acceptance criteria, and next vertical slice.

## Containerized local runtime

The local Compose stack builds independent containers for the currently runnable API Gateway, Identity, Tenant, Project, and Billing applications. It also starts PostgreSQL, MongoDB, Redis, and RabbitMQ with container health checks.

```bash
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 240
docker compose ps
npm run smoke:compose
```

The applications use separate images built from `infra/docker/node-service.Dockerfile`. The runtime stage contains compiled application output and production dependencies, runs as the unprivileged `node` user, and defines a readiness health check. Host ports are bound to `127.0.0.1` by default. Local development credentials can be overridden with environment variables or a local `.env` file; never reuse the defaults outside a local development environment.

The Web, Notification, and Audit applications are not runnable implementations yet and are not included in Compose. The gateway therefore reports a degraded platform while Notification and Audit are unavailable. The current backend applications do not yet connect to PostgreSQL, MongoDB, Redis, or RabbitMQ. Compose verifies infrastructure/container startup and application readiness, not persistence or messaging integration.

Stop the stack with `docker compose down`. Persistent volumes are retained. Use `docker compose down --volumes` only when you intend to delete local database data.

## Development

Use Node.js 22.12.0 or newer and npm 11.6.2 for the same toolchain as CI. Install the committed dependency graph and run the current backend verification suite:

```bash
npm ci
npm run typecheck
npm run build
npm test
npm run format:check
npm audit --audit-level=high
npm run smoke:services
```

The smoke test starts the implemented Identity, Tenant, Project, Billing, and API Gateway applications and checks their readiness and gateway aggregation. It does not require database or broker containers. See [CI and delivery](docs/ci-cd.md) for workflow coverage and the current deployment status.

Never commit real credentials. Production secrets belong in AWS Secrets Manager or an equivalent secret store.

## Engineering standards

See [Development Standards](docs/development-standards.md) and [Architecture Decision Records](docs/architecture/decisions/README.md).
