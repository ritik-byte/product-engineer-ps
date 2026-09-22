import React from 'react';
import { ConnectionState } from '@caygnus/shared';

interface ConnectionBadgeProps {
  state: ConnectionState;
  attemptCount?: number;
  nextRetryDelayMs?: number;
  isSyncing?: boolean;
}

export const ConnectionBadge: React.FC<ConnectionBadgeProps> = ({
  state,
  attemptCount = 0,
  nextRetryDelayMs = 0,
  isSyncing = false,
}) => {
  const renderStatus = () => {
    switch (state) {
      case 'CONNECTED':
        return (
          <span className="status-indicator status-indicator-connected">
            <span className="status-dot-pulse" />
            <span>Live Feed</span>
          </span>
        );
      case 'CONNECTING':
        return (
          <span className="status-indicator status-indicator-connecting">
            <svg
              className="icon-spin"
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            <span>Connecting...</span>
          </span>
        );
      case 'RECONNECTING':
        return (
          <span className="status-indicator status-indicator-reconnecting">
            <span className="status-dot-pulse" style={{ backgroundColor: 'currentColor' }} />
            <span>
              Reconnecting #{attemptCount} (~{(nextRetryDelayMs / 1000).toFixed(1)}s)
            </span>
          </span>
        );
      case 'DISCONNECTED':
      default:
        return (
          <span className="status-indicator status-indicator-disconnected">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'currentColor',
              }}
            />
            <span>Disconnected</span>
          </span>
        );
    }
  };

  return (
    <div className="connection-badge-wrap">
      {renderStatus()}
      {isSyncing && (
        <span className="sync-spinner-text">
          <svg
            className="icon-spin"
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          Syncing delta...
        </span>
      )}
    </div>
  );
};
