/**
 * Admin change log integration.
 * Logs CREATE/UPDATE/DELETE operations to admin_change_logs table.
 *
 * Log failures do NOT block the main CRUD operation.
 */

import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Action = "CREATE" | "UPDATE" | "DELETE";

interface ChangeLogEntry {
  action: Action;
  entityType: string;   // table name: 'entities', 'hotels', etc.
  entityId?: string;
  beforeJson?: unknown;
  afterJson?: unknown;
  actorHash?: string;
  actorNote?: string;
}

/**
 * Record a change log entry.
 * Silently catches errors to avoid blocking the main operation.
 */
export async function logChange(entry: ChangeLogEntry): Promise<void> {
  try {
    const db = getSupabaseAdmin();
    await db.from("admin_change_logs").insert({
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      before_json: entry.beforeJson ?? null,
      after_json: entry.afterJson ?? null,
      actor_hash: entry.actorHash ?? null,
      actor_note: entry.actorNote ?? "admin",
    });
  } catch (err) {
    // Log error but don't throw - change log failure should not block CRUD
    console.error("[CHANGE_LOG_FAIL]", entry.action, entry.entityType, entry.entityId, err);
  }
}

/**
 * Hash a value for actor identification (simple hash, not cryptographic).
 * Used to track which admin session made a change without storing raw tokens.
 */
export function hashActor(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `h_${Math.abs(hash).toString(36)}`;
}
