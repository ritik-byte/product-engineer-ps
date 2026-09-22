# Technology Stack

## Frontend

### React + TypeScript + Vite

Purpose:

- two-client browser demonstration
- feed rendering
- connection state
- reconnect control
- history recovery

## Backend

### Node.js + TypeScript

Purpose:

- API
- WebSocket server
- application services
- worker-free synchronous publish path for the prototype

### Fastify

Purpose:

- HTTP routing
- plugin lifecycle
- WebSocket integration

## Real-time

### WebSocket

Purpose:

- low-latency live updates
- connection lifecycle

## Persistence

### PostgreSQL

Purpose:

- durable update history
- transactional ordering
- uniqueness constraints

### Prisma

Purpose:

- typed database access
- migrations
- schema management

## Validation

### Zod

Purpose:

- runtime validation of HTTP/WebSocket input

## Testing

### Vitest

Purpose:

- unit tests
- integration tests
- deterministic fake-timer tests

## Infrastructure

### Docker Compose

Purpose:

- reproducible local PostgreSQL

## Why this stack

It matches the candidate's existing full-stack experience while keeping the challenge implementation understandable. Each technology directly supports a requirement; no infrastructure component is added solely for resume appeal.
