# Development Standards

## TypeScript and quality

- Enable strict TypeScript options; avoid any and unsafe casts.
- Validate untrusted input at HTTP and message boundaries.
- Keep functions focused and side effects explicit.
- CI runs typecheck, lint, tests, and build.
- Pin supported runtime/tool versions and update dependencies deliberately.

## Service structure

Organize each NestJS service by bounded context and separate domain, application, infrastructure, and interface concerns. Controllers do not contain business rules. ORM models do not leak into domain logic.

## API contracts

Version public APIs and event schemas. Publish OpenAPI documentation. Use consistent pagination, filtering, validation, and error envelopes. Make breaking changes explicit and support a migration window.

## Persistence

Each service owns migrations and persistence adapters. Use transactions for invariants within a service boundary. Add indexes based on query patterns and inspect important queries with EXPLAIN. Never use another service's database as an integration API.

## Messaging

Use durable queues/exchanges where required. Implement outbox/inbox and idempotency keys. Set retry limits, exponential backoff, and dead-letter routing. Include event ID, type, schema version, occurred-at timestamp, correlation ID, and causation ID. Do not put secrets or unnecessary personal data in messages.

## Security

Use least privilege and centralized secret management. Apply authorization in the service owning the resource. Protect against tenant-ID spoofing and insecure direct object references. Rate-limit sensitive endpoints and verify webhook signatures. Avoid logging credentials, tokens, or sensitive personal data.

## Testing

- Unit-test domain behavior without framework bootstrapping.
- Integration-test adapters against disposable real dependencies (Testcontainers where practical).
- Contract-test APIs and events.
- E2E-test critical journeys across web, gateway, and services.
- Test duplicate events, retries, timeouts, unauthorized tenant access, and partial outages.

## Pull requests

Each change includes a problem statement, design notes for non-trivial changes, tests, migration/event compatibility notes, and operational impact. CI must be green before merge.
