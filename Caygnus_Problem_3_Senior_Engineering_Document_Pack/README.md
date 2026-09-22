# Caygnus Product Engineering Challenge — Problem 3

## Reconnecting Real-Time Feed

A focused, reliability-oriented real-time incident feed demonstrating:

- WebSocket live delivery
- Durable event history
- Reconnection and missed-event recovery
- Deterministic server-side ordering
- Stable identifiers and client-side deduplication
- Explicit connection state
- Focused automated tests
- Clean separation between transport, domain, persistence, and UI

> This repository is intentionally small. It is production-minded in its boundaries and failure handling without introducing unnecessary distributed infrastructure.

## Selected Problem

**Problem 3 — Reconnecting Real-Time Feed**

### Core acceptance scenarios

1. Two clients connected to the same room receive live updates without refresh.
2. Connection state visibly changes between connected, reconnecting, and disconnected.
3. A client disconnected while updates are published can recover missed updates after reconnect.
4. Overlapping history/live delivery does not display duplicates.
5. Updates appear in deterministic order.

## Proposed stack

| Layer | Technology | Why |
|---|---|---|
| Web client | React + TypeScript + Vite | Small, inspectable browser client |
| Real-time transport | WebSocket | Bidirectional, low-latency live updates |
| API server | Node.js + Fastify + TypeScript | Existing strength, fast and minimal |
| WebSocket integration | `@fastify/websocket` | Fits Fastify lifecycle |
| Database | PostgreSQL | Durable ordered event history |
| ORM | Prisma | Type-safe persistence and migrations |
| Validation | Zod | Runtime validation at boundaries |
| Tests | Vitest | Fast deterministic unit/integration tests |
| Local infrastructure | Docker Compose | Reproducible PostgreSQL |
| API style | REST + WebSocket | REST for history/publish, WebSocket for live delivery |

## Architecture

```text
                    ┌──────────────────────┐
                    │      React Client    │
                    │                      │
                    │ Feed + Connection UI │
                    │ Recovery + Dedup     │
                    └──────────┬───────────┘
                               │
                    REST / WebSocket
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Fastify API Server  │
                    │                      │
                    │ Routes / WS Gateway  │
                    │ Application Services │
                    │ Room Connection Hub  │
                    └───────┬───────┬──────┘
                            │       │
                    persistence     │ broadcast
                            │       │
                            ▼       ▼
                    ┌──────────────┐  ┌──────────────┐
                    │  PostgreSQL  │  │ WebSocket    │
                    │              │  │ connections  │
                    │ Update log   │  │ (transient)  │
                    └──────────────┘  └──────────────┘
```

### Critical design rule

**PostgreSQL is the durable source of truth. WebSocket is only a delivery mechanism.**

A WebSocket message being delivered does not mean history is durable; the database write happens before broadcasting.

## Data flow

### Publish

```text
Client A
  │
  │ POST /rooms/:roomId/updates
  ▼
Fastify route
  │
  ▼
Application service
  │
  ├── validate input
  ├── create stable update ID
  ├── allocate room sequence transactionally
  └── persist update
  │
  ▼
PostgreSQL
  │
  ▼
Broadcast accepted update
  │
  └──────────────► Client B
```

### Reconnect/recovery

```text
Client B
  │
  │ lastConfirmedSequence = 42
  │
  X WebSocket disconnected
  │
  │ reconnect
  ▼
WebSocket connected
  │
  ▼
GET /rooms/:roomId/updates?after=42
  │
  ▼
PostgreSQL
  │
  └── 43,44,45
        │
        ▼
Client dedup store
        │
        ▼
Deterministic sort by sequence
        │
        ▼
Feed: 43,44,45
```

## Ordering

The server assigns a monotonically increasing `sequence` per room. The client never uses local arrival time as the ordering source.

Canonical ordering:

```text
(roomId, sequence ASC)
```

The stable update ID is separate from ordering. The ID provides identity; the sequence provides deterministic position.

## Deduplication

Every update has a stable `id`.

The client maintains a set/map of already-applied IDs. An update arriving from history and WebSocket simultaneously is applied only once.

The server also enforces uniqueness of update IDs.

## Reconnection

The client uses bounded exponential backoff with jitter:

```text
attempt 1: ~1s
attempt 2: ~2s
attempt 3: ~4s
attempt 4: ~8s
max: configurable
```

After reconnecting, the client recovers from its last confirmed sequence before considering itself fully current.

## State machine

```text
DISCONNECTED
     │
     │ connect()
     ▼
CONNECTING
     │
  success
     ▼
CONNECTED
     │
 disconnect/error
     ▼
RECONNECTING
     │
  success
     └──────────────► CONNECTED
     │
 retry limit
     ▼
DISCONNECTED
```

## Client update lifecycle

```text
RECEIVED
   ↓
DEDUP CHECK
   ├── seen → IGNORE
   └── new
        ↓
STORE/APPLY
        ↓
ADVANCE CONFIRMED CURSOR
```

The cursor must only advance through accepted, ordered updates. Recovery and live delivery share the same deduplication/application path.

## Project structure

```text
caygnus-realtime-feed/
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── lib/
│   │       ├── state/
│   │       ├── types/
│   │       └── main.tsx
│   │
│   └── api/
│       └── src/
│           ├── config/
│           ├── domain/
│           ├── application/
│           ├── infrastructure/
│           ├── interfaces/
│           │   ├── http/
│           │   └── websocket/
│           └── server.ts
│
├── packages/
│   └── shared/
│       └── src/
│           ├── contracts/
│           └── types/
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── docs/
├── docker-compose.yml
├── .env.example
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Local setup

Prerequisites:

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

Example:

```bash
pnpm install
docker compose up -d postgres
cp .env.example .env
pnpm prisma migrate dev
pnpm dev
```

The final implementation must provide exact commands and ports in `SUBMISSION.md`.

## Testing philosophy

Tests should be deterministic and should not rely on arbitrary sleeps.

Prefer:

- fake clocks/timers
- fake WebSocket transport
- in-memory repositories for domain tests
- a local PostgreSQL test database for persistence/integration tests

Required tests:

1. Live publish/receive.
2. Recovery after a cursor.
3. Deduplication across history/live overlap.

Additional high-value tests:

- ordering
- reconnect backoff
- connection state transitions
- room isolation
- cursor advancement
- reconnect immediately after publish

## Scope discipline

Not included:

- authentication
- authorization
- presence
- typing indicators
- message editing/deletion
- attachments
- multi-region deployment
- Kafka/Redis unless later justified by an actual requirement

## Senior-engineering principles

- Keep domain rules independent of Fastify and React.
- Keep persistence behind repository interfaces.
- Validate untrusted input at boundaries.
- Make state transitions explicit.
- Prefer deterministic tests.
- Avoid global mutable state except the intentionally scoped connection registry.
- Make room identity explicit in every query and WebSocket connection.
- Persist before broadcast.
- Use stable IDs and server-side sequence numbers.
- Document current prototype behavior separately from production evolution.

## Demo plan

1. Open two browser clients.
2. Show both connected.
3. Publish from Client A and show Client B receiving immediately.
4. Disconnect Client B.
5. Publish several updates from Client A.
6. Reconnect Client B.
7. Show recovery of missed updates.
8. Show no duplicates.
9. Show tests.
10. Explain one key trade-off: durable history is authoritative; WebSocket is transient.

