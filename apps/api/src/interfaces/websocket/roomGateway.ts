import { WebSocket } from 'ws';
import { ServerWsMessage, Update } from '@caygnus/shared';
import { Broadcaster } from '../../application/incidentFeedService.js';

export class RoomGateway implements Broadcaster {
  private rooms = new Map<string, Set<WebSocket>>();

  registerClient(socket: WebSocket, roomId: string, latestSequence = 0): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    const roomSockets = this.rooms.get(roomId)!;
    roomSockets.add(socket);

    // Send SUBSCRIBED confirmation
    const ack: ServerWsMessage = {
      type: 'SUBSCRIBED',
      roomId,
      serverTime: new Date().toISOString(),
      latestSequence,
    };
    this.safeSend(socket, ack);

    socket.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === 'PING') {
          const pong: ServerWsMessage = { type: 'PONG' };
          this.safeSend(socket, pong);
        }
      } catch {
        const err: ServerWsMessage = {
          type: 'ERROR',
          code: 'BAD_REQUEST',
          message: 'Invalid JSON payload',
        };
        this.safeSend(socket, err);
      }
    });

    const cleanup = () => {
      roomSockets.delete(socket);
      if (roomSockets.size === 0) {
        this.rooms.delete(roomId);
      }
    };

    socket.on('close', cleanup);
    socket.on('error', cleanup);
  }

  broadcast(roomId: string, update: Update): void {
    const roomSockets = this.rooms.get(roomId);
    if (!roomSockets || roomSockets.size === 0) {
      return;
    }

    const payload: ServerWsMessage = {
      type: 'UPDATE',
      update,
    };

    for (const socket of roomSockets) {
      this.safeSend(socket, payload);
    }
  }

  getSubscriberCount(roomId: string): number {
    return this.rooms.get(roomId)?.size ?? 0;
  }

  private safeSend(socket: WebSocket, message: ServerWsMessage): void {
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(message));
      } catch (err) {
        console.error('Failed to send WebSocket frame:', err);
      }
    }
  }
}
