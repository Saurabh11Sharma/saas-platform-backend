# SaaS Platform

A production-minded, full-stack, multi-tenant SaaS platform built with **Next.js**, **NestJS**, and **TypeScript**.

> This repository is being developed incrementally. The first milestone establishes the monorepo, local infrastructure, API foundation, and web application shell.

## Architecture

- **Web:** Next.js App Router, React, TypeScript
- **API:** NestJS, TypeScript, REST, OpenAPI
- **Data:** PostgreSQL and Prisma
- **Cache:** Redis
- **Messaging:** RabbitMQ
- **Local infrastructure:** Docker Compose
- **Quality:** ESLint, Prettier, Jest, Supertest, GitHub Actions

## Repository layout

```text
apps/
  api/                 # NestJS application
  web/                 # Next.js application
packages/
  config/              # Shared tooling configuration (future)
  contracts/           # Shared API contracts (future)
infra/
  docker/              # Local infrastructure
docs/
  architecture/        # Architecture decisions and diagrams
```

## Getting started

### Prerequisites

- Node.js 22 or newer
- npm 10 or newer
- Docker Desktop with Docker Compose

### Install

```bash
npm install
cp .env.example .env
docker compose up -d postgres redis rabbitmq
npm run dev
```

- Web application: http://localhost:3000
- API: http://localhost:4000/api/v1
- API documentation: http://localhost:4000/docs
- RabbitMQ management: http://localhost:15672 (guest / guest)

## Development principles

1. Keep domain rules independent from framework and infrastructure concerns.
2. Enforce tenant boundaries at the application and persistence layers.
3. Validate all external input at system boundaries.
4. Make asynchronous workflows observable, retryable, and idempotent.
5. Test business behavior, API contracts, persistence, and critical user journeys.
6. Document significant architectural decisions in `docs/architecture/decisions`.

## Roadmap

- [x] Monorepo foundation with Next.js and NestJS
- [x] Local PostgreSQL, Redis, and RabbitMQ infrastructure
- [ ] Authentication, refresh-token rotation, and session management
- [ ] Organizations, tenant isolation, RBAC, and audit logging
- [ ] Projects and task-management domain
- [ ] Domain events and asynchronous notification processing
- [ ] Subscription and billing integration
- [ ] Unit, integration, and end-to-end test coverage
- [ ] CI quality gates, container builds, and AWS deployment

## Security

Never commit real credentials. Use `.env` for local secrets and GitHub Actions secrets for CI/CD. The example credentials in `.env.example` are for local development only.
