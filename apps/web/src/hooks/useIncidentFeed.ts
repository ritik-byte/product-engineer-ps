import { useState, useEffect, useRef, useCallback } from 'react';
import { ConnectionState, ServerWsMessage, Update } from '@caygnus/shared';
import { createFeedStore, FeedStore } from '../state/feedStore.js';
import { calculateBackoffDelay } from '../state/backoff.js';
import { fetchHistory, publishUpdate } from '../services/apiClient.js';

export interface UseIncidentFeedOptions {
  roomId: string;
  clientName?: string;
  autoConnect?: boolean;
}

interface QueuedMessage {
  id: string;
  message: string;
  author: string;
}

export function useIncidentFeed({
  roomId,
  clientName = 'Client',
  autoConnect = true,
}: UseIncidentFeedOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');
  const [updates, setUpdates] = useState<Update[]>([]);
  const [lastConfirmedSequence, setLastConfirmedSequence] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [nextRetryDelayMs, setNextRetryDelayMs] = useState<number>(0);
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);

  const feedStoreRef = useRef<FeedStore | null>(null);
  if (!feedStoreRef.current) {
    feedStoreRef.current = createFeedStore();
  }
  const feedStore = feedStoreRef.current;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isManuallyDisconnectedRef = useRef<boolean>(!autoConnect);
  const attemptCountRef = useRef<number>(0);
  const outboxQueueRef = useRef<QueuedMessage[]>([]);

  // Sync store state to React local state
  useEffect(() => {
    const unsubscribe = feedStore.subscribe((state) => {
      setUpdates(state.updates);
      setLastConfirmedSequence(state.lastConfirmedSequence);
    });
    return unsubscribe;
  }, [feedStore]);

  // Recovery function: fetches all updates created after client's cursor
  const recoverMissedUpdates = useCallback(async () => {
    const currentCursor = feedStore.getState().lastConfirmedSequence;
    setIsSyncing(true);
    try {
      let hasMore = true;
      let cursor = currentCursor;

      while (hasMore) {
        const result = await fetchHistory(roomId, cursor, 50);
        if (result.updates && result.updates.length > 0) {
          feedStore.ingest(result.updates);
          cursor = result.updates[result.updates.length - 1].sequence;
          hasMore = result.hasMore;
        } else {
          hasMore = false;
        }
      }
    } catch (err) {
      console.error(`[${clientName}] Error recovering missed updates:`, err);
    } finally {
      setIsSyncing(false);
    }
  }, [roomId, clientName, feedStore]);

  // Flushes locally queued messages created while disconnected (WhatsApp-style outbound queue)
  const flushOutboxQueue = useCallback(async () => {
    if (outboxQueueRef.current.length === 0) {
      return;
    }

    const queueSnapshot = [...outboxQueueRef.current];
    outboxQueueRef.current = [];
    setPendingQueueCount(0);

    for (const item of queueSnapshot) {
      try {
        const confirmed = await publishUpdate(roomId, {
          clientAssignedId: item.id,
          message: item.message,
          author: item.author,
        });
        feedStore.ingest(confirmed);
      } catch (err) {
        console.error(`[${clientName}] Failed to flush queued message ${item.id}:`, err);
        // Put remaining un-sent items back in queue
        outboxQueueRef.current.unshift(item);
        setPendingQueueCount(outboxQueueRef.current.length);
        break;
      }
    }
  }, [roomId, clientName, feedStore]);

  // Connects WebSocket
  const connect = useCallback(() => {
    if (isManuallyDisconnectedRef.current) {
      return;
    }

    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    setConnectionState('CONNECTING');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:5173';
    const wsUrl = `${protocol}//${host}/ws/rooms/${encodeURIComponent(roomId)}`;

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = async () => {
      if (isManuallyDisconnectedRef.current || wsRef.current !== socket) {
        socket.close();
        return;
      }
      setConnectionState('CONNECTED');
      attemptCountRef.current = 0;
      setAttemptCount(0);
      setNextRetryDelayMs(0);

      // 1. Recover missed updates from other clients FIRST using pre-disconnect cursor
      await recoverMissedUpdates();

      // 2. Flush any queued messages that were typed while disconnected
      await flushOutboxQueue();

      // 3. Final recovery pass to ensure no race conditions
      await recoverMissedUpdates();
    };

    socket.onmessage = (event) => {
      if (isManuallyDisconnectedRef.current || wsRef.current !== socket) {
        return;
      }
      try {
        const msg: ServerWsMessage = JSON.parse(event.data);
        if (msg.type === 'UPDATE') {
          // Ingest live update into single central deduplicating store
          feedStore.ingest(msg.update);
        }
      } catch (err) {
        console.error(`[${clientName}] Failed to parse incoming WebSocket message:`, err);
      }
    };

    socket.onclose = () => {
      if (wsRef.current === socket) {
        wsRef.current = null;
      }

      if (isManuallyDisconnectedRef.current) {
        setConnectionState('DISCONNECTED');
        return;
      }

      // Transition to RECONNECTING and schedule with exponential backoff + jitter
      setConnectionState('RECONNECTING');
      attemptCountRef.current += 1;
      const nextAttempt = attemptCountRef.current;
      const delay = calculateBackoffDelay(nextAttempt);
      setAttemptCount(nextAttempt);
      setNextRetryDelayMs(delay);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    socket.onerror = () => {
      // Handled via onclose
    };
  }, [roomId, clientName, feedStore, flushOutboxQueue, recoverMissedUpdates]);

  // Manual disconnect control (stays disconnected indefinitely until explicit reconnect)
  const simulateDisconnect = useCallback(() => {
    isManuallyDisconnectedRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      const socket = wsRef.current;
      wsRef.current = null;
      socket.onmessage = null;
      socket.onopen = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close();
    }
    setConnectionState('DISCONNECTED');
  }, []);

  // Transient network interruption (tests automatic backoff and reconnection - AC2)
  const simulateInterruption = useCallback(() => {
    isManuallyDisconnectedRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  // Manual reconnect control
  const reconnect = useCallback(async () => {
    isManuallyDisconnectedRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    attemptCountRef.current = 0;
    setAttemptCount(0);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      await recoverMissedUpdates();
      await flushOutboxQueue();
      await recoverMissedUpdates();
    } else {
      connect();
    }
  }, [connect, recoverMissedUpdates, flushOutboxQueue]);

  // Publish update: if connected, sends immediately; if disconnected/offline, queues optimistically!
  const publish = useCallback(
    async (message: string, author?: string) => {
      const resolvedAuthor = author || clientName;
      const clientId = `upd_cli_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // If online and connected, attempt immediate network broadcast
      if (!isManuallyDisconnectedRef.current && connectionState === 'CONNECTED') {
        try {
          const update = await publishUpdate(roomId, {
            clientAssignedId: clientId,
            message,
            author: resolvedAuthor,
          });
          feedStore.ingest(update);
          return update;
        } catch (err) {
          console.warn(`[${clientName}] Immediate publish failed, falling back to queued outbox:`, err);
        }
      }

      // Offline / Disconnected: Optimistic local ingestion + queue for delivery on reconnect
      const pendingUpdate: Update = {
        id: clientId,
        roomId,
        sequence: 0, // indicates pending
        message,
        author: resolvedAuthor,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };

      feedStore.ingest(pendingUpdate);
      outboxQueueRef.current.push({
        id: clientId,
        message,
        author: resolvedAuthor,
      });
      setPendingQueueCount(outboxQueueRef.current.length);

      return pendingUpdate;
    },
    [roomId, clientName, feedStore, connectionState]
  );

  // Auto-connect on mount and cleanup on unmount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [autoConnect, connect]);

  return {
    connectionState,
    updates,
    lastConfirmedSequence,
    isSyncing,
    attemptCount,
    nextRetryDelayMs,
    pendingQueueCount,
    publish,
    simulateDisconnect,
    simulateInterruption,
    reconnect,
    recoverMissedUpdates,
  };
}
