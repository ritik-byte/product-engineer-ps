# Challenge Requirement Mapping

| Requirement | Planned implementation |
|---|---|
| Two clients | Two browser clients on same room |
| Publish update | REST application command |
| Broadcast without refresh | WebSocket room gateway |
| Durable history | PostgreSQL |
| Reconnect | Client connection manager |
| Recover missed updates | `after=sequence` history API |
| No duplicate display | Stable update ID deduplication |
| Connection state | Explicit client state machine |
| Deterministic order | Server sequence per room |
| Live test | WebSocket integration test |
| Cursor/replay test | Repository/application test |
| Dedup test | Client/application unit test |
| Transport decision | ADR |
| Resume point | Last confirmed sequence |
| Ordering owner | Server |
| Dedup location | Client for display; server ID uniqueness for persistence |
| Bounded reconnect | Exponential backoff + jitter |
