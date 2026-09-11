/**
 * Unified API Response Contract
 * All admin API routes must use these helpers to ensure consistent responses.
 *
 * Success: { success: true, data: ... }
 * Failure: { success: false, error: "...", code: "..." }
 *
 * Never return empty body / 204 for JSON endpoints.
 */

import { NextResponse } from "next/server";

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiFailure;

/** 200 success response */
export function ok<T>(data: T): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data });
}

/** 201 created response */
export function created<T>(data: T): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

/** 400 bad request */
export function badRequest(error: string, code = "BAD_REQUEST"): NextResponse<ApiFailure> {
  return NextResponse.json({ success: false, error, code }, { status: 400 });
}

/** 401 unauthorized */
export function unauthorized(): NextResponse<ApiFailure> {
  return NextResponse.json(
    { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
    { status: 401 }
  );
}

/** 404 not found */
export function notFound(message = "Not found"): NextResponse<ApiFailure> {
  return NextResponse.json({ success: false, error: message, code: "NOT_FOUND" }, { status: 404 });
}

/** 409 conflict (optimistic concurrency) */
export function conflict(message = "Conflict: data was modified by another user"): NextResponse<ApiFailure> {
  return NextResponse.json({ success: false, error: message, code: "CONFLICT" }, { status: 409 });
}

/** 500 internal error with safe message */
export function serverError(err: unknown): NextResponse<ApiFailure> {
  const msg = err instanceof Error ? err.message : "Server error";
  console.error("[API_ERROR]", msg);
  return NextResponse.json({ success: false, error: msg, code: "SERVER_ERROR" }, { status: 500 });
}

/** Safe JSON parse that never throws on empty/invalid body */
export async function safeJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  const text = await req.text();
  if (!text || text.trim().length === 0) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
