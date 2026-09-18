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
