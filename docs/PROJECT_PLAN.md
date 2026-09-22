# Senior Engineering Implementation Plan

## Phase 0 — Contract lock

Before coding:

- freeze acceptance criteria
- freeze event contract
- freeze state model
- freeze cursor semantics
- freeze retry/reconnect policy
- define non-goals

## Phase 1 — Domain + tests first

Implement and test:

- update entity
- room-scoped sequence
- stable ID
- deduplication
- cursor semantics
- ordering

No UI work yet.

## Phase 2 — Persistence

Implement:

- Prisma schema
- migrations
- repository interface
- PostgreSQL repository
- room-scoped queries

Tests must prove durable ordering and replay.

## Phase 3 — API

Implement:

- create update endpoint
- history endpoint
- validation
- error mapping

## Phase 4 — WebSocket

Implement:

- connect
- subscribe to room
- broadcast accepted events
- disconnect handling

## Phase 5 — Client recovery

Implement:

- connection state
- reconnect backoff
- last confirmed cursor
- recovery fetch
- shared dedup/apply path

## Phase 6 — Integration tests

Cover:

- live delivery
- replay
- duplicate overlap
- room isolation
- ordering

## Phase 7 — Demo UI

Only after correctness:

- room selector
- message input
- feed
- connection badge
- optional demo disconnect control

## Phase 8 — Documentation and QA

Verify:

- clean clone setup
- test command
- demo steps
- no secrets
- README accuracy
- submission completeness
- video accessibility

## Definition of Done

- all required ACs reproducible
- focused tests pass
- no arbitrary sleep-based tests
- architecture boundaries are understandable
- failure behavior documented
- production limitations documented
- demo video complete
