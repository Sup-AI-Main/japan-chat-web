/**
 * Entity Field Value CRUD operations.
 * Uses UPSERT for setting values (INSERT if not exists, UPDATE if exists).
 * Hard delete only — no soft delete, no restore.
 */

import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logChange } from "@/lib/crud/change-log";
import { isUuid, toStr } from "@/lib/crud/validation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EntityFieldValueRow {
  id: string;
  entity_id: string;
  field_definition_id: string;
  value_text: string | null;
  value_json: unknown | null;
  sort: number;
  visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface EntityFieldValueWithDef extends EntityFieldValueRow {
  field_definition: {
    id: string;
    field_key: string;
    label_ko: string;
    label_ja: string | null;
    label_en: string | null;
    field_type: string;
    icon: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Read (anon key)
// ---------------------------------------------------------------------------

export async function getEntityFieldValues(
  entityId: string
): Promise<EntityFieldValueWithDef[]> {
  if (!isUuid(entityId)) {
    throw new Error("entityId must be a valid UUID");
  }

  const db = getSupabaseServer();

  const { data, error } = await db
    .from("entity_field_values")
    .select(
      "id, entity_id, field_definition_id, value_text, value_json, sort, visible, created_at, updated_at, field_definition:field_definitions(id, field_key, label_ko, label_ja, label_en, field_type, icon)"
    )
    .eq("entity_id", entityId)
    .order("sort");

  if (error) throw error;

  return (data || []) as unknown as EntityFieldValueWithDef[];
}

// ---------------------------------------------------------------------------
// Set (UPSERT) — service role
// ---------------------------------------------------------------------------

export async function setEntityFieldValue(
  entityId: string,
  fieldDefinitionId: string,
  value: { value_text?: string | null; value_json?: unknown | null }
): Promise<EntityFieldValueRow> {
  if (!isUuid(entityId)) {
    throw new Error("entityId must be a valid UUID");
  }
  if (!isUuid(fieldDefinitionId)) {
    throw new Error("fieldDefinitionId must be a valid UUID");
  }

  const db = getSupabaseAdmin();

  const upsertData = {
    entity_id: entityId,
    field_definition_id: fieldDefinitionId,
    value_text: value.value_text !== undefined ? (toStr(value.value_text) || null) : undefined,
    value_json: value.value_json !== undefined ? value.value_json : undefined,
  };

  const { data, error } = await db
    .from("entity_field_values")
    .upsert(upsertData, { onConflict: "entity_id,field_definition_id" })
    .select("id, entity_id, field_definition_id, value_text, value_json, sort, visible, created_at, updated_at")
    .single();

  if (error) throw error;

  await logChange({
    action: "UPDATE",
    entityType: "entity_field_values",
    entityId: data.id,
    afterJson: data,
  });

  return data as EntityFieldValueRow;
}

// ---------------------------------------------------------------------------
// Delete — HARD DELETE
// ---------------------------------------------------------------------------

export async function deleteEntityFieldValue(id: string): Promise<void> {
  if (!isUuid(id)) {
    throw new Error("id must be a valid UUID");
  }

  const db = getSupabaseAdmin();

  // Fetch before snapshot for logging
  const { data: existing } = await db
    .from("entity_field_values")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) {
    throw new Error("Entity field value not found");
  }

  const { error } = await db
    .from("entity_field_values")
    .delete()
    .eq("id", id);

  if (error) throw error;

  await logChange({
    action: "DELETE",
    entityType: "entity_field_values",
    entityId: id,
    beforeJson: existing,
  });
}

export async function deleteEntityFieldValueByPair(
  entityId: string,
  fieldDefinitionId: string
): Promise<void> {
  if (!isUuid(entityId)) {
    throw new Error("entityId must be a valid UUID");
  }
  if (!isUuid(fieldDefinitionId)) {
    throw new Error("fieldDefinitionId must be a valid UUID");
  }

  const db = getSupabaseAdmin();

  // Fetch before snapshot for logging
  const { data: existing } = await db
    .from("entity_field_values")
    .select("*")
    .eq("entity_id", entityId)
    .eq("field_definition_id", fieldDefinitionId)
    .single();

  if (!existing) {
    throw new Error("Entity field value not found");
  }

  const { error } = await db
    .from("entity_field_values")
    .delete()
    .eq("entity_id", entityId)
    .eq("field_definition_id", fieldDefinitionId);

  if (error) throw error;

  await logChange({
    action: "DELETE",
    entityType: "entity_field_values",
    entityId: existing.id,
    beforeJson: existing,
  });
}

// ---------------------------------------------------------------------------
// Bulk set — UPSERT multiple values at once
// ---------------------------------------------------------------------------

export async function bulkSetEntityFieldValues(
  entityId: string,
  values: Array<{
    field_definition_id: string;
    value_text?: string | null;
    value_json?: unknown | null;
  }>
): Promise<EntityFieldValueRow[]> {
  if (!isUuid(entityId)) {
    throw new Error("entityId must be a valid UUID");
  }

  if (values.length === 0) return [];

  const db = getSupabaseAdmin();

  const upsertData = values.map((v) => ({
    entity_id: entityId,
    field_definition_id: v.field_definition_id,
    value_text: v.value_text !== undefined ? (toStr(v.value_text) || null) : null,
    value_json: v.value_json !== undefined ? v.value_json : null,
  }));

  const { data, error } = await db
    .from("entity_field_values")
    .upsert(upsertData, { onConflict: "entity_id,field_definition_id" })
    .select("id, entity_id, field_definition_id, value_text, value_json, sort, visible, created_at, updated_at");

  if (error) throw error;

  await logChange({
    action: "UPDATE",
    entityType: "entity_field_values",
    entityId,
    afterJson: data,
    actorNote: "bulkSetEntityFieldValues",
  });

  return (data || []) as EntityFieldValueRow[];
}
