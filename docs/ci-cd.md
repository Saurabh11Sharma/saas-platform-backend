# Continuous Integration and Delivery

## CI workflow

The GitHub Actions workflow in `.github/workflows/ci.yml` runs on pushes to `main`, pull requests targeting `main`, and manual dispatch.

It verifies the repository on the declared minimum Node.js version (22.12.0) and the current Node.js 26 LTS line. The workflow uses the npm version pinned in the root `package.json` and runs these gates:

1. TypeScript type-checking for configured workspaces.
2. Compilation/build for configured workspaces.
3. Tests for every workspace that defines a test script.
4. Repository formatting check.
5. npm dependency audit (high-severity threshold).
6. Runtime smoke checks: start the implemented Identity, Tenant, Project, and Billing services plus the API Gateway; verify each readiness endpoint; and verify the gateway reports those four services as healthy without exposing internal URLs.

The smoke test is intentionally limited to applications that currently exist and can start without external infrastructure. It does not claim that PostgreSQL, MongoDB, Redis, RabbitMQ, the planned web application, Notification, or Audit service are integration-tested.

## Dependency lockfile bootstrap

The repository currently has no committed npm lockfile. The workflow temporarily generates a lockfile, installs from it with `npm ci`, and uploads it as the `npm-lockfile-bootstrap` artifact. This allows CI validation to start, but dependency resolution is not reproducible across separate runs until that generated `package-lock.json` is reviewed and committed at the repository root.

After committing the lockfile, CI will automatically use `npm ci` directly. Dependency caching can then be enabled against the committed lockfile.

## Run the same checks locally

Use the Node.js/npm versions declared by the root `package.json`.

```bash
npm install --no-audit --no-fund
npm run typecheck
npm run build
npm test
npm run format:check
npm audit --audit-level=high
npm run smoke:services
```

Once `package-lock.json` is committed, use `npm ci` instead of `npm install` for clean, reproducible installs.

## CD / deployment status

Continuous deployment is not enabled yet. The repository does not currently contain a verified container build/deployment path for the implemented services or a configured target environment. Do not deploy from CI until Dockerfiles or another immutable packaging strategy, infrastructure definitions, environment-specific configuration, secrets, health checks, and an approval/release policy are in place.

The next delivery milestone is to commit the generated lockfile and make the CI workflow green. Container packaging and deployment can then be designed as a separate, gated release workflow without coupling deployment credentials to pull-request CI.
