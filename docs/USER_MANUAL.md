# User Manual

## Purpose

This prototype demonstrates a shared incident feed that remains correct when a real-time connection is interrupted.

## Start

Run the project according to the root README.

Open the web application in two browser tabs.

Use the same room ID in both clients.

## Connection indicators

- **Connected** — WebSocket is active.
- **Reconnecting** — the client is retrying the connection.
- **Disconnected** — there is currently no active connection.

## Send an update

Enter a message and press Send.

The update should immediately appear in other connected clients.

## Demonstrate recovery

1. Open two clients.
2. Confirm both are connected.
3. Disconnect Client B.
4. Send two or more updates from Client A.
5. Reconnect Client B.
6. Wait for recovery.
7. Verify the missed messages appear.
8. Verify each message appears only once.
9. Verify sequence/order is correct.

## Failure simulation

If the application includes a demo control, use it to force a WebSocket disconnect.

Otherwise use browser developer tools/network controls or close the connection through the provided test/demo mechanism.

The implementation should document the exact demonstration method in the final README.

## Important behavior

A WebSocket connection is not the source of truth. The database-backed history is.

This means a client can miss a live broadcast and still recover the update later.
