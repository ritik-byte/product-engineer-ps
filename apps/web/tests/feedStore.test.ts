import { describe, it, expect } from 'vitest';
import { createFeedStore } from '../src/state/feedStore.js';
import { Update } from '@caygnus/shared';

describe('Client FeedStore (Deduplication, Ordering, Cursor Tracking)', () => {
  it('appends unique updates and updates lastConfirmedSequence', () => {
    const store = createFeedStore();

    const u1: Update = {
      id: 'upd-1',
      roomId: 'room-1',
      sequence: 1,
      message: 'First',
      author: 'Alice',
      createdAt: new Date().toISOString(),
    };
    const u2: Update = {
      id: 'upd-2',
      roomId: 'room-1',
      sequence: 2,
      message: 'Second',
      author: 'Bob',
      createdAt: new Date().toISOString(),
    };

    store.ingest([u1, u2]);

    expect(store.getState().updates).toHaveLength(2);
    expect(store.getState().lastConfirmedSequence).toBe(2);
  });

  it('rejects duplicate updates by stable update ID (AC4)', () => {
    const store = createFeedStore();

    const u1: Update = {
      id: 'upd-dup',
      roomId: 'room-1',
      sequence: 1,
      message: 'Duplicate msg',
      author: 'Alice',
      createdAt: new Date().toISOString(),
    };

    store.ingest(u1);
    expect(store.getState().updates).toHaveLength(1);

    // Re-ingest same update (e.g. delivered via history and WebSocket)
    store.ingest(u1);
    expect(store.getState().updates).toHaveLength(1);
    expect(store.getState().lastConfirmedSequence).toBe(1);
  });

  it('deduplicates an update ingested immediately on publish when re-delivered via WebSocket broadcast or replay (AC4)', () => {
    const store = createFeedStore();

    const publishedUpdate: Update = {
      id: 'pub-100',
      roomId: 'incident-101',
      sequence: 5,
      message: 'Evacuation in progress',
      author: 'Client B',
      createdAt: new Date().toISOString(),
    };

    // 1. Immediate local ingestion on HTTP publish success
    const firstIngest = store.ingest(publishedUpdate);
    expect(firstIngest).toBe(true);
    expect(store.getState().updates).toHaveLength(1);
    expect(store.getState().lastConfirmedSequence).toBe(5);

    // 2. Incoming duplicate WebSocket frame or history recovery replay
    const secondIngest = store.ingest(publishedUpdate);
    expect(secondIngest).toBe(false); // correctly rejected as duplicate
    expect(store.getState().updates).toHaveLength(1);
    expect(store.getState().updates[0].message).toBe('Evacuation in progress');
    expect(store.getState().lastConfirmedSequence).toBe(5);
  });

  it('orders out-of-order arrivals strictly by sequence (AC5)', () => {
    const store = createFeedStore();

    const u1: Update = {
      id: 'upd-1',
      roomId: 'room-1',
      sequence: 1,
      message: 'One',
      author: 'Alice',
      createdAt: '',
    };
    const u3: Update = {
      id: 'upd-3',
      roomId: 'room-1',
      sequence: 3,
      message: 'Three',
      author: 'Alice',
      createdAt: '',
    };
    const u2: Update = {
      id: 'upd-2',
      roomId: 'room-1',
      sequence: 2,
      message: 'Two',
      author: 'Alice',
      createdAt: '',
    };

    // Arrives in order: 3, then 1, then 2
    store.ingest(u3);
    store.ingest(u1);
    store.ingest(u2);

    const updates = store.getState().updates;
    expect(updates.map((u) => u.sequence)).toEqual([1, 2, 3]);
    expect(updates.map((u) => u.message)).toEqual(['One', 'Two', 'Three']);
    expect(store.getState().lastConfirmedSequence).toBe(3);
  });

  it('handles empty batch gracefully without corrupting cursor', () => {
    const store = createFeedStore();
    store.ingest([]);
    expect(store.getState().updates).toHaveLength(0);
    expect(store.getState().lastConfirmedSequence).toBe(0);
  });

  it('correctly transitions offline pending updates to confirmed sequence order (WhatsApp-style)', () => {
    const store = createFeedStore();

    // 1. Existing confirmed update #1
    store.ingest({
      id: 'upd-1',
      roomId: 'room-1',
      sequence: 1,
      message: 'Hello from A',
      author: 'Client A',
      createdAt: '2026-09-18T10:00:00Z',
    });

    // 2. Client B is offline and creates 2 pending messages
    const pending1: Update = {
      id: 'upd-b-1',
      roomId: 'room-1',
      sequence: 0,
      message: 'Offline message 1 from B',
      author: 'Client B',
      createdAt: '2026-09-18T10:01:00Z',
      status: 'pending',
    };
    const pending2: Update = {
      id: 'upd-b-2',
      roomId: 'room-1',
      sequence: 0,
      message: 'Offline message 2 from B',
      author: 'Client B',
      createdAt: '2026-09-18T10:01:05Z',
      status: 'pending',
    };

    store.ingest([pending1, pending2]);
    expect(store.getState().updates).toHaveLength(3);
    expect(store.getState().updates[1].status).toBe('pending');
    expect(store.getState().updates[2].status).toBe('pending');
    expect(store.getState().lastConfirmedSequence).toBe(1);

    // 3. Reconnect occurs: server confirms pending1 with sequence 2 and pending2 with sequence 3
    const confirmed1: Update = {
      id: 'upd-b-1',
      roomId: 'room-1',
      sequence: 2,
      message: 'Offline message 1 from B',
      author: 'Client B',
      createdAt: '2026-09-18T10:01:00Z',
    };
    const confirmed2: Update = {
      id: 'upd-b-2',
      roomId: 'room-1',
      sequence: 3,
      message: 'Offline message 2 from B',
      author: 'Client B',
      createdAt: '2026-09-18T10:01:05Z',
    };

    store.ingest([confirmed1, confirmed2]);

    const finalUpdates = store.getState().updates;
    expect(finalUpdates).toHaveLength(3);
    expect(finalUpdates.map((u) => u.sequence)).toEqual([1, 2, 3]);
    expect(finalUpdates.every((u) => u.status !== 'pending')).toBe(true);
    expect(store.getState().lastConfirmedSequence).toBe(3);
  });
});
