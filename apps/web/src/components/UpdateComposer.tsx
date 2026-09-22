import React, { useState, useRef, KeyboardEvent } from 'react';

interface UpdateComposerProps {
  onPublish: (message: string) => Promise<any>;
  disabled?: boolean;
  placeholder?: string;
}

export const UpdateComposer: React.FC<UpdateComposerProps> = ({
  onPublish,
  disabled = false,
  placeholder = 'Broadcast operational update to room...',
}) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed || isSubmitting || disabled) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onPublish(trimmed);
      setMessage('');
    } catch (err: any) {
      const msg =
        err.message === 'Failed to fetch' || err.name === 'TypeError'
          ? 'Network error: Cannot reach incident server'
          : err.message || 'Failed to publish';
      setError(msg);
    } finally {
      setIsSubmitting(false);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="update-composer">
      {error && <div className="composer-error">{error}</div>}
      <div className="composer-input-row">
        <input
          ref={inputRef}
          type="text"
          className="composer-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
        <span className="composer-shortcut-hint" title="Press Enter to send">
          ↵
        </span>
        <button
          type="button"
          className="composer-send-btn"
          onClick={handleSubmit}
          disabled={disabled || isSubmitting || !message.trim()}
          title="Broadcast update"
        >
          {isSubmitting ? (
            'Sending...'
          ) : (
            <>
              <span>Send</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
