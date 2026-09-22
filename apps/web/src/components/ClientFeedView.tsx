import React from 'react';
import { useIncidentFeed } from '../hooks/useIncidentFeed.js';
import { ConnectionBadge } from './ConnectionBadge.js';
import { FeedList } from './FeedList.js';
import { UpdateComposer } from './UpdateComposer.js';

interface ClientFeedViewProps {
  roomId: string;
  clientName: string;
  role: string;
}

export const ClientFeedView: React.FC<ClientFeedViewProps> = ({
  roomId,
  clientName,
  role,
}) => {
  const {
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
  } = useIncidentFeed({ roomId, clientName });

  const isConnected = connectionState === 'CONNECTED';
  const isHQ = clientName.toLowerCase().includes('a') || role.toLowerCase().includes('dispatcher');

  return (
    <div className="client-feed-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="client-identity-group">
          <div className={`client-avatar ${isHQ ? 'avatar-hq' : 'avatar-field'}`}>
            {isHQ ? 'HQ' : 'FO'}
          </div>
          <div className="client-text-meta">
            <div className="client-name-row">
              <span className="client-title">{clientName}</span>
            </div>
            <span className="client-role-badge">{role}</span>
          </div>
        </div>

        <ConnectionBadge
          state={connectionState}
          attemptCount={attemptCount}
          nextRetryDelayMs={nextRetryDelayMs}
          isSyncing={isSyncing}
        />
      </div>

      {/* Telemetry & Developer Simulation Controls Bar */}
      <div className="panel-telemetry-bar">
        <div className="telemetry-metrics">
          <span className="metric-pill" title="Current monotonic sequence cursor">
            <span>SEQ</span>
            <strong>#{String(lastConfirmedSequence).padStart(3, '0')}</strong>
          </span>
          <span className="metric-pill" title="Total unique events in client store">
            <span>ITEMS</span>
            <strong>{updates.length}</strong>
          </span>
          {pendingQueueCount > 0 && (
            <span
              className="metric-pill pill-amber"
              title="Messages queued locally while offline waiting for reconnect"
            >
              <span>OUTBOX</span>
              <strong>{pendingQueueCount} QUEUED</strong>
            </span>
          )}
        </div>

        <div className="telemetry-actions">
          {isConnected ? (
            <>
              <button
                type="button"
                className="btn-sim btn-sim-disconnect"
                onClick={simulateDisconnect}
                title="Drop WebSocket connection indefinitely to test offline queuing & recovery"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                  <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                  <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
                  <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                  <line x1="12" y1="20" x2="12.01" y2="20" />
                </svg>
                <span>Drop Socket</span>
              </button>
              <button
                type="button"
                className="btn-sim btn-sim-glitch"
                onClick={simulateInterruption}
                title="Simulate a transient network drop with automatic exponential backoff (AC2)"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>Glitch</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-sim btn-sim-reconnect"
              onClick={reconnect}
              title="Reconnect to WebSocket, flush outbox messages, and replay missed updates"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <line x1="12" y1="20" x2="12.01" y2="20" />
              </svg>
              <span>Reconnect & Sync</span>
            </button>
          )}

          <button
            type="button"
            className="btn-sim btn-sim-sync"
            onClick={recoverMissedUpdates}
            disabled={isSyncing}
            title="Explicitly poll history endpoint after current cursor (GET /updates?after=cursor)"
          >
            <svg
              className={isSyncing ? 'icon-spin' : ''}
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>{isSyncing ? 'Replaying...' : 'Replay Delta'}</span>
          </button>
        </div>
      </div>

      {/* Disconnected Stream Warning Banner */}
      {!isConnected && (
        <div className="panel-disconnected-banner">
          <span className="disconnected-banner-dot" />
          <span>
            {pendingQueueCount > 0
              ? `${pendingQueueCount} message(s) in outbox — will automatically dispatch in sequence upon reconnect.`
              : connectionState === 'RECONNECTING'
              ? `Reconnecting with backoff (attempt #${attemptCount}). Messages typed now will queue.`
              : 'Socket disconnected. Messages typed now will queue locally and send automatically on reconnect.'}
          </span>
        </div>
      )}

      {/* Feed List */}
      <div className="panel-body">
        <FeedList updates={updates} />
      </div>

      {/* Message Composer - Always enabled so users can type and queue messages while offline */}
      <div className="panel-footer">
        <UpdateComposer
          onPublish={(msg) => publish(msg, clientName)}
          disabled={false}
          placeholder={
            isConnected
              ? `Broadcast update as ${clientName}...`
              : `Type offline message as ${clientName} (will queue & send on reconnect)...`
          }
        />
      </div>
    </div>
  );
};
