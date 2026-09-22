import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IncidentFeedService } from '../../src/application/incidentFeedService.js';
import { InMemoryUpdateRepository } from '../../src/infrastructure/inMemoryUpdateRepository.js';
import { Update } from '@caygnus/shared';

describe('IncidentFeedService (Persist-Before-Broadcast & Recovery Logic)', () => {
  let repository: InMemoryUpdateRepository;
  let broadcastFn: (roomId: string, update: Update) => void;
  let service: IncidentFeedService;

  beforeEach(() => {
    repository = new InMemoryUpdateRepository();
    broadcastFn = vi.fn();
    service = new IncidentFeedService(repository, { broadcast: broadcastFn });
  });

  it('persists update to repository and then broadcasts over WebSocket', async () => {
    const created = await service.publishUpdate('incident-100', {
      message: 'Evacuation team deployed',
      author: 'Commander',
    });

    expect(created.sequence).toBe(1);
    expect(created.roomId).toBe('incident-100');
    expect(created.message).toBe('Evacuation team deployed');
    expect(created.id).toBeDefined();

    // Verify it exists in repository
    const stored = await repository.findById(created.id);
    expect(stored).toEqual(created);

    // Verify broadcast occurred
    expect(broadcastFn).toHaveBeenCalledTimes(1);
    expect(broadcastFn).toHaveBeenCalledWith('incident-100', created);
  });

  it('NEVER broadcasts if persistence fails', async () => {
    const errorRepo = {
      create: vi.fn().mockRejectedValue(new Error('Database disk full')),
      findAfterSequence: vi.fn(),
      getLatestSequence: vi.fn(),
      findById: vi.fn(),
    };

    const failingService = new IncidentFeedService(errorRepo as any, { broadcast: broadcastFn });

    await expect(
      failingService.publishUpdate('incident-100', {
        message: 'This should fail',
        author: 'Commander',
      })
    ).rejects.toThrow('Database disk full');

    // Broadcast must NEVER be called
    expect(broadcastFn).not.toHaveBeenCalled();
  });

  it('preserves client-assigned ID for idempotent recovery', async () => {
    const clientAssignedId = 'client-uuid-12345';
    const created = await service.publishUpdate('incident-100', {
      clientAssignedId,
      message: 'Idempotent test',
      author: 'Operator',
    });

    expect(created.id).toBe(clientAssignedId);
  });

  it('calculates hasMore and latestSequence in history recovery', async () => {
    for (let i = 1; i <= 5; i++) {
      await service.publishUpdate('incident-100', {
        message: `Status update ${i}`,
        author: 'System',
      });
    }

    // Query after sequence 2 with limit 2
    const page1 = await service.getHistory('incident-100', 2, 2);
    expect(page1.updates).toHaveLength(2);
    expect(page1.updates.map((u) => u.sequence)).toEqual([3, 4]);
    expect(page1.hasMore).toBe(true);
    expect(page1.latestSequence).toBe(5);

    // Query after sequence 4 with limit 2
    const page2 = await service.getHistory('incident-100', 4, 2);
    expect(page2.updates).toHaveLength(1);
    expect(page2.updates[0].sequence).toBe(5);
    expect(page2.hasMore).toBe(false);
  });
});
