# Antigravity Project Memory

## Project

Caygnus Product Engineering Challenge

## Selected problem

Problem 3 — Reconnecting Real-Time Feed

## Candidate engineering context

The candidate has practical experience with:

- React Native / Expo
- React
- Node.js
- Fastify
- PostgreSQL
- Prisma
- SaaS applications
- offline-first mobile applications
- WebSocket / real-time data

## Goal

Produce a focused proof of senior product-engineering judgment within approximately 6–8 active hours.

Priority order:

1. Correctness
2. Architecture
3. Failure recovery
4. Tests
5. Maintainability
6. Documentation
7. Minimal UI polish

## Core architecture

```text
React Web Client
      ↓
REST + WebSocket
      ↓
Fastify API
      ↓
Application Services
      ↓
Repository
      ↓
PostgreSQL
```

WebSocket = transient delivery.

PostgreSQL = durable source of truth.

## Core domain

Update:

```text
id
roomId
sequence
message
createdAt
```

The server owns ordering.

The client owns display deduplication.

The database owns uniqueness constraints.

## Core recovery model

```text
lastConfirmedSequence
        ↓
reconnect
        ↓
fetch updates after cursor
        ↓
dedup by stable ID
        ↓
sort by server sequence
        ↓
apply
```

## State model

```text
DISCONNECTED
CONNECTING
CONNECTED
RECONNECTING
```

Reconnect with bounded exponential backoff + jitter.

## Important invariants

- Never broadcast an update before durable persistence succeeds.
- Never mix room data.
- Never use client arrival time as canonical ordering.
- Never advance the cursor twice for the same logical update.
- Never use an unbounded reconnect loop.
- Never rely on WebSocket delivery as durable storage.
- Never use arbitrary test sleeps.

## Required acceptance tests

- live update
- recovery after cursor
- deduplication

## Important edge cases

- history/live overlap
- duplicate delivery
- out-of-order arrival
- disconnect immediately after publish
- DB failure
- broadcast failure
- repeated reconnect failure
- room isolation
- long replay range

## Scope

Do not overbuild:

- no authentication
- no multi-tenancy
- no production broker
- no Kubernetes
- no rich dashboard
- no attachments
- no typing/presence
- no message editing

Document production improvements rather than implementing them unless required.

## Documentation expectations

Keep README and SUBMISSION synchronized with the actual implementation.

SUBMISSION must include:

- candidate details
- selected problem
- demo link
- setup
- tests
- architecture/data flow
- technology choices
- important decisions
- assumptions/limitations
- production scale
- AI usage
- credibility note

## AI disclosure

AI tools may be used for planning, brainstorming, implementation assistance, test ideas, and review. The candidate remains responsible for every line and must understand the system.

## Implementation discipline

Use TDD:

```text
RED → GREEN → REFACTOR
```

Implement domain behavior before UI polish.

Keep boundaries modular and testable.

## Final gate

Before submission:

- clean setup verified
- tests pass
- acceptance scenarios manually verified
- no secrets
- demo video recorded and accessible
- SUBMISSION.md complete
- architecture docs accurate
- AI usage disclosed
- credibility note truthful
