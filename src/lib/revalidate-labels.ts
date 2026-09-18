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

/**
 * Revalidate all public detail pages for a given entity type.
 * Queries the DB for all areas and slugs, then revalidates each path.
 */
export async function revalidateEntityPaths(entityType: string): Promise<number> {
  const type = entityType.toUpperCase();
  const pathSegment = ENTITY_PATH_MAP[type];
  if (!pathSegment) return 0;

  const db = getSupabaseAdmin();

  // A07: 실제 스키마 컬럼 사용 (entity_type, areas 관계)
  const { data: entities, error } = await db
    .from("entities")
    .select("slug, areas(code)")
    .eq("entity_type", type);

  if (error) {
    console.error("[REVALIDATE_ENTITY_PATHS_FAIL]", error);
    return 0;
  }

  if (!entities || entities.length === 0) return 0;

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
    } catch { /* ignore */ }

    // Revalidate list page (once per area)
    if (!revalidatedAreas.has(area)) {
      try {
        revalidatePath(`/${area}/${pathSegment}`);
        count++;
      } catch { /* ignore */ }
      revalidatedAreas.add(area);
    }
  }

  return count;
}
