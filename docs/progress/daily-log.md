# Daily Engineering Log

## 2026-11-13 — Morning feature increment (08:30 IST)

- **Focus:** Establish the first Identity-domain input invariant for email addresses.
- **Implemented:** Added an immutable `EmailAddress` value object that trims and lowercases addresses, validates common ASCII dot-atom local parts and DNS domain labels, enforces length limits, compares normalized values, and raises a generic domain error without echoing the supplied address.
- **Files changed:**
  - `apps/services/identity/src/domain/email-address.ts`
  - `apps/services/identity/src/domain/email-address.spec.ts`
  - `apps/services/identity/package.json`
- **Code commits:**
  - `39a0e39048f15f094937e0d41f923e8c201b85ea` — add the value object
  - `d96c91740b8ccc996795223142e5fa31dda3ce46` — add focused domain tests
  - `be904c19717a32298139cf140c7328c8467d8522` — add the Identity test script
- **Validation:** Not executed in this run. The GitHub integration used here can read and commit repository files but does not provide a shell to install dependencies or run the test/typecheck commands. Added test command: `npm run test --workspace=@saas/identity-service`.
- **Blockers / unverified:** Test and TypeScript results remain unverified. This is a domain primitive only; registration, password hashing, persistence, and an HTTP registration endpoint remain future work. The accepted syntax is intentionally a practical ASCII subset, not full RFC 5322 support.

## 2026-11-13 — Service and API increment (11:30 IST)

- **Focus:** Harden the API Gateway's platform-health aggregation boundary without moving domain logic into the gateway.
- **Implemented:** The gateway still checks each independently deployable service's versioned readiness endpoint with a 1.5-second timeout, but its public aggregate response now returns only each service's name and availability status. Internal service base URLs are no longer exposed. Non-success HTTP responses and network/timeout failures are reported as unavailable, and the aggregate status becomes degraded when any service is unavailable.
- **Files changed:**
  - `apps/gateway/src/platform-health.controller.ts`
  - `apps/gateway/src/platform-health.controller.spec.ts`
  - `apps/gateway/package.json`
- **Code commits:**
  - `4d59ab667ddf18c0d4fb83746567927a3fb81330` — remove internal URLs from the aggregate health response
  - `7dde8ce5419996b5652e56f928c16d5256606c9b` — add focused health aggregation contract tests
  - `6f28b5678fdeccc8964f1ac8bb97e33102782e66` — add the gateway test script
- **Validation:** Added Node.js test-runner coverage for all-healthy services, non-success responses, network failures, readiness paths, and response URL redaction. Not executed in this run because the GitHub integration provides repository read/write operations but no shell for dependency installation or test execution. Run with `npm run test --workspace=@saas/gateway`.
- **Blockers / unverified:** Test and TypeScript results remain unverified until the repository is run locally or in CI. No live service calls or deployments were performed.

## 2026-11-13 — CI baseline and runtime verification

- **Focus:** Establish a reproducible GitHub Actions quality gate for the implemented backend applications.
- **Implemented:** Added the root test and service-smoke scripts, a GitHub Actions workflow for Node.js 22.12.0 and Node.js 26, a committed npm lockfile, npm lockfile-keyed caching, high-severity dependency auditing, and a runtime smoke test that starts Identity, Tenant, Project, Billing, and the API Gateway. The smoke test verifies each readiness endpoint and confirms the gateway reports the four implemented services healthy without exposing internal service URLs. Repository files were normalized using the existing Prettier configuration. Added `docs/ci-cd.md` and updated README development commands and roadmap status.
- **Files / workflow paths:** `.github/workflows/ci.yml`, `package-lock.json`, `package.json`, `scripts/ci/smoke-services.mjs`, `docs/ci-cd.md`, `README.md`, plus the 26 existing files normalized by Prettier.
- **Key commits:**
  - `e11420c0d4b0812757c0602bbd6dddd1a9fb585d` — add backend service startup smoke check
  - `778f43b5790f1734aa48c0ee9155f2d5aa3b3728` — configure explicit local downstream URLs for the gateway smoke check
  - `d7e8427de984ce6192b7ee4d983fdfd8085bc246` — add root test and smoke scripts
  - `f96b22a872a9de1072e2dee0dab578946bd8511c` — add the initial Node matrix CI workflow
  - `eebe6d6a88d724a6d5a7dee17cea77092d965e97` — normalize formatting and commit the npm lockfile
  - `9b44952508add6da6966c2a45f9474fb413c7b91` — merge the final CI/documentation pull request
