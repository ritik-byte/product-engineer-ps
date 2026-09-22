import React, { useState } from 'react';
import { ClientFeedView } from './components/ClientFeedView.js';

export const App: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const initialClientParam = urlParams.get('client')?.toUpperCase();
  const initialMode = initialClientParam === 'A' ? 'A' : initialClientParam === 'B' ? 'B' : 'DUAL';

  const [roomId, setRoomId] = useState('incident-101');
  const [inputRoomId, setInputRoomId] = useState('incident-101');
  const [showInspector, setShowInspector] = useState(false);
  const [viewMode, setViewMode] = useState<'DUAL' | 'A' | 'B'>(initialMode);

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputRoomId.trim()) {
      setRoomId(inputRoomId.trim());
    }
  };

  return (
    <div className="app-container">
      {/* Top Incident Command Navigation */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div className="brand-titles">
            <div className="brand-title-row">
              <span className="brand-title">Incident Response Feed</span>
              <span className="brand-tag">Problem 3</span>
            </div>
            <span className="brand-meta">Durable Real-Time Coordination • Monotonic Sequencer</span>
          </div>
        </div>

        <div className="header-controls">
          {/* Room Selector Form */}
          <form onSubmit={handleRoomSubmit} className="room-selector-form">
            <span className="room-prefix">ROOM:</span>
            <input
              type="text"
              value={inputRoomId}
              onChange={(e) => setInputRoomId(e.target.value)}
              className="room-input"
              placeholder="incident-id"
              title="Current Incident Room ID"
            />
            <button type="submit" className="btn-icon-subtle" title="Switch Incident Room">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </form>

          {/* View Mode Segmented Control */}
          <div className="segmented-control" role="group" aria-label="View Mode">
            <button
              type="button"
              className={`segmented-btn ${viewMode === 'DUAL' ? 'segmented-btn-active' : ''}`}
              onClick={() => setViewMode('DUAL')}
              title="Dual split view showing Client A and Client B side-by-side"
            >
              Dual Split
            </button>
            <button
              type="button"
              className={`segmented-btn ${viewMode === 'A' ? 'segmented-btn-active' : ''}`}
              onClick={() => setViewMode('A')}
              title="Focus Client A (HQ Dispatcher)"
            >
              Client A
            </button>
            <button
              type="button"
              className={`segmented-btn ${viewMode === 'B' ? 'segmented-btn-active' : ''}`}
              onClick={() => setViewMode('B')}
              title="Focus Client B (Field Lead)"
            >
              Client B
            </button>
          </div>

          {/* Reviewer / Protocol Inspector Toggle */}
          <button
            type="button"
            className={`btn-inspector-toggle ${showInspector ? 'btn-inspector-active' : ''}`}
            onClick={() => setShowInspector(!showInspector)}
            title="Toggle Evaluator Architecture & Acceptance Scenarios HUD"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Protocol Specs (AC1–AC5)</span>
          </button>
        </div>
      </header>

      {/* Evaluator Architecture & Scenario HUD */}
      {showInspector && (
        <section className="scenario-hud-drawer" aria-label="Acceptance Criteria HUD">
          <div className="hud-header">
            <div className="hud-title-group">
              <span className="hud-title">Evaluator Test Plan & Invariant Verification</span>
            </div>
            <span className="hud-subtitle">Fastify v5 • WebSocket Gateway • Cursor Replay • Stable Deduplication</span>
          </div>
          <div className="hud-grid">
            <div className="hud-card">
              <div className="hud-card-label">AC1 • Live Broadcast</div>
              <div className="hud-card-desc">Send update from Client A; Client B receives frame via WebSocket without refresh.</div>
              <div className="hud-card-code">WS: {`{type: "UPDATE", update}`}</div>
            </div>
            <div className="hud-card">
              <div className="hud-card-label">AC2 • Connection State</div>
              <div className="hud-card-desc">Click "Drop Socket" on Client B. State updates to Disconnected; backoff timer ticks on reconnect.</div>
              <div className="hud-card-code">delay = min(10s, base * 2^n) * jitter</div>
            </div>
            <div className="hud-card">
              <div className="hud-card-label">AC3 • Delta Recovery</div>
              <div className="hud-card-desc">Post while Client B is disconnected. Reconnect Client B to automatically fetch missed delta.</div>
              <div className="hud-card-code">GET /updates?after=cursor</div>
            </div>
            <div className="hud-card">
              <div className="hud-card-label">AC4 • Deduplication</div>
              <div className="hud-card-desc">Overlapping history replay and live socket events are filtered idempotently by stable update ID.</div>
              <div className="hud-card-code">seenIds: Set&lt;string&gt;</div>
            </div>
            <div className="hud-card">
              <div className="hud-card-label">AC5 • Strict Ordering</div>
              <div className="hud-card-desc">Updates are sequenced monotonically by server; UI renders strictly in sequence ASC order.</div>
              <div className="hud-card-code">sort((a, b) =&gt; a.seq - b.seq)</div>
            </div>
          </div>
        </section>
      )}

      {/* Main Dual Feed Grid */}
      <main className={`client-grid-container ${viewMode === 'DUAL' ? 'dual-client-grid' : 'single-client-grid'}`}>
        {(viewMode === 'DUAL' || viewMode === 'A') && (
          <ClientFeedView
            key={`client-a-${roomId}`}
            roomId={roomId}
            clientName="Client A"
            role="HQ Incident Dispatcher"
          />
        )}
        {(viewMode === 'DUAL' || viewMode === 'B') && (
          <ClientFeedView
            key={`client-b-${roomId}`}
            roomId={roomId}
            clientName="Client B"
            role="Field Operations Lead"
          />
        )}
      </main>

      {/* Architecture & Telemetry Footer */}
      <footer className="app-footer">
        <div className="footer-left">
          <span className="footer-pill">Transport: HTTP POST + WS</span>
          <span className="footer-pill">Sequencer: Monotonic Server Sequence</span>
          <span className="footer-pill">Durable: PostgreSQL / InMemory</span>
        </div>
        <div className="footer-right">
          <span className="footer-invariant">Invariant: Persist-Before-Broadcast</span>
          <span>•</span>
          <span className="footer-invariant">Client Deduplication</span>
        </div>
      </footer>
    </div>
  );
};
