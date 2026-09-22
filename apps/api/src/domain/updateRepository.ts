import { Update } from '@caygnus/shared';

export interface CreateUpdateParams {
  id: string;
  roomId: string;
  message: string;
  author: string;
}

export interface UpdateRepository {
  create(params: CreateUpdateParams): Promise<Update>;
  findAfterSequence(
    roomId: string,
    afterSequence: number,
    limit: number
  ): Promise<Update[]>;
  getLatestSequence(roomId: string): Promise<number>;
  findById(id: string): Promise<Update | null>;
}
