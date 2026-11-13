# Continuous Integration and Delivery

## CI workflow

The GitHub Actions workflow at `.github/workflows/ci.yml` runs on pushes to `main`, pull requests targeting `main`, and manual dispatch.

The workflow verifies the repository on both the declared minimum Node.js version (22.12.0) and Node.js 26. It pins npm to 11.6.2 and the third-party Actions to full commit SHAs. It uses the committed root `package-lock.json`, `npm ci`, and the npm cache keyed by that lockfile.

The quality gates are:

1. Type-check every workspace that defines a `typecheck` script.
2. Compile every workspace that defines a `build` script.
3. Run tests for every workspace that defines a `test` script.
4. Verify repository formatting with Prettier.
5. Run `npm audit --audit-level=high`.
6. Start the currently implemented Identity, Tenant, Project, Billing, and API Gateway applications, verify their readiness endpoints, and verify that the gateway health aggregation reports those four services as healthy without exposing internal service URLs.

The runtime smoke test intentionally covers the applications that currently exist and can start without external infrastructure. The planned web, Notification, and Audit workspaces do not currently have runnable package manifests at their expected paths, so they are not represented as passing builds or tests. The smoke test does not claim integration coverage for PostgreSQL, MongoDB, Redis, RabbitMQ, or browser journeys.

## Run the same checks locally

Use Node.js 22.12.0 or newer and npm 11.6.2 to match CI.

```bash
npm ci
npm run typecheck
npm run build
npm test
npm run format:check
npm audit --audit-level=high
npm run smoke:services
```

Run the smoke check after the build because it starts the compiled service entry points from their `dist` directories.

## CD / deployment status

Continuous deployment is deliberately not enabled yet. The repository does not currently have a verified Dockerfile/image build path for each runnable service or a configured deployment target. Deployment must not be inferred from a successful CI run.

The next release-engineering milestone is to define immutable image packaging for the gateway and each service, add and verify infrastructure as code and environment configuration, document health-check and rollback behavior, and establish least-privilege deployment credentials and an approval policy. Only then should a separate protected deployment workflow publish and deploy images. Pull-request CI must remain secret-free and read-only.
