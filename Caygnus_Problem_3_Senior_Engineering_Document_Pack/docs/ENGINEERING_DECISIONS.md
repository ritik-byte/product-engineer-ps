# Engineering Decisions

## ADR-001: WebSocket transport

### Decision

Use WebSocket for live delivery.

### Reason

The feed needs low-latency server-to-client updates and explicit connection lifecycle handling.

### Alternatives

- SSE: simpler server-to-client streaming, but less natural if bidirectional interaction is needed.
- Long polling: simpler compatibility model but more overhead and less direct real-time behavior.

## ADR-002: PostgreSQL as durable history

### Decision

Persist accepted updates in PostgreSQL before broadcasting.

### Reason

The challenge requires recovery after disconnection. Durable storage gives the server something authoritative to replay.

## ADR-003: Sequence cursor

### Decision

Assign a monotonic sequence per room.

### Reason

A timestamp is not sufficient as a strict cursor because clocks can collide or be reordered. A server sequence gives deterministic ordering.

## ADR-004: ID-based deduplication

### Decision

Deduplicate by stable update ID.

### Reason

History and live paths can overlap during reconnect. Sequence alone is a position; ID is the identity of the logical update.

## ADR-005: Bounded reconnect backoff

### Decision

Use exponential backoff with jitter and a maximum delay.

### Reason

Prevents tight reconnect loops that can overload the server or drain client resources.

## ADR-006: No distributed broker in prototype

### Decision

Use in-process connection management.

### Reason

The challenge is explicitly not a distributed-production deployment. The design documents the broker boundary needed for multiple instances without paying the operational complexity now.
