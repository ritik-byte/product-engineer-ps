import { Update } from '@caygnus/shared';

export interface FeedState {
  updates: Update[];
  seenIds: Set<string>;
  lastConfirmedSequence: number;
}

export interface FeedStore {
  getState(): FeedState;
  ingest(items: Update | Update[]): boolean; // returns true if any new updates were added or updated
  reset(): void;
  subscribe(listener: (state: FeedState) => void): () => void;
}

export function createFeedStore(): FeedStore {
  let state: FeedState = {
    updates: [],
    seenIds: new Set<string>(),
    lastConfirmedSequence: 0,
  };

  const listeners = new Set<(state: FeedState) => void>();

  const notify = () => {
    listeners.forEach((l) => l(state));
  };

  return {
    getState: () => ({
      ...state,
      updates: [...state.updates],
      seenIds: new Set(state.seenIds),
    }),

    ingest: (items: Update | Update[]): boolean => {
      const incomingList = Array.isArray(items) ? items : [items];
      const newItems: Update[] = [];
      let updatedAny = false;
      const currentUpdates = [...state.updates];

      for (const item of incomingList) {
        if (!item || !item.id) {
          continue;
        }

        // Check if this item exists (e.g., an optimistic pending item transitioning to confirmed)
        const existingIndex = currentUpdates.findIndex((u) => u.id === item.id);
        if (existingIndex >= 0) {
          const existing = currentUpdates[existingIndex];
          // If incoming is confirmed (> 0) and existing was pending
          if (item.sequence > 0 && (existing.status === 'pending' || existing.sequence <= 0)) {
            currentUpdates[existingIndex] = {
              ...item,
              status: 'confirmed',
            };
            state.seenIds.add(item.id);
            updatedAny = true;
          }
          continue;
        }

        if (state.seenIds.has(item.id)) {
          continue; // Idempotent drop of duplicate
        }

        state.seenIds.add(item.id);
        newItems.push(item);
        updatedAny = true;
      }

      if (!updatedAny && newItems.length === 0) {
        return false;
      }

      const allUpdates = [...currentUpdates, ...newItems];

      // Sort: Confirmed updates sorted by sequence ASC; pending updates at the end by createdAt
      const confirmed = allUpdates
        .filter((u) => u.sequence > 0 && u.status !== 'pending')
        .sort((a, b) => a.sequence - b.sequence);

      const pending = allUpdates
        .filter((u) => u.status === 'pending' || u.sequence <= 0)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const merged = [...confirmed, ...pending];

      // Advance sequence cursor monotonically from confirmed items
      const maxSeq = confirmed.reduce(
        (max, u) => Math.max(max, u.sequence),
        state.lastConfirmedSequence
      );

      state = {
        updates: merged,
        seenIds: state.seenIds,
        lastConfirmedSequence: maxSeq,
      };

      notify();
      return true;
    },

    reset: () => {
      state = {
        updates: [],
        seenIds: new Set(),
        lastConfirmedSequence: 0,
      };
      notify();
    },

    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
