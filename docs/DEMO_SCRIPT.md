# 3–5 Minute Demo Script

## 0:00–0:30 — Introduction

“I'm solving Problem 3, Reconnecting Real-Time Feed. The key design decision is that WebSocket is used for live delivery, while PostgreSQL is the durable source of truth. A sequence cursor lets a reconnecting client recover missed events.”

## 0:30–1:10 — Two clients

Open two browser tabs on the same incident room.

Show:

```text
Client A: Connected
Client B: Connected
```

Send an update from A.

Point out that B receives it without refresh.

## 1:10–1:50 — Disconnect

Disconnect B.

Show:

```text
B: Reconnecting / Disconnected
```

Publish two or three updates from A.

Explain that B intentionally misses the live WebSocket delivery.

## 1:50–2:40 — Recovery

Reconnect B.

Show the client requesting updates after its last confirmed sequence.

The missed updates appear.

Point out that the messages are ordered by server sequence.

## 2:40–3:20 — Deduplication

Explain that history and live delivery can overlap.

If the same update arrives twice, the stable update ID causes the second copy to be ignored.

Show the feed contains one copy.

## 3:20–4:00 — Tests and architecture

Show the relevant tests:

- live delivery
- cursor recovery
- deduplication

Then show the architecture diagram and explain persist-before-broadcast.

## 4:00–4:30 — Trade-off

“I intentionally did not add Kafka, Redis, authentication, or multiple backend instances. The challenge is a focused proof. I documented where a shared broker, backpressure, retention, and production observability would be introduced.”
