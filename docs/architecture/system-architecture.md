# System Architecture

## System context

The platform serves multiple organizations (tenants). Users authenticate, belong to one or more organizations, and access tenant-scoped capabilities according to membership and permissions.

The Next.js application communicates with the API Gateway over HTTPS. The gateway is the frontend-facing entry point: it applies edge policies, propagates verified request context, and composes responses when a screen needs multiple services.

## Runtime components

- Next.js: presentation, navigation, server components, and client interactions.
- NestJS API Gateway/BFF: public API boundary, routing, correlation IDs, rate limiting, and response composition.
- NestJS domain services: independently deployable capabilities with their own domain model, persistence adapters, and transport adapters.
- RabbitMQ: asynchronous integration events and background processing.
- PostgreSQL: transactional relational persistence, with ownership assigned per service.
- MongoDB: audit/activity read model where flexible event documents and query patterns justify it.
- Redis: cache, rate-limit counters, and ephemeral coordination.
- AWS: container runtime, managed databases, object storage, secrets, networking, and monitoring.

## Communication

Synchronous HTTP/REST is for immediate request-response interactions. Define OpenAPI contracts, explicit timeouts, and consistent errors. Avoid long synchronous chains.

RabbitMQ is for asynchronous integration events and background work. Events describe facts that happened and include stable IDs, schema versions, timestamps, correlation IDs, and causation IDs. Consumers must be idempotent.

## Reliability patterns

- Transactional outbox: commit business changes and outgoing event records in one local transaction; publish asynchronously.
- Inbox/deduplication: record processed message IDs to prevent duplicate effects.
- Retry transient failures with bounded exponential backoff; route poison messages to dead-letter queues.
- Use saga/process-manager workflows for business processes spanning services.
- Design for at-least-once delivery and idempotent effects; do not claim global exactly-once delivery.

## Data ownership

Each service owns its database and migrations. Other services must not query its tables directly. Required data is obtained through a documented API or propagated through events into a local read model.

PostgreSQL is the default transactional store. MongoDB is reserved for audit/activity documents where its model is useful; it is not a second general-purpose database for every service. Redis is never the source of truth for durable business records.

## Security and tenant isolation

- Authenticate at the gateway and verify credentials at service trust boundaries as appropriate.
- Never trust a client-supplied tenant ID by itself.
- Resolve active tenant from authenticated membership and authorize every operation against it.
- Enforce tenant scope in repositories and database constraints; consider PostgreSQL row-level security as defense in depth.
- Hash passwords with a modern adaptive algorithm.
- Rotate refresh tokens, detect reuse, revoke sessions, and avoid storing raw refresh tokens.
- Use least-privilege service identities, TLS, secret rotation, and audit security-sensitive actions.

## Architecture inside a service

Dependency direction:

Inbound adapter (HTTP/message) → application use case → domain model.
Application/domain define outbound ports; infrastructure adapters implement them (Prisma, RabbitMQ, AWS, Redis).

NestJS modules and dependency injection are delivery mechanisms. Domain rules must be testable without booting NestJS or connecting infrastructure.

## Observability and operations

Propagate trace context across HTTP and message boundaries. Emit structured logs without credentials or sensitive payloads. Instrument HTTP, database, and message operations with OpenTelemetry. Provide liveness/readiness checks, queue-depth alerts, latency/error dashboards, and runbooks.

## Deployment

Build one immutable container image per deployable application/service. Deploy independently with health checks, resource limits, graceful shutdown, rolling or blue/green rollout, and backward-compatible database/event changes. AWS infrastructure will be codified; environment-specific configuration stays outside images.

## Avoiding premature complexity

Microservices are an explicit architecture and portfolio objective. Keep service count limited to meaningful bounded contexts, automate local startup, and introduce distributed patterns where they solve demonstrated problems. Do not split every entity into a service.
