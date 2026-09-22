# Acceptance Traceability

| Acceptance | Implementation area | Test | Demo |
|---|---|---|---|
| AC1 Live update | WebSocket gateway + client feed | live update test | yes |
| AC2 Connection state | client connection state machine | state transition tests | yes |
| AC3 Missed recovery | history API + cursor recovery | replay test | yes |
| AC4 Dedup | client update store | dedup overlap test | yes |
| AC5 Stable ordering | server sequence + ordered query | ordering test | yes |

## Completion rule

An item is only marked complete after the implementation and its evidence have both been verified.
