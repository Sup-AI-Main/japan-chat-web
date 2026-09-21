/**
 * Revalidation helper for dynamic label changes.
 * When section_definitions or field_definitions change,
 * revalidate all affected public detail pages.
 */

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const ENTITY_PATH_MAP: Record<string, string> = {
  GOLF: "golf",
  HOTEL: "hotel",
  RESTAURANT: "restaurant",
  ATTRACTION: "attraction",
};

export interface RevalidationResult {
  revalidatedCount: number;
  errors: string[];
}

/**
 * Revalidate all public detail pages for a given entity type.
 * Queries the DB for all areas and slugs, then revalidates each path.
 * Returns structured result with error details instead of silently swallowing failures.
 */
export async function revalidateEntityPaths(entityType: string): Promise<RevalidationResult> {
  const type = entityType.toUpperCase();
  const pathSegment = ENTITY_PATH_MAP[type];
  if (!pathSegment) return { revalidatedCount: 0, errors: [`Unknown entity type: ${type}`] };

  const db = getSupabaseAdmin();
  const errors: string[] = [];

  const { data: entities, error } = await db
    .from("entities")
    .select("slug, areas(code)")
    .eq("entity_type", type);

  if (error) {
    console.error("[REVALIDATE_ENTITY_PATHS_DB_FAIL]", type, error);
    return { revalidatedCount: 0, errors: [`DB query failed: ${error.message}`] };
  }

  if (!entities || entities.length === 0) return { revalidatedCount: 0, errors: [] };

  let count = 0;
  const revalidatedAreas = new Set<string>();

  for (const entity of entities) {
    const areaRelation = entity.areas as { code: string }[] | { code: string } | null;
    const areaCode = Array.isArray(areaRelation) ? areaRelation[0]?.code : areaRelation?.code;
    const area = areaCode?.toLowerCase();
    if (!area) continue;

    // Revalidate detail page
    try {
      revalidatePath(`/${area}/${pathSegment}/${entity.slug}`);
      count++;
    } catch (err) {
      errors.push(`revalidatePath detail ${area}/${pathSegment}/${entity.slug}: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Revalidate list page (once per area)
    if (!revalidatedAreas.has(area)) {
      try {
        revalidatePath(`/${area}/${pathSegment}`);
        count++;
      } catch (err) {
        errors.push(`revalidatePath list ${area}/${pathSegment}: ${err instanceof Error ? err.message : String(err)}`);
      }
      revalidatedAreas.add(area);
    }
  }

  return { revalidatedCount: count, errors };
}
