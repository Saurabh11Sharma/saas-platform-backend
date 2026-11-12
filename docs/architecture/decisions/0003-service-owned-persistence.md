# ADR-0003: Service-owned persistence

- **Status:** Accepted

## Context
Independent services must evolve and deploy without coupling to another service's schema.

## Decision
Each service owns its database and migrations. PostgreSQL is the default transactional database. MongoDB is used for the audit/activity document read model. Redis is ephemeral/cache infrastructure, not durable business storage.

## Consequences
Cross-service data access occurs through APIs or events and may be eventually consistent. Local projections and operational monitoring are required.
