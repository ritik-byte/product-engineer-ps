import { PrismaClient } from '@prisma/client';
import { Update } from '@caygnus/shared';
import { CreateUpdateParams, UpdateRepository } from '../domain/updateRepository.js';

export class PrismaUpdateRepository implements UpdateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(params: CreateUpdateParams): Promise<Update> {
    return await this.prisma.$transaction(async (tx) => {
      // Find current maximum sequence for this room
      const latest = await tx.update.findFirst({
        where: { roomId: params.roomId },
        orderBy: { sequence: 'desc' },
        select: { sequence: true },
      });

      const nextSequence = (latest?.sequence ?? 0) + 1;

      const record = await tx.update.create({
        data: {
          id: params.id,
          roomId: params.roomId,
          sequence: nextSequence,
          message: params.message,
          author: params.author,
        },
      });

      return {
        id: record.id,
        roomId: record.roomId,
        sequence: record.sequence,
        message: record.message,
        author: record.author,
        createdAt: record.createdAt.toISOString(),
      };
    });
  }

  async findAfterSequence(
    roomId: string,
    afterSequence: number,
    limit: number
  ): Promise<Update[]> {
    const records = await this.prisma.update.findMany({
      where: {
        roomId,
        sequence: { gt: afterSequence },
      },
      orderBy: { sequence: 'asc' },
      take: limit,
    });

    return records.map((r) => ({
      id: r.id,
      roomId: r.roomId,
      sequence: r.sequence,
      message: r.message,
      author: r.author,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getLatestSequence(roomId: string): Promise<number> {
    const latest = await this.prisma.update.findFirst({
      where: { roomId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });
    return latest?.sequence ?? 0;
  }

  async findById(id: string): Promise<Update | null> {
    const record = await this.prisma.update.findUnique({
      where: { id },
    });

    if (!record) return null;

    return {
      id: record.id,
      roomId: record.roomId,
      sequence: record.sequence,
      message: record.message,
      author: record.author,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
