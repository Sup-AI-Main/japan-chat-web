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
