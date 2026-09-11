/**
 * Lightweight admin API fetch helper.
 * Handles auth, 409 conflict, empty body, and common error patterns.
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

  // Safe body reading: never crash on empty/invalid response
  const text = await res.text();
  let body: Record<string, unknown> = {};

  if (text && text.trim().length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`서버 응답을 파싱할 수 없습니다 (${res.status})`);
    }
  }

  if (!res.ok) {
    const errorMsg =
      (body.error as string) ||
      (body.message as string) ||
      `요청 실패 (${res.status})`;
    const errorCode = (body.code as string) || undefined;
    const err = new Error(errorMsg);
    if (errorCode) (err as unknown as Record<string, unknown>).code = errorCode;
    throw err;
  }

  // If body is empty (e.g., 204 or no content), return empty object
  if (!text || text.trim().length === 0) {
    return {} as T;
  }

  return body as T;
}
