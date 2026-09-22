import { Update } from '@caygnus/shared';
import { CreateUpdateParams, UpdateRepository } from '../domain/updateRepository.js';

export class InMemoryUpdateRepository implements UpdateRepository {
  private updatesByRoom = new Map<string, Update[]>();
  private allUpdatesById = new Map<string, Update>();

  async create(params: CreateUpdateParams): Promise<Update> {
    if (this.allUpdatesById.has(params.id)) {
      throw new Error(`Duplicate update ID: "${params.id}" already exists`);
    }

    const roomList = this.updatesByRoom.get(params.roomId) || [];
    const nextSequence = roomList.length > 0 ? roomList[roomList.length - 1].sequence + 1 : 1;

    const update: Update = {
      id: params.id,
      roomId: params.roomId,
      sequence: nextSequence,
      message: params.message,
      author: params.author,
      createdAt: new Date().toISOString(),
    };

    roomList.push(update);
    this.updatesByRoom.set(params.roomId, roomList);
    this.allUpdatesById.set(params.id, update);

    return { ...update };
  }

  async findAfterSequence(
    roomId: string,
    afterSequence: number,
    limit: number
  ): Promise<Update[]> {
    const roomList = this.updatesByRoom.get(roomId) || [];
    return roomList
      .filter((u) => u.sequence > afterSequence)
      .slice(0, limit)
      .map((u) => ({ ...u }));
  }

  async getLatestSequence(roomId: string): Promise<number> {
    const roomList = this.updatesByRoom.get(roomId) || [];
    if (roomList.length === 0) {
      return 0;
    }
    return roomList[roomList.length - 1].sequence;
  }

  async findById(id: string): Promise<Update | null> {
    const found = this.allUpdatesById.get(id);
    return found ? { ...found } : null;
  }
}
