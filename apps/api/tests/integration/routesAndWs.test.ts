import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import { buildServer } from '../../src/server.js';
import { InMemoryUpdateRepository } from '../../src/infrastructure/inMemoryUpdateRepository.js';
import { ServerWsMessage } from '@caygnus/shared';

describe('Fastify REST & WebSocket Gateway Integration Tests', () => {
  let app: ReturnType<typeof buildServer>;
  let address: string;
  let port: number;

  beforeAll(async () => {
    // Inject InMemory repository for deterministic, lightning-fast isolated test
    const repository = new InMemoryUpdateRepository();
    app = buildServer({ repository });
    address = await app.listen({ port: 0, host: '127.0.0.1' });
    const addr = app.server.address();
    port = typeof addr === 'object' && addr !== null ? addr.port : 3000;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/rooms/:roomId/updates persists and assigns sequence', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/rooms/incident-1/updates',
      payload: {
        message: 'Engineers on site',
        author: 'Lead',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.sequence).toBe(1);
    expect(body.roomId).toBe('incident-1');
    expect(body.message).toBe('Engineers on site');
    expect(body.author).toBe('Lead');
    expect(body.id).toBeDefined();
  });

  it('POST /api/rooms/:roomId/updates rejects empty messages with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/rooms/incident-1/updates',
      payload: {
        message: '   ',
        author: 'Lead',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBeDefined();
  });

  it('GET /api/rooms/:roomId/updates replays history after cursor', async () => {
    // Publish updates #2 and #3
    await app.inject({
      method: 'POST',
      url: '/api/rooms/incident-1/updates',
      payload: { message: 'Update 2', author: 'A' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/rooms/incident-1/updates',
      payload: { message: 'Update 3', author: 'B' },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/rooms/incident-1/updates?after=1&limit=10',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.roomId).toBe('incident-1');
    expect(body.updates).toHaveLength(2);
    expect(body.updates[0].sequence).toBe(2);
    expect(body.updates[1].sequence).toBe(3);
    expect(body.latestSequence).toBe(3);
    expect(body.hasMore).toBe(false);
  });

  it('broadcasts live update to connected WebSocket client in the same room (AC1)', async () => {
    const wsUrl = `ws://127.0.0.1:${port}/ws/rooms/incident-live`;
    const ws = new WebSocket(wsUrl);

    const receivedMessages: ServerWsMessage[] = [];

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
    });

    ws.on('message', (data) => {
      receivedMessages.push(JSON.parse(data.toString()));
    });

    // Wait for subscribed ack
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Post update via REST
    const res = await app.inject({
      method: 'POST',
      url: '/api/rooms/incident-live/updates',
      payload: { message: 'Live alert broadcast', author: 'Dispatcher' },
    });
    expect(res.statusCode).toBe(201);

    // Wait for WS receipt
    await new Promise((resolve) => setTimeout(resolve, 100));

    ws.close();

    const updateMsg = receivedMessages.find((m) => m.type === 'UPDATE');
    expect(updateMsg).toBeDefined();
    if (updateMsg && updateMsg.type === 'UPDATE') {
      expect(updateMsg.update.message).toBe('Live alert broadcast');
      expect(updateMsg.update.roomId).toBe('incident-live');
      expect(updateMsg.update.sequence).toBe(1);
    }
  });

  it('guarantees room isolation over WebSocket (Room A does not receive Room B)', async () => {
    const wsA = new WebSocket(`ws://127.0.0.1:${port}/ws/rooms/room-A`);
    const wsB = new WebSocket(`ws://127.0.0.1:${port}/ws/rooms/room-B`);

    const messagesA: ServerWsMessage[] = [];
    const messagesB: ServerWsMessage[] = [];

    await Promise.all([
      new Promise<void>((res) => wsA.on('open', res)),
      new Promise<void>((res) => wsB.on('open', res)),
    ]);

    wsA.on('message', (d) => messagesA.push(JSON.parse(d.toString())));
    wsB.on('message', (d) => messagesB.push(JSON.parse(d.toString())));

    await new Promise((res) => setTimeout(res, 50));

    // Send update strictly to room-B
    await app.inject({
      method: 'POST',
      url: '/api/rooms/room-B/updates',
      payload: { message: 'Secret B update', author: 'Agent B' },
    });

    await new Promise((res) => setTimeout(res, 100));

    wsA.close();
    wsB.close();

    // Verify room B received UPDATE, and room A received NO update
    expect(messagesB.some((m) => m.type === 'UPDATE')).toBe(true);
    expect(messagesA.some((m) => m.type === 'UPDATE')).toBe(false);
  });
});
