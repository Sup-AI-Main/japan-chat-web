/**
 * Section Definition CRUD operations.
 * Stores section headings (e.g., "기본 정보", "조식", "온천/스파") per entity_type.
 * Admin can customize label, visibility, and sort order.
 */

import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logChange } from "@/lib/crud/change-log";
import { requireFields, isUuid, toInt, toStr } from "@/lib/crud/validation";
import { ConflictError } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SectionDefinitionRow {
  id: string;
  entity_type: string;
  section_key: string;
  label_ko: string;
  label_ja: string | null;
  sort: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Read (anon key)
// ---------------------------------------------------------------------------

export async function listSectionDefinitions(
  entityType?: string
): Promise<SectionDefinitionRow[]> {
  const db = getSupabaseServer();

  let query = db
    .from("section_definitions")
    .select("id, entity_type, section_key, label_ko, label_ja, sort, is_visible, created_at, updated_at");

  if (entityType) {
    query = query.eq("entity_type", entityType.toUpperCase());
  }

  const { data, error } = await query.order("sort");

  if (error) throw error;
  return (data || []) as SectionDefinitionRow[];
}

export async function getSectionDefinition(
  id: string
): Promise<SectionDefinitionRow | null> {
  const db = getSupabaseServer();

  const { data, error } = await db
    .from("section_definitions")
    .select("id, entity_type, section_key, label_ko, label_ja, sort, is_visible, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as SectionDefinitionRow;
}

// ---------------------------------------------------------------------------
// Create (service role)
// ---------------------------------------------------------------------------

export async function createSectionDefinition(
  data: Record<string, unknown>
): Promise<SectionDefinitionRow> {
  const missing = requireFields(data, ["entity_type", "section_key", "label_ko"]);
  if (missing) throw new Error(missing);

  const db = getSupabaseAdmin();

  const insertData = {
    entity_type: toStr(data.entity_type).toUpperCase(),
    section_key: toStr(data.section_key),
    label_ko: toStr(data.label_ko),
    label_ja: data.label_ja !== undefined ? toStr(data.label_ja) || null : null,
    sort: toInt(data.sort, 0),
    is_visible: data.is_visible !== undefined ? Boolean(data.is_visible) : true,
  };

  const { data: row, error } = await db
    .from("section_definitions")
    .insert(insertData)
    .select("id, entity_type, section_key, label_ko, label_ja, sort, is_visible, created_at, updated_at")
    .single();

  if (error) throw error;

  await logChange({
    action: "CREATE",
    entityType: "section_definitions",
    entityId: row.id,
    afterJson: row,
  });

  return row as SectionDefinitionRow;
}

// ---------------------------------------------------------------------------
// Update (service role + optimistic concurrency)
// ---------------------------------------------------------------------------

export async function updateSectionDefinition(
  id: string,
  data: Record<string, unknown>,
  expectedUpdatedAt?: string
): Promise<SectionDefinitionRow> {
  if (!isUuid(id)) throw new Error("id must be a valid UUID");

  const db = getSupabaseAdmin();

  const { data: existing, error: findError } = await db
    .from("section_definitions")
    .select("id, entity_type, section_key, label_ko, label_ja, sort, is_visible, updated_at")
    .eq("id", id)
    .single();

  if (findError || !existing) {
    throw new Error("Section definition not found");
  }

  if (expectedUpdatedAt && existing.updated_at !== expectedUpdatedAt) {
    throw new ConflictError();
  }

  const updates: Record<string, unknown> = {};
  if (data.label_ko !== undefined) updates.label_ko = toStr(data.label_ko);
  if (data.label_ja !== undefined) updates.label_ja = toStr(data.label_ja) || null;
  if (data.sort !== undefined) updates.sort = toInt(data.sort, 0);
  if (data.is_visible !== undefined) updates.is_visible = Boolean(data.is_visible);

  if (Object.keys(updates).length === 0) {
    return existing as SectionDefinitionRow;
  }

  const { data: updated, error: updateError } = await db
    .from("section_definitions")
    .update(updates)
    .eq("id", id)
    .select("id, entity_type, section_key, label_ko, label_ja, sort, is_visible, created_at, updated_at")
    .single();

  if (updateError) throw updateError;

  await logChange({
    action: "UPDATE",
    entityType: "section_definitions",
    entityId: id,
    beforeJson: existing,
    afterJson: updated,
  });

  return updated as SectionDefinitionRow;
}

// ---------------------------------------------------------------------------
// Delete (hard delete)
// ---------------------------------------------------------------------------

export async function deleteSectionDefinition(id: string): Promise<void> {
  if (!isUuid(id)) throw new Error("id must be a valid UUID");

  const db = getSupabaseAdmin();

  const { data: existing } = await db
    .from("section_definitions")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) {
    throw new Error("Section definition not found");
  }

  const { error } = await db
    .from("section_definitions")
    .delete()
    .eq("id", id);

  if (error) throw error;

  await logChange({
    action: "DELETE",
    entityType: "section_definitions",
    entityId: id,
    beforeJson: existing,
  });
}
