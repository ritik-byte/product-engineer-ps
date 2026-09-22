import React, { useEffect, useRef } from 'react';
import { Update } from '@caygnus/shared';

interface FeedListProps {
  updates: Update[];
}

export const FeedList: React.FC<FeedListProps> = ({ updates }) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Smooth scroll when new items arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [updates.length]);

  if (updates.length === 0) {
    return (
      <div className="feed-empty-state">
        <div className="empty-radar-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
            <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
            <circle cx="12" cy="12" r="2" />
            <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
            <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
          </svg>
        </div>
        <div className="empty-title">Awaiting Incident Updates</div>
        <div className="empty-subtitle">
          Feed is synchronized with server. Broadcast an update below to begin real-time coordination.
        </div>
      </div>
    );
  }

  return (
    <div className="feed-list" role="log" aria-live="polite">
      {updates.map((update) => {
        const isPending = update.status === 'pending' || update.sequence <= 0;
        const timeStr = update.createdAt
          ? new Date(update.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          : '';

        const isHQ = update.author?.toLowerCase().includes('a') || update.author?.toLowerCase().includes('hq');

        return (
          <div
            key={update.id}
            className={`feed-item ${isPending ? 'feed-item-pending' : ''}`}
            data-sequence={update.sequence}
          >
            <div className="feed-item-header">
              {isPending ? (
                <span
                  className="sequence-tag tag-pending"
                  title="Queued locally while offline — will broadcast automatically upon reconnect"
                >
                  ⏳ QUEUED
                </span>
              ) : (
                <span className="sequence-tag" title="Authoritative monotonic server sequence">
                  #{String(update.sequence).padStart(3, '0')}
                </span>
              )}
              <span className={`author-pill ${isHQ ? 'author-hq-badge' : 'author-field-badge'}`}>
                {update.author}
              </span>
              <span className="item-timestamp">
                {isPending ? 'Waiting for reconnect' : timeStr}
              </span>
              <span className="item-stable-id" title={`Stable UUID: ${update.id}`}>
                {update.id.slice(0, 12)}
              </span>
            </div>
            <div className="feed-item-message">{update.message}</div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};
