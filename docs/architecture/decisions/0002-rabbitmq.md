# ADR-0002: RabbitMQ as the initial message broker

- **Status:** Accepted

## Context

The system needs asynchronous integration events, background jobs, retries, and dead-letter handling.

## Decision

Use RabbitMQ as the first broker. Define versioned event envelopes and implement outbox/inbox, idempotent consumers, retry policies, and dead-letter queues.

## Consequences

RabbitMQ supports the initial queue- and routing-oriented workflows. Kafka is not deployed in parallel without a concrete event-streaming requirement. Broker abstractions must not erase useful delivery semantics.
