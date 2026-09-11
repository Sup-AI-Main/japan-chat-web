/**
 * Atomic compound deletes via PostgreSQL RPC functions.
 *
 * Area and Category deletes use PostgreSQL functions (delete_area_cascade,
 * delete_category_cascade) that execute within a single DB transaction.
 * If any step fails, the entire operation is rolled back automatically.
 *
 * Entity and Field Definition deletes use single DELETE statements
 * with FK CASCADE, which is inherently atomic.
 *
 * Hard delete only — no soft delete, no restore.
 */

import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logChange } from "@/lib/crud/change-log";
import { isUuid } from "@/lib/crud/validation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AreaDeleteImpactReport {
  area_id: string;
  entities: number;
  hotels: number;
  golf_courses: number;
  restaurants: number;
  faq: number;
  travel_times: number;
  content_sections: number;
  includes_excludes: number;
  entity_field_values: number;
  entity_categories: number;
}

export interface CategoryDeleteImpactReport {
  category_id: string;
  entity_categories: number;
  faq: number;
  field_definition_scopes: number;
  entities_primary: number;
}

// ---------------------------------------------------------------------------
// A. deleteEntityFull — single DELETE + FK CASCADE (atomic)
// ---------------------------------------------------------------------------

export async function deleteEntityFull(id: string): Promise<void> {
  if (!isUuid(id)) throw new Error("id must be a valid UUID");

  const db = getSupabaseAdmin();

  // Fetch before snapshot for logging
  const { data: existing } = await db
    .from("entities")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) throw new Error("Entity not found");

  // Single DELETE — FK CASCADE handles all subtables atomically
  const { error } = await db.rpc("delete_entity_cascade", { p_entity_id: id });
  if (error) {
    // Fallback to direct delete if RPC not available
    const { error: delError } = await db.from("entities").delete().eq("id", id);
    if (delError) throw delError;
  }

  await logChange({
    action: "DELETE",
    entityType: "entities",
    entityId: id,
    beforeJson: existing,
    actorNote: "deleteEntityFull",
  });
}

// ---------------------------------------------------------------------------
// B. deleteAreaFull — RPC atomic transaction
// ---------------------------------------------------------------------------

export async function getAreaDeleteImpactReport(
  id: string
): Promise<AreaDeleteImpactReport> {
  if (!isUuid(id)) throw new Error("id must be a valid UUID");

  const db = getSupabaseServer();

  // Get entity IDs for this area
  const { data: entities } = await db
    .from("entities")
    .select("id")
    .eq("area_id", id);

  const entityIds = (entities || []).map((e) => e.id);

  if (entityIds.length === 0) {
    const [faqResult, fdsResult] = await Promise.all([
      db.from("faq").select("id", { count: "exact", head: true }).eq("area_id", id),
      db.from("field_definition_scopes").select("id", { count: "exact", head: true }).eq("area_id", id),
    ]);

    return {
      area_id: id,
      entities: 0,
      hotels: 0,
      golf_courses: 0,
      restaurants: 0,
      faq: faqResult.count ?? 0,
      travel_times: 0,
      content_sections: 0,
      includes_excludes: 0,
      entity_field_values: 0,
      entity_categories: 0,
    };
  }

  const [ecResult, ttFromResult, ttToResult, efvResult, faqResult, fdsResult,
    csResult, ieResult, hotelResult, golfResult, restResult] = await Promise.all([
    db.from("entity_categories").select("entity_id", { count: "exact", head: true }).in("entity_id", entityIds),
    db.from("travel_times").select("id", { count: "exact", head: true }).in("from_entity_id", entityIds),
    db.from("travel_times").select("id", { count: "exact", head: true }).in("to_entity_id", entityIds),
    db.from("entity_field_values").select("id", { count: "exact", head: true }).in("entity_id", entityIds),
    db.from("faq").select("id", { count: "exact", head: true }).eq("area_id", id),
    db.from("field_definition_scopes").select("id", { count: "exact", head: true }).eq("area_id", id),
    db.from("content_sections").select("id", { count: "exact", head: true }).in("parent_entity_id", entityIds),
    db.from("includes_excludes").select("id", { count: "exact", head: true }).in("parent_entity_id", entityIds),
    db.from("hotels").select("entity_id", { count: "exact", head: true }).in("entity_id", entityIds),
    db.from("golf_courses").select("entity_id", { count: "exact", head: true }).in("entity_id", entityIds),
    db.from("restaurants").select("entity_id", { count: "exact", head: true }).in("entity_id", entityIds),
  ]);

  return {
    area_id: id,
    entities: entityIds.length,
    hotels: hotelResult.count ?? 0,
    golf_courses: golfResult.count ?? 0,
    restaurants: restResult.count ?? 0,
    faq: faqResult.count ?? 0,
    travel_times: (ttFromResult.count ?? 0) + (ttToResult.count ?? 0),
    content_sections: csResult.count ?? 0,
    includes_excludes: ieResult.count ?? 0,
    entity_field_values: efvResult.count ?? 0,
    entity_categories: ecResult.count ?? 0,
  };
}

