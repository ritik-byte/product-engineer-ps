# Production Evolution

## Many backend instances

Current prototype:

```text
Instance 1 → local WebSockets
```

Production:

```text
                 ┌──────────────┐
Client ─────────►│ Load Balancer│
                 └──────┬───────┘
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
        API Instance A        API Instance B
             │                     │
             └──────────┬──────────┘
                        ▼
                  Shared Broker
                        │
                        ▼
                   PostgreSQL
```

The broker distributes accepted updates to all instances that have subscribers for the room.

## Ordering

A single logical ordering authority is required per room. At scale this could be provided by:

- database transaction/sequence
- partitioned event stream
- broker partition keyed by room ID

The exact mechanism depends on throughput and consistency requirements.

## Backpressure

A slow client must not block the entire room.

Production controls:

- per-connection send queue
- queue size limit
- drop/disconnect slow consumers
- metrics on queue depth

## History

Use:

- room + sequence index
- bounded page size
- retention policy
- archival/snapshot strategy for very old history

## Observability

Recommended metrics:

- active WebSocket connections
- connections by room
- connect/disconnect rate
- reconnect attempts
- recovery requests
- recovered event count
- duplicate event count
- recovery latency
- publish latency
- database latency/errors
- broadcast failures
- per-client outbound queue depth
- slow consumer disconnects

Recommended alerts:

- abnormal disconnect spike
- recovery latency above SLO
- database error rate
- growing pending recovery volume
- broker lag in a multi-instance deployment
- abnormal duplicate rate
