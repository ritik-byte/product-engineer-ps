import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUpdateRepository } from '../../src/infrastructure/inMemoryUpdateRepository.js';

describe('UpdateRepository (In-Memory Implementation & Contract Test)', () => {
  let repository: InMemoryUpdateRepository;

  beforeEach(() => {
    repository = new InMemoryUpdateRepository();
  });

  it('assigns contiguous monotonic sequence numbers starting at 1 per room', async () => {
    const upd1 = await repository.create({
      id: 'upd_1',
      roomId: 'room-101',
      message: 'First update',
      author: 'Alice',
    });
    const upd2 = await repository.create({
      id: 'upd_2',
      roomId: 'room-101',
      message: 'Second update',
      author: 'Bob',
    });

    expect(upd1.sequence).toBe(1);
    expect(upd2.sequence).toBe(2);
    expect(upd1.roomId).toBe('room-101');
    expect(upd2.roomId).toBe('room-101');
  });

  it('isolates sequence counters across different rooms', async () => {
    const r1Upd1 = await repository.create({
      id: 'upd_r1_1',
      roomId: 'room-1',
      message: 'Room 1 message',
      author: 'Alice',
    });
    const r2Upd1 = await repository.create({
      id: 'upd_r2_1',
      roomId: 'room-2',
      message: 'Room 2 message',
      author: 'Bob',
    });

    expect(r1Upd1.sequence).toBe(1);
    expect(r2Upd1.sequence).toBe(1);
  });

  it('queries updates strictly greater than afterSequence in ascending sequence order', async () => {
    for (let i = 1; i <= 5; i++) {
      await repository.create({
        id: `upd_${i}`,
        roomId: 'room-test',
        message: `Message ${i}`,
        author: 'User',
      });
    }

    const replayed = await repository.findAfterSequence('room-test', 3, 10);
    expect(replayed).toHaveLength(2);
    expect(replayed[0].sequence).toBe(4);
    expect(replayed[1].sequence).toBe(5);
    expect(replayed[0].id).toBe('upd_4');
    expect(replayed[1].id).toBe('upd_5');
  });

  it('enforces room isolation during history replay', async () => {
    await repository.create({
      id: 'rA_1',
      roomId: 'room-A',
      message: 'Confidential Room A',
      author: 'Alice',
    });
    await repository.create({
      id: 'rB_1',
      roomId: 'room-B',
      message: 'Confidential Room B',
      author: 'Bob',
    });

    const roomAUpdates = await repository.findAfterSequence('room-A', 0, 10);
    expect(roomAUpdates).toHaveLength(1);
    expect(roomAUpdates[0].id).toBe('rA_1');
    expect(roomAUpdates[0].message).toBe('Confidential Room A');
  });

  it('rejects duplicate update ID', async () => {
    await repository.create({
      id: 'duplicate-id',
      roomId: 'room-1',
      message: 'First attempt',
      author: 'Alice',
    });

    await expect(
      repository.create({
        id: 'duplicate-id',
        roomId: 'room-1',
        message: 'Second attempt with same ID',
        author: 'Alice',
      })
    ).rejects.toThrow(/duplicate update id/i);
  });

  it('respects limit parameter', async () => {
    for (let i = 1; i <= 10; i++) {
      await repository.create({
        id: `upd_${i}`,
        roomId: 'room-limit',
        message: `Message ${i}`,
        author: 'User',
      });
    }

    const replayed = await repository.findAfterSequence('room-limit', 0, 3);
    expect(replayed).toHaveLength(3);
    expect(replayed.map((u) => u.sequence)).toEqual([1, 2, 3]);
  });
});
