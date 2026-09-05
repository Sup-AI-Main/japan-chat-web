/**
 * Lightweight admin API fetch helper.
 * Handles auth, 409 conflict, and common error patterns.
 * Does NOT change any API contract or response shape.
 */

export class ConflictError extends Error {
  constructor() {
    super("409_CONFLICT");
  }
}

export async function adminFetchJson<T = Record<string, unknown>>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (res.status === 409) {
    throw new ConflictError();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `요청 실패 (${res.status})`);
  }

  return res.json();
}