/**
 * Area CRUD operations.
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

export interface AreaRow {
  id: string;
  code: string;
  name_kr: string;
  name_jp: string;
  icon: string;
  description: string;
  active: boolean;
  sort: number;
  created_at: string;
  updated_at: string;
}

export interface AreaImpactReport {
  area_id: string;
  entities: number;
  faq: number;
}

// ---------------------------------------------------------------------------
// Read (anon key)
// ---------------------------------------------------------------------------

export async function listAreas(): Promise<AreaRow[]> {
  const db = getSupabaseServer();
  const { data, error } = await db
    .from("areas")
    .select("id, code, name_kr, name_jp, icon, description, active, sort, created_at, updated_at")
    .order("sort");

  if (error) throw error;
  return (data || []) as AreaRow[];
}

export async function getArea(id: string): Promise<AreaRow | null> {
  const db = getSupabaseServer();
  const { data, error } = await db
    .from("areas")
    .select("id, code, name_kr, name_jp, icon, description, active, sort, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as AreaRow;
}

// ---------------------------------------------------------------------------
// Create (service role)
// ---------------------------------------------------------------------------

export async function createArea(
  data: Record<string, unknown>
): Promise<AreaRow> {
  const missing = requireFields(data, ["code", "name_kr"]);
  if (missing) throw new Error(missing);

  const db = getSupabaseAdmin();

  const insertData = {
    code: toStr(data.code).toUpperCase(),
    name_kr: toStr(data.name_kr),
    name_jp: toStr(data.name_jp),
    icon: toStr(data.icon),
    description: toStr(data.description),
    active: true,
    sort: toInt(data.sort, 999),
  };

  const { data: row, error } = await db
    .from("areas")
    .insert(insertData)
    .select("id, code, name_kr, name_jp, icon, description, active, sort, created_at, updated_at")
    .single();

  if (error) throw error;

  await logChange({
    action: "CREATE",
    entityType: "areas",
    entityId: row.id,
    afterJson: row,
  });

  return row as AreaRow;
}

// ---------------------------------------------------------------------------
// Update (service role + optimistic concurrency)
// ---------------------------------------------------------------------------

export async function updateArea(
  id: string,
  data: Record<string, unknown>,
  expectedUpdatedAt?: string
): Promise<AreaRow> {
  const db = getSupabaseAdmin();

  // Fetch current for concurrency check
  const { data: existing, error: findError } = await db
    .from("areas")
    .select("id, code, name_kr, name_jp, icon, description, active, sort, updated_at")
    .eq("id", id)
    .single();

  if (findError || !existing) {
    throw new Error("Area not found");
  }

  if (expectedUpdatedAt && existing.updated_at !== expectedUpdatedAt) {
    throw new ConflictError();
  }

  const updates: Record<string, unknown> = {};
  if (data.code !== undefined) updates.code = toStr(data.code).toUpperCase();
  if (data.name_kr !== undefined) updates.name_kr = toStr(data.name_kr);
  if (data.name_jp !== undefined) updates.name_jp = toStr(data.name_jp);
  if (data.icon !== undefined) updates.icon = toStr(data.icon);
  if (data.description !== undefined) updates.description = toStr(data.description);
  if (data.active !== undefined) updates.active = Boolean(data.active);
  if (data.sort !== undefined) updates.sort = toInt(data.sort, 0);

  if (Object.keys(updates).length === 0) {
    return existing as AreaRow;
  }

  const { data: updated, error: updateError } = await db
    .from("areas")
    .update(updates)
    .eq("id", id)
    .select("id, code, name_kr, name_jp, icon, description, active, sort, created_at, updated_at")
    .single();

  if (updateError) throw updateError;

  await logChange({
    action: "UPDATE",
    entityType: "areas",
    entityId: id,
    beforeJson: existing,
    afterJson: updated,
  });

  return updated as AreaRow;
}

// ---------------------------------------------------------------------------
// Impact Report (for confirmation dialog before delete)
// ---------------------------------------------------------------------------

export async function getAreaImpactReport(id: string): Promise<AreaImpactReport> {
  const db = getSupabaseServer();

  const [entitiesResult, faqResult] = await Promise.all([
    db.from("entities").select("id", { count: "exact", head: true }).eq("area_id", id),
    db.from("faq").select("id", { count: "exact", head: true }).eq("area_id", id),
  ]);

  return {
    area_id: id,
    entities: entitiesResult.count ?? 0,
    faq: faqCount(faqResult.count),
  };
}

function faqCount(v: number | null): number {
  return v ?? 0;
}

// ---------------------------------------------------------------------------
// Delete — HARD DELETE via atomic PostgreSQL RPC
// ---------------------------------------------------------------------------

export async function deleteArea(id: string): Promise<void> {
  const { deleteAreaFull } = await import("@/lib/crud/compound-delete");
  await deleteAreaFull(id, true);
}
