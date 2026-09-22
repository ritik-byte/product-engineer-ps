# Architecture Decision Record

## Goal

Build the smallest system that demonstrates reliable real-time feed behavior under temporary connection loss.

## Boundary model

```text
                    ┌─────────────────┐
                    │ Presentation    │
                    │ React UI        │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Client Feed     │
                    │ dedup + cursor  │
                    └────────┬────────┘
                             │
                    HTTP / WebSocket
                             │
                    ┌────────▼────────┐
                    │ Transport       │
                    │ Fastify + WS    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Application     │
                    │ use cases       │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Repository      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ PostgreSQL      │
                    └─────────────────┘
```

## Responsibility rules

### Client

Owns:

- connection state
- reconnect scheduling
- last confirmed cursor
- local deduplication
- rendering

Does not own:

- authoritative ordering
- durable server history

### API

Owns:

- request validation
- authorization boundary when added later
- room/update application commands

### Application service

Owns:

- use-case orchestration
- persist-before-broadcast sequencing
- recovery semantics

### Repository

Owns:

- database reads/writes
- room-scoped history queries

### WebSocket gateway

Owns:

- socket lifecycle
- room subscription
- broadcasting

It does not own durable state.

## State transition invariants

1. An update cannot be broadcast before persistence succeeds.
2. A client must not advance its confirmed cursor based on a duplicate.
3. Room queries always include room identity.
4. Ordering is based on server sequence, never client arrival order.
5. Reconnect attempts are bounded/delayed.

## Failure model

### Client disconnects

Live messages can be missed. Recovery reads durable history after the client's last confirmed sequence.

### Server process restarts

WebSocket connections disappear, but update history remains in PostgreSQL. Clients reconnect and recover.

### Database unavailable

New updates cannot be accepted. The API returns an error rather than broadcasting an unpersisted event.

### WebSocket broadcast failure

The update remains durable. The disconnected client recovers it later through history.

## Why not Kafka/Redis?

The challenge explicitly does not require distributed infrastructure. Adding a broker would increase operational and conceptual complexity without improving the core proof for a single-instance prototype.
