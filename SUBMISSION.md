# Product Engineering Challenge Submission

## Candidate

- **Name:** Ritik Vishwakarma
- **Email:** ritikvishwakarma001@gmail.com
- **GitHub:** https://github.com/ritik-byte
- **Selected problem:** Problem 3 — Reconnecting Real-Time Feed
- **Demo video:** https://drive.google.com/file/d/1BF56vNuP4c0sQOjCTj77WNKKuYH7E0LB/view?usp=sharing


---

## 1. Run the Project

### Prerequisites
- Node.js 20+ (tested on Node.js v24.18.0)
- npm 10+ (or pnpm 9+)
- (Optional) Docker / PostgreSQL for durable database mode; or zero-config standalone mode using the included in-memory repository.

### Quick Start (Standalone / Reviewer Evaluation)
The project is pre-configured with a robust, zero-friction standalone repository mode so reviewers can test immediately without setting up Docker or local PostgreSQL credentials:

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Start development servers (API on port 3000, Web on port 5173)
npm run dev
```

Visit **`http://localhost:5173`** in your browser to explore the interactive dual-client feed!

### PostgreSQL Production Mode (Optional)
If running with Docker Compose or a local PostgreSQL instance:
```bash
# Start PostgreSQL via Docker Compose
docker compose up -d postgres

# Run database migrations
npm run prisma:migrate

# Set USE_IN_MEMORY_DB=false in .env and start
npm run dev
```

### Environment Configuration
The application reads configuration from `.env`:
```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/caygnus_realtime
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
WS_PATH=/ws
RECONNECT_MAX_DELAY_MS=10000
USE_IN_MEMORY_DB=true
```

---

## 2. Run the Tests

The test suite runs deterministically with Vitest across all layers (Unit, Integration, and E2E Acceptance scenarios):

```bash
# Run all 28 automated tests across the workspace
npm test

# Or run specific test suites
npm run test:unit           # Domain logic, repository, feed store, backoff
npm run test:integration    # Fastify REST endpoints & WebSocket room isolation
npm run test:e2e            # Full end-to-end acceptance tests (AC1 to AC5)
```

**Test Suite Coverage Summary:**
- `@caygnus/api`: 20 tests (UpdateRepository, IncidentFeedService persist-before-broadcast, REST routes, WebSocket room isolation, AC1–AC5 e2e)
- `@caygnus/web`: 8 tests (FeedStore deduplication, out-of-order sorting, cursor advancement, jittered exponential backoff, publisher immediate ingestion deduplication, offline outbox queuing & sequence catch-up)
- **Total: 28 passing tests**

---

## 3. Architecture and Data Flow

The project is structured with clear boundary separation between transient delivery and durable storage:

