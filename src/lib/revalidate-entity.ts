/**
 * Targeted revalidation for entity detail changes.
 * Only revalidates the changed entity's detail + list pages.
 * Does NOT loop over all entities.
 */

import { revalidatePath } from "next/cache";
import { ENTITY_PATH_MAP } from "@/lib/entity-details/constants";

/**
 * Revalidate public pages for a single entity.
 * Call after successful entity save.
 */
export function revalidateEntityDetail(args: {
  entityType: string;
  area: string;
  slug: string;
}): void {
  const segment = ENTITY_PATH_MAP[args.entityType.toUpperCase()];
  if (!segment) return;

  const area = args.area.toLowerCase();

  // Revalidate detail page
  revalidatePath(`/${area}/${segment}/${args.slug}`);
  // Revalidate list page
  revalidatePath(`/${area}/${segment}`);
}