export async function deleteAreaFull(
  id: string,
  confirmed: boolean
): Promise<AreaDeleteImpactReport | Record<string, unknown>> {
  if (!isUuid(id)) throw new Error("id must be a valid UUID");

  // If not confirmed, return impact report
  if (!confirmed) {
    return getAreaDeleteImpactReport(id);
  }

  const db = getSupabaseAdmin();

  // Fetch before snapshot for logging
  const { data: existing } = await db
    .from("areas")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) throw new Error("Area not found");

  // Use PostgreSQL RPC for atomic transaction
  const { data: impact, error } = await db.rpc("delete_area_cascade", {
    p_area_id: id,
  });

  if (error) throw error;

  await logChange({
    action: "DELETE",
    entityType: "areas",
    entityId: id,
    beforeJson: existing,
    afterJson: impact,
    actorNote: "deleteAreaFull",
  });

  return impact as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// C. deleteCategoryFull — RPC atomic transaction
// ---------------------------------------------------------------------------

export async function getCategoryDeleteImpactReport(
  id: string
): Promise<CategoryDeleteImpactReport> {
  if (!isUuid(id)) throw new Error("id must be a valid UUID");

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

export async function deleteCategoryFull(
  id: string,
  confirmed: boolean
): Promise<CategoryDeleteImpactReport | Record<string, unknown>> {
  if (!isUuid(id)) throw new Error("id must be a valid UUID");

  // If not confirmed, return impact report
  if (!confirmed) {
    return getCategoryDeleteImpactReport(id);
  }

  const db = getSupabaseAdmin();

  // Fetch before snapshot for logging
  const { data: existing } = await db
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) throw new Error("Category not found");

  // Use PostgreSQL RPC for atomic transaction
  const { data: impact, error } = await db.rpc("delete_category_cascade", {
    p_category_id: id,
  });

  if (error) throw error;

  await logChange({
    action: "DELETE",
    entityType: "categories",
    entityId: id,
    beforeJson: existing,
    afterJson: impact,
    actorNote: "deleteCategoryFull",
  });

  return impact as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// D. deleteFieldDefinitionFull — single DELETE + FK CASCADE (atomic)
// ---------------------------------------------------------------------------

export async function deleteFieldDefinitionFull(
  id: string
): Promise<void> {
  if (!isUuid(id)) throw new Error("id must be a valid UUID");

  const db = getSupabaseAdmin();

  // Fetch before snapshot for logging
  const { data: existing } = await db
    .from("field_definitions")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) throw new Error("Field definition not found");

  // Use PostgreSQL RPC for atomic delete (CASCADE handles entity_field_values + scopes)
  const { error } = await db.rpc("delete_field_definition_cascade", {
    p_field_def_id: id,
  });

  if (error) {
    // Fallback to direct delete if RPC not available
    const { error: delError } = await db
      .from("field_definitions")
      .delete()
      .eq("id", id);
    if (delError) throw delError;
  }

  await logChange({
    action: "DELETE",
    entityType: "field_definitions",
    entityId: id,
    beforeJson: existing,
    actorNote: "deleteFieldDefinitionFull",
  });
}