```text
┌─────────────────────────────────────────────────────────────┐
│                     React Client (Vite)                     │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │               Incident Feed UI Component            │   │
│   │     (Client A & Client B Views, Simulation Toolbar) │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              │                              │
│   ┌──────────────────────────▼──────────────────────────┐   │
│   │           IncidentFeedStore & Deduplicator          │   │
│   │   - seenIds: Set<string>                            │   │
│   │   - lastConfirmedSequence: number                   │   │
│   │   - orderedUpdates: Update[] (sorted sequence ASC)  │   │
│   └──────────────▲───────────────────────▲──────────────┘   │
│                  │                       │                  │
│       ┌──────────┴──────────┐ ┌──────────┴──────────────┐   │
│       │ History Sync Service│ │ WebSocket Client Driver │   │
│       │ (REST Replay)       │ │ (State Machine+Backoff) │   │
│       └──────────┬──────────┘ └──────────┬──────────────┘   │
└──────────────────┼───────────────────────┼──────────────────┘
                   │ HTTP GET/POST         │ WebSocket Frame
                   ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 Fastify Backend (TypeScript)                │
│                                                             │
│   ┌─────────────────────────┐   ┌───────────────────────┐   │
│   │   HTTP Route Handlers   │   │   WebSocket Gateway   │   │
│   │ - POST /rooms/:id/update│   │ - Room Subscriptions  │   │
│   │ - GET  /rooms/:id/update│   │ - Broadcast Gateway   │   │
│   └──────────────┬──────────┘   └───────────▲───────────┘   │
│                  │                          │ Broadcast     │
│                  ▼                          │               │
│   ┌─────────────────────────────────────────┴───────────┐   │
│   │              IncidentFeedService                    │   │
│   │   - Persist-Before-Broadcast sequencing             │   │
│   │   - Monotonic sequence allocation                   │   │
│   │   - Cursor history replay                           │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              │                              │
│   ┌──────────────────────────▼──────────────────────────┐   │
│   │          UpdateRepository (Interface)               │   │
│   │   - PrismaUpdateRepository (PostgreSQL)             │   │
│   │   - InMemoryUpdateRepository (Zero-config/Tests)    │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Core Architectural Invariants
1. **WebSocket is NOT the Database**: WebSocket connections are transient infrastructure. PostgreSQL (or the durable repository) is the authoritative source of truth.
2. **Persist-Before-Broadcast**: An update is never broadcast over WebSocket until it is durably committed. If the database write fails, no broadcast occurs, and an error is returned to the publisher.
3. **Unified Ingestion Pipeline**: Updates arriving via live WebSocket frames and updates retrieved through history recovery flow through the exact same `IncidentFeedStore.ingest()` method, preventing divergence in ordering or deduplication logic.

---

## 4. Technology Choices

### Transport: HTTP POST + WebSocket
- **Publishing (HTTP POST)**: Using HTTP POST for publishing provides standard HTTP status codes (`201 Created`, `400 Bad Request`, `500 Server Error`), backpressure, and request-level error handling. Crucially, it enforces **Persist-Before-Broadcast**: updates are written to durable storage before any broadcast frame is dispatched.
- **Delivery (WebSocket)**: WebSocket provides bi-directional, full-duplex communication with minimal frame overhead, sub-millisecond broadcast latency, and immediate notification of disconnects (`close` events).
- **Alternatives Considered**: 
  - *Server-Sent Events (SSE)*: Excellent for uni-directional streaming, but still requires separate HTTP for publishing and has limited connection lifecycle control across older proxies.
  - *Long Polling*: High server overhead and latency; unnecessary given universal WebSocket support in modern browsers and runtimes.

### Backend: Fastify + TypeScript
- High-performance asynchronous HTTP and WebSocket routing with schema validation via Zod, encapsulated plugin architecture, and minimal lifecycle overhead.

### Frontend: React 18 + Pure CSS Design System
- Reactive component architecture, hook-based connection lifecycle management, zero CSS framework overhead, and responsive side-by-side dual-client evaluation UI.

---

## 5. Important Decisions

### ADR-001: Monotonic Sequence Numbering per Room
- **Decision**: Every update receives a server-assigned sequence number monotonically increasing within each room `(roomId, sequence)`.
- **Rationale**: Timestamps are unreliable for strict cursors due to clock skew, concurrent writes, and sub-millisecond collisions. A server sequence provides a deterministic checkpoint for recovery (`after=sequence`).

### ADR-002: Stable ID Deduplication
- **Decision**: Deduplicate updates by stable update ID (`seenIds: Set<string>`).
- **Rationale**: Reconnection creates inevitable overlap between the history recovery window and incoming live WebSocket events. Ingesting both immediate publisher responses and replayed updates through a single deduplicating pipeline ensures idempotency across delivery channels.

### ADR-003: Jittered Bounded Exponential Backoff
- **Decision**: Reconnection attempts follow `delay = min(maxDelay, baseDelay * 2^attempt) * jitter`.
- **Rationale**: Prevents client tight loops and protects the backend against "thundering herd" reconnection storms during network recoveries or server restarts.

### ADR-004: Dual-Implementation Repository Pattern
- **Decision**: Define a pure domain interface `UpdateRepository` with both `PrismaUpdateRepository` (for PostgreSQL production persistence) and `InMemoryUpdateRepository` (for isolated, deterministic unit tests and zero-dependency evaluator onboarding).

---

## 6. Assumptions and Limitations

### Assumptions
1. **Single-Node Authoritative Sequencing**: In the provided prototype, sequence allocation is managed by the single backend process or PostgreSQL sequence per room.
2. **Transient Disconnection Window**: Clients reconnect within a reasonable operational window where retrieving delta updates (`GET /updates?after=cursor`) is efficient.

### Architectural Enhancements Added
1. **Offline Message Creation & Outbox Queue (WhatsApp-style)**: When a client's connection is interrupted, users can continue typing and sending messages without interruption. Messages are optimistically appended to local state with a unique client ID and a `status: 'pending'` badge (`⏳ QUEUED`). Upon reconnection, the client automatically flushes its outbox queue to the server, assigning authoritative monotonic sequences and synchronizing both feeds in exact chronological order.

### Limitations & Deliberately Unfinished Work
1. **No Distributed Message Brokers (Kafka/Redis)**: Multi-instance WebSocket synchronization across horizontal server pods is documented in architectural answers rather than implemented, keeping reviewer onboarding zero-friction.
2. **Compaction / Snapshots**: Very long disconnects (>10,000 updates) would benefit from snapshot compaction; currently, bounded pagination handles delta retrieval up to 100 items per page.

---

## 7. Production and Scale

If this system were deployed to production with hundreds of thousands of concurrent clients across multiple data centers, we would implement:
1. **Distributed Event Pub/Sub (Redis / NATS)**: Fastify WebSocket instances would subscribe to Redis Pub/Sub channels per active room, fanning out updates across server clusters.
2. **Snapshot Compaction**: For clients reconnecting after hours or days, provide state snapshots instead of replaying thousands of individual log entries.
3. **Database Partitioning & Read Replicas**: Partition incident tables by `roomId` and route history reads (`GET /updates`) to read replicas while writes commit to the primary.
4. **WebSocket Heartbeats & Ghost Connection Detection**: Implement ping/pong frames every 30 seconds to aggressively tear down stale half-open mobile connections.

---

## 8. Answers to Problem 3 Questions

### 1. What happens if a client disconnects immediately after sending an update?
- **Current Behavior**: The client sends `POST /api/rooms/:roomId/updates`. If the network disconnects before the client receives the HTTP 201 response, the server has already durably committed the record in PostgreSQL. Upon reconnecting, the client issues `GET /updates?after=lastConfirmedSequence`, safely fetching the newly created update and restoring state consistency.
- **Outbound Idempotency**: To guard against duplicated publisher retries, the API contract accepts an optional `clientAssignedId`. If the client resends after a reconnection, the repository recognizes the existing ID and returns the accepted record without duplicating the sequence.

### 2. How would multiple backend instances share and order events?
- **Ordering Authority**: Even with multiple API servers, ordering authority must remain centralized or partitioned. In PostgreSQL, monotonic sequences are assigned per room via transactional locking (`SELECT MAX(sequence) + 1 ... FOR UPDATE`) or a dedicated room-sequence table.
- **Cross-Instance Fan-Out**: In a multi-instance production cluster, local WebSocket gateways do not see sockets connected to other nodes. A lightweight message broker (e.g. Redis Pub/Sub, NATS, or Kafka) would subscribe each Fastify instance to room update channels. When Instance 1 commits an update, it publishes to the broker, which fans out to Instances 2 and 3 to broadcast to their locally connected clients.

### 3. How would you prevent an unbounded history replay?
- **Pagination**: The `GET /api/rooms/:roomId/updates` endpoint enforces strict bounded pagination (`limit` parameter clamped between 1 and 100, defaulting to 50) and returns a `hasMore` boolean.
- **Windowing / Compaction**: In production, clients that have been disconnected for an extended period (e.g. > 10,000 sequences) should not replay fine-grained events. Instead, the server would provide periodic room state snapshots (compaction) and only replay delta updates occurring after the snapshot.

### 4. What would you monitor in production?
- **Transport Metrics**: Active WebSocket connections per node, socket connection/disconnection rate, and reconnect loop frequency.
- **Lag & Replay Metrics**: Average recovery duration, number of updates replayed per reconnect request, and `after` cursor distance (`latestSequence - after`).
- **Reliability & Latency**: Persist-to-broadcast latency (time between DB commit and WS frame send), 4xx/5xx HTTP error rates, and PostgreSQL connection pool saturation.

---

## 9. AI Usage Disclosure

AI tools (Antigravity IDE / Gemini 3.8) were utilized in this challenge as a staff-level pair programmer:
- Brainstorming failure edge cases, race conditions, and thundering herd mitigations.
- Drafting initial scaffolding and boilerplate across workspaces.
- Formulating Vitest test cases for AC1 through AC5.
- Performing visual browser regression runs via browser subagents.

All architectural decisions, invariants, domain boundaries, and code structures were reviewed, verified, and are fully owned by the candidate.

---

## 10. Credibility Note

### Product
Enterprise Real-Time Coordination & Mobile Incident Response Systems.

### Problem Solved
Field operators and remote dispatchers coordinated critical field assets under intermittent cellular connectivity, tunnel transitions, and frequent app backgrounding. Data loss or duplicated state caused operational errors.

### Personal Contribution
- Designed and implemented offline-first state synchronization using local persistent storage, monotonic sequence tracking, and idempotent ingestion queues.
- Architected Fastify and WebSocket microservices with strict transactional persistence-before-broadcast guarantees.
- Built reusable reconnection engines featuring bounded backoff, jitter, and automatic history delta replay.

### Difficult Decision & Trade-Off
Chose at-least-once network delivery combined with client-side stable ID deduplication over complex distributed two-phase commit protocols. This prioritized client responsiveness and system availability under hostile network conditions without sacrificing consistency.
