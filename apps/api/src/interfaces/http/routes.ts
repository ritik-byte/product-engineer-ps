import { FastifyInstance } from 'fastify';
import { historyQuerySchema, publishUpdateSchema } from '@caygnus/shared';
import { IncidentFeedService } from '../../application/incidentFeedService.js';

export const registerHttpRoutes = (
  app: FastifyInstance,
  service: IncidentFeedService
): void => {
  // Health check endpoint
  app.get('/api/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'caygnus-realtime-feed',
    };
  });

  // Publish update
  app.post<{
    Params: { roomId: string };
  }>('/api/rooms/:roomId/updates', async (request, reply) => {
    const { roomId } = request.params;
    if (!roomId || roomId.trim().length === 0) {
      return reply.status(400).send({ error: 'Room ID is required' });
    }

    const parseResult = publishUpdateSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.flatten(),
      });
    }

    try {
      const created = await service.publishUpdate(roomId, parseResult.data);
      return reply.status(201).send(created);
    } catch (err: any) {
      request.log.error(err, 'Failed to publish update');
      return reply.status(500).send({
        error: 'Failed to persist update',
        message: err.message,
      });
    }
  });

  // Query / replay updates after cursor
  app.get<{
    Params: { roomId: string };
    Querystring: { after?: string; limit?: string };
  }>('/api/rooms/:roomId/updates', async (request, reply) => {
    const { roomId } = request.params;
    if (!roomId || roomId.trim().length === 0) {
      return reply.status(400).send({ error: 'Room ID is required' });
    }

    const parseResult = historyQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: parseResult.error.flatten(),
      });
    }

    const { after, limit } = parseResult.data;

    try {
      const history = await service.getHistory(roomId, after, limit);
      return reply.status(200).send(history);
    } catch (err: any) {
      request.log.error(err, 'Failed to retrieve update history');
      return reply.status(500).send({
        error: 'Failed to retrieve update history',
        message: err.message,
      });
    }
  });
};
