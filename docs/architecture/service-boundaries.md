# Service Boundaries and Ownership

| Deployable        | Owns                                                | Primary store                      | Responsibilities                    |
| ----------------- | --------------------------------------------------- | ---------------------------------- | ----------------------------------- |
| Web (Next.js)     | UI and presentation                                 | None                               | User experience                     |
| API Gateway / BFF | Edge policies and frontend composition              | No business database               | Public REST API                     |
| Identity          | Credentials, sessions, refresh-token families       | PostgreSQL                         | Authentication and account security |
| Tenant            | Organizations, memberships, invitations, roles      | PostgreSQL                         | Tenant lifecycle and authorization  |
| Project           | Projects, tasks, assignments                        | PostgreSQL                         | Project/task domain                 |
| Billing           | Plans, subscriptions, invoices, provider references | PostgreSQL                         | Billing and webhook processing      |
| Notification      | Templates, preferences, delivery attempts           | PostgreSQL + Redis transient state | Notification delivery               |
| Audit             | Append-oriented audit records and query model       | MongoDB                            | Audit ingestion and activity search |

## Boundary rules

- A service is the sole writer and schema owner for its business data.
- Shared packages contain contracts and technical utilities, not shared domain entities or repositories.
- A service may keep a local projection of another service's published facts; that projection is not the source of truth.
- The gateway must not become a second domain layer. Business decisions stay in owning services.
- Cross-service workflows use events or sagas; never distributed database transactions.
- Every event has an owner, schema version, compatibility policy, and documented consumers.

## Example interactions

- Identity authenticates a user; gateway validates access credentials and propagates verified claims.
- Tenant resolves memberships and active organization.
- Project authorizes operations against tenant membership/permissions through a bounded API or versioned local projection.
- Project commits business data and an outbox record atomically, then publishes a project-created event.
- Notification consumes relevant events and schedules delivery. Duplicate deliveries are harmless through inbox/idempotency keys.
- Audit consumes security and business events and builds an append-oriented searchable activity model.
- Billing consumes tenant lifecycle events and owns provider webhooks, subscription state, and reconciliation.

These are target interactions. A flow is complete only after implementation and tests.
