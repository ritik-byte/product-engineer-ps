# Failure and Edge-Case Model

## Disconnect immediately after publish

If the client disconnects immediately after sending an update, the sender may not know whether the server accepted it.

The production-safe pattern is:

1. stable client/request ID
2. server idempotency
3. query/reconcile accepted state
4. recovery using durable history

The prototype should make the limitation explicit if outbound idempotency is not implemented.

## Duplicate WebSocket and history delivery

Expected during reconnect.

Solution:

```text
stable update ID
       ↓
dedup store
       ↓
apply once
```

## Out-of-order network arrival

The client sorts accepted updates by server sequence.

## Room isolation

Every history query, update write, and WebSocket subscription is scoped to a room ID.

## Database write succeeds but broadcast fails

The event remains durable. The affected client will recover it through the cursor-based history endpoint.

## Client receives an update twice

Second application is ignored by stable ID.

## Client reconnect storm

Use bounded exponential backoff with jitter.

## Long-disconnected client

Do not replay unlimited history. Use pagination and, at scale, snapshots/compaction.
