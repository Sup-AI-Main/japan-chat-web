/**
 * Entity CRUD with category sync.
 * CRITICAL: entities.category_id = PRIMARY category
 *           entity_categories = ALL category relationships
 * Both must be kept in sync!
 *
 * Hard delete only — no soft delete, no restore.
 */

import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logChange } from "@/lib/crud/change-log";
import {
  requireFields,
  isUuid,
  toInt,
  toStr,
  generateSlug,
} from "@/lib/crud/validation";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import { ConflictError } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EntityRow {
  id: string;
  slug: string;
  display_name: string;
  entity_type: string;
  area_id: string;
  category_id: string | null;
  active: boolean;
  sort: number;
  created_at: string;
  updated_at: string;
}

export interface EntityWithCategory extends EntityRow {
  category: { id: string; code: string; label: string } | null;
  area: { id: string; code: string; name_kr: string } | null;
}

export interface EntityFilters {
  area?: string;
  category?: string;
  entity_type?: string;
}

// ---------------------------------------------------------------------------
// Read (anon key)
// ---------------------------------------------------------------------------

export async function listEntities(
  filters?: EntityFilters
): Promise<EntityRow[]> {
  const db = getSupabaseServer();

  let query = db
    .from("entities")
    .select(
      "id, slug, display_name, entity_type, area_id, category_id, active, sort, created_at, updated_at"
    );

  if (filters?.area) {
    const areaFilter = filters.area;
    // Resolve area code to UUID if it looks like a code, otherwise use as-is
    if (UUID_RE.test(areaFilter)) {
      query = query.eq("area_id", areaFilter);
    } else {
      const { data: areaRow } = await db
        .from("areas")
        .select("id")
        .eq("code", areaFilter.toUpperCase())
        .single();
      if (areaRow) {
        query = query.eq("area_id", areaRow.id);
      } else {
        return [];
      }
    }
  }

  if (filters?.category) {
    const categoryFilter = filters.category;
    if (UUID_RE.test(categoryFilter)) {
      query = query.eq("category_id", categoryFilter);
    } else {
      const { data: catRow } = await db
        .from("categories")
        .select("id")
        .eq("code", categoryFilter.toUpperCase())
        .single();
      if (catRow) {
        query = query.eq("category_id", catRow.id);
      } else {
        return [];
      }
    }
  }

  if (filters?.entity_type) {
    query = query.eq("entity_type", filters.entity_type.toUpperCase());
  }

  const { data, error } = await query.order("sort");

  if (error) throw error;
  return (data || []) as EntityRow[];
}

