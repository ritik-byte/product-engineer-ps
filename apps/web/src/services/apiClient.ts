import { HistoryQueryResponse, PublishUpdateInput, Update } from '@caygnus/shared';

const API_BASE = '/api';

export async function publishUpdate(
  roomId: string,
  input: PublishUpdateInput
): Promise<Update> {
  const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(roomId)}/updates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to publish update: ${res.statusText}`);
  }

  return res.json();
}

export async function fetchHistory(
  roomId: string,
  after = 0,
  limit = 50
): Promise<HistoryQueryResponse> {
  const url = `${API_BASE}/rooms/${encodeURIComponent(roomId)}/updates?after=${after}&limit=${limit}`;
  const res = await fetch(url);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to fetch history: ${res.statusText}`);
  }

  return res.json();
}
