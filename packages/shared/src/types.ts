export interface Update {
  id: string;
  roomId: string;
  sequence: number;
  message: string;
  author: string;
  createdAt: string; // ISO 8601 string
  status?: 'pending' | 'confirmed';
}

export interface PublishUpdateInput {
  clientAssignedId?: string;
  message: string;
  author?: string;
}

export interface HistoryQueryResponse {
  roomId: string;
  updates: Update[];
  latestSequence: number;
  hasMore: boolean;
}

export type ConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING';

export type ClientWsMessage =
  | {
      type: 'SUBSCRIBE';
      roomId: string;
      afterSequence?: number;
    }
  | {
      type: 'PING';
    };

export type ServerWsMessage =
  | {
      type: 'SUBSCRIBED';
      roomId: string;
      serverTime: string;
      latestSequence: number;
    }
  | {
      type: 'UPDATE';
      update: Update;
    }
  | {
      type: 'PONG';
    }
  | {
      type: 'ERROR';
      code: string;
      message: string;
    };
