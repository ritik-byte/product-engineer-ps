# Antigravity Master Prompt — Caygnus Problem 3

You are acting as a senior/staff-level product engineer helping implement the Caygnus Product Engineering Challenge.

## Context

We selected:

**Problem 3 — Reconnecting Real-Time Feed**

The challenge evaluates:

- Core correctness — 25%
- Software architecture/decomposition — 25%
- Coding patterns/maintainability — 20%
- Failure handling — 15%
- Testing — 10%
- Communication/trade-offs — 5%

The complete official problem statement and scorecard are supplied separately in the project repository. Treat those files as the source of truth.

## Candidate context

The candidate has practical experience with:

- React / React Native
- Node.js
- Fastify
- PostgreSQL
- Prisma
- SaaS applications
- offline-first mobile applications
- WebSocket / real-time data

Do not invent additional experience or metrics.

## Primary objective

Build a focused, high-quality proof of engineering judgment. Optimize for correctness, reliability, maintainability, testability, and clear explanation—not feature count.

Recommended stack:

- React + TypeScript + Vite
- Node.js + Fastify + TypeScript
- WebSocket / @fastify/websocket
- PostgreSQL
- Prisma
- Zod
- Vitest
- Docker Compose

You may change a technology only when there is a clear reason and you document the trade-off.

## Mandatory engineering approach

Work in this order:

1. Read ALL supplied challenge documents before writing application code.
2. Extract the acceptance criteria into a traceability checklist.
3. Identify ambiguities and make explicit assumptions.
4. Produce a short implementation plan.
5. Design the domain model and state transitions.
6. Define interfaces between domain/application/infrastructure/transport.
7. Write tests FIRST for important behavior.
8. Implement the minimum code required to make the tests pass.
9. Refactor for clarity and DRY.
10. Add integration tests for real persistence and WebSocket behavior.
11. Build the smallest useful UI.
12. Run the full test suite.
13. Manually execute every acceptance scenario.
14. Review for race conditions and failure modes.
15. Update documentation.
16. Perform a final reviewer-style audit against the Caygnus scorecard.

## Architecture principles

Use clear layers:

```text
Web UI
  ↓
Client application/state
  ↓
REST/WebSocket transport
  ↓
Application services
  ↓
Domain rules
  ↓
Repository interfaces
  ↓
PostgreSQL/Prisma
```

The WebSocket connection manager is transient infrastructure, not durable state.

PostgreSQL is the durable source of truth.

## Core design

Every update needs:

- stable ID
- room ID
- message
- createdAt
- server-assigned sequence

Use:

```text
(roomId, sequence)
```

for deterministic ordering.

Use stable update ID for deduplication.

Persist before broadcast.

## Recovery semantics

The client stores its last confirmed sequence.

After reconnect:

```text
GET /rooms/:roomId/updates?after=<lastConfirmedSequence>
```

The recovery path and WebSocket live path MUST feed through the same deduplication/application logic.

Do not implement two separate message-application paths that can drift.

## Connection state

Use an explicit state machine:

```text
DISCONNECTED
CONNECTING
CONNECTED
RECONNECTING
```

Use bounded exponential backoff with jitter.

Never create a tight reconnect loop.

## Race conditions to reason about

Explicitly test/reason about:

1. history and WebSocket deliver the same update
2. WebSocket delivers an update while history is loading
3. reconnect occurs immediately after a publish
4. duplicate update IDs
5. out-of-order network arrival
6. empty recovery
7. database write succeeds but WebSocket broadcast fails
8. client receives an update twice
9. room A update accidentally reaching room B
10. client reconnecting repeatedly while server is unavailable

## Testing rules

Do not use arbitrary `sleep()` to make tests pass.

Use:

- fake timers
- controlled promises
- fake transports
- deterministic fixtures
- test repositories
- isolated integration database

Minimum required tests:

- live update publish/receive
- recovery after cursor
- deduplication

Add tests for:

- ordering
- room isolation
- reconnect state
- bounded backoff
- persistence-before-broadcast behavior

## Scope rules

Do NOT add these unless required:

- authentication
- authorization
- user profiles
- Kafka
- Redis
- Kubernetes
- multi-region infrastructure
- rich design system
- attachments
- typing indicators
- presence
- message editing
- production monitoring stack

If production evolution is relevant, document it instead of implementing unnecessary infrastructure.

## Code quality rules

- TypeScript strict mode.
- No `any` unless explicitly justified.
- Small functions with one responsibility.
- Avoid premature abstractions.
- No duplicated business logic.
- No business rules inside React presentation components.
- No database queries inside WebSocket handlers.
- No direct Prisma calls from UI/transport code.
- Validate external input.
- Use meaningful names.
- Return typed errors.
- Keep configuration centralized.
- Keep environment variables validated.
- Keep room scoping explicit in every data access method.
- Prefer dependency injection for services that need testing.

## Database rules

The database must enforce logical uniqueness.

At minimum:

```text
Update.id UNIQUE
(roomId, sequence) UNIQUE
```

Add appropriate indexes for:

```text
(roomId, sequence)
```

Do not rely only on application-level uniqueness.

## Reviewer-focused quality bar

Before declaring complete, answer:

### Correctness
Can every acceptance scenario be reproduced?

### Architecture
Can a reviewer quickly find the code responsible for:

- publishing
- persistence
- broadcasting
- reconnecting
- replay
- deduplication
- ordering?

### Failure handling
What happens when:

- DB fails?
- WebSocket disconnects?
- broadcast fails?
- reconnect keeps failing?
- history and live paths overlap?

### Testing
Do tests prove behavior rather than implementation details?

### Communication
Does SUBMISSION.md clearly explain:

- setup
- architecture
- technology choices
- important decisions
- assumptions
- production scaling
- AI usage
- credibility note?

## TDD workflow

For every important feature:

```text
RED
  ↓
Write failing behavior test
  ↓
GREEN
  ↓
Minimum implementation
  ↓
REFACTOR
  ↓
Run focused tests
  ↓
Run full suite
```

Do not write a large implementation first and then create superficial tests.

## Required documentation

Maintain:

- README.md
- SUBMISSION.md
- docs/ARCHITECTURE.md
- docs/ENGINEERING_DECISIONS.md
- docs/TEST_STRATEGY.md
- docs/USER_MANUAL.md
- docs/PRODUCTION_SCALE.md
- docs/THREAT_AND_FAILURE_MODEL.md
- docs/DEMO_SCRIPT.md
- docs/REVIEWER_MAPPING.md
- docs/PROJECT_PLAN.md

Keep documentation aligned with actual implementation. Never claim behavior that the code does not provide.

## Final self-review

Act like the Caygnus reviewer.

Create a table:

| Area | Evidence | Risk | Fix |
|---|---|---|---|
| Core correctness | | | |
| Architecture | | | |
| Maintainability | | | |
| Failure handling | | | |
| Testing | | | |
| Communication | | | |

Do not invent a score as if you were Caygnus. Instead identify gaps and fix them.

## Final response to candidate

At the end, report:

1. What was implemented.
2. Which acceptance criteria are covered.
3. Test results.
4. Important architectural decisions.
5. Known limitations.
6. Any remaining manual verification steps.
7. Exact commands for running the app and tests.

Never say the project is complete unless the tests and acceptance scenarios have actually been verified.
