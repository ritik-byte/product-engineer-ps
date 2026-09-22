# Test Strategy

## Objective

Test behavior that is easy to get wrong rather than testing framework internals.

## Test pyramid

```text
             ┌───────────────┐
             │ Small E2E     │
             │ recovery demo │
             └───────┬───────┘
                     │
           ┌─────────▼─────────┐
           │ Integration       │
           │ API + repository  │
           └─────────┬─────────┘
                     │
        ┌────────────▼────────────┐
        │ Unit                    │
        │ cursor/dedup/backoff    │
        └─────────────────────────┘
```

## Required tests

### T1 — Live update

Given two clients connected to the same room, publishing an update causes the second client to receive it.

### T2 — Recovery after cursor

Given updates 1–5 exist and a client has confirmed sequence 3, querying after 3 returns 4–5.

### T3 — Deduplication

Given update X arrives through recovery and WebSocket, the feed contains X exactly once.

## High-value additional tests

- updates are ordered by server sequence
- room A updates never appear in room B
- reconnect state transitions are correct
- retry delay is bounded
- duplicate IDs do not advance state twice
- empty recovery is handled
- recovery is paginated
- server rejects malformed update payloads
- database failure prevents broadcast
