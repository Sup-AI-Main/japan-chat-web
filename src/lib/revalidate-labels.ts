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

  // Get all entities of this type with their areas
  const { data: entities } = await db
    .from("entities")
    .select("slug, area")
    .eq("type", type);

  if (!entities || entities.length === 0) return 0;

  let count = 0;
  const revalidatedAreas = new Set<string>();

  for (const entity of entities) {
    const area = entity.area?.toLowerCase();
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
