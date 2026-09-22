import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { PrismaClient } from '@prisma/client';
import { loadConfig } from './config/env.js';
import { UpdateRepository } from './domain/updateRepository.js';
import { InMemoryUpdateRepository } from './infrastructure/inMemoryUpdateRepository.js';
import { PrismaUpdateRepository } from './infrastructure/prismaUpdateRepository.js';
import { IncidentFeedService } from './application/incidentFeedService.js';
import { RoomGateway } from './interfaces/websocket/roomGateway.js';
import { registerHttpRoutes } from './interfaces/http/routes.js';

export interface ServerOptions {
  repository?: UpdateRepository;
  logLevel?: string;
}

export function buildServer(options: ServerOptions = {}): FastifyInstance {
  const app = fastify({
    logger: options.logLevel ? { level: options.logLevel } : false,
  });

  const config = loadConfig();

  // 1. Register plugins
  app.register(cors, {
    origin: '*', // Allow local frontend clients
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  app.register(websocket);

  // 2. Initialize layers
  const roomGateway = new RoomGateway();

  let repository: UpdateRepository;
  if (options.repository) {
    repository = options.repository;
  } else if (config.USE_IN_MEMORY_DB) {
    console.log('[Server] Using InMemoryUpdateRepository (USE_IN_MEMORY_DB=true)');
    repository = new InMemoryUpdateRepository();
  } else {
    try {
      const prisma = new PrismaClient();
      repository = new PrismaUpdateRepository(prisma);
    } catch (err) {
      console.warn('[Server] Could not initialize Prisma client, falling back to InMemoryUpdateRepository:', err);
      repository = new InMemoryUpdateRepository();
    }
  }

  const service = new IncidentFeedService(repository, roomGateway);

  // 3. Register HTTP routes
  registerHttpRoutes(app, service);

  // 4. Register WebSocket gateway endpoint
  app.register(async (fastifyInstance) => {
    fastifyInstance.get(
      '/ws/rooms/:roomId',
      { websocket: true },
      async (connection: any, req: any) => {
        const socket = connection.socket ?? connection;
        const { roomId } = req.params as { roomId: string };
        const latestSequence = await repository.getLatestSequence(roomId);
        roomGateway.registerClient(socket, roomId, latestSequence);
      }
    );
  });

  return app;
}

async function startServer(): Promise<void> {
  const config = loadConfig();
  const server = buildServer({ logLevel: 'info' });

  try {
    const address = await server.listen({
      port: config.PORT,
      host: config.HOST,
    });
    console.log(`[Server] Incident feed API & WebSocket live at ${address}`);
  } catch (err) {
    console.error('[Server] Failed to start server:', err);
    process.exit(1);
  }
}

// Start if executed directly
if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  startServer();
}
