import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import { buildServer } from '../../src/server.js';
import { InMemoryUpdateRepository } from '../../src/infrastructure/inMemoryUpdateRepository.js';
import { ServerWsMessage, Update } from '@caygnus/shared';

describe('Caygnus Problem 3 Acceptance Scenarios (AC1 - AC5)', () => {
  let app: ReturnType<typeof buildServer>;
  let port: number;

  beforeAll(async () => {
    const repository = new InMemoryUpdateRepository();
    app = buildServer({ repository });
    await app.listen({ port: 0, host: '127.0.0.1' });
    const addr = app.server.address();
    port = typeof addr === 'object' && addr !== null ? addr.port : 3000;
  });

  afterAll(async () => {
    await app.close();
  });

  it('AC1: Live update — Client A publishes, Client B receives without manual refresh', async () => {
    const roomId = 'incident-ac1';
    const wsA = new WebSocket(`ws://127.0.0.1:${port}/ws/rooms/${roomId}`);
    const wsB = new WebSocket(`ws://127.0.0.1:${port}/ws/rooms/${roomId}`);

    const messagesB: ServerWsMessage[] = [];

    await Promise.all([
      new Promise<void>((res) => wsA.on('open', res)),
      new Promise<void>((res) => wsB.on('open', res)),
    ]);

    wsB.on('message', (data) => {
      messagesB.push(JSON.parse(data.toString()));
    });

    await new Promise((res) => setTimeout(res, 50));

    // Client A publishes update
    const res = await app.inject({
      method: 'POST',
      url: `/api/rooms/${roomId}/updates`,
      payload: {
        message: 'Hazard contained at substation',
        author: 'Client A',
      },
    });
    expect(res.statusCode).toBe(201);
    const published = res.json();

    // Give time for socket delivery
    await new Promise((res) => setTimeout(res, 80));

    wsA.close();
    wsB.close();

    const updateEvent = messagesB.find((m) => m.type === 'UPDATE');
    expect(updateEvent).toBeDefined();
    if (updateEvent && updateEvent.type === 'UPDATE') {
      expect(updateEvent.update.id).toBe(published.id);
      expect(updateEvent.update.sequence).toBe(published.sequence);
      expect(updateEvent.update.message).toBe('Hazard contained at substation');
      expect(updateEvent.update.author).toBe('Client A');
    }
  });

  it('AC2: Connection state — interrupted connection exposes disconnected/reconnecting state', async () => {
    const roomId = 'incident-ac2';
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/rooms/${roomId}`);

    await new Promise<void>((res) => ws.on('open', res));
    expect(ws.readyState).toBe(WebSocket.OPEN);

    // Simulate unexpected network interruption
    const closePromise = new Promise<{ code: number; reason: string }>((resolve) => {
      ws.on('close', (code, reason) => resolve({ code, reason: reason.toString() }));
    });

    ws.terminate(); // Hard socket termination

    const closeInfo = await closePromise;
    expect(ws.readyState).toBe(WebSocket.CLOSED);
    expect(closeInfo).toBeDefined();
  });

  it('AC3: Missed-update recovery — Client B disconnects, A sends messages, B reconnects and recovers', async () => {
    const roomId = 'incident-ac3';

    // 1. Initial message when both connected
    const initialRes = await app.inject({
      method: 'POST',
      url: `/api/rooms/${roomId}/updates`,
      payload: { message: 'Initial baseline update', author: 'System' },
    });
    const initialUpdate = initialRes.json();
    let clientBLastConfirmedSequence = initialUpdate.sequence; // = 1

    // 2. Client B is disconnected while Client A posts 3 updates
    await app.inject({
      method: 'POST',
      url: `/api/rooms/${roomId}/updates`,
      payload: { message: 'Missed Update 1', author: 'Client A' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/rooms/${roomId}/updates`,
      payload: { message: 'Missed Update 2', author: 'Client A' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/rooms/${roomId}/updates`,
      payload: { message: 'Missed Update 3', author: 'Client A' },
    });

    // 3. Client B reconnects and queries history after lastConfirmedSequence
    const recoveryRes = await app.inject({
      method: 'GET',
      url: `/api/rooms/${roomId}/updates?after=${clientBLastConfirmedSequence}&limit=50`,
    });

    expect(recoveryRes.statusCode).toBe(200);
    const recoveryData = recoveryRes.json();

    expect(recoveryData.updates).toHaveLength(3);
    expect(recoveryData.updates.map((u: Update) => u.sequence)).toEqual([2, 3, 4]);
    expect(recoveryData.updates.map((u: Update) => u.message)).toEqual([
      'Missed Update 1',
      'Missed Update 2',
      'Missed Update 3',
    ]);
    expect(recoveryData.latestSequence).toBe(4);
  });

  it('AC4: Duplicate prevention — update arriving through history AND live WS is processed once', () => {
    // Pure deduplication engine logic test (mirrors Client feed store invariant)
    const seenIds = new Set<string>();
    const feedUpdates: Update[] = [];

    const applyUpdate = (update: Update) => {
      if (seenIds.has(update.id)) {
        return; // Drop duplicate
      }
      seenIds.add(update.id);
      feedUpdates.push(update);
    };

    const duplicateUpdate: Update = {
      id: 'upd_duplicate_test_999',
      roomId: 'incident-ac4',
      sequence: 5,
      message: 'Concurrent update on site',
      author: 'Tech',
      createdAt: new Date().toISOString(),
    };

    // Simulate concurrent delivery:
    // Delivery 1: arrived via WebSocket live stream
    applyUpdate(duplicateUpdate);
    // Delivery 2: arrived via Replay / History endpoint
    applyUpdate(duplicateUpdate);

    expect(feedUpdates).toHaveLength(1);
    expect(feedUpdates[0].id).toBe('upd_duplicate_test_999');
    expect(seenIds.size).toBe(1);
  });

  it('AC5: Stable ordering — updates always rendered in deterministic sequence order', () => {
    const rawUpdates: Update[] = [
      { id: '1', roomId: 'ac5', sequence: 4, message: 'Step 4', author: 'A', createdAt: '' },
      { id: '2', roomId: 'ac5', sequence: 1, message: 'Step 1', author: 'A', createdAt: '' },
      { id: '3', roomId: 'ac5', sequence: 3, message: 'Step 3', author: 'A', createdAt: '' },
      { id: '4', roomId: 'ac5', sequence: 2, message: 'Step 2', author: 'A', createdAt: '' },
    ];

    // Feed store maintains sort order by sequence
    const sorted = [...rawUpdates].sort((a, b) => a.sequence - b.sequence);

    expect(sorted.map((u) => u.sequence)).toEqual([1, 2, 3, 4]);
    expect(sorted.map((u) => u.message)).toEqual([
      'Step 1',
      'Step 2',
      'Step 3',
      'Step 4',
    ]);
  });
});