export async function getEntity(id: string): Promise<EntityWithCategory | null> {
  const db = getSupabaseServer();

  const { data, error } = await db
    .from("entities")
    .select(
      "id, slug, display_name, entity_type, area_id, category_id, active, sort, created_at, updated_at, category:categories(id, code, label), area:areas(id, code, name_kr)"
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  const row = data as unknown as EntityRow & {
    category: { id: string; code: string; label: string } | null;
    area: { id: string; code: string; name_kr: string } | null;
  };

  return {
    ...row,
    category: row.category ?? null,
    area: row.area ?? null,
  };
}

// ---------------------------------------------------------------------------
// Create (service role) — syncs entities.category_id + entity_categories
// ---------------------------------------------------------------------------

export async function createEntity(
  data: Record<string, unknown>
): Promise<EntityRow> {
  const missing = requireFields(data, ["display_name", "entity_type", "area_id"]);
  if (missing) throw new Error(missing);

  if (!isUuid(toStr(data.area_id))) {
    throw new Error("area_id must be a valid UUID");
  }

  if (data.category_id !== undefined && data.category_id !== null && !isUuid(toStr(data.category_id))) {
    throw new Error("category_id must be a valid UUID");
  }

  const db = getSupabaseAdmin();

  const slug = toStr(data.slug) || generateSlug(
    toStr(data.entity_type).toLowerCase(),
    toStr(data.display_name)
  );

  const insertData = {
    slug,
    display_name: toStr(data.display_name),
    entity_type: toStr(data.entity_type).toUpperCase(),
    area_id: toStr(data.area_id),
    category_id: data.category_id ? toStr(data.category_id) : null,
    active: data.active !== undefined ? Boolean(data.active) : true,
    sort: toInt(data.sort, 999),
  };

  const { data: row, error } = await db
    .from("entities")
    .insert(insertData)
    .select("id, slug, display_name, entity_type, area_id, category_id, active, sort, created_at, updated_at")
    .single();

  if (error) throw error;

  // Sync entity_categories junction table
  if (insertData.category_id) {
    const { error: ecError } = await db
      .from("entity_categories")
      .insert({
        entity_id: row.id,
        category_id: insertData.category_id,
        sort: 0,
      });

    if (ecError) {
      console.error("[ENTITY_CAT_SYNC_FAIL]", ecError);
    }
  }

  await logChange({
    action: "CREATE",
    entityType: "entities",
    entityId: row.id,
    afterJson: row,
  });

  return row as EntityRow;
}

// ---------------------------------------------------------------------------
// Update (service role + optimistic concurrency + category sync)
// ---------------------------------------------------------------------------

export async function updateEntity(
  id: string,
  data: Record<string, unknown>,
  expectedUpdatedAt?: string
): Promise<EntityRow> {
  const db = getSupabaseAdmin();

  // Fetch current entity
  const { data: existing, error: findError } = await db
    .from("entities")
    .select("id, slug, display_name, entity_type, area_id, category_id, active, sort, updated_at")
    .eq("id", id)
    .single();

  if (findError || !existing) {
    throw new Error("Entity not found");
  }

  if (expectedUpdatedAt && existing.updated_at !== expectedUpdatedAt) {
    throw new ConflictError();
  }

  const oldCategoryId = existing.category_id;
  let newCategoryId = oldCategoryId;

  // Build entity updates
  const updates: Record<string, unknown> = {};
  if (data.slug !== undefined) updates.slug = toStr(data.slug);
  if (data.display_name !== undefined) updates.display_name = toStr(data.display_name);
  if (data.entity_type !== undefined) updates.entity_type = toStr(data.entity_type).toUpperCase();
  if (data.active !== undefined) updates.active = Boolean(data.active);
  if (data.sort !== undefined) updates.sort = toInt(data.sort, 0);
  if (data.area_id !== undefined) {
    if (!isUuid(toStr(data.area_id))) throw new Error("area_id must be a valid UUID");
    updates.area_id = toStr(data.area_id);
  }
  if (data.category_id !== undefined) {
    const catId = data.category_id ? toStr(data.category_id) : null;
    if (catId && !isUuid(catId)) throw new Error("category_id must be a valid UUID");
    updates.category_id = catId;
    newCategoryId = catId;
  }

  if (Object.keys(updates).length > 0) {
    const { data: updated, error: updateError } = await db
      .from("entities")
      .update(updates)
      .eq("id", id)
      .select("id, slug, display_name, entity_type, area_id, category_id, active, sort, created_at, updated_at")
      .single();

    if (updateError) throw updateError;

    // Sync entity_categories if category_id changed
    if (newCategoryId !== oldCategoryId) {
      await syncEntityCategories(db, id, oldCategoryId, newCategoryId);
    }

    await logChange({
      action: "UPDATE",
      entityType: "entities",
      entityId: id,
      beforeJson: existing,
      afterJson: updated,
    });

    return updated as EntityRow;
  }

  return existing as EntityRow;
}

/**
 * Sync entity_categories when the primary category changes.
 * - Removes old primary from junction (if it exists)
 * - Adds new primary to junction (if it doesn't exist)
 */
async function syncEntityCategories(
  db: ReturnType<typeof getSupabaseAdmin>,
  entityId: string,
  oldCategoryId: string | null,
  newCategoryId: string | null
): Promise<void> {
  // Remove old category from junction (if it was set)
  if (oldCategoryId) {
    await db
      .from("entity_categories")
      .delete()
      .eq("entity_id", entityId)
      .eq("category_id", oldCategoryId);
  }

  // Add new category to junction (if it is set)
  if (newCategoryId) {
    const { error } = await db
      .from("entity_categories")
      .insert({
        entity_id: entityId,
        category_id: newCategoryId,
        sort: 0,
      });

    // Ignore conflict (already exists in junction)
    if (error && error.code !== "23505") {
      console.error("[ENTITY_CAT_SYNC_FAIL]", error);
    }
  }
}

// ---------------------------------------------------------------------------
// Change Primary Category
// ---------------------------------------------------------------------------

export async function changePrimaryCategory(
  entityId: string,
  newCategoryId: string
): Promise<EntityRow> {
  if (!isUuid(newCategoryId)) {
    throw new Error("newCategoryId must be a valid UUID");
  }

  const db = getSupabaseAdmin();

  const { data: existing, error: findError } = await db
    .from("entities")
    .select("id, slug, display_name, entity_type, area_id, category_id, active, sort, created_at, updated_at")
    .eq("id", entityId)
    .single();

  if (findError || !existing) {
    throw new Error("Entity not found");
  }

  const oldCategoryId = existing.category_id;

  // Update entity's primary category_id
  const { data: updated, error: updateError } = await db
    .from("entities")
    .update({ category_id: newCategoryId })
    .eq("id", entityId)
    .select("id, slug, display_name, entity_type, area_id, category_id, active, sort, created_at, updated_at")
    .single();

  if (updateError) throw updateError;

  // Sync junction table
  await syncEntityCategories(db, entityId, oldCategoryId, newCategoryId);

  await logChange({
    action: "UPDATE",
    entityType: "entities",
    entityId,
    beforeJson: existing,
    afterJson: updated,
    actorNote: "changePrimaryCategory",
  });

  return updated as EntityRow;
}

// ---------------------------------------------------------------------------
// Delete — HARD DELETE via atomic PostgreSQL RPC (FK CASCADE handles subtypes)
// ---------------------------------------------------------------------------

export async function deleteEntity(id: string): Promise<void> {
  const { deleteEntityFull } = await import("@/lib/crud/compound-delete");
  await deleteEntityFull(id);
}
