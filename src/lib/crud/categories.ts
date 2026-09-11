/**
 * Category CRUD operations.
 * Hard delete only — no soft delete, no restore.
 */

import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logChange } from "@/lib/crud/change-log";
import { requireFields, toInt, toStr } from "@/lib/crud/validation";
import { ConflictError } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CategoryRow {
  id: string;
  code: string;
  label: string;
  icon: string;
  description: string;
  group_type: string;
  active: boolean;
  sort: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryImpactReport {
  category_id: string;
  entity_categories: number;
  faq: number;
  field_definition_scopes: number;
  entities_primary: number;
}

// ---------------------------------------------------------------------------
// Read (anon key)
// ---------------------------------------------------------------------------

export async function listCategories(): Promise<CategoryRow[]> {
  const db = getSupabaseServer();
  const { data, error } = await db
    .from("categories")
    .select("id, code, label, icon, description, group_type, active, sort, created_at, updated_at")
    .order("sort");

  if (error) throw error;
  return (data || []) as CategoryRow[];
}

export async function getCategory(id: string): Promise<CategoryRow | null> {
  const db = getSupabaseServer();
  const { data, error } = await db
    .from("categories")
    .select("id, code, label, icon, description, group_type, active, sort, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as CategoryRow;
}

// ---------------------------------------------------------------------------
// Create (service role)
// ---------------------------------------------------------------------------

export async function createCategory(
  data: Record<string, unknown>
): Promise<CategoryRow> {
  const missing = requireFields(data, ["code", "label"]);
  if (missing) throw new Error(missing);

  const validGroupTypes = ["AREA", "COMMON", "SYSTEM"];
  const groupType = toStr(data.group_type).toUpperCase() || "AREA";
  if (!validGroupTypes.includes(groupType)) {
    throw new Error(`Invalid group_type: ${groupType}. Must be AREA, COMMON, or SYSTEM`);
  }

  const db = getSupabaseAdmin();

  const insertData = {
    code: toStr(data.code).toUpperCase(),
    label: toStr(data.label),
    icon: toStr(data.icon),
    description: toStr(data.description),
    group_type: groupType,
    active: true,
    sort: toInt(data.sort, 999),
  };

  const { data: row, error } = await db
    .from("categories")
    .insert(insertData)
    .select("id, code, label, icon, description, group_type, active, sort, created_at, updated_at")
    .single();

  if (error) throw error;

  await logChange({
    action: "CREATE",
    entityType: "categories",
    entityId: row.id,
    afterJson: row,
  });

  return row as CategoryRow;
}

// ---------------------------------------------------------------------------
// Update (service role + optimistic concurrency)
// ---------------------------------------------------------------------------

export async function updateCategory(
  id: string,
  data: Record<string, unknown>,
  expectedUpdatedAt?: string
): Promise<CategoryRow> {
  const db = getSupabaseAdmin();

  const { data: existing, error: findError } = await db
    .from("categories")
    .select("id, code, label, icon, description, group_type, active, sort, updated_at")
    .eq("id", id)
    .single();

  if (findError || !existing) {
    throw new Error("Category not found");
  }

  if (expectedUpdatedAt && existing.updated_at !== expectedUpdatedAt) {
    throw new ConflictError();
  }

  const updates: Record<string, unknown> = {};
  if (data.code !== undefined) updates.code = toStr(data.code).toUpperCase();
  if (data.label !== undefined) updates.label = toStr(data.label);
  if (data.icon !== undefined) updates.icon = toStr(data.icon);
  if (data.description !== undefined) updates.description = toStr(data.description);
  if (data.group_type !== undefined) {
    const validGroupTypes = ["AREA", "COMMON", "SYSTEM"];
    const gt = toStr(data.group_type).toUpperCase();
    if (!validGroupTypes.includes(gt)) {
      throw new Error(`Invalid group_type: ${gt}. Must be AREA, COMMON, or SYSTEM`);
    }
    updates.group_type = gt;
  }
  if (data.active !== undefined) updates.active = Boolean(data.active);
  if (data.sort !== undefined) updates.sort = toInt(data.sort, 0);

  if (Object.keys(updates).length === 0) {
    return existing as CategoryRow;
  }

  const { data: updated, error: updateError } = await db
    .from("categories")
    .update(updates)
    .eq("id", id)
    .select("id, code, label, icon, description, group_type, active, sort, created_at, updated_at")
    .single();

  if (updateError) throw updateError;

  await logChange({
    action: "UPDATE",
    entityType: "categories",
    entityId: id,
    beforeJson: existing,
    afterJson: updated,
  });

  return updated as CategoryRow;
}

// ---------------------------------------------------------------------------
// Impact Report (for confirmation dialog before delete)
// ---------------------------------------------------------------------------

export async function getCategoryImpactReport(id: string): Promise<CategoryImpactReport> {
  const db = getSupabaseServer();

  const [ecResult, faqResult, fdsResult, entResult] = await Promise.all([
    db.from("entity_categories").select("entity_id", { count: "exact", head: true }).eq("category_id", id),
    db.from("faq").select("id", { count: "exact", head: true }).eq("category_id", id),
    db.from("field_definition_scopes").select("id", { count: "exact", head: true }).eq("category_id", id),
    db.from("entities").select("id", { count: "exact", head: true }).eq("category_id", id),
  ]);

  return {
    category_id: id,
    entity_categories: ecResult.count ?? 0,
    faq: faqResult.count ?? 0,
    field_definition_scopes: fdsResult.count ?? 0,
    entities_primary: entResult.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Delete — HARD DELETE via atomic PostgreSQL RPC
// ---------------------------------------------------------------------------

export async function deleteCategory(id: string): Promise<void> {
  const { deleteCategoryFull } = await import("@/lib/crud/compound-delete");
  await deleteCategoryFull(id, true);
}
