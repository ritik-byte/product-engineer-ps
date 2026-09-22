import crypto from 'node:crypto';
import { HistoryQueryResponse, PublishUpdateInput, Update } from '@caygnus/shared';
import { UpdateRepository } from '../domain/updateRepository.js';

export interface Broadcaster {
  broadcast(roomId: string, update: Update): void;
}

export class IncidentFeedService {
  constructor(
    private readonly repository: UpdateRepository,
    private readonly broadcaster: Broadcaster
  ) {}

  async publishUpdate(
    roomId: string,
    input: PublishUpdateInput
  ): Promise<Update> {
    // 0. Outbound idempotency check for retried/offline queued updates
    if (input.clientAssignedId) {
      const existing = await this.repository.findById(input.clientAssignedId);
      if (existing) {
        return existing;
      }
    }

    const id = input.clientAssignedId || `upd_${crypto.randomUUID().replace(/-/g, '')}`;
    const author = input.author?.trim() || 'Anonymous';
    const message = input.message.trim();

    // 1. Durably persist before broadcast (Persist-Before-Broadcast Invariant)
    const update = await this.repository.create({
      id,
      roomId,
      message,
      author,
    });

    // 2. Broadcast transiently over WebSocket
    try {
      this.broadcaster.broadcast(roomId, update);
    } catch (err) {
      // In a production system, log broadcast failure.
      // The update is already durable in PostgreSQL; disconnected/lagging clients will recover it via replay.
      console.error(`[IncidentFeedService] Transient broadcast error for room ${roomId}:`, err);
    }

    return update;
  }

  async getHistory(
    roomId: string,
    afterSequence: number,
    limit: number
  ): Promise<HistoryQueryResponse> {
    // Fetch limit + 1 to reliably detect hasMore without an extra COUNT query
    const results = await this.repository.findAfterSequence(
      roomId,
      afterSequence,
      limit + 1
    );

    const hasMore = results.length > limit;
    const updates = hasMore ? results.slice(0, limit) : results;
    const latestSequence = await this.repository.getLatestSequence(roomId);

    return {
      roomId,
      updates,
      latestSequence,
      hasMore,
    };
  }
}
