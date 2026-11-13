# SaaS Platform — Distributed Systems Reference Implementation

A full-stack, multi-tenant SaaS platform built as independently deployable microservices. The goal is to demonstrate production-grade engineering across frontend, backend, data, messaging, security, observability, testing, and cloud delivery.

## Technology stack

| Area            | Technology                                  | Responsibility                                     |
| --------------- | ------------------------------------------- | -------------------------------------------------- |
| Web             | Next.js App Router, React, TypeScript       | SaaS user experience                               |
| Backend         | NestJS, TypeScript                          | Independently deployable domain services           |
| Edge            | API Gateway / BFF                           | Routing, request policies, frontend composition    |
| Relational data | PostgreSQL, Prisma                          | Service-owned transactional data                   |
| Document data   | MongoDB                                     | Audit/activity read models where appropriate       |
| Cache           | Redis                                       | Caching, rate limits, distributed coordination     |
| Messaging       | RabbitMQ                                    | Domain events and background work                  |
| Contracts       | OpenAPI, versioned event schemas            | Explicit service contracts                         |
| Runtime         | Docker, Docker Compose                      | Reproducible local environment                     |
| Cloud           | AWS                                         | Container hosting, managed data, storage, secrets  |
| CI              | GitHub Actions                              | Build, test, audit, and Docker Compose smoke gates |
| Testing         | Jest, Supertest, Testcontainers, Playwright | Unit, integration, contract, e2e                   |
| Observability   | OpenTelemetry, Prometheus, Grafana, Loki    | Traces, metrics, logs                              |

