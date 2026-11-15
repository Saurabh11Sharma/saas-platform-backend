# Delivery Roadmap

This roadmap distinguishes verified implementation from the intended target architecture. A checkbox is complete only when the corresponding behavior exists and the relevant CI or integration evidence is available.

## Verified baseline

- **npm workspaces and CI — implemented:** the committed lockfile, strict TypeScript builds, Prettier checks, high-severity dependency audit, and Node 22.12.0 / Node 26 matrix use `npm ci`.
- **Five runnable NestJS processes — implemented as service shells:** API Gateway, Identity, Tenant, Project, and Billing build and start independently. Identity now also has a framework-independent registration domain/application slice in progress; Gateway has bounded-timeout aggregate health behavior.
- **Liveness/readiness and gateway aggregate health — implemented:** process smoke tests and the Compose smoke test exercise readiness. Aggregate health reports availability without returning internal service URLs.
- **Local Docker Compose stack — implemented for the current runnable slice:** five application containers plus PostgreSQL, MongoDB, Redis, and RabbitMQ start in CI. Infrastructure health does not mean application persistence or messaging integration.
- **Identity email-address invariant — implemented:** framework-independent value object and focused Node test-runner coverage.
- **Identity registration application slice — in progress:** Identity aggregate, redaction-safe PasswordHash value object, RegisterIdentity use case, and IdentityRepository / PasswordHasher outbound ports are implemented and covered by 18 unit tests. There is no concrete hasher, PostgreSQL driver/migration/repository adapter, registration HTTP endpoint, or real database integration test.
- **PostgreSQL persistence, service migrations, and real database integration tests — planned:** no service repository adapter or migration is currently wired into the runnable services; Compose only starts PostgreSQL.
- **RabbitMQ publishing/consuming and versioned event contracts — planned:** RabbitMQ is selected and containerized, but applications do not connect to it.
- **Next.js Web, Notification, and Audit applications — planned:** no runnable workspaces or containers exist for these applications.
- **OpenTelemetry instrumentation and AWS deployment — planned:** no verified instrumentation, infrastructure-as-code deployment target, or CD workflow exists.

## Service implementation status

- **Gateway:** process health, readiness, and bounded-timeout aggregate downstream health checks are implemented. Public business routing, authentication/authorization policies, request correlation, and BFF composition remain future work.
- **Identity:** `EmailAddress`, the Identity aggregate, and PasswordHash value object are implemented. The framework-independent RegisterIdentity use case and its outbound ports are in progress and unit-tested. A concrete adaptive password hasher, Identity-owned PostgreSQL migration/repository, validated HTTP boundary, real database integration tests, and token/session lifecycle are still outstanding.
- **Tenant:** runnable process and health endpoints only. Tenant lifecycle, membership, role/permission checks, and tenant-isolation tests remain future work.
- **Project:** runnable process and health endpoints only. Project/task use cases, persistence, and tenant authorization remain future work.
- **Billing:** runnable process and health endpoints only. Subscription/entitlement workflows, webhook verification, idempotency, and provider adapters remain future work.
- **Web, Notification, Audit:** planned; do not represent them as runnable services.

## Next end-to-end milestone

**Complete one Identity registration vertical slice backed by an Identity-owned PostgreSQL database.**

Acceptance criteria:

1. Keep registration rules and application orchestration framework-independent; define only the repository ports needed by the use case.
2. Add an explicit, repeatable Identity-owned schema migration and repository adapter. No other service may read or write the Identity database.
3. Expose a validated Identity API boundary and implement safe password hashing and the required account/session behavior before describing registration as complete.
4. Add domain/application unit tests and integration tests against a disposable real PostgreSQL instance; execute those integration tests in CI.
5. Document configuration, migration/startup failure behavior, duplicate registration behavior, and local verification commands.

The existing `EmailAddress` value object and the new RegisterIdentity application slice are foundations, not a completed registration flow. Keep the first slice narrow and do not add persistence to every service at once.

## Platform maturity after the first vertical slice

- [ ] Add linting and broader static analysis without weakening strict TypeScript or existing gates.
- [ ] Validate environment configuration at process boundaries and document local-only defaults versus production secrets.
- [ ] Make readiness reflect required dependency connectivity once services actually use those dependencies; retain separate liveness checks.
- [ ] Add structured logs, correlation/trace propagation, and OpenTelemetry instrumentation across HTTP and messaging.
- [ ] Add versioned RabbitMQ contracts, then idempotent consumers and bounded retry/dead-letter behavior where a real use case requires them.
- [ ] Implement tenant authorization and isolation tests at the owning service boundary.
- [ ] Add Project and Billing workflows only after their contracts, persistence ownership, and tests are defined.
- [ ] Build the Next.js frontend with accessible loading, empty, and error states and end-to-end coverage.
- [ ] Add Notification and Audit only with real use cases, owned storage, privacy-aware retention, and operational tests.
- [ ] Define AWS infrastructure, release and rollback procedures only after an approved target, access model, budget, and security controls exist. Production CD remains disabled.
