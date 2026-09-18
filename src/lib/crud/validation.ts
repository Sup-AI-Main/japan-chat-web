/**
 * Common validation helpers for admin CRUD operations.
 */

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export function isNonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function isUrl(v: unknown): boolean {
  if (typeof v !== "string" || !v) return true; // empty is OK (optional URL)
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
}

export function isSortValue(v: unknown): boolean {
  if (v === null || v === undefined || v === "") return true; // optional
  const n = Number(v);
  return Number.isInteger(n) && n >= 0;
}

export function isActive(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toUpperCase();
    return s === "TRUE" || s === "YES" || s === "1" || s === "Y";
  }
  return false;
}

export function toBool(v: unknown): boolean {
  return isActive(v);
}

export function toInt(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isInteger(n) ? n : fallback;
}

export function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export function cleanStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** Validate required fields exist and are non-empty */
export function requireFields(
  data: Record<string, unknown>,
  fields: string[]
): string | null {
  for (const f of fields) {
    if (!isNonEmpty(data[f])) {
      return `Missing required field: ${f}`;
    }
  }
  return null;
}

/** Generate a safe slug from display_name */
export function generateSlug(prefix: string, displayName: string): string {
  const clean = displayName
    .toLowerCase()
    .replace(/[^a-z0-9\uac00-\ud7af\u3040-\u309f\u30a0-\u30ff]+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 50);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${clean}_${rand}`;
}

/** Generate a unique field_key from label, handling collisions */
export function generateFieldKey(label: string): string {
  const clean = label
    .toLowerCase()
    .replace(/[^a-z0-9\uac00-\ud7af\u3040-\u309f\u30a0-\u30ff]+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 40);
  const rand = Math.random().toString(36).substring(2, 6);
  return `${clean}_${rand}`;
}

/** Supported field types for dynamic fields */
export const FIELD_TYPES = ["text", "textarea", "number", "url", "boolean", "select", "multi_select", "date", "json"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export function isValidFieldType(v: unknown): v is FieldType {
  return typeof v === "string" && (FIELD_TYPES as readonly string[]).includes(v);
}

/** Supported scope types for field definitions */
export const SCOPE_TYPES = ["ITEM", "CATEGORY", "AREA", "ENTITY_TYPE", "GLOBAL"] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];

export function isValidScopeType(v: unknown): v is ScopeType {
  return typeof v === "string" && (SCOPE_TYPES as readonly string[]).includes(v);
}

/**
 * A03: 이동시간 입력 파싱
 * "35" → { minutes: 35, display: "35분" }
 * "35분" → { minutes: 35, display: "35분" }
 * "30~40분" → { minutes: null, min: 30, max: 40, display: "30~40분" }
 * "" → { minutes: null, display: "" }
 * "-1", "3abc", "40~30" → throws Error (400)
 */
export function parseTravelTimeInput(value: string): {
  minutes: number | null;
  min: number | null;
  max: number | null;
  display: string;
} {
  const trimmed = value.trim();
  if (trimmed === '') {
    return { minutes: null, min: null, max: null, display: '' };
  }

  // Range pattern: "30~40분" or "30~40"
  const rangeMatch = trimmed.match(/^(\d+)\s*[~～]\s*(\d+)\s*분?$/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    if (min > max) {
      throw new Error(`잘못된 범위: ${trimmed} (최소값이 최대값보다 큽니다)`);
    }
    return { minutes: null, min, max, display: trimmed };
  }

  // Single number: "35" or "35분"
  const singleMatch = trimmed.match(/^(\d+)\s*분?$/);
  if (singleMatch) {
    const minutes = parseInt(singleMatch[1], 10);
    return { minutes, min: null, max: null, display: `${minutes}분` };
  }

  // Invalid format
  throw new Error(`잘못된 시간 형식: ${trimmed}`);
}
