# ADR-0001: Microservices and bounded contexts

- **Status:** Accepted

## Context

This repository is an explicit reference implementation for distributed full-stack SaaS engineering. It must demonstrate independently deployable capabilities without arbitrary service boundaries.

## Decision

Use NestJS services aligned to business bounded contexts, with a Next.js web application and a dedicated API Gateway/BFF. Initial services: Identity, Tenant, Project, Billing, Notification, and Audit. Keep authorization with Tenant initially.

## Consequences

Services can deploy and scale independently, but introduce network failure, operational overhead, eventual consistency, and more complex testing. Local development and CI must automate the system. Avoid splitting services further without a clear ownership or scaling reason.

## Alternatives

A modular monolith reduces operational complexity but does not meet the explicit microservices reference objective.
