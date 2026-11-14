# Continuous Integration and Delivery

## CI workflow

The GitHub Actions workflow at `.github/workflows/ci.yml` runs on pushes to `main`, pull requests targeting `main`, and manual dispatch. It is read-only and requires no deployment secrets.

### TypeScript and quality matrix

The `verify` job runs on the declared minimum Node.js version (22.12.0) and Node.js 26. It pins npm to 11.6.2 and third-party Actions to full commit SHAs. It uses the committed root `package-lock.json`, `npm ci`, and npm caching keyed by the lockfile.

Each matrix job runs:

1. Type-check every workspace that defines a `typecheck` script.
2. Compile every workspace that defines a `build` script.
3. Run tests for every workspace that defines a `test` script.
4. Verify repository formatting with Prettier.
5. Run `npm audit --audit-level=high`.
6. Start Identity, Tenant, Project, Billing, and the API Gateway as processes; verify readiness and gateway aggregation.

The configured tests use Node.js's built-in `node:test` runner through `tsx --test`. The current suite contains 20 unit tests (18 Identity and 2 Gateway). Identity coverage includes the `EmailAddress` value object, aggregate invariants, `PasswordHash` redaction, and `RegisterIdentity` application orchestration. The registration tests exercise outbound ports with test implementations; they do not validate a real password-hashing algorithm or a PostgreSQL adapter. PostgreSQL integration, RabbitMQ contract, Testcontainers, Supertest, browser end-to-end, and load tests are not currently wired into CI.

### Docker Compose build and runtime

The `container-smoke` job validates `compose.yaml`, builds the current application images from `infra/docker/node-service.Dockerfile`, and starts the full local stack with Docker Compose. Compose waits for PostgreSQL, MongoDB, Redis, RabbitMQ, the four backend services, and the Gateway to become healthy. The `smoke:compose` script then verifies all five application readiness endpoints and confirms that the Gateway sees all four implemented downstream services as healthy without exposing internal URLs. CI collects logs on failure and tears down containers and temporary volumes afterward.

The shared Dockerfile produces a separate image per service using build arguments. It builds with the committed lockfile, prunes development dependencies, copies only the selected compiled application into the runtime image, runs as the non-root `node` user, and defines a readiness health check.

### Current coverage boundaries

The runnable workspaces currently include the Gateway and four backend services. The planned Web, Notification, and Audit applications do not yet have runnable package manifests and are not represented as built or healthy containers. The gateway reports a degraded platform while Notification and Audit are absent.

Compose currently verifies that the database and broker containers start and become healthy, but the backend services do not yet establish persistence or RabbitMQ connections. The Identity workspace has no PostgreSQL driver, migration, or repository adapter, and its PasswordHasher port has no concrete implementation. The registration use case is therefore not yet a working HTTP or persisted account-creation flow. This is not yet a database integration, messaging integration, Testcontainers, contract, browser end-to-end, or load test.

## Run locally

Use Node.js 22.12.0 or newer and npm 11.6.2.

```bash
npm ci
npm run typecheck
npm run build
npm test
npm run format:check
npm audit --audit-level=high
npm run smoke:services

docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 240
npm run smoke:compose
docker compose ps
```

Stop the local stack with `docker compose down`. This retains persistent volumes. Use `docker compose down --volumes` only when intentionally deleting local database data. Default credentials are for local development only; override them through environment variables or a local `.env` file and never commit real secrets.

## CD / deployment status

Continuous deployment is deliberately not enabled. Docker images are currently built locally and in CI only; they are not pushed to a container registry. The repository has no configured deployment target or verified environment-specific infrastructure, secrets, approvals, and rollback path.

A future release workflow should publish immutable images and deploy them independently per service only after a target runtime and infrastructure-as-code configuration are chosen, health checks and rollback behavior are documented, and least-privilege credentials and approval policies are configured. Pull-request CI must remain secret-free and read-only.
