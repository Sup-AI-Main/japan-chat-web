/**
 * Central route helper.
 *
 * All internal links should use these functions instead of string interpolation.
 */

export const routes = {
  home: () => '/',

  // Public area routes
  area: (slug: string) => `/${slug}`,
  areaHotel: (slug: string) => `/${slug}/hotel`,
  areaHotelDetail: (slug: string, id: string) => `/${slug}/hotel/${id}`,
  areaGolf: (slug: string) => `/${slug}/golf`,
  areaGolfDetail: (slug: string, id: string) => `/${slug}/golf/${id}`,
  areaRestaurant: (slug: string) => `/${slug}/restaurant`,
  areaRestaurantDetail: (slug: string, id: string) => `/${slug}/restaurant/${id}`,
  areaAttraction: (slug: string) => `/${slug}/attraction`,
  areaAttractionDetail: (slug: string, slugOrId: string) => `/${slug}/attraction/${slugOrId}`,
  areaFaq: (slug: string, category: string) => `/${slug}/faq/${category}`,

  // Guide routes
  guide: () => '/guide',
  guideCategory: (category: string) => `/guide/${category}`,

  // Admin routes
  admin: () => '/admin',
  adminHome: () => '/admin/home',
  adminArea: (slug: string) => `/admin/${slug}`,
  adminAreaCategory: (slug: string, category: string) => `/admin/${slug}/${category}`,
  adminAreaCategoryNew: (slug: string, category: string) => `/admin/${slug}/${category}/new`,
  adminAreaCategoryDetail: (slug: string, category: string, id: string) =>
    `/admin/${slug}/${category}/${id}`,
  adminAreaEntities: (slug: string) => `/admin/${slug}/entities`,
  adminAreaManage: (slug: string) => `/admin/${slug}/manage`,
} as const;

// ---------------------------------------------------------------------------
// Centralized category route resolver
// ---------------------------------------------------------------------------

/** Valid entity template types that map to existing [area]/[entity] routes */
const ENTITY_TEMPLATES = new Set(['GOLF', 'HOTEL', 'RESTAURANT', 'ATTRACTION']);

/**
 * Resolve the actual route for a category based on its template_type.
 *
 * - ENTITY templates (GOLF/HOTEL/RESTAURANT/ATTRACTION):
 *   - AREA group → `/{area}/{lowercase_code}` (e.g., /dos/golf)
 *   - These map to existing page files at src/app/[area]/golf/page.tsx etc.
 *
 * - AREA template: `/{area}/faq/{lowercase_code}` (area-scoped FAQ)
 * - COMMON template: `/guide/{lowercase_code}` (shared guide page)
 *
 * Returns null for unknown template types so callers can skip broken links.
 */
export function resolveCategoryRoute(
  areaSlug: string,
  categoryCode: string,
  templateType: string | undefined,
  groupType: string
): string | null {
  const tt = (templateType || 'COMMON').toUpperCase();
  const codeLower = categoryCode.toLowerCase();

  if (ENTITY_TEMPLATES.has(tt)) {
    if (groupType === 'AREA') {
      const entityRouteMap: Record<string, (slug: string) => string> = {
        GOLF: routes.areaGolf,
        HOTEL: routes.areaHotel,
        RESTAURANT: routes.areaRestaurant,
        ATTRACTION: routes.areaAttraction,
      };
      return entityRouteMap[tt]?.(areaSlug) ?? null;
    }
    // Entity template in non-AREA group — unexpected, skip
    return null;
  }

  // AREA template — render FAQ content scoped to the area
  if (tt === 'AREA') {
    return routes.areaFaq(areaSlug, codeLower);
  }

  // COMMON template — render shared guide content
  if (tt === 'COMMON') {
    if (groupType === 'COMMON') {
      return routes.guideCategory(codeLower);
    }
    // AREA group with COMMON template — also use area FAQ
    return routes.areaFaq(areaSlug, codeLower);
  }

  return null;
}
