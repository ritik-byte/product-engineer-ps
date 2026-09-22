# Product Engineering Challenge Submission

## Candidate

- **Name:** Ritik Vishwakarma
- **Email:** `<your-email>`
- **GitHub:** `<your-github>`
- **Selected problem:** Problem 3 — Reconnecting Real-Time Feed
- **Demo video:** `<Loom/YouTube/Drive link>`

## Run the project

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker and Docker Compose

### Setup

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres
pnpm prisma migrate dev
pnpm dev
```

Replace the commands above with the final repository commands if implementation details differ.

### Configuration

Document environment variable names only:

```text
DATABASE_URL=
PORT=
CLIENT_ORIGIN=
WS_PATH=
RECONNECT_MAX_DELAY_MS=
```

Never commit secret values.

### Successful scenario

1. Start the API and web client.
2. Open two browser tabs for the same incident room.
3. Confirm both show `Connected`.
4. Publish an update from Client A.
5. Client B receives it without refresh.

### Recovery scenario

1. Disconnect Client B using the demo connection control or browser/network simulation.
2. Publish at least two updates from Client A.
3. Reconnect Client B.
4. Client B requests history after its last confirmed sequence.
5. The missed updates appear once and in deterministic order.

## Run the tests

```bash
pnpm test
```

Use the final project command if different.

## Architecture and data flow

The system has four primary responsibilities:

1. **HTTP/API layer** — validates requests and maps transport input to application commands.
2. **Application/domain layer** — creates updates, determines ordering/cursor behavior, and coordinates persistence and broadcasting.
3. **Persistence layer** — stores durable update history in PostgreSQL through Prisma.
4. **Real-time layer** — manages transient WebSocket connections and broadcasts accepted updates.

The browser has a corresponding separation:

1. connection manager
2. recovery/history client
3. deduplication/update store
4. feed presentation

### Core rule

PostgreSQL is the durable source of truth. WebSocket is not treated as durable.

An update is persisted before it is broadcast. If a client misses the broadcast, it recovers the update using its last confirmed server sequence.

## Technology choices

### React + TypeScript + Vite

Chosen for a minimal browser client that makes two-client demonstration easy.

### Node.js + Fastify + TypeScript

Chosen because it is lightweight, explicit, and matches my existing backend experience.

### WebSocket

Chosen because the requirement is bidirectional real-time delivery and connection-state visibility.

### PostgreSQL + Prisma

PostgreSQL provides durable event history and transactional guarantees. Prisma provides typed access and migration tooling.

### Zod

Used at application boundaries for runtime validation.

### Vitest

Used for fast deterministic unit and integration tests.

## Important decisions

### 1. Server-assigned per-room sequence

Stable IDs identify updates; a server sequence identifies their deterministic position within a room.

### 2. Persist before broadcast

An update is not broadcast until it has been accepted by durable storage. This prevents a transient WebSocket success from becoming the only copy of an update.

### 3. Recovery by cursor plus ID deduplication

The client remembers its last confirmed sequence. On reconnect it asks for updates after that sequence. Because history and live delivery can overlap, both paths use the same ID-based deduplication mechanism.

## Delivery and recovery semantics

The system provides **at-least-once event visibility to clients**, not exactly-once delivery across a network boundary.

A receiver/client may observe an update more than once at the transport level, but the client feed applies each stable update ID once.

A disconnect immediately after sending/publishing can create uncertainty about whether the sender's request reached the server. The sender should use a stable client/request ID and query/reconcile server state where required. The prototype focuses on feed recovery rather than implementing an offline outbound queue.

## Assumptions and limitations

- One logical backend instance is assumed.
- One incident room is sufficient for the challenge.
- PostgreSQL is available locally.
- Authentication and authorization are intentionally excluded.
- No background service is required after the browser is closed.
- The prototype does not promise exactly-once network delivery.
- History replay should be bounded/paginated in a production deployment.
- A production multi-instance deployment would require a shared event distribution mechanism.

## Production and scale

First changes at larger scale:

1. Add Redis Pub/Sub, NATS, Kafka, or another appropriate shared broker for cross-instance live fan-out.
2. Keep PostgreSQL as durable history unless event volume requires a different event store.
3. Partition/index history by room and sequence.
4. Paginate recovery rather than replaying an unbounded range.
5. Add connection limits and per-client backpressure.
6. Add authentication/authorization.
7. Add structured telemetry and tracing.
8. Use load balancing with connection-aware WebSocket infrastructure.
9. Define retention/archival policies.

### Multiple backend instances

Each instance would maintain only its local WebSocket connections. A shared broker would distribute accepted events between instances. The database remains the source of durable history and the server-side ordering authority.

### Preventing unbounded history replay

Use:

```text
after=<sequence>
limit=<bounded value>
```

and continue recovery in pages. For long-disconnected clients, optionally provide snapshots/compaction or an explicit maximum recovery window.

## AI usage

AI tools were used as an engineering assistant for planning, documentation, code review ideas, test-case brainstorming, and implementation assistance.

All submitted code and technical decisions remain the candidate's responsibility. The candidate must be able to explain the implementation and modify it during follow-up discussion.

## Credibility note

Use one real shipped product and describe only work that can be truthfully supported.

Suggested structure:

### Product

`<Project/Product name>`

### Problem solved

`<What users/business needed>`

### Personal contribution

`<Exactly what I designed/built/owned>`

### Scale / operational complexity

`<Users, API volume, data size, deployment complexity, integrations, reliability requirement, or another truthful measure>`

### Difficult decision

`<A real trade-off, failure, architecture choice, or product constraint>`

### Evidence

`<Public URL / repository / product link / case study, if available>`

Do not invent metrics or ownership.

## Reviewer checklist

- [ ] Repository accessible
- [ ] Selected problem clearly identified
- [ ] Setup works
- [ ] Demo video accessible
- [ ] Live update demonstrated
- [ ] Disconnect/reconnect demonstrated
- [ ] Missed updates recovered
- [ ] Duplicate display prevented
- [ ] Ordering deterministic
- [ ] Tests pass
- [ ] AI usage disclosed
- [ ] No secrets committed
