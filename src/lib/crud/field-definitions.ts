/**
 * Field Definition CRUD operations.
 * Supports multiple scopes per field definition via field_definition_scopes.
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
  generateFieldKey,
  isValidFieldType,
  isValidScopeType,
} from "@/lib/crud/validation";
import { ConflictError } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FieldDefinitionRow {
  id: string;
  field_key: string;
  label_ko: string;
  label_ja: string | null;
  label_en: string | null;
  field_type: string;
  icon: string | null;
  scope_type: string;
  scope_entity_type: string | null;
  scope_entity_id: string | null;
  scope_area_id: string | null;
  scope_category_id: string | null;
  options_json: unknown | null;
  validation_json: unknown | null;
  sort: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FieldScopeRow {
  id: string;
  field_definition_id: string;
  scope_type: string;
  area_id: string | null;
  category_id: string | null;
  entity_id: string | null;
  entity_type: string | null;
  created_at: string;
}

export interface FieldDefinitionWithScopes extends FieldDefinitionRow {
  scopes: FieldScopeRow[];
}

export interface FieldDefinitionFilters {
  scope_type?: string;
  scope_entity_id?: string;
  active_only?: boolean;
}

// ---------------------------------------------------------------------------
// Read (anon key)
// ---------------------------------------------------------------------------

export async function listFieldDefinitions(
  filters?: FieldDefinitionFilters
): Promise<FieldDefinitionRow[]> {
  const db = getSupabaseServer();

  let query = db
    .from("field_definitions")
    .select(
      "id, field_key, label_ko, label_ja, label_en, field_type, icon, scope_type, scope_entity_type, scope_entity_id, scope_area_id, scope_category_id, options_json, validation_json, sort, active, created_at, updated_at"
    );

  if (filters?.scope_type) {
    query = query.eq("scope_type", filters.scope_type.toUpperCase());
  }

  if (filters?.scope_entity_id) {
    query = query.eq("scope_entity_id", filters.scope_entity_id);
  }

  if (filters?.active_only) {
    query = query.eq("active", true);
  }

  const { data, error } = await query.order("sort");

  if (error) throw error;
  return (data || []) as FieldDefinitionRow[];
}

export async function getFieldDefinition(
  id: string
): Promise<FieldDefinitionWithScopes | null> {
  const db = getSupabaseServer();

  const { data, error } = await db
    .from("field_definitions")
    .select(
      "id, field_key, label_ko, label_ja, label_en, field_type, icon, scope_type, scope_entity_type, scope_entity_id, scope_area_id, scope_category_id, options_json, validation_json, sort, active, created_at, updated_at"
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  const row = data as FieldDefinitionRow;

  // Fetch scopes
  const { data: scopes } = await db
    .from("field_definition_scopes")
    .select("id, field_definition_id, scope_type, area_id, category_id, entity_id, entity_type, created_at")
    .eq("field_definition_id", id)
    .order("created_at");

  return {
    ...row,
    scopes: (scopes || []) as FieldScopeRow[],
  };
}

// ---------------------------------------------------------------------------
// Create (service role) — with field_key collision handling
// ---------------------------------------------------------------------------

export async function createFieldDefinition(
  data: Record<string, unknown>
): Promise<FieldDefinitionWithScopes> {
  const missing = requireFields(data, ["label_ko", "scope_type"]);
  if (missing) throw new Error(missing);

  const scopeType = toStr(data.scope_type).toUpperCase();
  if (!isValidScopeType(scopeType)) {
    throw new Error(`Invalid scope_type: ${scopeType}`);
  }

  const fieldType = toStr(data.field_type) || "text";
  if (!isValidFieldType(fieldType)) {
    throw new Error(`Invalid field_type: ${fieldType}`);
  }

  if (data.scope_entity_id !== undefined && data.scope_entity_id !== null && !isUuid(toStr(data.scope_entity_id))) {
    throw new Error("scope_entity_id must be a valid UUID");
  }

  const db = getSupabaseAdmin();

  const labelKo = toStr(data.label_ko);
  let fieldKey = toStr(data.field_key) || generateFieldKey(labelKo);
  const scopeEntityId = data.scope_entity_id ? toStr(data.scope_entity_id) : null;

  const insertData = {
    field_key: fieldKey,
    label_ko: labelKo,
    label_ja: data.label_ja !== undefined ? toStr(data.label_ja) || null : null,
    label_en: data.label_en !== undefined ? toStr(data.label_en) || null : null,
    field_type: fieldType,
    icon: data.icon !== undefined ? toStr(data.icon) || null : null,
    scope_type: scopeType,
    scope_entity_type: data.scope_entity_type !== undefined ? toStr(data.scope_entity_type) || null : null,
    scope_entity_id: scopeEntityId,
    scope_area_id: data.scope_area_id !== undefined ? toStr(data.scope_area_id) || null : null,
    scope_category_id: data.scope_category_id !== undefined ? toStr(data.scope_category_id) || null : null,
    options_json: data.options_json ?? null,
    validation_json: data.validation_json ?? null,
    sort: toInt(data.sort, 0),
    active: data.active !== undefined ? Boolean(data.active) : true,
  };

  // Retry up to 3 times on field_key collision
  let row: FieldDefinitionRow | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: result, error } = await db
      .from("field_definitions")
      .insert({ ...insertData, field_key: fieldKey })
      .select("id, field_key, label_ko, label_ja, label_en, field_type, icon, scope_type, scope_entity_type, scope_entity_id, scope_area_id, scope_category_id, options_json, validation_json, sort, active, created_at, updated_at")
      .single();

    if (!error) {
      row = result as FieldDefinitionRow;
      break;
    }

    // Check if this is a unique violation on field_key indexes (23505)
    if (error.code === "23505" && (error.message?.includes("idx_fd_key_global") || error.message?.includes("idx_fd_key_per_entity"))) {
      fieldKey = generateFieldKey(labelKo);
      lastError = error;
      continue;
    }

    throw error;
  }

  if (!row) {
    throw lastError || new Error("Failed to create field definition after retries");
  }

  await logChange({
    action: "CREATE",
    entityType: "field_definitions",
    entityId: row.id,
    afterJson: row,
  });

  return { ...row, scopes: [] };
}

// ---------------------------------------------------------------------------
// Update (service role + optimistic concurrency)
// ---------------------------------------------------------------------------

export async function updateFieldDefinition(
  id: string,
  data: Record<string, unknown>,
  expectedUpdatedAt?: string
): Promise<FieldDefinitionRow> {
  const db = getSupabaseAdmin();

  const { data: existing, error: findError } = await db
    .from("field_definitions")
    .select("id, field_key, label_ko, label_ja, label_en, field_type, icon, scope_type, scope_entity_type, scope_entity_id, scope_area_id, scope_category_id, options_json, validation_json, sort, active, updated_at")
    .eq("id", id)
    .single();

  if (findError || !existing) {
    throw new Error("Field definition not found");
  }

  if (expectedUpdatedAt && existing.updated_at !== expectedUpdatedAt) {
    throw new ConflictError();
  }

  const updates: Record<string, unknown> = {};
  if (data.field_key !== undefined) updates.field_key = toStr(data.field_key);
  if (data.label_ko !== undefined) updates.label_ko = toStr(data.label_ko);
  if (data.label_ja !== undefined) updates.label_ja = toStr(data.label_ja) || null;
  if (data.label_en !== undefined) updates.label_en = toStr(data.label_en) || null;
  if (data.field_type !== undefined) {
    const ft = toStr(data.field_type);
    if (!isValidFieldType(ft)) throw new Error(`Invalid field_type: ${ft}`);
    updates.field_type = ft;
  }
  if (data.icon !== undefined) updates.icon = toStr(data.icon) || null;
  if (data.scope_type !== undefined) {
    const st = toStr(data.scope_type).toUpperCase();
    if (!isValidScopeType(st)) throw new Error(`Invalid scope_type: ${st}`);
    updates.scope_type = st;
  }
  if (data.scope_entity_type !== undefined) updates.scope_entity_type = toStr(data.scope_entity_type) || null;
  if (data.scope_entity_id !== undefined) {
    const seId = data.scope_entity_id ? toStr(data.scope_entity_id) : null;
    if (seId && !isUuid(seId)) throw new Error("scope_entity_id must be a valid UUID");
    updates.scope_entity_id = seId;
  }
  if (data.scope_area_id !== undefined) {
    const saId = data.scope_area_id ? toStr(data.scope_area_id) : null;
    if (saId && !isUuid(saId)) throw new Error("scope_area_id must be a valid UUID");
    updates.scope_area_id = saId;
  }
  if (data.scope_category_id !== undefined) {
    const scId = data.scope_category_id ? toStr(data.scope_category_id) : null;
    if (scId && !isUuid(scId)) throw new Error("scope_category_id must be a valid UUID");
    updates.scope_category_id = scId;
  }
  if (data.options_json !== undefined) updates.options_json = data.options_json;
  if (data.validation_json !== undefined) updates.validation_json = data.validation_json;
  if (data.sort !== undefined) updates.sort = toInt(data.sort, 0);
  if (data.active !== undefined) updates.active = Boolean(data.active);

  if (Object.keys(updates).length === 0) {
    return existing as FieldDefinitionRow;
  }

  const { data: updated, error: updateError } = await db
    .from("field_definitions")
    .update(updates)
    .eq("id", id)
    .select("id, field_key, label_ko, label_ja, label_en, field_type, icon, scope_type, scope_entity_type, scope_entity_id, scope_area_id, scope_category_id, options_json, validation_json, sort, active, created_at, updated_at")
    .single();

  if (updateError) throw updateError;

  await logChange({
    action: "UPDATE",
    entityType: "field_definitions",
    entityId: id,
    beforeJson: existing,
    afterJson: updated,
  });

  return updated as FieldDefinitionRow;
}

// ---------------------------------------------------------------------------
// Delete — HARD DELETE via atomic PostgreSQL RPC (CASCADE handles subtables)
// ---------------------------------------------------------------------------

export async function deleteFieldDefinition(id: string): Promise<void> {
  const { deleteFieldDefinitionFull } = await import("@/lib/crud/compound-delete");
  await deleteFieldDefinitionFull(id);
}

// ---------------------------------------------------------------------------
// Scope management
// ---------------------------------------------------------------------------

export async function addFieldScope(
  fieldDefinitionId: string,
  scopeData: {
    scope_type: string;
    area_id?: string | null;
    category_id?: string | null;
    entity_id?: string | null;
    entity_type?: string | null;
  }
): Promise<FieldScopeRow> {
  if (!isUuid(fieldDefinitionId)) {
    throw new Error("fieldDefinitionId must be a valid UUID");
  }

  const db = getSupabaseAdmin();

  const insertData = {
    field_definition_id: fieldDefinitionId,
    scope_type: toStr(scopeData.scope_type).toUpperCase(),
    area_id: scopeData.area_id ?? null,
    category_id: scopeData.category_id ?? null,
    entity_id: scopeData.entity_id ?? null,
    entity_type: scopeData.entity_type ?? null,
  };

  const { data, error } = await db
    .from("field_definition_scopes")
    .insert(insertData)
    .select("id, field_definition_id, scope_type, area_id, category_id, entity_id, entity_type, created_at")
    .single();

  if (error) throw error;

  return data as FieldScopeRow;
}

export async function removeFieldScope(scopeId: string): Promise<void> {
  if (!isUuid(scopeId)) {
    throw new Error("scopeId must be a valid UUID");
  }

  const db = getSupabaseAdmin();
  const { error } = await db
    .from("field_definition_scopes")
    .delete()
    .eq("id", scopeId);

  if (error) throw error;
}

export async function setFieldScopes(
  fieldDefinitionId: string,
  scopes: Array<{
    scope_type: string;
    area_id?: string | null;
    category_id?: string | null;
    entity_id?: string | null;
    entity_type?: string | null;
  }>
): Promise<FieldScopeRow[]> {
  if (!isUuid(fieldDefinitionId)) {
    throw new Error("fieldDefinitionId must be a valid UUID");
  }

  const db = getSupabaseAdmin();

  // Delete all existing scopes
  await db
    .from("field_definition_scopes")
    .delete()
    .eq("field_definition_id", fieldDefinitionId);

  if (scopes.length === 0) return [];

  // Insert new scopes
  const insertData = scopes.map((s) => ({
    field_definition_id: fieldDefinitionId,
    scope_type: toStr(s.scope_type).toUpperCase(),
    area_id: s.area_id ?? null,
    category_id: s.category_id ?? null,
    entity_id: s.entity_id ?? null,
    entity_type: s.entity_type ?? null,
  }));

  const { data, error } = await db
    .from("field_definition_scopes")
    .insert(insertData)
    .select("id, field_definition_id, scope_type, area_id, category_id, entity_id, entity_type, created_at");

  if (error) throw error;

  return (data || []) as FieldScopeRow[];
}

// ---------------------------------------------------------------------------
// Get applicable field definitions for an entity
// ---------------------------------------------------------------------------

export async function getApplicableFieldDefinitions(
  entityId: string
): Promise<FieldDefinitionRow[]> {
  if (!isUuid(entityId)) {
    throw new Error("entityId must be a valid UUID");
  }

  const db = getSupabaseServer();

  // First, get the entity to know its category_id, area_id, entity_type
  const { data: entity, error: entityError } = await db
    .from("entities")
    .select("id, category_id, area_id, entity_type")
    .eq("id", entityId)
    .single();

  if (entityError || !entity) {
    throw new Error("Entity not found");
  }

  // 1. ITEM scope where scope_entity_id = entityId
  const { data: itemScoped } = await db
    .from("field_definitions")
    .select("id, field_key, label_ko, label_ja, label_en, field_type, icon, scope_type, scope_entity_type, scope_entity_id, scope_area_id, scope_category_id, options_json, validation_json, sort, active, created_at, updated_at")
    .eq("scope_entity_id", entityId)
    .eq("active", true);

  // 2. CATEGORY scope where category matches entity's category (via field_definition_scopes)
  let categoryScoped: FieldDefinitionRow[] = [];
  if (entity.category_id) {
    const { data: catScopeFds } = await db
      .from("field_definition_scopes")
      .select("field_definition_id")
      .eq("scope_type", "CATEGORY")
      .eq("category_id", entity.category_id);

    if (catScopeFds && catScopeFds.length > 0) {
      const fdIds = catScopeFds.map((s) => s.field_definition_id);
      const { data: fds } = await db
        .from("field_definitions")
        .select("id, field_key, label_ko, label_ja, label_en, field_type, icon, scope_type, scope_entity_type, scope_entity_id, scope_area_id, scope_category_id, options_json, validation_json, sort, active, created_at, updated_at")
        .in("id", fdIds)
        .eq("active", true);

      categoryScoped = (fds || []) as FieldDefinitionRow[];
    }
  }

  // 3. AREA scope where area matches entity's area (via field_definition_scopes)
  let areaScoped: FieldDefinitionRow[] = [];
  if (entity.area_id) {
    const { data: areaScopeFds } = await db
      .from("field_definition_scopes")
      .select("field_definition_id")
      .eq("scope_type", "AREA")
      .eq("area_id", entity.area_id);

    if (areaScopeFds && areaScopeFds.length > 0) {
      const fdIds = areaScopeFds.map((s) => s.field_definition_id);
      const { data: fds } = await db
        .from("field_definitions")
        .select("id, field_key, label_ko, label_ja, label_en, field_type, icon, scope_type, scope_entity_type, scope_entity_id, scope_area_id, scope_category_id, options_json, validation_json, sort, active, created_at, updated_at")
        .in("id", fdIds)
        .eq("active", true);

      areaScoped = (fds || []) as FieldDefinitionRow[];
    }
  }

  // 4. ENTITY_TYPE scope where entity_type matches (via field_definition_scopes)
  let entityTypeScoped: FieldDefinitionRow[] = [];
  if (entity.entity_type) {
    const { data: etScopeFds } = await db
      .from("field_definition_scopes")
      .select("field_definition_id")
      .eq("scope_type", "ENTITY_TYPE")
      .eq("entity_type", entity.entity_type.toUpperCase());

    if (etScopeFds && etScopeFds.length > 0) {
      const fdIds = etScopeFds.map((s) => s.field_definition_id);
      const { data: fds } = await db
        .from("field_definitions")
        .select("id, field_key, label_ko, label_ja, label_en, field_type, icon, scope_type, scope_entity_type, scope_entity_id, scope_area_id, scope_category_id, options_json, validation_json, sort, active, created_at, updated_at")
        .in("id", fdIds)
        .eq("active", true);

      entityTypeScoped = (fds || []) as FieldDefinitionRow[];
    }
  }

  // 5. GLOBAL scope with no specific scope constraints
  const { data: globalScoped } = await db
    .from("field_definitions")
    .select("id, field_key, label_ko, label_ja, label_en, field_type, icon, scope_type, scope_entity_type, scope_entity_id, scope_area_id, scope_category_id, options_json, validation_json, sort, active, created_at, updated_at")
    .eq("scope_type", "GLOBAL")
    .eq("active", true);

  // Also include fields with scope_type in CATEGORY/AREA/ENTITY_TYPE that have
  // a direct scope_*_id on the field_definition itself (legacy inline scoping)
  let inlineCategoryScoped: FieldDefinitionRow[] = [];
  if (entity.category_id) {
    const { data } = await db
      .from("field_definitions")
      .select("id, field_key, label_ko, label_ja, label_en, field_type, icon, scope_type, scope_entity_type, scope_entity_id, scope_area_id, scope_category_id, options_json, validation_json, sort, active, created_at, updated_at")
      .eq("scope_category_id", entity.category_id)
      .eq("active", true);
    inlineCategoryScoped = (data || []) as FieldDefinitionRow[];
  }

  let inlineAreaScoped: FieldDefinitionRow[] = [];
  if (entity.area_id) {
    const { data } = await db
      .from("field_definitions")
      .select("id, field_key, label_ko, label_ja, label_en, field_type, icon, scope_type, scope_entity_type, scope_entity_id, scope_area_id, scope_category_id, options_json, validation_json, sort, active, created_at, updated_at")
      .eq("scope_area_id", entity.area_id)
      .eq("active", true);
    inlineAreaScoped = (data || []) as FieldDefinitionRow[];
  }

  // Combine all and deduplicate by field_key
  const allFields = [
    ...(itemScoped || []),
    ...categoryScoped,
    ...areaScoped,
    ...entityTypeScoped,
    ...(globalScoped || []),
    ...inlineCategoryScoped,
    ...inlineAreaScoped,
  ] as FieldDefinitionRow[];

  const seen = new Set<string>();
  const deduped: FieldDefinitionRow[] = [];
  for (const field of allFields) {
    if (!seen.has(field.field_key)) {
      seen.add(field.field_key);
      deduped.push(field);
    }
  }

  // Sort by sort field
  deduped.sort((a, b) => a.sort - b.sort);

  return deduped;
}