- **Validation:** Permanent CI pull-request run [#6](https://github.com/Saurabh11Sharma/saas-platform-backend/actions/runs/43409726848) passed on both Node versions. Main push run [#7](https://github.com/Saurabh11Sharma/saas-platform-backend/actions/runs/43409847338) also passed on both matrix jobs. Each job successfully installed with `npm ci`, type-checked, compiled, ran 7 tests (2 Gateway and 5 Identity), passed Prettier, and passed `npm audit --audit-level=high` with 0 vulnerabilities. Both jobs started all five applications and passed readiness checks; the gateway aggregate reported Identity, Tenant, Project, and Billing healthy. The main push run's two jobs and every step completed successfully.
- **Coverage boundaries:** The runnable workspaces currently include the Gateway and four backend services. The planned Web, Notification, and Audit workspaces are not yet runnable package implementations. The smoke check does not replace database/message-broker integration tests, browser e2e tests, or Testcontainers coverage.
- **CD / blockers:** No deployment workflow was created because verified per-service container packaging and a deployment target are not yet present. Branch-protection settings could not be inspected or changed through the connected GitHub integration (the read endpoint returned HTTP 403); required status checks may still need to be configured by a repository administrator. Do not describe deployment or branch-protection enforcement as enabled.
- **Next priority:** Add verified Docker packaging and local compose orchestration for the currently runnable services, then design a separately protected deployment workflow only after an actual target, environment configuration, health/rollback behavior, and least-privilege credentials are defined.


## 2026-11-13 — Containerization and Docker Compose CI

- **Focus:** Package the currently runnable backend applications as independent containers and verify the full local stack in GitHub Actions.
- **Implemented:** Added a shared multi-stage Dockerfile parameterized by service workspace, path, port, and entry point. Each application is built independently from the committed lockfile; the runtime stage contains compiled output and production dependencies, runs as the non-root `node` user, and has a readiness health check. Extended Compose with Gateway, Identity, Tenant, Project, and Billing containers alongside PostgreSQL, MongoDB, Redis, and RabbitMQ. Local application and infrastructure ports bind to loopback by default. Added a Compose smoke test and a CI job that validates Compose configuration, builds/starts the stack, verifies all application readiness endpoints and gateway aggregation, collects logs on failure, and removes CI-only volumes.
- **Files changed:** `.dockerignore`, `.github/workflows/ci.yml`, `README.md`, `compose.yaml`, `docs/ci-cd.md`, `infra/docker/node-service.Dockerfile`, `package.json`, `scripts/ci/smoke-compose.mjs`.
- **Key change commits:** `625bad1d22777704fce29ae70a6edcac5bb5501e` (multi-stage Dockerfile), `9878994846978d326a88d87e39aeb42051d5c118` (Compose application containers), `acc09c468b043380b6bc7ef893877eb1726e0dc7` (Docker CI job), `d506d75f2df957c1c9ca13e737ae75cf45de4c42` (full README restoration and local Compose instructions).
- **Validation:** Pull request [#3](https://github.com/Saurabh11Sharma/saas-platform-backend/pull/3), CI run [#17](https://github.com/Saurabh11Sharma/saas-platform-backend/actions/runs/43412235440), for commit `d506d75f2df957c1c9ca13e737ae75cf45de4c42` completed successfully. Both Node 22.12.0 and Node 26 jobs passed locked installation, type-check, build, all 7 configured tests, Prettier, high-severity npm audit, and direct-process startup smoke checks. The Docker Compose job passed `docker compose config --quiet`, built and started all five application containers and four infrastructure containers, waited for all health checks, passed the Identity/Tenant/Project/Billing/Gateway readiness checks, and confirmed gateway aggregate health. CI cleanup stopped and removed containers and temporary volumes.
- **Coverage boundaries:** Notification, Audit, and Web are still planned and are not represented as runnable containers. The four application services do not yet connect to the databases or RabbitMQ; infrastructure container health is not persistence or messaging integration. No registry publishing, cloud deployment, or CD is enabled.
- **Follow-up:** Next highest-value step is real service-owned PostgreSQL integration for one bounded context, including migrations and Testcontainers-backed repository/application tests. Do not connect all services to a shared database; each service must own its database and migrations.
- **Review note:** The original README content was restored after an intermediate formatting attempt reduced its contents. The final PR diff retains the full architecture, roadmap, service descriptions, and engineering standards, with only the intended container-development additions.
